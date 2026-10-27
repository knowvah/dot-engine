// SPDX-License-Identifier: EPL-2.0

/**
 * Port of neatogen/smart_ini_x.c: `IMDS_given_dim`, which finds the second
 * coordinate of a hierarchical layout given the first. The inner products of
 * this file are inlined by the 16.1 arm64 `-O3 -flto=thin` build at each call
 * site, so every site carries its own unfused block width (see matrix-ops.ts);
 * the constants below name them.
 *
 * @see lib/neatogen/smart_ini_x.c
 */

import { crand } from '../../common/crand.js';
import { fma } from '../../common/fma.js';
import { conjugateGradientF } from './conjgrad.js';
import type { VtxData } from './dijkstra.js';
import { computeApsp } from './kkutils.js';
import {
  BLOCK_NONE,
  copyVector,
  innerProduct,
  norm,
  scadd,
  vectorsScalarMult,
} from './matrix-ops.js';

const fr = Math.fround;

/** `#define SCALE_FACTOR` @see lib/neatogen/smart_ini_x.c */
const SCALE_FACTOR = 256;

/** `DBL_EPSILON` @see float.h */
const DBL_EPSILON = 2.220446049250313e-16;

/** The `len < 1e-10` colinearity / null-space test of power iteration. */
const POWER_LENGTH_FLOOR = 1e-10;

/**
 * Unfused block widths per inlined call site of the 16.1 arm64 `-O3 -flto=thin`
 * build (`BLOCK_NONE` = plain scalar loop). Calibrated bit for bit against the
 * oracle's own libneatogen.a on random DAGs (n = 5..40, 192 graphs): each width
 * was the only one of {1, 4, 8, 16} matching the native intermediate values.
 * Sites inside the eigenvector loops over earlier eigenvectors (j < i) are
 * never reached: CMDS_orthog asks for one eigenvector.
 */

/** standardize: the norm of the centred vector. */
const BLOCK_STANDARDIZE_NORM = 4;
/** mat_mult_vec_orthog: each row of mat * vec. */
const BLOCK_MAT_MULT_ROW = 4;
/** mat_mult_vec_orthog: result . orthog. */
const BLOCK_MAT_MULT_ORTHOG = 8;
/** power iteration: orthog . guess. */
const BLOCK_GUESS_ORTHOG = 8;
/** power iteration: norm of the orthogonalized guess (scalar loop). */
const BLOCK_GUESS_LEN = BLOCK_NONE;
/** power iteration: norm inside the iteration (scalar loop). */
const BLOCK_LOOP_LEN = BLOCK_NONE;
/** power iteration: curr . last. */
const BLOCK_ANGLE = 8;
/**
 * IMDS_given_dim: the sum1/sum2 loops. The disassembly shows a 16-wide body
 * and a 4-wide epilogue; on the harness data 4 and a scalar loop agree.
 */
const BLOCK_UNIFORM_SUMS = 4;
/** compute_avgs: sums of squared int distances (exact below 2^26, so unobservable). */
const BLOCK_AVGS = 4;

/** Dense float matrix (`float **`), one `Float32Array` per row. */
type FloatMatrix = Float32Array[];

/**
 * Centre `orthog` and scale it to unit length (left alone when degenerate).
 * @see lib/neatogen/smart_ini_x.c:standardize
 */
function standardize(orthog: Float64Array, nvtxs: number): void {
  let avg = 0;
  for (let i = 0; i < nvtxs; i++) avg += orthog[i]!;
  avg /= nvtxs;

  /* centralize: */
  for (let i = 0; i < nvtxs; i++) orthog[i] = orthog[i]! - avg;

  /* normalize: */
  const len = norm(orthog, nvtxs - 1, BLOCK_STANDARDIZE_NORM);

  // if we have a degenerate length, do not attempt to scale by it
  if (Math.abs(len) < DBL_EPSILON) return;

  vectorsScalarMult(nvtxs, orthog, 1.0 / len, orthog);
}

