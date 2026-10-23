// SPDX-License-Identifier: EPL-2.0

/**
 * Dense k-D stress majorization under hierarchy constraints (`mode=hier`):
 * partitions the nodes into levels (compute_y_coords + compute_hierarchy),
 * then runs the majorization loop, solving the y axis by constrained
 * majorization (quadratic programming over the levels) and every other axis
 * by conjugate gradient.
 *
 * `Verbose` timing and `fprintf` lines are not ported (the port has no Verbose).
 * The C function takes nine parameters; the trailing scalars travel as
 * {@link HierarchyOpts} to stay within the five-parameter limit.
 *
 * @see lib/neatogen/constrained_majorization.c
 */

import { RenderError } from '../../errors.js';
import type { Node } from '../../model/node.js';
import { conjugateGradientMkernelFused, rightMultWithVectorFFFused } from './conjgrad-mkernel.js';
import { computeHierarchy, type Hierarchy } from './compute-hierarchy.js';
import type { VtxData } from './dijkstra.js';
import { MODEL_CIRCUIT, MODEL_MDS, MODEL_SUBSET } from './init.js';
import {
  fma, invertSqrtVec, invertVec, orthog1, sqrtVecF, squareVec, vectorsInnerProductF,
} from './matrix-ops.js';
import type { DirectedVtxData } from './opt-arrangement.js';
import { computeYCoords } from './opt-arrangement.js';
import {
  constrainedMajorizationNewWithGaps, initConstrainedMajorization, type CMajEnv,
} from './quad-prog-solve.js';
import { imdsGivenDim } from './smart-ini-x.js';
import {
  computeApspPacked, computeWeightedApspPacked, initLayout, stressMajorizationKDMkernel,
} from './stress-kernel.js';
import { mdsModel, OPT_SMART_INIT, TOLERANCE_CG } from './stress.js';

const fr = Math.fround;

/** `#define localConstrMajorIterations` @see lib/neatogen/constrained_majorization.c */
const LOCAL_CONSTR_MAJOR_ITERATIONS = 15;
/** `#define levels_sep_tol` @see lib/neatogen/constrained_majorization.c */
const LEVELS_SEP_TOL = 1e-1;
/** `abs_tol`: gaps smaller than this are noise. @see lib/neatogen/constrained_majorization.c */
const ABS_TOL = 1e-2;
/** Iteration cap of the (dim-1)-D layout that seeds dim > 2. */
const SUBSPACE_ITERATIONS = 15;
/** `FLT_MAX` @see float.h */
const FLT_MAX = 3.4028234663852886e38;
/** `DBL_MAX` @see float.h */
const DBL_MAX = Number.MAX_VALUE;
/** Level count below which there is no hierarchy to impose. */
const MIN_LEVELS = 1;
/** The y axis, solved by quadratic programming. */
const Y_AXIS = 1;

/** The scalar parameters of `stress_majorization_with_hierarchy`. */
export interface HierarchyOpts {
  /** Dimensionality of the layout. */
  dim: number;
  /** `opt_*` bits. */
  opts: number;
  /** `MODEL_*` (neato.h values). */
  model: number;
  /** Maximum number of iterations. */
  maxi: number;
  /** Minimum separation of consecutive levels (`levelsgap`). */
  levelsGap: number;
  /** The `Epsilon` global: convergence tolerance (`epsilon` attribute). */
  epsilon: number;
}

/** The scalar parameters of `stress_majorization_kD_mkernel`. */
interface KdOpts {
  dim: number;
  opts: number;
  model: number;
  maxi: number;
  epsilon: number;
}

/** Throw where C runs a distance model or initialisation this port does not have. */
function unsupported(what: string): never {
  throw new RenderError(`hierarchical stress majorization: ${what} is not supported yet`, 'UNSUPPORTED_FEATURE');
}

/**
 * Distance model dispatch shared by both drivers: the MDS model is ported
 * (`mdsModel`, `null` when the graph has no lengths); the subset and circuit
 * models need C helpers that are not ported (AD-6, stop 12) and stay loud.
 * @see lib/neatogen/stress.c:stress_majorization_kD_mkernel
 * @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
 */
