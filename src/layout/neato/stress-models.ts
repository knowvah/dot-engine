// SPDX-License-Identifier: EPL-2.0

/**
 * The subset and circuit distance models of stress majorization, plus the
 * three kkutils.c neighbour-vector helpers they use (kept here because
 * kkutils.ts is outside the porting task that added them).
 *
 * `Dij` is C `float` (Float32Array); the circuit matrices are C `double`.
 * C `NULL` ewgts is the port's empty array.
 *
 * @see lib/neatogen/stress.c
 * @see lib/neatogen/kkutils.c
 */

import type { VtxData } from './dijkstra.js';
import { computeApspPacked, computeWeightedApspPacked } from './bfs.js';
import { solveCircuit } from './circuit.js';
import { newArray } from './lu.js';
import { fmaxf } from './quad-prog-solve.js';

/** 2^64: C `size_t` arithmetic wraps modulo this. */
const SIZE_T_MODULUS = 2 ** 64;

// ---------------------------------------------------------------------------
// kkutils.c helpers
// ---------------------------------------------------------------------------

/**
 * Count the neighbours of `u` marked in `vVector`.
 * @see lib/neatogen/kkutils.c:common_neighbors
 */
export function commonNeighbors(graph: readonly VtxData[], u: number, vVector: Int32Array): number {
  // count number of common neighbors of 'v_vector' and 'u'
  let numSharedNeighbors = 0;
  for (let j = 1; j < graph[u]!.nedges; j++) {
    const neighbor = graph[u]!.edges[j]!;
    if (vVector[neighbor]! > 0) {
      // a shared neighbor
      numSharedNeighbors++;
    }
  }
  return numSharedNeighbors;
}

/**
 * Mark the neighbours of `vtx` (a node is NOT a neighbour of itself).
 * @see lib/neatogen/kkutils.c:fill_neighbors_vec_unweighted
 */
export function fillNeighborsVecUnweighted(graph: readonly VtxData[], vtx: number, vtxVec: Int32Array): void {
  for (let j = 1; j < graph[vtx]!.nedges; j++) {
    vtxVec[graph[vtx]!.edges[j]!] = 1;
  }
}

/**
 * Clear the marks set by `fillNeighborsVecUnweighted`.
 * @see lib/neatogen/kkutils.c:empty_neighbors_vec
 */
export function emptyNeighborsVec(graph: readonly VtxData[], vtx: number, vtxVec: Int32Array): void {
  for (let j = 1; j < graph[vtx]!.nedges; j++) {
    vtxVec[graph[vtx]!.edges[j]!] = 0;
  }
}

// ---------------------------------------------------------------------------
// circuitModel
// ---------------------------------------------------------------------------

/**
 * Distances from the resistor circuit: Dij = Ginv[i][i] + Ginv[j][j] -
 * 2 Ginv[i][j] over the inverted conductance matrix; `null` (C `NULL`) when
 * `solveCircuit` fails, e.g. on a disconnected graph.
 * @see lib/neatogen/stress.c:circuitModel
 */
export function circuitModel(graph: readonly VtxData[], nG: number): Float32Array | null {
  let Dij: Float32Array | null = new Float32Array((nG * (nG + 1)) / 2);
  const Gm = newArray(nG, nG, 0.0);
  const GmInv = newArray(nG, nG, 0.0);

  /* set non-diagonal entries */
  if (graph[0]!.ewgts.length !== 0) {
    for (let i = 0; i < nG; i++) {
      for (let e = 1; e < graph[i]!.nedges; e++) {
        const j = graph[i]!.edges[e]!;
        /* conductance is 1/resistance; ewgts is C float */
        Gm[i]![j] = Gm[j]![i] = -1.0 / Math.fround(graph[i]!.ewgts[e]!); /* negate */
      }
    }
  } else {
    for (let i = 0; i < nG; i++) {
      for (let e = 1; e < graph[i]!.nedges; e++) {
        const j = graph[i]!.edges[e]!;
        /* conductance is 1/resistance */
        Gm[i]![j] = Gm[j]![i] = -1.0; /* ewgts are all 1 */
      }
    }
  }

  const rv = solveCircuit(nG, Gm, GmInv);

  if (rv) {
    circuitDistances(GmInv, nG, Dij);
  } else {
    Dij = null;
  }
  return Dij;
}

/**
 * Fill the packed `Dij` from the inverted conductance matrix.
 * @see lib/neatogen/stress.c:circuitModel (stress.c:197-209)
 */