/**
 * result = (I - orthog orthog^T) mat vec, `mat` being dim1 x dim2.
 * @see lib/neatogen/smart_ini_x.c:mat_mult_vec_orthog
 */
function matMultVecOrthog(
  mat: FloatMatrix,
  dim: number,
  vec: Float64Array,
  result: Float64Array,
  orthog: Float64Array,
): void {
  /* computes mat*vec, where mat is a dim*dim matrix */
  const blocked = dim - (dim % BLOCK_MAT_MULT_ROW);
  for (let i = 0; i < dim; i++) {
    const row = mat[i]!;
    let sum = 0;
    let j = 0;
    for (; j < blocked; j++) sum += row[j]! * vec[j]!;
    for (; j < dim; j++) sum = fma(row[j]!, vec[j]!, sum);
    result[i] = sum;
  }
  const alpha = -innerProduct(dim, result, orthog, BLOCK_MAT_MULT_ORTHOG);
  scadd(result, dim - 1, alpha, orthog);
}

/** Inputs of power iteration shared by its phases. */
interface PowerIteration {
  mat: FloatMatrix;
  n: number;
  eigs: Float64Array[];
  evals: Float64Array;
  orthog: Float64Array;
}

/**
 * Orthogonalize `vec` against the first `count` eigenvectors.
 * @see lib/neatogen/smart_ini_x.c:power_iteration_orthog
 */
function orthogonalizeAgainstEigs(
  p: PowerIteration,
  vec: Float64Array,
  count: number,
  block: number,
): void {
  for (let j = 0; j < count; j++) {
    const alpha = -innerProduct(p.n, p.eigs[j]!, vec, block);
    scadd(vec, p.n - 1, alpha, p.eigs[j]!);
  }
}

/**
 * Guess the i-th eigenvector (`choose:` in C): random, orthogonal to `orthog`
 * and the earlier eigenvectors, normalized; retried while nearly colinear.
 * @see lib/neatogen/smart_ini_x.c:power_iteration_orthog
 */
function chooseStartVector(p: PowerIteration, i: number): void {
  const curr = p.eigs[i]!;
  for (;;) {
    for (let j = 0; j < p.n; j++) curr[j] = crand() % 100;
    const alpha = -innerProduct(p.n, p.orthog, curr, BLOCK_GUESS_ORTHOG);
    scadd(curr, p.n - 1, alpha, p.orthog);
    // orthogonalize against higher eigenvectors
    orthogonalizeAgainstEigs(p, curr, i, BLOCK_NONE);
    const len = norm(curr, p.n - 1, BLOCK_GUESS_LEN);
    if (len < POWER_LENGTH_FLOOR) continue; // colinear with previous ones: goto choose
    vectorsScalarMult(p.n, curr, 1.0 / len, curr);
    return;
  }
}

/** Result of one eigenvector's power iteration. */
interface IterationResult {
  /** true when the null space was reached (C `goto exit`). */
  nullSpace: boolean;
  eval: number;
}

/**
 * Iterate `curr` to the dominant eigenvector (`do { } while` in C).
 * @see lib/neatogen/smart_ini_x.c:power_iteration_orthog
 */
function iterateEigenvector(
  p: PowerIteration,
  i: number,
  tol: number,
  work: { tmp: Float64Array; last: Float64Array },
): IterationResult {
  const curr = p.eigs[i]!;
  for (;;) {
    copyVector(p.n, curr, work.last);
    matMultVecOrthog(p.mat, p.n, curr, work.tmp, p.orthog);
    copyVector(p.n, work.tmp, curr);
    /* orthogonalize against higher eigenvectors */
    orthogonalizeAgainstEigs(p, curr, i, BLOCK_NONE);
    const len = norm(curr, p.n - 1, BLOCK_LOOP_LEN);
    if (len < POWER_LENGTH_FLOOR) {
      /* We have reached the null space (e.vec. associated with e.val. 0) */
      return { nullSpace: true, eval: 0 };
    }
    vectorsScalarMult(p.n, curr, 1.0 / len, curr);
    const angle = innerProduct(p.n, curr, work.last, BLOCK_ANGLE);
    if (!(Math.abs(angle) < tol)) {
      /* the Rayleigh quotient (up to errors due to orthogonalization) */
      return { nullSpace: false, eval: angle * len };
    }
  }
}