function modelDistances(graph: VtxData[], n: number, model: number): Float32Array | null {
  if (model === MODEL_SUBSET) unsupported('the subset distance model');
  if (model === MODEL_CIRCUIT) unsupported('the circuit distance model');
  return model === MODEL_MDS ? mdsModel(graph, n) : null;
}

/**
 * `stress_majorization_kD_mkernel`: the distance matrix per model, then the
 * ported kernel. C takes `smart_ini` through `sparse_stress_subspace_majorization_kD`,
 * which is not ported.
 * @see lib/neatogen/stress.c:stress_majorization_kD_mkernel
 */
function unconstrainedMajorization(
  graph: VtxData[], n: number, dCoords: Float64Array[], nodes: Node[], o: KdOpts,
): number {
  if (o.maxi < 0) return 0;
  const weighted = (graph[0]?.ewgts.length ?? 0) > 0;
  const Dij = modelDistances(graph, n, o.model)
    ?? (weighted ? computeWeightedApspPacked(graph, n) : computeApspPacked(graph, n));
  if ((o.opts & OPT_SMART_INIT) !== 0 && n > 1) unsupported('the smart initial layout');
  return stressMajorizationKDMkernel(Dij, n, dCoords, nodes, {
    dim: o.dim, opts: o.opts, maxi: o.maxi, epsilon: o.epsilon,
  });
}

/**
 * Does any edge carry a direction? (`edists` absent, or all zero, means none.)
 * @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
 */
function hasDirectionality(graph: DirectedVtxData[], n: number): boolean {
  if (!graph[0]?.edists) return false;
  let directionalityExist = false;
  for (let i = 0; i < n; i++) {
    const edists = graph[i]!.edists;
    for (let j = 1; j < graph[i]!.nedges; j++) {
      directionalityExist ||= edists![j] !== 0;
    }
  }
  return directionalityExist;
}

/**
 * Push the levels apart: each level moves up by the shortfall to `levelsGap`.
 * @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
 */
function separateLevels(y: Float64Array, h: Hierarchy, n: number, levelsGap: number): void {
  const { ordering, levels, numLevels } = h;
  let displacement = 0;
  for (let i = 0; i < numLevels; i++) {
    const shortfall = levelsGap - (y[ordering[levels[i]!]!]! + displacement - y[ordering[levels[i]! - 1]!]!);
    displacement += 0 > shortfall ? 0 : shortfall; // C MAX(a, b): `a > b ? a : b`
    const stop = i < numLevels - 1 ? levels[i + 1]! : n;
    for (let j = levels[i]!; j < stop; j++) y[ordering[j]!]! += displacement;
  }
}

/**
 * The smart-init layering: y from `compute_y_coords`, levels from it, the
 * levels separated, then x from `IMDS_given_dim`. Returns the C return value
 * when the function ends here, else the hierarchy.
 * @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
 */
function smartInitLayers(
  graph: DirectedVtxData[], n: number, dCoords: Float64Array[], nodes: Node[], o: HierarchyOpts,
): Hierarchy | number {
  const { dim } = o;
  if (dim > 2) {
    // the dim==2 case is handled below
    const sub = { dim: dim - 1, opts: o.opts, model: o.model, maxi: SUBSPACE_ITERATIONS, epsilon: o.epsilon };
    if (unconstrainedMajorization(graph, n, dCoords.slice(1), nodes, sub) < 0) return -1;
    // now copy the y-axis into the (dim-1)-axis
    dCoords[dim - 1]!.set(dCoords[1]!.subarray(0, n));
  }
  const x = dCoords[0]!;
  const y = dCoords[1]!;
  if (computeYCoords(graph, n, y, n)) return -1;
  const h = computeHierarchy(graph, n, ABS_TOL, LEVELS_SEP_TOL, y);
  if (h === null) return -1;
  if (h.numLevels < MIN_LEVELS) {
    // no hierarchy found, use faster algorithm
    return unconstrainedMajorization(graph, n, dCoords, nodes, o);
  }
  if (o.levelsGap > 0) separateLevels(y, h, n, o.levelsGap); // ensure the initial layout separates levels
  if (dim === 2 && imdsGivenDim(graph, n, y, x, o.epsilon)) return -1;
  return h;
}

