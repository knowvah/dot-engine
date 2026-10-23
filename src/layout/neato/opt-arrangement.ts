// SPDX-License-Identifier: EPL-2.0

/**
 * Optimal y arrangement of a directed graph: solves `L*y = b` by conjugate
 * gradient over the unit-weight Laplacian, where `b` is the balance vector of
 * the edge directions (`edists`).
 *
 * `conjugate_gradient` (the vtx_data / double variant of conjgrad.c) and
 * `init_vec_orth1` (matrix_ops.c) are not ported elsewhere (conjgrad.ts has only
 * the packed-float kernel), so their double-precision bodies live here as
 * helpers, `@see`-tagged to their C homes.
 *
 * @see lib/neatogen/opt_arrangement.c
 */

import { agerrorf } from '../../common/agerr.js';
import { crand } from '../../common/crand.js';
import { fma } from '../../common/fma.js';
import type { VtxData } from './dijkstra.js';
import { orthog1 } from './matrix-ops.js';

/** `vtx_data` with the `DIGCOLA` `edists` field (`int8_t *`, `NULL` when absent). */
export interface DirectedVtxData extends VtxData {
  edists?: ArrayLike<number> | null;
}

/** `#define hierarchy_cg_tol` @see lib/neatogen/opt_arrangement.c */
const HIERARCHY_CG_TOL = 1e-3;

/** `#define RANGE` @see lib/neatogen/matrix_ops.c */
const RANGE = 500;

/**
 * Build `b` with `-b[i] = sum_j -w_ij * delta_ij` (the balance vector; the
 * matrix is -L, so `-Lx = -b` is solved). `b` is left untouched when node 0 has
 * no `edists` (C: `continue`, `b` stays calloc-zero).
 * @see lib/neatogen/opt_arrangement.c:construct_b
 */
export function constructB(graph: DirectedVtxData[], n: number, b: Float64Array): void {
  for (let i = 0; i < n; i++) {
    if (graph[0]!.edists == null) continue;
    let bI = 0;
    const node = graph[i]!;
    for (let j = 1; j < node.nedges; j++) { // skip the self loop
      // C ewgts is float; edists is int8_t
      bI += Math.fround(Math.fround(node.ewgts[j]!) * node.edists![j]!);
    }
    b[i] = bI;
  }
}

/**
 * `vec[i] = rand() % RANGE`, then orthogonalize against 1.
 * @see lib/neatogen/matrix_ops.c:init_vec_orth1
 */
function initVecOrth1(n: number, vec: Float64Array): void {
  for (let i = 0; i < n; i++) vec[i] = crand() % RANGE;
  orthog1(n, vec);
}

/**
 * result = matrix * vector over the sparse `vtx_data` rows.
 * @see lib/neatogen/matrix_ops.c:right_mult_with_vector
 */
function rightMultWithVector(
  matrix: VtxData[],
  n: number,
  vector: Float64Array,
  result: Float64Array,
): void {
  for (let i = 0; i < n; i++) {
    let res = 0;
    const row = matrix[i]!;
    // arm64 -O3 -flto=thin (the 16.1 oracle build) contracts `res += w * v` to fmadd
    for (let j = 0; j < row.nedges; j++) res = fma(row.ewgts[j]!, vector[row.edges[j]!]!, res);
    result[i] = res;
  }
}

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
const BLOCK_NONE = 1;

/**
 * Inner product reproducing the oracle's per-site contraction: the first
 * `block * floor(n / block)` elements are accumulated unfused, the rest fused.
 * @see lib/neatogen/matrix_ops.c:vectors_inner_product
 */
function innerProduct(n: number, v1: Float64Array, v2: Float64Array, block: number): number {
  let result = 0;
  const blocked = block === BLOCK_NONE ? 0 : n - (n % block);
  let i = 0;
  for (; i < blocked; i++) result += v1[i]! * v2[i]!;
  for (; i < n; i++) result = fma(v1[i]!, v2[i]!, result);
  return result;
}

/** @see lib/neatogen/matrix_ops.c:max_abs */
function maxAbs(n: number, vec: Float64Array): number {
  let max = -1e50;
  for (let i = 0; i < n; i++) {
    const a = Math.abs(vec[i]!); // fmax ignores a NaN operand, as `>` does
    if (a > max) max = a;
  }
  return max;
}

/** `result = vector * alpha` (aliasing allowed). @see lib/neatogen/matrix_ops.c:vectors_scalar_mult */
function scalarMult(n: number, vector: Float64Array, alpha: number, result: Float64Array): void {
  for (let i = 0; i < n; i++) result[i] = vector[i]! * alpha;
}