/**
 * Remaining eigenvectors, probably of eigenvalue 0, for which power
 * iteration is dangerous: random, orthogonalized, normalized, eval 0.
 * @see lib/neatogen/smart_ini_x.c:power_iteration_orthog
 */
function fillNullSpaceEigenvectors(p: PowerIteration, from: number, neigs: number): void {
  for (let i = from; i < neigs; i++) {
    const curr = p.eigs[i]!;
    /* guess the i-th eigen vector */
    for (let j = 0; j < p.n; j++) curr[j] = crand() % 100;
    /* orthogonalize against higher eigenvectors */
    orthogonalizeAgainstEigs(p, curr, i, BLOCK_NONE);
    const len = norm(curr, p.n - 1, BLOCK_NONE);
    vectorsScalarMult(p.n, curr, 1.0 / len, curr);
    p.evals[i] = 0;
  }
}

/**
 * Sort the vectors by decreasing eigenvalue, against possible mis-convergence.
 * @see lib/neatogen/smart_ini_x.c:power_iteration_orthog
 */
function sortEigenvectors(p: PowerIteration, neigs: number, tmp: Float64Array): void {
  for (let i = 0; i < neigs - 1; i++) {
    let largestIndex = i;
    let largestEval = p.evals[largestIndex]!;
    for (let j = i + 1; j < neigs; j++) {
      if (largestEval < p.evals[j]!) {
        largestIndex = j;
        largestEval = p.evals[largestIndex]!;
      }
    }
    if (largestIndex !== i) { // exchange eigenvectors:
      copyVector(p.n, p.eigs[i]!, tmp);
      copyVector(p.n, p.eigs[largestIndex]!, p.eigs[i]!);
      copyVector(p.n, tmp, p.eigs[largestIndex]!);

      p.evals[largestIndex] = p.evals[i]!;
      p.evals[i] = largestEval;
    }
  }
}

/**
 * Power iteration with (I - orthog orthog^T) mat (I - orthog orthog^T).
 * @see lib/neatogen/smart_ini_x.c:power_iteration_orthog
 */
function powerIterationOrthog(
  p: PowerIteration,
  neigsIn: number,
  pIterationThreshold: number,
): void {
  const work = { tmp: new Float64Array(p.n), last: new Float64Array(p.n) };
  const tol = 1 - pIterationThreshold;
  const neigs = neigsIn >= p.n ? p.n : neigsIn;

  let i = 0;
  for (; i < neigs; i++) {
    chooseStartVector(p, i);
    const res = iterateEigenvector(p, i, tol, work);
    if (res.nullSpace) break; // goto exit (i is not advanced)
    p.evals[i] = res.eval;
  }
  fillNullSpaceEigenvectors(p, i, neigs);
  sortEigenvectors(p, neigs, work.tmp);
}

/**
 * Row and overall averages of the squared distances, as floats.
 * @see lib/neatogen/smart_ini_x.c:compute_avgs
 */
function computeAvgs(Dij: Int32Array[], n: number): { rowAvg: Float32Array; allAvg: number } {
  const rowAvg = new Float32Array(n);
  let sum = 0;
  const blocked = n - (n % BLOCK_AVGS);

  for (let i = 0; i < n; i++) {
    let sumRow = 0;
    const row = Dij[i]!;
    let j = 0;
    for (; j < blocked; j++) {
      sum += row[j]! * row[j]!;
      sumRow += row[j]! * row[j]!;
    }
    for (; j < n; j++) {
      sum = fma(row[j]!, row[j]!, sum);
      sumRow = fma(row[j]!, row[j]!, sumRow);
    }
    rowAvg[i] = fr(fr(sumRow) / n);
  }
  return { rowAvg, allAvg: fr(fr(sum) / (n * n)) };
}