/**
 * Layering without smart init: the ordinary initial layout, levels from
 * `compute_y_coords` (which draws from the libc `rand()` stream).
 * @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
 */
function plainInitLayers(
  graph: DirectedVtxData[], n: number, dCoords: Float64Array[], nodes: Node[], dim: number,
): Hierarchy | number {
  initLayout(n, dim, dCoords, nodes);
  const h = computeHierarchy(graph, n, ABS_TOL, LEVELS_SEP_TOL, null);
  return h === null ? -1 : h;
}

/**
 * Euclidean distance between nodes `i` and `j` in `dim` dimensions.
 * @see lib/neatogen/kkutils.c:distance_kD
 */
function distanceKD(coords: Float64Array[], dim: number, i: number, j: number): number {
  let sum = 0;
  for (let k = 0; k < dim; k++) {
    const d = coords[k]![i]! - coords[k]![j]!;
    sum = fma(d, d, sum);
  }
  return Math.sqrt(sum);
}

/**
 * For numerical stability, scale the layout down (no jiggling: it might
 * conflict with the constraints).
 * @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
 */
function scaleDownLayout(dCoords: Float64Array[], n: number, dim: number): void {
  let max = 1;
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < n; j++) {
      const a = Math.abs(dCoords[i]![j]!);
      if (a > max) max = a; // fmax ignores a NaN operand, as `>` does
    }
  }
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < n; j++) dCoords[i]![j]! *= 10 / max;
  }
}

/**
 * Scale the distances so the layout's average stretch is one.
 * @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
 */
function scaleDistances(Dij: Float32Array, dCoords: Float64Array[], n: number, dim: number): void {
  const length = n + Math.trunc((n * (n - 1)) / 2);
  const sum1 = Math.trunc((n * (n - 1)) / 2);
  let sum2 = 0;
  for (let count = 0, i = 0; i < n - 1; i++) {
    count++; // skip self distance
    for (let j = i + 1; j < n; j++, count++) {
      sum2 += distanceKD(dCoords, dim, i, j) / Dij[count]!;
    }
  }
  const scaleRatio = fr(sum2 / sum1);
  for (let i = 0; i < length; i++) Dij[i] = Dij[i]! * scaleRatio;
}

/**
 * Centre every axis; y is not centred but translated so that `y[0] = 0`.
 * @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
 */
function centerLayout(dCoords: Float64Array[], n: number, dim: number): void {
  for (let i = 0; i < dim; i++) orthog1(n, dCoords[i]!);
  const y0 = dCoords[Y_AXIS]![0]!;
  for (let i = 0; i < n; i++) dCoords[Y_AXIS]![i]! -= y0;
}

/**
 * The row sums of the off-diagonal entries of `lap2`, as the negated degrees.
 * @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
 */
function negatedDegrees(lap2: Float32Array, n: number): Float64Array {
  const degrees = new Float64Array(n);
  for (let i = 0, count = 0; i < n - 1; i++) {
    let degree = 0;
    count++; // skip main diag entry
    for (let j = 1; j < n - i; j++, count++) {
      const val = lap2[count]!;
      degree += val;
      degrees[i + j]! -= val;
    }
    degrees[i]! -= degree;
  }
  return degrees;
}

/**
 * Turn the packed distances into the negated Laplacian `lap2`, in place:
 * off-diagonals `1/d^2`, diagonals minus the row sums.
 * @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
 */
function buildLap2(lap2: Float32Array, n: number): void {
  const lapLength = n + Math.trunc((n * (n - 1)) / 2);
  squareVec(lapLength, lap2);
  invertVec(lapLength, lap2); // off-diagonal entries
  const degrees = negatedDegrees(lap2, n);
  for (let step = n, count = 0, i = 0; i < n; i++, count += step, step--) {
    lap2[count] = degrees[i]!;
  }
}

