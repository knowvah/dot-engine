// SPDX-License-Identifier: EPL-2.0
/**
 * Single-source shortest paths for the SGD engine, ported with C's indexed
 * binary heap. The heap's tie-breaking order decides the order terms are
 * emitted, and sgd's Fisher-Yates shuffle consumes that order, so the heap
 * (including its 1-based left/right/parent arithmetic over a 0-based array)
 * is reproduced exactly rather than replaced by a lazy-deletion heap.
 *
 * @see lib/neatogen/dijkstra.c
 */

import type { TermSgd } from './dijkstra.js';
import type { GraphSgd } from './sgd.js';

/** C FLT_MAX. */
const FLT_MAX = 3.4028234663852886e38;

/** @see lib/neatogen/dijkstra.c:heap */
interface Heap {
  data: Int32Array;
  heapSize: number;
  index: Int32Array;
}

// C's left/right/parent are 1-based formulas applied to a 0-based array.
const left = (i: number): number => 2 * i;
const right = (i: number): number => 2 * i + 1;
const parent = (i: number): number => Math.trunc(i / 2);

/** @see lib/neatogen/dijkstra.c:greaterPriority_f */
const greaterPriority = (h: Heap, i: number, j: number, dist: Float32Array): boolean =>
  dist[h.data[i]] < dist[h.data[j]];

/** @see lib/neatogen/dijkstra.c:exchange */
function exchange(h: Heap, i: number, j: number): void {
  const t = h.data[i];
  h.data[i] = h.data[j];
  h.data[j] = t;
  h.index[h.data[i]] = i;
  h.index[h.data[j]] = j;
}

/** @see lib/neatogen/dijkstra.c:heapify_f */
function heapify(h: Heap, start: number, dist: Float32Array): void {
  let i = start;
  for (;;) {
    const l = left(i);
    const r = right(i);
    let largest = l < h.heapSize && greaterPriority(h, l, i, dist) ? l : i;
    if (r < h.heapSize && greaterPriority(h, r, largest, dist)) largest = r;
    if (largest === i) break;
    exchange(h, largest, i);
    i = largest;
  }
}

/** @see lib/neatogen/dijkstra.c:initHeap_f */
function initHeap(startVertex: number, dist: Float32Array, n: number): Heap {
  const h: Heap = {
    data: new Int32Array(Math.max(n - 1, 0)),
    heapSize: n - 1,
    index: new Int32Array(n),
  };
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (i === startVertex) continue;
    h.data[count] = i;
    h.index[i] = count++;
  }
  for (let j = Math.trunc((n - 1) / 2); j >= 0; j--) heapify(h, j, dist);
  return h;
}

/** @see lib/neatogen/dijkstra.c:extractMax_f; returns -1 when empty. */
function extractMax(h: Heap, dist: Float32Array): number {
  if (h.heapSize === 0) return -1;
  const max = h.data[0];
  h.data[0] = h.data[h.heapSize - 1];
  h.index[h.data[0]] = 0;
  h.heapSize--;
  heapify(h, 0, dist);
  return max;
}

/** @see lib/neatogen/dijkstra.c:increaseKey_f */
function increaseKey(h: Heap, v: number, newDist: number, dist: Float32Array): void {
  if (dist[v] <= newDist) return;
  dist[v] = newDist;
  let i = h.index[v];
  while (i > 0 && dist[h.data[parent(i)]] > newDist) {
    h.data[i] = h.data[parent(i)];
    h.index[h.data[i]] = i;
    i = parent(i);
  }
  h.data[i] = v;
  h.index[v] = i;
}

/**
 * Single-source shortest paths that also builds terms as it goes. Writes
 * terms for reachable pinned nodes and nodes below `source`; returns how many.
 * `terms` is appended to from index 0 (the caller passes a fresh chunk).
 *
 * @see lib/neatogen/dijkstra.c:dijkstra_sgd
 */
export function dijkstraSgd(graph: GraphSgd, source: number, terms: TermSgd[]): number {
  const dists = new Float32Array(graph.n).fill(FLT_MAX);
  dists[source] = 0;
  for (let i = graph.sources[source]; i < graph.sources[source + 1]; i++) {
    dists[graph.targets[i]] = graph.weights[i];
  }
  const h = initHeap(source, dists, graph.n);
  let offset = 0;
  for (let closest = extractMax(h, dists); closest >= 0; closest = extractMax(h, dists)) {
    const d = dists[closest];
    if (d === FLT_MAX) break;
    if (graph.pinneds[closest] || closest < source) {
      terms[offset++] = { i: source, j: closest, d, w: Math.fround(1 / Math.fround(d * d)) };
    }
    for (let i = graph.sources[closest]; i < graph.sources[closest + 1]; i++) {
      increaseKey(h, graph.targets[i], Math.fround(d + graph.weights[i]), dists);
    }
  }
  return offset;
}
