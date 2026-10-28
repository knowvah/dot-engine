// SPDX-License-Identifier: EPL-2.0

/**
 * Float32 vector/matrix helpers for the stress kernel. C computes
 * these in 32-bit float (FLT_EVAL_METHOD 0); every chained float
 * operation is rounded with Math.fround. Single binary ops stored
 * into Float32Array round identically to C without an explicit
 * fround (no double-rounding for one op on f32 operands).
 *
 * @see lib/neatogen/matrix_ops.c
 */

import { crand } from '../../common/crand.js';
import { fma } from '../../common/fma.js';
import type { VtxData } from './dijkstra.js';

const fr = Math.fround;

/** Subtract the mean (double precision). @see matrix_ops.c:orthog1 */
export function orthog1(n: number, vec: Float64Array): void {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += vec[i]!;
  sum /= n;
  for (let i = 0; i < n; i++) vec[i] = vec[i]! - sum;
}

/** Subtract the mean (float precision). @see matrix_ops.c:orthog1f */
export function orthog1f(n: number, vec: Float32Array): void {
  let sum = fr(0);
  for (let i = 0; i < n; i++) sum = fr(sum + vec[i]!);
  sum = fr(sum / n);
  for (let i = 0; i < n; i++) vec[i] = vec[i]! - sum;
}

/**
 * result = packed_matrix * vector, packed upper-triangular symmetric.
 * @see matrix_ops.c:right_mult_with_vector_ff
 */
export function rightMultWithVectorFF(
  m: Float32Array, n: number, vector: Float32Array, result: Float32Array,
): void {
  for (let i = 0; i < n; i++) result[i] = 0;
  let index = 0;
  for (let i = 0; i < n; i++) {
    const vi = vector[i]!;
    let res = fr(m[index++]! * vi);
    for (let j = i + 1; j < n; j++, index++) {
      res = fr(res + fr(m[index]! * vector[j]!));
      result[j] = result[j]! + fr(m[index]! * vi);
    }
    result[i] = result[i]! + res;
  }
}

/** result = v1 - v2. @see matrix_ops.c:vectors_subtractionf */
export function vectorsSubtractionF(
  n: number, v1: Float32Array, v2: Float32Array, result: Float32Array,
): void {
  for (let i = 0; i < n; i++) result[i] = v1[i]! - v2[i]!;
}

/** v1 += alpha * v2 (float alpha). @see matrix_ops.c:vectors_mult_additionf */
export function vectorsMultAdditionF(
  n: number, v1: Float32Array, alpha: number, v2: Float32Array,
): void {
  const a = fr(alpha);
  for (let i = 0; i < n; i++) v1[i] = v1[i]! + fr(a * v2[i]!);
}

/** Double-precision dot product of float vectors. @see matrix_ops.c:vectors_inner_productf */
export function vectorsInnerProductF(n: number, v1: Float32Array, v2: Float32Array): number {
  let result = 0;
  for (let i = 0; i < n; i++) result += fr(v1[i]! * v2[i]!);
  return result;
}

/** @see matrix_ops.c:copy_vectorf */
export function copyVectorF(n: number, src: Float32Array, dst: Float32Array): void {
  for (let i = 0; i < n; i++) dst[i] = src[i]!;
}

/** @see matrix_ops.c:max_absf */
export function maxAbsF(n: number, vec: Float32Array): number {
  let max = fr(-1e30);
  for (let i = 0; i < n; i++) {
    const a = fr(Math.abs(vec[i]!));
    if (a > max) max = a;
  }
  return max;
}

/** @see matrix_ops.c:square_vec */
export function squareVec(n: number, vec: Float32Array): void {
  for (let i = 0; i < n; i++) vec[i] = vec[i]! * vec[i]!;
}

/** @see matrix_ops.c:invert_vec */
export function invertVec(n: number, vec: Float32Array): void {
  for (let i = 0; i < n; i++) {
    if (vec[i] !== 0) vec[i] = 1 / vec[i]!;
  }
}

/** target = sqrtf(source) where source >= 0. @see matrix_ops.c:sqrt_vecf */
export function sqrtVecF(n: number, source: Float32Array, target: Float32Array): void {
  for (let i = 0; i < n; i++) {
    if (source[i]! >= 0) target[i] = fr(Math.sqrt(source[i]!));
  }
}

/** vec = 1/sqrtf(vec) where vec > 0. @see matrix_ops.c:invert_sqrt_vec */
export function invertSqrtVec(n: number, vec: Float32Array): void {
  for (let i = 0; i < n; i++) {
    if (vec[i]! > 0) vec[i] = 1 / fr(Math.sqrt(vec[i]!));
  }
}

// ---------------------------------------------------------------------------
// Double-precision helpers (vectors_inner_product, scadd, norm, ...).
//
// The 16.1 oracle is built `-O3 -flto=thin` for arm64, so each helper is
// inlined into every call site and compiled there on its own: a vectorized
// reduction rounds the products of its leading `block * floor(n / block)`
// elements before the in-order adds (no reassociation is allowed), while its
// scalar remainder (or a whole scalar loop) contracts `acc += a * b` to fmadd.
// The block width is therefore a property of the call site; callers pass it,
// named after the site, and `BLOCK_NONE` stands for a plain scalar loop.
// Elementwise `x += a * b` (scadd) is fmadd/fmla in every shape.
// ---------------------------------------------------------------------------