/** Working storage of the majorization loop. */
interface LoopState {
  n: number;
  dim: number;
  lap1: Float32Array;
  lap2: Float32Array;
  coords: Float32Array[];
  b: Float32Array[];
  tmpCoords: Float32Array;
  distAccumulator: Float32Array;
  degrees: Float64Array;
}

/**
 * Squared distances between node `i` and `i+1..n-1`, summed over the axes,
 * then inverted to `1/d_ij` (zero where undefined or overflowing).
 * @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
 */
function inverseDistances(st: LoopState, i: number, len: number): void {
  const { coords, tmpCoords, distAccumulator } = st;
  distAccumulator.fill(0, 0, st.n);
  for (let k = 0; k < st.dim; k++) {
    const ck = coords[k]!;
    for (let j = 0; j < len; j++) tmpCoords[j] = ck[i]! - ck[i + 1 + j]!;
    for (let j = 0; j < len; j++) tmpCoords[j] = tmpCoords[j]! * tmpCoords[j]!;
    for (let j = 0; j < len; j++) distAccumulator[j] = tmpCoords[j]! + distAccumulator[j]!;
  }
  invertSqrtVec(len, distAccumulator); // convert to 1/d_{ij}
  for (let j = 0; j < len; j++) {
    // detect overflows
    if (distAccumulator[j]! >= FLT_MAX || distAccumulator[j]! < 0) distAccumulator[j] = 0;
  }
}

/**
 * The Laplacian of `1/(d_ij*|p_i-p_j|)` at the current coordinates.
 * @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
 */
function buildLap1(st: LoopState): void {
  const { n, lap1, lap2, degrees, distAccumulator } = st;
  degrees.fill(0);
  sqrtVecF(n + Math.trunc((n * (n - 1)) / 2), lap2, lap1);
  let count = 0;
  for (let i = 0; i < n - 1; i++) {
    const len = n - i - 1;
    inverseDistances(st, i, len);
    count++; // save place for the main diagonal entry
    let degree = 0;
    for (let j = 0; j < len; j++, count++) {
      const val = fr(lap1[count]! * distAccumulator[j]!);
      lap1[count] = val;
      degree += val;
      degrees[i + j + 1]! -= val;
    }
    degrees[i]! -= degree;
  }
  for (let step = n, count2 = 0, i = 0; i < n; i++, count2 += step, step--) {
    lap1[count2] = degrees[i]!;
  }
}

/**
 * The stress at the current coordinates; also leaves `b[k] = lap1*coords[k]`.
 * The Laplacians are negated, so the second sum is subtracted.
 * @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
 */
function computeNewStress(st: LoopState, constantTerm: number): number {
  const { n, dim, lap1, lap2, coords, b, tmpCoords } = st;
  for (let k = 0; k < dim; k++) rightMultWithVectorFFFused(lap1, n, coords[k]!, b[k]!);
  let newStress = 0;
  for (let k = 0; k < dim; k++) newStress += vectorsInnerProductF(n, coords[k]!, b[k]!);
  newStress *= 2;
  newStress += constantTerm; // only after mult by 2
  for (let k = 0; k < dim; k++) {
    rightMultWithVectorFFFused(lap2, n, coords[k]!, tmpCoords);
    newStress -= vectorsInnerProductF(n, coords[k]!, tmpCoords);
  }
  return newStress;
}

/** Everything the loop needs besides its working storage. */
interface SolveCtx {
  cMajEnv: CMajEnv;
  levelsGap: number;
  maxi: number;
  epsilon: number;
}

/**
 * Optimise `trace(X'LX)+X'B` per axis: constrained majorization in y, conjugate
 * gradient elsewhere. Returns true when conjugate gradient fails.
 * @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
 */
function solveAxes(st: LoopState, ctx: SolveCtx): boolean {
  for (let k = 0; k < st.dim; k++) {
    if (k === Y_AXIS) {
      // use quad solver in the y-dimension
      constrainedMajorizationNewWithGaps(
        ctx.cMajEnv, st.b[k]!, st.coords, k, LOCAL_CONSTR_MAJOR_ITERATIONS, ctx.levelsGap,
      );
    } else if (conjugateGradientMkernelFused(st.lap2, st.coords[k]!, st.b[k]!, st.n, { tol: TOLERANCE_CG, maxIterations: st.n })) {
      // use conjugate gradient for all dimensions except y
      return true;
    }
  }
  return false;
}

