// SPDX-License-Identifier: EPL-2.0

/**
 * The fastest and least accurate stress optimization: a sparse distance matrix
 * (40 pivots) within a vector space (the principal axes of a high-dimensional
 * embedding). It only gives the initial layout of a smart start, reached from
 * `stress_majorization_kD_mkernel` when `opt_smart_init` is set.
 *
 * Its one caller always passes a nonzero `smart_ini` and 40 pivots, so C's random
 * directions and no-pivots branches cannot be reached and are not ported; nor is
 * `visited_nodes`, always empty since `bfs_bounded` left. C aliases non-pivot rows
 * into shared storage; here each row has its own arrays. C overruns that storage
 * when a non-pivot node exists with n < 40 (only through a zero-length `len`
 * truncation), which the port cannot reproduce.
 *
 * Fusion follows the 16.1 arm64 disassembly of `_compute_stress1` and the code
 * inlined into `_stress_majorization_kD_mkernel`.
 *
 * @see lib/neatogen/stress.c:sparse_stress_subspace_majorization_kD
 */

import { crand } from '../../common/crand.js';
import { fma } from '../../common/fma.js';
import { conjugateGradientF } from './conjgrad.js';
import type { VtxData } from './dijkstra.js';
import { centerCoordinate, embedGraph, pivotDistances, saveWeights } from './embed-graph.js';
import { computeNewWeights, restoreOldWeights } from './kkutils.js';
import { multDenseMat, multSparseDenseMatTranspose, rightMultWithVectorD, rightMultWithVectorTranspose } from './matrix-ops-dense.js';
import { iterativePCA1D, pcaAlloc } from './pca.js';
import { TOLERANCE_CG } from './stress.js';

const fr = Math.fround;

/** `stress_pca_dim`: dimensionality of the subspace. @see lib/neatogen/stress.c */
const STRESS_PCA_DIM = 50;
/** `MAX(2 * subspace_dim, 50)`'s floor. @see lib/neatogen/stress.c */
const MIN_EMBEDDING_PIVOTS = 50;
/** `dist_ij > 1e-30`: skip zero distances. @see lib/neatogen/stress.c */
const ZERO_DISTANCE = 1e-30;
/** `new_stress + 1e-10`. @see lib/neatogen/stress.c */
const STRESS_GUARD = 1e-10;

/**
 * The scalar parameters of `sparse_stress_subspace_majorization_kD`, plus the
 * `Epsilon` global.
 */
export interface SubspaceOpts {
  dim: number;
  /** Scale exponent, 1 or 2. */
  exp: number;
  /** `model == MODEL_SUBSET`. */
  reweightGraph: boolean;
  nIterations: number;
  /** Number of pivots in the sparse distance matrix. */
  numCenters: number;
  epsilon: number;
}

/** A row of the sparse distance matrix. @see lib/neatogen/stress.c:dist_data */
export interface DistData {
  nedges: number;
  edges: Int32Array;
  edist: Int32Array;
}

/**
 * Euclidean distance between nodes `i` and `j` in `dim` dimensions.
 * @see lib/neatogen/kkutils.c:distance_kD
 */
export function distanceKD(coords: readonly Float64Array[], dim: number, i: number, j: number): number {
  let sum = 0;
  for (let k = 0; k < dim; k++) {
    const d = coords[k]![i]! - coords[k]![j]!;
    sum = fma(d, d, sum);
  }
  return Math.sqrt(sum);
}

/**
 * The overall stress.
 * @see lib/neatogen/stress.c:compute_stress1
 */
export function computeStress1(
  coords: readonly Float64Array[], distances: readonly DistData[], dim: number, n: number, exp: number,
): number {
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const row = distances[i]!;
    for (let j = 0; j < row.nedges; j++) {
      const node = row.edges[j]!;
      if (node <= i) continue;
      const dist = distanceKD(coords, dim, i, node);
      const Dij = row.edist[j]!;
      sum += exp === 2
        ? ((Dij - dist) * (Dij - dist)) / (Dij * Dij)
        : ((Dij - dist) * (Dij - dist)) / Dij;
    }
  }
  return sum;
}