/**
 * The double-centred squared-distance matrix, as floats.
 * @see lib/neatogen/smart_ini_x.c:compute_Bij
 */
function computeBij(Dij: Int32Array[], n: number): FloatMatrix {
  const Bij: FloatMatrix = [];
  for (let i = 0; i < n; i++) Bij.push(new Float32Array(n));

  const { rowAvg, allAvg } = computeAvgs(Dij, n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      // -(float)D*D + row_avg[i] contracts to fmsub (float), then two float ops
      const fD = fr(Dij[i]![j]!);
      const t = fr(fma(-fD, fD, rowAvg[i]!));
      Bij[i]![j] = fr(fr(t + rowAvg[j]!) - allAvg);
      Bij[j]![i] = Bij[i]![j]!;
    }
  }
  return Bij;
}

/**
 * Classical MDS in one dimension, orthogonal to `orthog`.
 * @see lib/neatogen/smart_ini_x.c:CMDS_orthog
 */
function cmdsOrthog(
  n: number,
  dim: number,
  eigs: Float64Array[],
  tol: number,
  input: { orthog: Float64Array; Dij: Int32Array[] },
): void {
  const { orthog, Dij } = input;
  const Bij = computeBij(Dij, n);
  const evals = new Float64Array(dim);

  const orthogAux = Float64Array.from(orthog.subarray(0, n));
  standardize(orthogAux, n);
  powerIterationOrthog({ mat: Bij, n, eigs, evals, orthog: orthogAux }, dim, tol);

  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < n; j++) eigs[i]![j] = eigs[i]![j]! * Math.sqrt(Math.abs(evals[i]!));
  }
}

/**
 * Scale `x` so that distances along it best fit the ideal ones; returns the
 * scale (`uniLength`, 0 when the sums overflow).
 * @see lib/neatogen/smart_ini_x.c:IMDS_given_dim
 */
function scaleGivenCoords(Dij: Int32Array[], n: number, x: Float64Array): number {
  let sum1 = 0;
  let sum2 = 0;
  for (let i = 1; i < n; i++) {
    const blocked = i - (i % BLOCK_UNIFORM_SUMS);
    for (let j = 0; j < i; j++) {
      const d = Dij[i]![j]!;
      const f = Math.abs(x[i]! - x[j]!);
      const t1 = 1.0 / d;
      const t2 = (1.0 / Math.imul(d, d)) * f;
      if (j < blocked) {
        sum1 += t1 * f;
        sum2 += t2 * f;
      } else {
        sum1 = fma(t1, f, sum1);
        sum2 = fma(t2, f, sum2);
      }
    }
  }
  const uniLength = Math.abs(sum2) === Infinity ? 0 : sum1 / sum2;
  for (let i = 0; i < n; i++) x[i] = x[i]! * uniLength;
  return uniLength;
}

/**
 * The Laplacian of the weights w_ij = 1 / D_ij^2, as floats.
 * @see lib/neatogen/smart_ini_x.c:IMDS_given_dim
 */
function computeLaplacian(Dij: Int32Array[], n: number): FloatMatrix {
  const lap: FloatMatrix = [];
  for (let i = 0; i < n; i++) {
    const row = new Float32Array(n);
    let degree = fr(0);
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const w = fr(fr(-1.0) / fr(fr(Dij[i]![j]!) * fr(Dij[i]![j]!))); // w_{ij}
      row[j] = w;
      degree = fr(degree - w);
    }
    row[i] = degree;
    lap.push(row);
  }
  return lap;
}

/**
 * Replace the distances by their residuals after removing the x component.
 * @see lib/neatogen/smart_ini_x.c:IMDS_given_dim
 */