/** Block width of a call site compiled as a scalar loop (all fmadd). */
export const BLOCK_NONE = 1;

/**
 * Sum of `a[i] * b[i]` over `n` terms, the first `block * floor(n / block)`
 * unfused and the rest fused, as the oracle's inlined copy of the site.
 * @see lib/neatogen/matrix_ops.c:vectors_inner_product
 */
export function innerProduct(n: number, v1: Float64Array, v2: Float64Array, block: number): number {
  let result = 0;
  const blocked = block === BLOCK_NONE ? 0 : n - (n % block);
  let i = 0;
  for (; i < blocked; i++) result += v1[i]! * v2[i]!;
  for (; i < n; i++) result = fma(v1[i]!, v2[i]!, result);
  return result;
}

/** vec1[0..end] += fac * vec2[0..end] (fmadd). @see lib/neatogen/matrix_ops.c:scadd */
export function scadd(vec1: Float64Array, end: number, fac: number, vec2: Float64Array): void {
  for (let i = 0; i <= end; i++) vec1[i] = fma(fac, vec2[i]!, vec1[i]!);
}

/** 2-norm of vec[0..end]. @see lib/neatogen/matrix_ops.c:norm */
export function norm(vec: Float64Array, end: number, block: number): number {
  return Math.sqrt(innerProduct(end + 1, vec, vec, block));
}

/** result = vector * alpha (aliasing allowed). @see lib/neatogen/matrix_ops.c:vectors_scalar_mult */
export function vectorsScalarMult(
  n: number, vector: Float64Array, alpha: number, result: Float64Array,
): void {
  for (let i = 0; i < n; i++) result[i] = vector[i]! * alpha;
}

/** dest = source. @see lib/neatogen/matrix_ops.c:copy_vector */
export function copyVector(n: number, source: Float64Array, dest: Float64Array): void {
  for (let i = 0; i < n; i++) dest[i] = source[i]!;
}

/** result = v1 + v2 (aliasing allowed). @see lib/neatogen/matrix_ops.c:vectors_addition */
export function vectorsAddition(
  n: number, v1: Float64Array, v2: Float64Array, result: Float64Array,
): void {
  for (let i = 0; i < n; i++) result[i] = v1[i]! + v2[i]!;
}

/** result = v1 - v2 (aliasing allowed). @see lib/neatogen/matrix_ops.c:vectors_subtraction */
export function vectorsSubtraction(
  n: number, v1: Float64Array, v2: Float64Array, result: Float64Array,
): void {
  for (let i = 0; i < n; i++) result[i] = v1[i]! - v2[i]!;
}

/** Largest |vector[i]| (start -1e50). @see lib/neatogen/matrix_ops.c:max_abs */
export function maxAbs(n: number, vector: Float64Array): number {
  let maxVal = -1e50;
  for (let i = 0; i < n; i++) {
    const a = Math.abs(vector[i]!);
    if (a > maxVal) maxVal = a; // fmax: a NaN operand is ignored, as `>` does
  }
  return maxVal;
}

/**
 * result = matrix * vector for an n x n float** matrix and double vector;
 * each row's reduction is blocked as the call site was compiled.
 * @see lib/neatogen/matrix_ops.c:right_mult_with_vector_f
 */
export function rightMultWithVectorF(
  matrix: readonly Float32Array[], n: number, vector: Float64Array, result: Float64Array,
  block: number,
): void {
  const blocked = block === BLOCK_NONE ? 0 : n - (n % block);
  for (let i = 0; i < n; i++) {
    const row = matrix[i]!;
    let res = 0;
    let j = 0;
    for (; j < blocked; j++) res += row[j]! * vector[j]!;
    for (; j < n; j++) res = fma(row[j]!, vector[j]!, res);
    result[i] = res;
  }
}

/**
 * result = matrix * vector over the sparse `vtx_data` rows (`ewgts` weights).
 * The loop is scalar in the oracle: every term is an fmadd.
 * @see lib/neatogen/matrix_ops.c:right_mult_with_vector
 */
export function rightMultWithVector(
  matrix: VtxData[], n: number, vector: Float64Array, result: Float64Array,
): void {
  for (let i = 0; i < n; i++) {
    let res = 0;
    const row = matrix[i]!;
    for (let j = 0; j < row.nedges; j++) res = fma(row.ewgts[j]!, vector[row.edges[j]!]!, res);
    result[i] = res;
  }
}

/** `#define RANGE` @see lib/neatogen/matrix_ops.c */
const RANGE = 500;

/**
 * `vec[i] = rand() % RANGE`, then orthogonalize against 1.
 * @see lib/neatogen/matrix_ops.c:init_vec_orth1
 */
export function initVecOrth1(n: number, vec: Float64Array): void {
  for (let i = 0; i < n; i++) vec[i] = crand() % RANGE;
  orthog1(n, vec);
}
