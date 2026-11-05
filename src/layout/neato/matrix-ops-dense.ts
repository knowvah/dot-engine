// SPDX-License-Identifier: EPL-2.0

/**
 * The dense matrix routines of matrix_ops.c that the smart initial layout needs
 * (`sparse_stress_subspace_majorization_kD`, `PCA_alloc`, `iterativePCA_1D`).
 * `matrix-ops.ts` holds the rest of that C file.
 *
 * Fusion follows the 16.1 arm64 `-O3 -flto=thin` disassembly of each site (see
 * matrix-ops.ts): products over pointer-chased rows are scalar `fmadd`; sums over
 * one contiguous row are 8-wide (`fmul.2d` then in-order `fadd`) with an `fmadd`
 * remainder. C's output parameters (`float ***CC`) are return values here.
 *
 * @see lib/neatogen/matrix_ops.c
 */

import { crand } from '../../common/crand.js';
import { fma } from '../../common/fma.js';
import type { VtxData } from './dijkstra.js';
import {
  BLOCK_NONE, copyVector, innerProduct, norm, scadd, vectorsScalarMult,
} from './matrix-ops.js';

const fr = Math.fround;

/** `p_iteration_threshold` @see lib/neatogen/matrix_ops.c */
const P_ITERATION_THRESHOLD = 1e-3;
/** The `len < 1e-10` colinearity and null-space test of power iteration. */
const POWER_LENGTH_FLOOR = 1e-10;
/** `rand() % 100`, the components of a guessed eigenvector. */
const GUESS_RANGE = 100;
/** Vector width of the reductions inlined in `_power_iteration` and `_stress_majorization_kD_mkernel`. */
const BLOCK_ROW = 8;

/**
 * result = matrix × vector, matrix dim1 × dim2. Its inlined copies (in
 * power_iteration and the subspace loop) are both 8-wide.
 * @see lib/neatogen/matrix_ops.c:right_mult_with_vector_d
 */
export function rightMultWithVectorD(
  matrix: readonly Float64Array[], dim1: number, dim2: number, vector: Float64Array, result: Float64Array,
): void {
  const blocked = dim2 - (dim2 % BLOCK_ROW);
  for (let i = 0; i < dim1; i++) {
    const row = matrix[i]!;
    let res = 0;
    let j = 0;
    for (; j < blocked; j++) res += row[j]! * vector[j]!;
    for (; j < dim2; j++) res = fma(row[j]!, vector[j]!, res);
    result[i] = res;
  }
}

/**
 * result = matrixᵀ × vector, matrix dim2 × dim1, vector of dim2 components.
 * @see lib/neatogen/matrix_ops.c:right_mult_with_vector_transpose
 */
export function rightMultWithVectorTranspose(
  matrix: readonly Float64Array[], dim1: number, dim2: number, vector: Float64Array, result: Float64Array,
): void {
  for (let i = 0; i < dim1; i++) {
    let res = 0;
    for (let j = 0; j < dim2; j++) res = fma(matrix[j]![i]!, vector[j]!, res);
    result[i] = res;
  }
}

/**
 * C = A × B: A is dim1 × dim2 (double), B is dim2 × dim3 (float), C is float.
 * @see lib/neatogen/matrix_ops.c:mult_dense_mat
 */
export function multDenseMat(
  A: readonly Float64Array[], B: readonly Float32Array[], dim1: number, dim2: number, dim3: number,
): Float32Array[] {
  const C = Array.from({ length: dim1 }, () => new Float32Array(dim3));
  for (let i = 0; i < dim1; i++) {
    for (let j = 0; j < dim3; j++) {
      let sum = 0;
      for (let k = 0; k < dim2; k++) sum = fma(A[i]![k]!, B[k]![j]!, sum);
      C[i]![j] = sum;
    }
  }
  return C;
}

/**
 * C = A × B: A is dim1 × dim2 (double), B is dim2 × dim3 (float), C is double.
 * @see lib/neatogen/matrix_ops.c:mult_dense_mat_d
 */
export function multDenseMatD(
  A: readonly Float64Array[], B: readonly Float32Array[], dim1: number, dim2: number, dim3: number,
): Float64Array[] {
  const C = Array.from({ length: dim1 }, () => new Float64Array(dim3));
  for (let i = 0; i < dim1; i++) {
    for (let j = 0; j < dim3; j++) {
      let sum = 0;
      for (let k = 0; k < dim2; k++) sum = fma(A[i]![k]!, B[k]![j]!, sum);
      C[i]![j] = sum;
    }
  }
  return C;
}

/**
 * C = A × Bᵀ: A is dim1 × dim1 and sparse, B is dim2 × dim1, C is float.
 * @see lib/neatogen/matrix_ops.c:mult_sparse_dense_mat_transpose
 */