/**
 * The majorization loop. Returns the iteration count, or -1 when conjugate
 * gradient failed (coordinates are then not written back).
 * @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
 */
function majorize(st: LoopState, ctx: SolveCtx, dCoords: Float64Array[]): number {
  const constantTerm = Math.trunc((st.n * (st.n - 1)) / 2);
  let oldStress = DBL_MAX; // at least one iteration
  let iterations = 0;
  for (let converged = false; iterations < ctx.maxi && !converged; iterations++) {
    buildLap1(st);
    const newStress = computeNewStress(st, constantTerm);
    // check for convergence
    converged = Math.abs(newStress - oldStress) / Math.abs(oldStress + 1e-10) < ctx.epsilon;
    // in first iteration we allowed stress increase, which might result by imposing constraints
    converged ||= iterations > 1 && newStress > oldStress;
    oldStress = newStress;
    if (solveAxes(st, ctx)) return -1;
  }
  for (let i = 0; i < st.dim; i++) {
    for (let j = 0; j < st.n; j++) dCoords[i]![j] = st.coords[i]![j]!;
  }
  return iterations;
}

/**
 * The `float` working copy of the layout.
 * @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
 */
function toFloatCoords(dCoords: Float64Array[], n: number, dim: number): Float32Array[] {
  const coords: Float32Array[] = [];
  for (let i = 0; i < dim; i++) coords.push(Float32Array.from(dCoords[i]!.subarray(0, n)));
  return coords;
}

/**
 * Fresh working storage for the loop.
 * @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
 */
function newLoopState(lap2: Float32Array, coords: Float32Array[], n: number): LoopState {
  const dim = coords.length;
  return {
    n, dim, lap2, coords,
    lap1: new Float32Array(n + Math.trunc((n * (n - 1)) / 2)),
    b: Array.from({ length: dim }, () => new Float32Array(n)),
    tmpCoords: new Float32Array(n),
    distAccumulator: new Float32Array(n),
    degrees: new Float64Array(n),
  };
}

/**
 * Stress majorization of the layout under hierarchy constraints. Writes the
 * layout to `dCoords` and returns the iteration count (C's return value; -1
 * on failure). Graphs without directed edges, and layouts that find no
 * hierarchy, go to the unconstrained stress majorization.
 * @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
 */
export function stressMajorizationWithHierarchy(
  graph: DirectedVtxData[], n: number, dCoords: Float64Array[], nodes: Node[], o: HierarchyOpts,
): number {
  if (!hasDirectionality(graph, n)) return unconstrainedMajorization(graph, n, dCoords, nodes, o);

  // First, partition nodes into layers: these are our constraints
  const smartIni = (o.opts & OPT_SMART_INIT) !== 0;
  const layers = smartIni
    ? smartInitLayers(graph, n, dCoords, nodes, o)
    : plainInitLayers(graph, n, dCoords, nodes, o.dim);
  if (typeof layers === 'number') return layers;
  if (n === 1) return 0;

  // Compute the all-pairs-shortest-distances matrix
  if (o.maxi === 0) return 0;
  const Dij = modelDistances(graph, n, o.model) ?? computeApspPacked(graph, n);
  if (!smartIni) scaleDownLayout(dCoords, n, o.dim);
  if (o.levelsGap > 0) scaleDistances(Dij, dCoords, n, o.dim);

  // Layout initialization, Laplacian computation
  centerLayout(dCoords, n, o.dim);
  const st = newLoopState(Dij, toFloatCoords(dCoords, n, o.dim), n);
  buildLap2(Dij, n);

  // Layout optimization
  const cMajEnv = initConstrainedMajorization(Dij, n, layers.ordering, layers.levels, layers.numLevels);
  return majorize(st, { cMajEnv, levelsGap: o.levelsGap, maxi: o.maxi, epsilon: o.epsilon }, dCoords);
}
