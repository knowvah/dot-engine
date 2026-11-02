// SPDX-License-Identifier: EPL-2.0

/**
 * Linear equations (Ax = b) by LU decomposition with partial pivoting and row
 * equilibration (Ken Turkowski). `luDecompose` factors the coefficient matrix;
 * `luSolve` solves against one unit vector per call.
 *
 * Floating point follows the oracle's clang -O3 arm64 code (16.1.0
 * `libgvplugin_neato_layout`): the elimination `lu[i][j] -= mult * lu[k][j]`
 * is fused (fmla/fmsub), and `luSolve`'s dot products are vectorised 8 terms
 * at a time as fmul + in-order fadd (unfused) with a fused (fmadd) scalar tail.
 *
 * @see lib/neatogen/lu.c
 */

import { fma } from '../../common/fma.js';
import { fmaxf as fmax } from './quad-prog-solve.js';

/**
 * State for an LU decomposition. `null` is a freed (or never allocated) field.
 * @see lib/neatogen/neato.h:lu_t
 */
export interface LuT {
  /** Composite of the upper and lower triangular matrices. */
  lu: Float64Array[] | null;
  /** Pivot sequence. */
  ps: Int32Array | null;
}

/** clang's vector width for `luSolve`'s dot products (4 x 2 doubles). */
const DOT_VECTOR_TERMS = 8;

/**
 * An m x n array of rows over one buffer, every entry `ival`.
 * Lives here (not in a stuff.c port) because lu.c is its first ported caller.
 * @see lib/neatogen/stuff.c:new_array
 */
export function newArray(m: number, n: number, ival: number): Float64Array[] {
  const mem = new Float64Array(m * n);
  const rv: Float64Array[] = [];
  for (let i = 0; i < m; i++) {
    rv.push(mem.subarray(i * n, (i + 1) * n));
    rv[i]!.fill(ival);
  }
  return rv;
}

/**
 * Copy `a` into `lu.lu`, record 1/largest per row in `scales` and the identity
 * pivot sequence; false on a zero row (C returns 0 there).
 * @see lib/neatogen/lu.c:lu_decompose (lu.c:74-86)
 */
function luScaleRows(lu: LuT, a: readonly ArrayLike<number>[], n: number, scales: Float64Array): boolean {
  const m = lu.lu!;
  const ps = lu.ps!;
  for (let i = 0; i < n; i++) { // for each row
    /* Find the largest element in each row for row equilibration */
    let biggest = 0;
    for (let j = 0; j < n; j++) biggest = fmax(biggest, Math.abs((m[i]![j] = a[i]![j]!)));
    if (biggest > 0.0) scales[i] = 1.0 / biggest;
    else return false; /* Zero row: singular matrix */
    ps[i] = i; // initialize pivot sequence
  }
  return true;
}

/**
 * The scaled-largest row index at or below `k` in column `k`, or -1 when the
 * column is zero. `pivotindex` carries over between columns, as in C.
 * @see lib/neatogen/lu.c:lu_decompose (lu.c:88-102)
 */
function luFindPivot(lu: LuT, k: number, n: number, scales: Float64Array, pivotindex: number): number {
  const m = lu.lu!;
  const ps = lu.ps!;
  /* Find the largest element in each column to pivot around */
  let biggest = 0;
  for (let i = k; i < n; i++) {
    const tempf = Math.abs(m[ps[i]!]![k]!) * scales[ps[i]!]!;
    if (biggest < tempf) {
      biggest = tempf;
      pivotindex = i;
    }
  }
  if (biggest <= 0.0) return -1; /* Zero column: singular matrix */
  return pivotindex;
}

/**
 * Pivot on column `k`, eliminating an extra variable (fused multiply-subtract).
 * @see lib/neatogen/lu.c:lu_decompose (lu.c:107-113)
 */
function luEliminate(lu: LuT, k: number, n: number): void {
  const m = lu.lu!;
  const ps = lu.ps!;
  const rowK = m[ps[k]!]!;
  const pivot = rowK[k]!;
  for (let i = k + 1; i < n; i++) {
    const rowI = m[ps[i]!]!;
    const mult = (rowI[k] = rowI[k]! / pivot);
    for (let j = k + 1; j < n; j++) rowI[j] = fma(-mult, rowK[j]!, rowI[j]!);
  }
}

/**
 * Decompose the n x n matrix `a` into `lu`. 1 on success; 0 (with `lu` freed)
 * when `a` is singular. n = 0 reads `ps[-1]` in C (undefined behaviour); no
 * caller reaches it (stress_majorization_cola returns early for one node).
 * @see lib/neatogen/lu.c:lu_decompose
 */
export function luDecompose(lu: LuT, a: readonly ArrayLike<number>[], n: number): 0 | 1 {
  lu.lu = newArray(n, n, 0.0);
  lu.ps = new Int32Array(n);
  const scales = new Float64Array(n);

  if (!luScaleRows(lu, a, n, scales)) {
    luFree(lu);
    return 0; /* Zero row: singular matrix */
  }

  for (let k = 0, pivotindex = 0; k < n - 1; k++) { // for each column
    pivotindex = luFindPivot(lu, k, n, scales, pivotindex);
    if (pivotindex < 0) {
      luFree(lu);
      return 0; /* Zero column: singular matrix */
    }
    if (pivotindex !== k) { /* Update pivot sequence */
      const ps = lu.ps;
      const t = ps[k]!;
      ps[k] = ps[pivotindex]!;
      ps[pivotindex] = t;
    }
    /* Pivot, eliminating an extra variable each time */
    luEliminate(lu, k, n);
  }

  if (lu.lu[lu.ps[n - 1]!]![n - 1] === 0.0) {
    luFree(lu);
    return 0; /* Singular matrix */
  }
  return 1;
}

/**
 * `sum row[j] * x[j]` for j in [from, to), as clang emits it: the first
 * 8-multiple of terms as fmul + in-order fadd, the rest fused.
 * @see lib/neatogen/lu.c:lu_solve (lu.c:140-141, 147-148)
 */
function luDot(row: Float64Array, x: Float64Array, from: number, to: number): number {
  const vecEnd = from + (to - from) - ((to - from) % DOT_VECTOR_TERMS);
  let dot = 0;
  let j = from;
  for (; j < vecEnd; j++) dot += row[j]! * x[j]!;
  for (; j < to; j++) dot = fma(row[j]!, x[j]!, dot);
  return dot;
}

/**
 * Solve A x = e_bi with the decomposition from `luDecompose`.
 * @see lib/neatogen/lu.c:lu_solve
 */
export function luSolve(lu: LuT, x: Float64Array, bi: number, n: number): void {
  const m = lu.lu!;
  const ps = lu.ps!;
  /* Vector reduction using U triangular matrix */
  for (let i = 0; i < n; i++) {
    const dot = luDot(m[ps[i]!]!, x, 0, i);
    x[i] = (ps[i] === bi ? 1 : 0) - dot;
  }

  /* Back substitution, in L triangular matrix */
  for (let i = n - 1; i >= 0; i--) {
    const row = m[ps[i]!]!;
    const dot = luDot(row, x, i + 1, n);
    x[i] = (x[i]! - dot) / row[i]!;
  }
}

/**
 * Release the decomposition. C frees without clearing the pointers; the port
 * drops them to `null`.
 * @see lib/neatogen/lu.c:lu_free
 */
export function luFree(lu: LuT | null): void {
  if (lu === null) {
    return;
  }
  lu.lu = null;
  lu.ps = null;
}
