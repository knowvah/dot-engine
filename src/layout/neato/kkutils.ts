// SPDX-License-Identifier: EPL-2.0

/**
 * Helpers of neatogen/kkutils.c: the all-pairs shortest-path matrix
 * (`compute_apsp`) and the index sorts `quicksort_place` and
 * `quicksort_placef`. The sorts go through `gv_sort`, i.e. libc `qsort`, which is
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
