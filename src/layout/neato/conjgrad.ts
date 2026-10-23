// SPDX-License-Identifier: EPL-2.0
import { agerrorf } from '../../common/agerr.js';
import type { VtxData } from './dijkstra.js';
import {
  BLOCK_NONE,
  copyVector,
  innerProduct,
  maxAbs,
  orthog1,
  rightMultWithVector,
  rightMultWithVectorF,
  vectorsAddition,
  vectorsScalarMult,
  vectorsSubtraction,
} from './matrix-ops.js';

/**
 * Conjugate gradient solvers for packed symmetric float matrices.
 * @see lib/neatogen/conjgrad.c
 */

/**
 * Subtract mean from `v` in-place (orthogonalize against constant vector).
 * Matches `orthog1f` in lib/neatogen/matrix_ops.c.
 * @see lib/neatogen/matrix_ops.c:orthog1f
 */
export function orthog1f(n: number, v: Float32Array): void {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += v[i];
  const mean = sum / n;
  for (let i = 0; i < n; i++) v[i] -= mean;
}

/**
 * Multiply packed symmetric matrix `A` by vector `x`, writing result to `y`.
 * `A` is upper-triangular, row-major, length n*(n+1)/2.
 * Matches `right_mult_with_vector_ff` in lib/neatogen/matrix_ops.c.
 * @see lib/neatogen/matrix_ops.c:right_mult_with_vector_ff
 */
export function rightMultVecFF(
  A: Float32Array,
  n: number,
  x: Float32Array,
  y: Float32Array,
): void {
  for (let i = 0; i < n; i++) y[i] = 0;
  let idx = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++, idx++) {
      y[i] += A[idx] * x[j];
      if (i !== j) y[j] += A[idx] * x[i];
    }
  }
}

/** Maximum absolute value in float array. @internal */
export function maxAbsF(n: number, v: Float32Array): number {
  let m = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.abs(v[i]);
    if (a > m) m = a;
  }
  return m;
}