export function multSparseDenseMatTranspose(
  A: readonly VtxData[], B: readonly Float64Array[], dim1: number, dim2: number,
): Float32Array[] {
  const C = Array.from({ length: dim1 }, () => new Float32Array(dim2));
  for (let i = 0; i < dim1; i++) {
    const { edges, ewgts, nedges } = A[i]!;
    for (let j = 0; j < dim2; j++) {
      let sum = 0;
      for (let k = 0; k < nedges; k++) sum = fma(fr(ewgts[k]!), B[j]![edges[k]!]!, sum);
      C[i]![j] = sum;
    }
  }
  return C;
}

/** Working state of one `power_iteration` call. */
interface PowerState {
  readonly mat: readonly Float64Array[];
  readonly n: number;
  readonly eigs: readonly Float64Array[];
  readonly evals: Float64Array;
  readonly tmpVec: Float64Array;
  readonly lastVec: Float64Array;
  readonly maxIterations: number;
  readonly tol: number;
  iteration: number;
}

/** Orthogonalize `vec` against the `i` higher eigenvectors. */
function orthogonalize(st: PowerState, i: number, vec: Float64Array): void {
  for (let j = 0; j < i; j++) {
    const alpha = -innerProduct(st.n, st.eigs[j]!, vec, BLOCK_ROW);
    scadd(vec, st.n - 1, alpha, st.eigs[j]!);
  }
}

/** Guess the i-th eigenvector: random components, orthogonalized; returns its length. */
function guess(st: PowerState, i: number): number {
  const curr = st.eigs[i]!;
  for (let j = 0; j < st.n; j++) curr[j] = crand() % GUESS_RANGE;
  orthogonalize(st, i, curr);
  return norm(curr, st.n - 1, BLOCK_NONE);
}

/**
 * Iterate the i-th eigenvector until it settles. Returns its Rayleigh quotient,
 * or `null` for C's `goto exit` (null space reached, or out of iterations).
 */
function iterate(st: PowerState, i: number): number | null {
  const { n, mat, tmpVec, lastVec } = st;
  const curr = st.eigs[i]!;
  let angle: number;
  let len: number;
  st.iteration = 0;
  do {
    st.iteration++;
    copyVector(n, curr, lastVec);
    rightMultWithVectorD(mat, n, n, curr, tmpVec);
    copyVector(n, tmpVec, curr);
    orthogonalize(st, i, curr);
    len = norm(curr, n - 1, BLOCK_NONE);
    if (len < POWER_LENGTH_FLOOR || st.iteration > st.maxIterations) return null;
    vectorsScalarMult(n, curr, 1.0 / len, curr);
    angle = innerProduct(n, curr, lastVec, BLOCK_ROW);
  } while (Math.abs(angle) < st.tol);
  return angle * len;
}

/** The smallest eigenvectors, probably of eigenvalue 0: no power iteration. */
function fillNullSpace(st: PowerState, from: number, neigs: number): void {
  for (let i = from; i < neigs; i++) {
    const len = guess(st, i);
    vectorsScalarMult(st.n, st.eigs[i]!, 1.0 / len, st.eigs[i]!);
    st.evals[i] = 0;
  }
}

/** Sort the vectors by their evals, for overcoming possible mis-convergence. */
function sortByEval(st: PowerState, neigs: number): void {
  const { n, eigs, evals, tmpVec } = st;
  for (let i = 0; i < neigs - 1; i++) {
    let largestIndex = i;
    let largestEval = evals[largestIndex]!;
    for (let j = i + 1; j < neigs; j++) {
      if (largestEval < evals[j]!) {
        largestIndex = j;
        largestEval = evals[largestIndex]!;
      }
    }
    if (largestIndex !== i) { // exchange eigenvectors
      copyVector(n, eigs[i]!, tmpVec);
      copyVector(n, eigs[largestIndex]!, eigs[i]!);
      copyVector(n, tmpVec, eigs[largestIndex]!);
      evals[largestIndex] = evals[i]!;
      evals[i] = largestEval;
    }
  }
}

/**
 * Compute the `neigs` top eigenvectors of `mat` by power iteration. Returns
 * false when the last iteration ran out of iterations.
 * @see lib/neatogen/matrix_ops.c:power_iteration
 */
export function powerIteration(
  mat: readonly Float64Array[], n: number, neigsIn: number, eigs: readonly Float64Array[],
): boolean {
  const neigs = neigsIn >= n ? n : neigsIn;
  const st: PowerState = {
    mat, n, eigs, evals: new Float64Array(neigs),
    tmpVec: new Float64Array(n), lastVec: new Float64Array(n),
    maxIterations: 30 * n, tol: 1 - P_ITERATION_THRESHOLD, iteration: 0,
  };
  let i = 0;
  for (; i < neigs; i++) {
    let len = guess(st, i);
    while (len < POWER_LENGTH_FLOOR) len = guess(st, i); // a vector colinear with previous ones
    vectorsScalarMult(n, eigs[i]!, 1.0 / len, eigs[i]!);
    const rayleigh = iterate(st, i);
    if (rayleigh === null) break; // goto exit
    st.evals[i] = rayleigh;
  }
  fillNullSpace(st, i, neigs);
  sortByEval(st, neigs);
  return st.iteration <= st.maxIterations;
}