function computeResidualDistances(Dij: Int32Array[], n: number, x: Float64Array): void {
  for (let i = 1; i < n; i++) {
    const posI = x[i]!;
    for (let j = 0; j < i; j++) {
      const t = posI - x[j]!;
      const d = Dij[i]![j]!;
      const diff = fma(d, d, -(t * t));
      const v = diff > 0 ? Math.sqrt(diff) : 0;
      Dij[i]![j] = v;
      Dij[j]![i] = v;
    }
  }
}

/**
 * One entry of the balance vector: sum_j sign * delta_ij * w_ij, the sign
 * following the order of y_i and y_j.
 * @see lib/neatogen/smart_ini_x.c:IMDS_given_dim
 */
function balanceOf(i: number, n: number, y: Float64Array, ctx: BalanceCtx): number {
  const posI = y[i]!;
  let b = 0;
  for (let j = 0; j < n; j++) {
    if (j === i) continue;
    const term = fr(fr(ctx.Dij[i]![j]!) * -ctx.lap[i]![j]!); // w_{ij}*delta_{ij}
    if (posI >= y[j]!) b += term;
    else b -= term;
  }
  return b;
}

/** Distances and Laplacian read by {@link balanceOf}. */
interface BalanceCtx {
  Dij: Int32Array[];
  lap: FloatMatrix;
}

/**
 * Alternate conjugate gradient and balance updates until the balance is stable.
 * Returns 1 when conjugate gradient fails (C tests `< 0`, which it never is).
 * @see lib/neatogen/smart_ini_x.c:IMDS_given_dim
 */
function solveBalanced(
  ctx: BalanceCtx,
  n: number,
  y: Float64Array,
  balance: Float64Array,
  convTol: number,
): 0 | 1 {
  let converged = false;
  for (let iterations2 = 0; iterations2 < 200 && !converged; iterations2++) {
    if (conjugateGradientF(ctx.lap, y, balance, n, { tol: convTol, maxIterations: n, ortho1: true }) < 0) return 1;
    converged = true;
    for (let i = 0; i < n; i++) {
      const b = balanceOf(i, n, y, ctx);
      if (b !== balance[i] && Math.abs(1 - b / balance[i]!) > 1e-5) {
        converged = false;
        balance[i] = b;
      }
    }
  }
  return 0;
}

/**
 * Compute `newCoords` (y) given `givenCoords` (x) for a hierarchical layout;
 * `givenCoords` is rescaled in place and restored at the end. Returns 1 when
 * conjugate gradient fails.
 * @see lib/neatogen/smart_ini_x.c:IMDS_given_dim
 */
export function imdsGivenDim(
  graph: VtxData[],
  n: number,
  givenCoords: Float64Array,
  newCoords: Float64Array,
  conjTol: number,
): 0 | 1 {
  const x = givenCoords;
  const y = newCoords;
  const Dij = computeApsp(graph, n);

  /* scaling up the distances to enable an 'sqrt' operation later
   * (in case distances are integers) */
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) Dij[i]![j] = Dij[i]![j]! * SCALE_FACTOR;
  }

  const uniLength = scaleGivenCoords(Dij, n, x);

  /* smart ini: */
  cmdsOrthog(n, 1, [y], conjTol, { orthog: x, Dij });

  /* Compute Laplacian: */
  const lap = computeLaplacian(Dij, n);

  /* compute residual distances */
  computeResidualDistances(Dij, n, x);

  /* Compute the balance vector: */
  const ctx: BalanceCtx = { Dij, lap };
  const balance = new Float64Array(n);
  for (let i = 0; i < n; i++) balance[i] = balanceOf(i, n, y, ctx);

  if (solveBalanced(ctx, n, y, balance, conjTol) === 1) return 1;

  for (let i = 0; !(Math.abs(uniLength) < DBL_EPSILON) && i < n; i++) {
    x[i] = x[i]! / uniLength;
    y[i] = y[i]! / uniLength;
  }
  return 0;
}