function circuitDistances(GmInv: readonly Float64Array[], nG: number, Dij: Float32Array): void {
  let count = 0;
  for (let i = 0; i < nG; i++) {
    for (let j = i; j < nG; j++) {
      // the Float32Array store is C's (float) cast
      Dij[count++] = i === j ? 0.0 : GmInv[i]![i]! + GmInv[j]![j]! - 2.0 * GmInv[i]![j]!;
    }
  }
}

// ---------------------------------------------------------------------------
// compute_apsp_artificial_weights_packed
// ---------------------------------------------------------------------------

/**
 * The artificial weight of edge (i, neighbor): `deg_i + deg_j - 2 * common`
 * in C `size_t`, so a negative value (only possible with duplicate
 * neighbours) wraps modulo 2^64 before the (float) cast.
 * @see lib/neatogen/stress.c:compute_apsp_artificial_weights_packed (stress.c:735-736, 752-753)
 */
function artificialWeight(graph: readonly VtxData[], degI: number, neighbor: number, vtxVec: Int32Array): number {
  const degJ = graph[neighbor]!.nedges - 1;
  const w = degI + degJ - 2 * commonNeighbors(graph, neighbor, vtxVec);
  return Math.fround(w < 0 ? w + SIZE_T_MODULUS : w);
}

/**
 * Weighted branch: each weight is fmaxf(artificial, the caller's ewgts[j]),
 * read from graph[i].ewgts before graph[i].ewgts is reassigned.
 * @see lib/neatogen/stress.c:compute_apsp_artificial_weights_packed (stress.c:730-743)
 */
function weightGraphKeepingLengths(graph: VtxData[], n: number, vtxVec: Int32Array): void {
  for (let i = 0; i < n; i++) {
    const weights = new Array<number>(graph[i]!.nedges).fill(0);
    fillNeighborsVecUnweighted(graph, i, vtxVec);
    const degI = graph[i]!.nedges - 1;
    for (let j = 1; j <= degI; j++) {
      const neighbor = graph[i]!.edges[j]!;
      weights[j] = fmaxf(artificialWeight(graph, degI, neighbor, vtxVec), Math.fround(graph[i]!.ewgts[j]!));
    }
    emptyNeighborsVec(graph, i, vtxVec);
    graph[i]!.ewgts = weights;
  }
}

/**
 * Unweighted branch: graph[i].ewgts is pointed at the new weights first.
 * @see lib/neatogen/stress.c:compute_apsp_artificial_weights_packed (stress.c:745-758)
 */
function weightGraph(graph: VtxData[], n: number, vtxVec: Int32Array): void {
  for (let i = 0; i < n; i++) {
    const weights = new Array<number>(graph[i]!.nedges).fill(0);
    graph[i]!.ewgts = weights;
    fillNeighborsVecUnweighted(graph, i, vtxVec);
    const degI = graph[i]!.nedges - 1;
    for (let j = 1; j <= degI; j++) {
      const neighbor = graph[i]!.edges[j]!;
      weights[j] = artificialWeight(graph, degI, neighbor, vtxVec);
    }
    emptyNeighborsVec(graph, i, vtxVec);
  }
}

/**
 * All-pairs shortest paths after weighting every edge so that high-degree
 * nodes sit far apart: Dijkstra when the graph carries ewgts, else bfs over
 * the (int-truncated) artificial weights.
 *
 * The C allocates one buffer of sum(nedges) floats and walks a pointer
 * through it; the port allocates each vertex's slice. On return
 * graph[0].ewgts is NULL; when the caller had ewgts every vertex gets its
 * original array back, otherwise graph[1..n-1].ewgts keep the artificial
 * weights (C: dangling pointers into the freed buffer).
 * @see lib/neatogen/stress.c:compute_apsp_artificial_weights_packed
 */
export function computeApspArtificialWeightsPacked(graph: VtxData[], n: number): Float32Array {
  /* compute all-pairs-shortest-path-length while weighting the graph */
  /* so high-degree nodes are distantly located */
  const oldWeights = graph[0]!.ewgts;
  // C walks old_weights by graph[i].nedges; the port keeps each vertex's array
  const savedWeights = graph.slice(0, n).map((v) => v.ewgts);
  const vtxVec = new Int32Array(n);

  let Dij: Float32Array;
  if (graph[0]!.ewgts.length !== 0) {
    weightGraphKeepingLengths(graph, n, vtxVec);
    Dij = computeWeightedApspPacked(graph, n);
  } else {
    weightGraph(graph, n, vtxVec);
    Dij = computeApspPacked(graph, n);
  }

  graph[0]!.ewgts = []; // free(graph[0].ewgts); graph[0].ewgts = NULL
  if (oldWeights.length !== 0) {
    for (let i = 0; i < n; i++) {
      graph[i]!.ewgts = savedWeights[i]!;
    }
  }
  return Dij;
}