/** The pivots of the sparse distance matrix. */
interface Pivots {
  /** If i is a pivot, its index; otherwise -1. C leaves a repeated pivot's last index. */
  centerIndex: Int32Array;
  /** The pivot nodes. */
  invCenterIndex: Int32Array;
  /** The distance between each pivot and each node. */
  Dij: Int32Array[];
}

/**
 * Lower `dist` to the new pivot's distances and pick the farthest node; a tie may
 * take the later node, by a draw from libc's stream (`dist[j] == 0` ties too).
 * @see lib/neatogen/stress.c:sparse_stress_subspace_majorization_kD
 */
function nextPivot(dist: Int32Array, Di: Int32Array, n: number, from: number): number {
  let node = from;
  let maxDist = 0;
  for (let j = 0; j < n; j++) {
    dist[j] = Math.min(dist[j]!, Di[j]!);
    if (dist[j]! > maxDist || (dist[j] === maxDist && crand() % (j + 1) === 0)) {
      node = j;
      maxDist = dist[j]!;
    }
  }
  return node;
}

/**
 * Select `numCenters` pivots uniformly spread over the graph; the first one is
 * random.
 * @see lib/neatogen/stress.c:sparse_stress_subspace_majorization_kD
 */
function selectPivots(graph: VtxData[], n: number, numCenters: number, reweightGraph: boolean): Pivots {
  const centerIndex = new Int32Array(n).fill(-1);
  const invCenterIndex = new Int32Array(numCenters);
  const Dij = Array.from({ length: numCenters }, () => new Int32Array(n));
  const dist = new Int32Array(n);

  let node = crand() % n;
  centerIndex[node] = 0;
  invCenterIndex[0] = node;
  pivotDistances(node, graph, n, reweightGraph, Dij[0]!);

  // find the most distant node from the first pivot
  let maxDist = 0;
  for (let i = 0; i < n; i++) {
    dist[i] = Dij[0]![i]!;
    if (dist[i]! > maxDist) {
      node = i;
      maxDist = dist[i]!;
    }
  }
  // select the others
  for (let i = 1; i < numCenters; i++) {
    centerIndex[node] = i;
    invCenterIndex[i] = node;
    pivotDistances(node, graph, n, reweightGraph, Dij[i]!);
    node = nextPivot(dist, Dij[i]!, n, node);
  }
  return { centerIndex, invCenterIndex, Dij };
}

/** A pivot's row: its distance to every other node. */
function pivotRow(i: number, n: number, Di: Int32Array): DistData {
  const edges = new Int32Array(n - 1);
  const edist = new Int32Array(n - 1);
  for (let j = 0; j < i; j++) {
    edges[j] = j;
    edist[j] = Di[j]!;
  }
  for (let j = i + 1; j < n; j++) {
    edges[j - 1] = j;
    edist[j - 1] = Di[j]!;
  }
  return { nedges: n - 1, edges, edist };
}

/** A non-pivot's row: its distance to all pivots. */
function nonPivotRow(i: number, numCenters: number, p: Pivots): DistData {
  const edges = new Int32Array(numCenters);
  const edist = new Int32Array(numCenters);
  for (let j = 0; j < numCenters; j++) {
    edges[j] = p.invCenterIndex[j]!;
    edist[j] = p.Dij[j]![i]!;
  }
  return { nedges: numCenters, edges, edist };
}

/**
 * Construct the sparse distance matrix.
 * @see lib/neatogen/stress.c:sparse_stress_subspace_majorization_kD
 */
function buildDistances(n: number, numCenters: number, p: Pivots): DistData[] {
  const distances: DistData[] = [];
  for (let i = 0; i < n; i++) {
    const index = p.centerIndex[i]!;
    distances.push(index >= 0 ? pivotRow(i, n, p.Dij[index]!) : nonPivotRow(i, numCenters, p));
  }
  return distances;
}

