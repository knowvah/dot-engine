// SPDX-License-Identifier: EPL-2.0

/**
 * High-dimensional embedding of a graph: each coordinate is a pivot's
 * graph-theoretic distance to every node. `DistType` is C `int` (Int32Array).
 *
 * @see lib/neatogen/embed_graph.c
 */

import { crand } from '../../common/crand.js';
import { bfs } from './bfs.js';
import { ngdijkstra, type VtxData } from './dijkstra.js';
import { computeNewWeights, restoreOldWeights } from './kkutils.js';

/**
 * `old_weights = graph[0].ewgts`. C keeps one block; the port's weights are one
 * array per vertex, and `null` is C `NULL`.
 */
export function saveWeights(graph: readonly VtxData[], n: number): number[][] | null {
  return graph[0]!.ewgts.length === 0 ? null : graph.slice(0, n).map((v) => v.ewgts);
}

/** The distances from `node`: Dijkstra over the new weights, else BFS. */
export function pivotDistances(
  node: number, graph: VtxData[], n: number, reweightGraph: boolean, dist: Int32Array,
): void {
  if (reweightGraph) ngdijkstra(node, graph, n, dist);
  else bfs(node, graph, n, dist);
}

/**
 * Compute a `dim`-dimensional embedding of the `n` nodes, choosing `dim` pivots,
 * each as far as possible from those already chosen.
 * @see lib/neatogen/embed_graph.c:embed_graph
 */
export function embedGraph(graph: VtxData[], n: number, dim: number, reweightGraph: boolean): Int32Array[] {
  const dist = new Int32Array(n); // distances of each node to the selected pivots
  const oldWeights = saveWeights(graph, n);
  const coords = Array.from({ length: dim }, () => new Int32Array(n));
  if (reweightGraph) computeNewWeights(graph, n);

  let node = crand() % n; // select the first pivot
  pivotDistances(node, graph, n, reweightGraph, coords[0]!);
  let maxDist = 0;
  for (let i = 0; i < n; i++) {
    dist[i] = coords[0]![i]!;
    if (dist[i]! > maxDist) {
      node = i;
      maxDist = dist[i]!;
    }
  }

  // select other dim-1 nodes as pivots
  for (let i = 1; i < dim; i++) {
    pivotDistances(node, graph, n, reweightGraph, coords[i]!);
    maxDist = 0;
    for (let j = 0; j < n; j++) {
      dist[j] = Math.min(dist[j]!, coords[i]![j]!);
      if (dist[j]! > maxDist) {
        node = j;
        maxDist = dist[j]!;
      }
    }
  }

  if (reweightGraph) restoreOldWeights(graph, n, oldWeights);
  return coords;
}

/**
 * Make each axis centered around 0; the average is truncated to `DistType`.
 * @see lib/neatogen/embed_graph.c:center_coordinate
 */
export function centerCoordinate(coords: readonly Int32Array[], n: number, dim: number): void {
  for (let i = 0; i < dim; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) sum += coords[i]![j]!;
    const avg = Math.trunc(sum / n);
    for (let j = 0; j < n; j++) coords[i]![j] = coords[i]![j]! - avg;
  }
}
