// SPDX-License-Identifier: EPL-2.0

/**
 * The subset and circuit distance models of stress majorization. The kkutils.c
 * neighbour-vector helpers they use live in kkutils.ts, re-exported here.
 * `circuitModel` here is stress.c's (float `Dij` from `vtx_data`); `circuit.ts`'s
 * `circuitModel` is circuit.c's `circuit_model` (`GD_dist` from a graph, KK path).
 *
 * `Dij` is C `float` (Float32Array); the circuit matrices are C `double`.
 * C `NULL` ewgts is the port's empty array.
 *
 * @see lib/neatogen/stress.c
 */

import type { VtxData } from './dijkstra.js';
import { computeApspPacked, computeWeightedApspPacked } from './bfs.js';
import { solveCircuit } from './circuit.js';
import { artificialWeight, emptyNeighborsVec, fillNeighborsVecUnweighted } from './kkutils.js';
import { newArray } from './lu.js';
import { fmaxf } from './quad-prog-solve.js';

export { commonNeighbors, emptyNeighborsVec, fillNeighborsVecUnweighted } from './kkutils.js';

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