/**
 * The Laplacian of the sparse distances: self loop first, weights C `float`.
 * @see lib/neatogen/stress.c:sparse_stress_subspace_majorization_kD
 */
function buildSparseLaplacian(distances: readonly DistData[], n: number, exp: number): VtxData[] {
  const lap: VtxData[] = [];
  for (let i = 0; i < n; i++) {
    const row = distances[i]!;
    const edges = [i];
    const ewgts = [0];
    let degree = 0;
    for (let j = 0; j < row.nedges; j++) {
      const d = fr(row.edist[j]!);
      const w = exp === 2 ? fr(-1 / fr(d * d)) : fr(-1 / d);
      edges.push(row.edges[j]!);
      ewgts.push(w);
      degree -= w;
    }
    ewgts[0] = fr(degree);
    lap.push({ nedges: row.nedges + 1, edges, ewgts });
  }
  return lap;
}

/**
 * The smart initial direction vectors; the layout is subspace*directions.
 * @see lib/neatogen/stress.c:sparse_stress_subspace_majorization_kD
 */
function initialDirections(subspace: readonly Float64Array[], subspaceDim: number, n: number, dim: number): Float64Array[] {
  // one block, as C: with fewer nodes than dimensions `directions[k][k]` lands in a later row
  const storage = new Float64Array(dim * subspaceDim);
  const directions = Array.from({ length: dim }, (_, k) => storage.subarray(k * subspaceDim, (k + 1) * subspaceDim));
  if (dim !== 2) {
    // use the first vectors in the eigenspace: each direction points to its principal axis
    for (let k = 0; k < dim; k++) storage[k * subspaceDim + k] = 1;
    return directions;
  }
  // for the frequent 2-D case we prefer iterative-PCA over PCA
  directions[0]![0] = 1; // first pca projection vector
  if (!iterativePCA1D(subspace, subspaceDim, n, directions[1]!)) {
    directions[1]!.fill(0);
    directions[1]![1] = 1;
  }
  return directions;
}

/** Everything the optimization loop reads. */
interface SubspaceState {
  readonly n: number;
  readonly dim: number;
  readonly subspaceDim: number;
  readonly subspace: readonly Float64Array[];
  readonly distances: readonly DistData[];
  readonly lap: readonly VtxData[];
  readonly matrix: readonly Float32Array[];
  readonly directions: readonly Float64Array[];
  readonly coords: readonly Float64Array[];
  readonly b: Float64Array;
  readonly bRestricted: Float64Array;
}

/**
 * The vector b of axis `k`: multiply on the fly with the distance-based
 * Laplacian. `-ewgts[j] * dist_list[j]` is C `float` arithmetic.
 * @see lib/neatogen/stress.c:sparse_stress_subspace_majorization_kD
 */
function computeB(st: SubspaceState, k: number): void {
  const { n, dim, coords, distances, lap, b } = st;
  const ck = coords[k]!;
  for (let i = 0; i < n; i++) {
    let degree = 0;
    let bi = 0;
    const { edges, ewgts, nedges } = lap[i]!;
    const edist = distances[i]!.edist;
    for (let j = 1; j < nedges; j++) {
      const node = edges[j]!;
      const distIj = distanceKD(coords, dim, i, node);
      if (distIj > ZERO_DISTANCE) { // skip zero distances
        const Lij = fr(-ewgts[j]! * fr(edist[j - 1]!)) / distIj; // L_ij=w_{ij}*d_{ij}/dist_{ij}
        degree -= Lij;
        bi = fma(Lij, ck[node]!, bi);
      }
    }
    b[i] = fma(degree, ck[i]!, bi);
  }
}

