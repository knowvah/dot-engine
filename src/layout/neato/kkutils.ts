// SPDX-License-Identifier: EPL-2.0

/**
 * Helpers of neatogen/kkutils.c: the neighbour-vector helpers, the all-pairs
 * shortest-path matrices (`compute_apsp`, `compute_apsp_artificial_weights`),
 * the reweighting they use (`compute_new_weights`, `restore_old_weights`) and
 * the index sorts `quicksort_place` and `quicksort_placef`. The sorts go through `gv_sort`, i.e. libc `qsort`, which is
 * not stable: tied keys keep the permutation the BSD/Apple qsort gives, so the
 * sort runs through `gvQsort` (the reproduction of that algorithm).
 *
 * @see lib/neatogen/kkutils.c
 * @see lib/util/sort.h:gv_sort
 */

import { gvQsort } from '../../util/bsd-qsort.js';
import { bfs } from './bfs.js';
import { ngdijkstra } from './dijkstra.js';
import type { VtxData } from './dijkstra.js';

/** 2^64: C `size_t` arithmetic wraps modulo this. */
const SIZE_T_MODULUS = 2 ** 64;

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

/** Three-way compare of two keys; 0 on tie or NaN, as C's `<`/`>` chain. */
function compareKeys(a: number, b: number): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Sort `ordering[first..first+count)` with `qsort` by `place[ordering[i]]`.
 * `gv_sort` skips the call when `nmemb <= 1`; `gvQsort` does the same.
 * @see lib/util/sort.h:gv_sort
 */
function gvSortByPlace(
  place: Float64Array | Float32Array,
  ordering: Int32Array,
  first: number,
  count: number,
): void {
  const slice = Array.from(ordering.subarray(first, first + count));
  gvQsort(slice, (x, y) => compareKeys(place[x]!, place[y]!));
  for (let i = 0; i < count; i++) ordering[first + i] = slice[i]!;
}

/**
 * Sort `ordering[0..size)` by ascending `place[ordering[i]]`.
 * @see lib/neatogen/kkutils.c:quicksort_place
 */
export function quicksortPlace(place: Float64Array, ordering: Int32Array, size: number): void {
  gvSortByPlace(place, ordering, 0, size);
}

/**
 * Sort `ordering[first..last]` (inclusive) by ascending `place[ordering[i]]`
 * (float keys); a no-op unless `first < last`.
 * @see lib/neatogen/kkutils.c:quicksort_placef
 */
export function quicksortPlacef(
  place: Float32Array,
  ordering: Int32Array,
  first: number,
  last: number,
): void {
  if (first < last) {
    gvSortByPlace(place, ordering, first, last - first + 1);
  }
}

/**
 * Weighted APSP: one `ngdijkstra` per source. `DistType` is C `int`.
 * @see lib/neatogen/kkutils.c:compute_apsp_dijkstra
 */
function computeApspDijkstra(graph: VtxData[], n: number): Int32Array[] {
  const dij: Int32Array[] = [];
  for (let i = 0; i < n; i++) dij.push(new Int32Array(n));
  for (let i = 0; i < n; i++) ngdijkstra(i, graph, n, dij[i]!);
  return dij;
}

/**
 * Unweighted APSP: one `bfs` per source.
 * @see lib/neatogen/kkutils.c:compute_apsp_simple
 */
function computeApspSimple(graph: VtxData[], n: number): Int32Array[] {
  const dij: Int32Array[] = [];
  for (let i = 0; i < n; i++) dij.push(new Int32Array(n));
  for (let i = 0; i < n; i++) bfs(i, graph, n, dij[i]!);
  return dij;
}

/**
 * All-pairs shortest-path lengths as `DistType` (int) rows: Dijkstra when the
 * graph has edge lengths (`graph->ewgts`; the port's empty array is C NULL),
 * BFS otherwise.
 * @see lib/neatogen/kkutils.c:compute_apsp
 */
export function computeApsp(graph: VtxData[], n: number): Int32Array[] {
  return graph[0]!.ewgts.length > 0 ? computeApspDijkstra(graph, n) : computeApspSimple(graph, n);
}

/**
 * The artificial weight of edge (i, neighbor): `deg_i + deg_j - 2 * common`
 * in C `size_t`, so a negative value (only possible with duplicate
 * neighbours) wraps modulo 2^64 before the (float) cast.
 * @see lib/neatogen/kkutils.c:compute_new_weights (kkutils.c:186-188)
 * @see lib/neatogen/stress.c:compute_apsp_artificial_weights_packed (stress.c:735-736, 752-753)
 */
export function artificialWeight(graph: readonly VtxData[], degI: number, neighbor: number, vtxVec: Int32Array): number {
  const degJ = graph[neighbor]!.nedges - 1;
  const w = degI + degJ - 2 * commonNeighbors(graph, neighbor, vtxVec);
  return Math.fround(w < 0 ? w + SIZE_T_MODULUS : w);
}

/**
 * Reweight the graph so that high degree nodes will be separated. C walks a
 * pointer through one buffer of sum(nedges) floats; the port allocates each
 * vertex's slice.
 * @see lib/neatogen/kkutils.c:compute_new_weights
 */
export function computeNewWeights(graph: VtxData[], n: number): void {
  const vtxVec = new Int32Array(n);
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
 * Drop the new weights and give the caller's back. C's `old_weights` is the one
 * block it walks by `nedges`; the port's is one array per vertex, `null` for C
 * `NULL`. With `null` only graph[0].ewgts is cleared, so graph[1..n-1].ewgts
 * keep the new weights (C: dangling pointers into the freed buffer).
 * @see lib/neatogen/kkutils.c:restore_old_weights
 */
export function restoreOldWeights(graph: VtxData[], n: number, oldWeights: readonly number[][] | null): void {
  graph[0]!.ewgts = []; // free(graph[0].ewgts); graph[0].ewgts = NULL
  if (oldWeights !== null) {
    for (let i = 0; i < n; i++) {
      graph[i]!.ewgts = oldWeights[i]!;
    }
  }
}

/**
 * All-pairs shortest-path lengths as `DistType` (int) rows while weighting the
 * graph so high-degree nodes are distantly located: always Dijkstra, over the
 * int-truncated new weights.
 * @see lib/neatogen/kkutils.c:compute_apsp_artificial_weights
 */
export function computeApspArtificialWeights(graph: VtxData[], n: number): Int32Array[] {
  const oldWeights = graph[0]!.ewgts.length === 0 ? null : graph.slice(0, n).map((v) => v.ewgts);
  computeNewWeights(graph, n);
  const Dij = computeApspDijkstra(graph, n);
  restoreOldWeights(graph, n, oldWeights);
  return Dij;
}