/** Inner product of two float arrays. @internal */
export function dotF(n: number, a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

/** CG state bundle. @internal */
interface CgState {
  r: Float32Array;
  p: Float32Array;
  Ap: Float32Array;
  rr: number;
}

/**
 * Initialise CG state from A, x, b (with orthogonalization).
 * @see lib/neatogen/conjgrad.c:conjugate_gradient_mkernel
 */
export function cgInit(
  A: Float32Array,
  x: Float32Array,
  b: Float32Array,
  n: number,
): CgState {
  const Ax = new Float32Array(n);
  const r = new Float32Array(n);
  orthog1f(n, x); orthog1f(n, b);
  rightMultVecFF(A, n, x, Ax);
  orthog1f(n, Ax);
  for (let i = 0; i < n; i++) r[i] = b[i] - Ax[i];
  const p = new Float32Array(r);
  return { r, p, Ap: new Float32Array(n), rr: dotF(n, r, r) };
}

/**
 * Update p and rr after a non-final CG step.
 * Returns 1 on zero-length error, 0 on success.
 * @see lib/neatogen/conjgrad.c:conjugate_gradient_mkernel
 */
export function cgUpdateDirection(
  n: number,
  alpha: number,
  state: CgState,
): number {
  const { r, p, Ap } = state;
  for (let j = 0; j < n; j++) r[j] -= alpha * Ap[j];
  const rrNew = dotF(n, r, r);
  if (state.rr === 0) return 1;
  const beta = rrNew / state.rr;
  state.rr = rrNew;
  for (let j = 0; j < n; j++) p[j] = beta * p[j] + r[j];
  return 0;
}

/**
 * Execute one CG iteration on packed matrix A.
 * Returns 0 = continue, 1 = zero-length error, 2 = p·Ap zero (done).
 * @see lib/neatogen/conjgrad.c:conjugate_gradient_mkernel
 */
export function cgStep(
  A: Float32Array,
  x: Float32Array,
  n: number,
  state: CgState,
  last: boolean,
): number {
  const { r, p, Ap } = state;
  orthog1f(n, p); orthog1f(n, x); orthog1f(n, r);
  rightMultVecFF(A, n, p, Ap);
  orthog1f(n, Ap);
  const pAp = dotF(n, p, Ap);
  if (pAp === 0) return 2;
  const alpha = state.rr / pAp;
  for (let j = 0; j < n; j++) x[j] += alpha * p[j];
  if (last) return 0;
  return cgUpdateDirection(n, alpha, state);
}

/** Options for {@link conjugateGradientMkernel}. */
export interface CgOptions {
  tol: number;
  maxIterations: number;
}

/**
 * Conjugate gradient solver for packed symmetric float matrix `A`.
 * Solves A·x = b in place (x is both initial guess and output).
 * `b` and `x` are orthogonalized against 1 before and during iteration.
 * Returns 0 on success, 1 if a zero-length vector is encountered.
 *
 * @see lib/neatogen/conjgrad.c:conjugate_gradient_mkernel
 */
export function conjugateGradientMkernel(
  A: Float32Array,
  x: Float32Array,
  b: Float32Array,
  n: number,
  opts: CgOptions,
): number {
  const state = cgInit(A, x, b, n);
  const { tol, maxIterations } = opts;
  for (let i = 0; i < maxIterations && maxAbsF(n, state.r) > tol; i++) {
    const rv = cgStep(A, x, n, state, i === maxIterations - 1);
    if (rv === 1) return 1;
    if (rv === 2) break;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Double-precision solvers (conjugate_gradient, conjugate_gradient_f)
// ---------------------------------------------------------------------------

/**
 * Unfused block widths of the 16.1 arm64 `-O3 -flto=thin` build, which inlines
 * `vectors_inner_product` into `conjugate_gradient` and compiles each of the
 * three call sites differently (disassembly of `libgvplugin_neato_layout`):
 * the initial `r.r` is vectorized in blocks of 4, `p.Ap` in blocks of 8, and
 * the in-loop `r.r` is a plain scalar loop. In a vectorized block the products
 * are rounded before the in-order adds; the scalar loop contracts to fmadd.
 */
const BLOCK_INITIAL_RR = 4;
const BLOCK_P_AP = 8;

/** Working vectors of `conjugate_gradient`. @internal */
interface CgWork {
  r: Float64Array;
  p: Float64Array;
  Ap: Float64Array;
  alphap: Float64Array;
}

/**
 * One CG step after `x += alpha*p`: update residual and direction.
 * Returns the new `r.r`, or null for C's `goto cleanup0` (rv = 1).
 * @see lib/neatogen/conjgrad.c:conjugate_gradient
 */
function cgNextDirection(n: number, w: CgWork, alpha: number, rR: number): number | null {
  vectorsScalarMult(n, w.Ap, alpha, w.Ap);
  vectorsSubtraction(n, w.r, w.Ap, w.r); // fast computation of r, the residual
  const rRNew = innerProduct(n, w.r, w.r, BLOCK_NONE);
  if (rR === 0) {
    agerrorf('conjugate_gradient: unexpected length 0 vector\n');
    return null;
  }
  const beta = rRNew / rR;
  vectorsScalarMult(n, w.p, beta, w.p);
  vectorsAddition(n, w.r, w.p, w.p);
  return rRNew;
}

/**
 * Residual setup of `conjugate_gradient`: `r = orth_b - A x`, `p = r`; `x` and
 * `b` are orthogonalized against 1.
 * @see lib/neatogen/conjgrad.c:conjugate_gradient
 */
function cgStart(A: VtxData[], x: Float64Array, b: Float64Array, n: number): CgWork {
  const w: CgWork = {
    r: new Float64Array(n), p: new Float64Array(n),
    Ap: new Float64Array(n), alphap: new Float64Array(n),
  };
  const Ax = new Float64Array(n);
  const orthB = Float64Array.from(b.subarray(0, n));
  orthog1(n, orthB);
  orthog1(n, x);
  rightMultWithVector(A, n, x, Ax);
  vectorsSubtraction(n, orthB, Ax, w.r);
  w.p.set(w.r.subarray(0, n));
  return w;
}

/**
 * Solve `A x = b` by conjugate gradients; `x` and `b` are orthogonalized
 * against 1. Returns C's `rv` (1 on the zero-length-residual failure).
 * @see lib/neatogen/conjgrad.c:conjugate_gradient
 */
export function conjugateGradient(
  A: VtxData[],
  x: Float64Array,
  b: Float64Array,
  n: number,
  tol: number,
  maxIterations: number,
): number {
  const w = cgStart(A, x, b, n);
  let rR = innerProduct(n, w.r, w.r, BLOCK_INITIAL_RR);

  for (let i = 0; i < maxIterations && maxAbs(n, w.r) > tol; i++) {
    rightMultWithVector(A, n, w.p, w.Ap);
    const pAp = innerProduct(n, w.p, w.Ap, BLOCK_P_AP);
    if (pAp === 0) break;
    const alpha = rR / pAp;
    vectorsScalarMult(n, w.p, alpha, w.alphap); // derive new x
    vectorsAddition(n, x, w.alphap, x);
    if (i < maxIterations - 1) { // not last iteration
      const next = cgNextDirection(n, w, alpha, rR);
      if (next === null) return 1;
      rR = next;
    }
  }
  return 0;
}

/**
 * Block widths of conjugate_gradient_f's inlined sites in the same build:
 * the initial `A x` and the in-loop `A p` row reductions and the initial
 * `r.r` are blocks of 4, `p.Ap` blocks of 8, the in-loop `r.r` scalar.
 * Verified bit for bit against the oracle's own libneatogen.a over random
 * float matrices (n = 5..40, ortho1 on and off).
 */
const CGF_BLOCK_AX = 4;
const CGF_BLOCK_AP = 4;
const CGF_BLOCK_INITIAL_RR = 4;
const CGF_BLOCK_P_AP = 8;

/** Work vectors of one conjugate_gradient_f call. @internal */
interface CgfState {
  r: Float64Array;
  p: Float64Array;
  Ap: Float64Array;
  alphap: Float64Array;
  rr: number;
}

/**
 * Residual setup: r = orth_b - A x, p = r. `x` is centred when `ortho1`.
 * @see lib/neatogen/conjgrad.c:conjugate_gradient_f
 */
function cgfInit(
  A: readonly Float32Array[], x: Float64Array, b: Float64Array, n: number, ortho1: boolean,
): CgfState {
  const orthB = new Float64Array(n);
  copyVector(n, b, orthB);
  if (ortho1) {
    orthog1(n, orthB);
    orthog1(n, x);
  }
  const Ax = new Float64Array(n);
  rightMultWithVectorF(A, n, x, Ax, CGF_BLOCK_AX);
  const r = new Float64Array(n);
  vectorsSubtraction(n, orthB, Ax, r);
  const p = new Float64Array(n);
  copyVector(n, r, p);
  return {
    r, p, Ap: new Float64Array(n), alphap: new Float64Array(n),
    rr: innerProduct(n, r, r, CGF_BLOCK_INITIAL_RR),
  };
}

/**
 * Residual and direction update of a non-last iteration; returns C's `rv`
 * (1 after reporting a zero-length residual).
 * @see lib/neatogen/conjgrad.c:conjugate_gradient_f
 */
function cgfUpdate(n: number, alpha: number, st: CgfState): number {
  vectorsScalarMult(n, st.Ap, alpha, st.Ap);
  vectorsSubtraction(n, st.r, st.Ap, st.r);
  const rrNew = innerProduct(n, st.r, st.r, BLOCK_NONE);
  if (st.rr === 0) {
    agerrorf('conjugate_gradient: unexpected length 0 vector\n');
    return 1;
  }
  const beta = rrNew / st.rr;
  st.rr = rrNew;
  vectorsScalarMult(n, st.p, beta, st.p);
  vectorsAddition(n, st.r, st.p, st.p);
  return 0;
}

/** Stopping rule and centring of {@link conjugateGradientF} (C's trailing parameters). */
export interface CgfOptions {
  tol: number;
  maxIterations: number;
  ortho1: boolean;
}

/**
 * Solves A x = b for a float** matrix with double x, b (x, b centred when
 * `ortho1`). Returns 0, or 1 after a zero-length residual (callers test `< 0`).
 * @see lib/neatogen/conjgrad.c:conjugate_gradient_f
 */
export function conjugateGradientF(
  A: readonly Float32Array[],
  x: Float64Array,
  b: Float64Array,
  n: number,
  opts: CgfOptions,
): number {
  const { tol, maxIterations, ortho1 } = opts;
  const st = cgfInit(A, x, b, n, ortho1);
  for (let i = 0; i < maxIterations && maxAbs(n, st.r) > tol; i++) {
    rightMultWithVectorF(A, n, st.p, st.Ap, CGF_BLOCK_AP);
    const pAp = innerProduct(n, st.p, st.Ap, CGF_BLOCK_P_AP);
    if (pAp === 0) break;
    const alpha = st.rr / pAp;
    vectorsScalarMult(n, st.p, alpha, st.alphap);
    vectorsAddition(n, x, st.alphap, x);
    if (i < maxIterations - 1 && cgfUpdate(n, alpha, st) === 1) return 1;
  }
  return 0;
}