/** Axis-by-axis optimization. Returns true when conjugate gradient fails. */
function optimizeAxes(st: SubspaceState): boolean {
  const { n, dim, subspaceDim, subspace, matrix, directions, coords, b, bRestricted } = st;
  for (let k = 0; k < dim; k++) {
    computeB(st, k);
    rightMultWithVectorD(subspace, subspaceDim, n, b, bRestricted);
    const rc = conjugateGradientF(matrix, directions[k]!, bRestricted, subspaceDim, {
      tol: TOLERANCE_CG, maxIterations: subspaceDim, ortho1: false,
    });
    if (rc !== 0) return true;
    rightMultWithVectorTranspose(subspace, n, subspaceDim, directions[k]!, coords[k]!);
  }
  return false;
}

/**
 * Layout optimization. Returns the iteration count, or -1 when conjugate
 * gradient fails.
 * @see lib/neatogen/stress.c:sparse_stress_subspace_majorization_kD
 */
function optimizeLayout(st: SubspaceState, o: SubspaceOpts): number {
  let oldStress = computeStress1(st.coords, st.distances, st.dim, st.n, o.exp);
  let converged = false;
  let iterations = 0;
  for (; iterations < o.nIterations && !converged; iterations++) {
    if (optimizeAxes(st)) return -1;
    if (iterations % 2 === 0) { // check for convergence each two iterations
      const newStress = computeStress1(st.coords, st.distances, st.dim, st.n, o.exp);
      converged = Math.abs(newStress - oldStress) / (newStress + STRESS_GUARD) < o.epsilon;
      oldStress = newStress;
    }
  }
  return iterations;
}

/** The subspace in which we optimize: PCA of the high-dimensional embedding. */
function computeSubspace(graph: VtxData[], n: number, subspaceDim: number, reweightGraph: boolean): Float64Array[] {
  const subspace = Array.from({ length: subspaceDim }, () => new Float64Array(n));
  const numCentersLocal = Math.min(n, Math.max(2 * subspaceDim, MIN_EMBEDDING_PIVOTS));
  const fullCoords = embedGraph(graph, n, numCentersLocal, reweightGraph);
  centerCoordinate(fullCoords, n, numCentersLocal);
  pcaAlloc(fullCoords, numCentersLocal, n, subspace, subspaceDim);
  return subspace;
}

/**
 * Writes the layout to `coords` and returns the iteration count, or -1 when
 * conjugate gradient fails.
 * @see lib/neatogen/stress.c:sparse_stress_subspace_majorization_kD
 */
export function sparseStressSubspaceMajorizationKD(
  graph: VtxData[], n: number, coords: readonly Float64Array[], o: SubspaceOpts,
): number {
  const { dim, exp, reweightGraph, numCenters } = o;
  const subspaceDim = Math.min(STRESS_PCA_DIM, n);
  const subspace = computeSubspace(graph, n, subspaceDim, reweightGraph);

  // the sparse-shortest-distances matrix
  const oldWeights = saveWeights(graph, n);
  if (reweightGraph) computeNewWeights(graph, n); // weight graph to separate high-degree nodes
  const pivots = selectPivots(graph, n, numCenters, reweightGraph);
  const distances = buildDistances(n, numCenters, pivots);
  const lap = buildSparseLaplacian(distances, n, exp);

  // an initial k-D layout
  const directions = initialDirections(subspace, subspaceDim, n, dim);
  for (let k = 0; k < dim; k++) {
    rightMultWithVectorTranspose(subspace, n, subspaceDim, directions[k]!, coords[k]!);
  }

  // the restriction of the Laplacian to the subspace
  const tmpMat = multSparseDenseMatTranspose(lap, subspace, n, subspaceDim);
  const matrix = multDenseMat(subspace, tmpMat, subspaceDim, n, subspaceDim);

  const iterations = optimizeLayout({
    n, dim, subspaceDim, subspace, distances, lap, matrix, directions, coords,
    b: new Float64Array(n), bRestricted: new Float64Array(subspaceDim),
  }, o);
  if (reweightGraph) restoreOldWeights(graph, n, oldWeights);
  return iterations;
}