/** `result = v1 + v2` (aliasing allowed). @see lib/neatogen/matrix_ops.c:vectors_addition */
function addition(n: number, v1: Float64Array, v2: Float64Array, result: Float64Array): void {
  for (let i = 0; i < n; i++) result[i] = v1[i]! + v2[i]!;
}

/** `result = v1 - v2` (aliasing allowed). @see lib/neatogen/matrix_ops.c:vectors_subtraction */
function subtraction(n: number, v1: Float64Array, v2: Float64Array, result: Float64Array): void {
  for (let i = 0; i < n; i++) result[i] = v1[i]! - v2[i]!;
}

/** Working vectors of `conjugate_gradient`. */
interface CgWork {
  r: Float64Array;
  p: Float64Array;
  Ap: Float64Array;
  alphap: Float64Array;
}

/**
 * One CG step after `x += alpha*p`: update residual and direction.
 * Returns `[r_r_new, ok]` as C's `rv`/`goto cleanup0` split.
 * @see lib/neatogen/conjgrad.c:conjugate_gradient
 */
function cgNextDirection(n: number, w: CgWork, alpha: number, rR: number): number | null {
  scalarMult(n, w.Ap, alpha, w.Ap);
  subtraction(n, w.r, w.Ap, w.r); // fast computation of r, the residual
  const rRNew = innerProduct(n, w.r, w.r, BLOCK_NONE);
  if (rR === 0) {
    agerrorf('conjugate_gradient: unexpected length 0 vector\n');
    return null;
  }
  const beta = rRNew / rR;
  scalarMult(n, w.p, beta, w.p);
  addition(n, w.r, w.p, w.p);
  return rRNew;
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
  const w: CgWork = {
    r: new Float64Array(n), p: new Float64Array(n),
    Ap: new Float64Array(n), alphap: new Float64Array(n),
  };
  const Ax = new Float64Array(n);
  const orthB = Float64Array.from(b.subarray(0, n));
  orthog1(n, orthB);
  orthog1(n, x);
  rightMultWithVector(A, n, x, Ax);
  subtraction(n, orthB, Ax, w.r);
  w.p.set(w.r.subarray(0, n));
  let rR = innerProduct(n, w.r, w.r, BLOCK_INITIAL_RR);

  for (let i = 0; i < maxIterations && maxAbs(n, w.r) > tol; i++) {
    rightMultWithVector(A, n, w.p, w.Ap);
    const pAp = innerProduct(n, w.p, w.Ap, BLOCK_P_AP);
    if (pAp === 0) break;
    const alpha = rR / pAp;
    scalarMult(n, w.p, alpha, w.alphap); // derive new x
    addition(n, x, w.alphap, x);
    if (i < maxIterations - 1) { // not last iteration
      const next = cgNextDirection(n, w, alpha, rR);
      if (next === null) return 1;
      rR = next;
    }
  }
  return 0;
}

/**
 * Replace every row's edge weights (lengths) by uniform Laplacian weights:
 * `-(nedges-1)` on the diagonal, 1 off it. Returns the replaced rows' weights.
 * @see lib/neatogen/opt_arrangement.c:compute_y_coords
 */
function setUniformWeights(graph: VtxData[], n: number): number[][] {
  const old: number[][] = [];
  for (let i = 0; i < n; i++) {
    const node = graph[i]!;
    old.push(node.ewgts);
    const weights = new Array<number>(node.nedges).fill(1);
    weights[0] = -(node.nedges - 1);
    node.ewgts = weights;
  }
  return old;
}

/**
 * Find the y coordinates of a directed graph by solving `L*y = b`. Starts from
 * a `rand()`-seeded vector, so the result depends on the libc rand stream
 * position (`common/crand`). Returns 1 when conjugate gradient fails.
 * @see lib/neatogen/opt_arrangement.c:compute_y_coords
 */
export function computeYCoords(
  graph: VtxData[],
  n: number,
  yCoords: Float64Array,
  maxIterations: number,
): 0 | 1 {
  let rv: 0 | 1 = 0;
  const b = new Float64Array(n);

  constructB(graph, n, b);
  initVecOrth1(n, yCoords);

  // replace original edge weights (which are lengths) with uniform weights
  const oldEwgts = setUniformWeights(graph, n);
  // C tests `< 0` although conjugate_gradient returns 0 or 1, so rv never becomes 1
  if (conjugateGradient(graph, yCoords, b, n, HIERARCHY_CG_TOL, maxIterations) < 0) {
    rv = 1;
  }
  // restore original edge weights
  for (let i = 0; i < n; i++) graph[i]!.ewgts = oldEwgts[i]!;
  return rv;
}
