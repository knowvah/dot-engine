// SPDX-License-Identifier: EPL-2.0
/** @see lib/neatogen/dijkstra.c */

/**
 * Sparse-graph vertex descriptor used by neato layout algorithms.
 * Matches `vtx_data` in lib/neatogen/sparsegraph.h.
 *
 * - `nedges`: total entries including self at index 0
 * - `edges[0]` = self-index; `edges[1..]` = neighbor indices
 * - `ewgts[k]` = edge weight for `edges[k]`
 *
 * @see lib/neatogen/sparsegraph.h:vtx_data
 */
export interface VtxData {
  nedges: number;
  edges: number[];
  ewgts: number[];
}

/**
 * A term used by the SGD layout engine.
 * Matches `term_sgd` in lib/neatogen/sgd.h.
 * @see lib/neatogen/sgd.h:term_sgd
 */
export interface TermSgd {
  i: number;  // source node
  j: number;  // destination node
  d: number;  // ideal distance
  w: number;  // weight = 1/d²
}

// ---------------------------------------------------------------------------
// Min-heap (keyed by Float32Array distances)
// ---------------------------------------------------------------------------

/** Push vertex index `idx` into the heap. @internal */
export function heapPush(
  heap: number[],
  dist: Float32Array,
  idx: number,
): void {
  let pos = heap.length;
  heap.push(idx);
  while (pos > 0) {
    const parent = (pos - 1) >> 1;
    if (dist[heap[parent]] <= dist[heap[pos]]) break;
    const tmp = heap[parent];
    heap[parent] = heap[pos];
    heap[pos] = tmp;
    pos = parent;
  }
}

/** Sift the root down to restore heap order after replacing it. @internal */
export function heapSiftDown(heap: number[], dist: Float32Array): void {
  let pos = 0;
  for (;;) {
    const l = 2 * pos + 1;
    const r = 2 * pos + 2;
    let smallest = pos;
    if (l < heap.length && dist[heap[l]] < dist[heap[smallest]]) smallest = l;
    if (r < heap.length && dist[heap[r]] < dist[heap[smallest]]) smallest = r;
    if (smallest === pos) break;
    const tmp = heap[smallest];
    heap[smallest] = heap[pos];
    heap[pos] = tmp;
    pos = smallest;
  }
}

/** Pop and return the vertex with minimum distance. @internal */
export function heapPop(heap: number[], dist: Float32Array): number {
  const top = heap[0];
  const last = heap.pop()!;
  if (heap.length === 0) return top;
  heap[0] = last;
  heapSiftDown(heap, dist);
  return top;
}

/** Build a min-heap from all nodes except `src`. @internal */
export function heapBuildExcluding(
  src: number,
  n: number,
  dist: Float32Array,
): number[] {
  const heap: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i !== src) heapPush(heap, dist, i);
  }
  return heap;
}

// ---------------------------------------------------------------------------
// dijkstra helpers
// ---------------------------------------------------------------------------

/** Initialise dist array from source edges. @internal */
export function dijkstraInitDist(
  src: number,
  graph: VtxData[],
  n: number,
  dist: Float32Array,
): void {
  for (let i = 0; i < n; i++) dist[i] = Infinity;
  dist[src] = 0;
  const v = graph[src];
  for (let i = 1; i < v.nedges; i++) dist[v.edges[i]] = v.ewgts[i];
}

/** Relax all outgoing edges of `closest`. @internal */
export function dijkstraRelax(
  closest: number,
  closestDist: number,
  graph: VtxData[],
  dist: Float32Array,
  heap: number[],
): void {
  const cv = graph[closest];
  for (let i = 1; i < cv.nedges; i++) {
    const nb = cv.edges[i];
    const nd = closestDist + cv.ewgts[i];
    if (nd < dist[nb]) {
      dist[nb] = nd;
      heapPush(heap, dist, nb);
    }
  }
}

// ---------------------------------------------------------------------------
// Public: dijkstra (float-weight, float-output)
// ---------------------------------------------------------------------------

/**
 * Single-source shortest paths (weighted) from `src`.
 * Populates `dist` with Float32 distances; unreachable nodes get Infinity.
 * Equivalent to `dijkstra_f` in lib/neatogen/dijkstra.c.
 *
 * @see lib/neatogen/dijkstra.c:dijkstra_f
 */
export function dijkstra(
  src: number,
  graph: VtxData[],
  n: number,
  dist: Float32Array,
): void {
  dijkstraInitDist(src, graph, n, dist);
  const heap = heapBuildExcluding(src, n, dist);
  while (heap.length > 0) {
    const closest = heapPop(heap, dist);
    const closestDist = dist[closest];
    if (!isFinite(closestDist)) break;
    dijkstraRelax(closest, closestDist, graph, dist, heap);
  }
}

// ---------------------------------------------------------------------------
// Integer (DistType) Dijkstra: ngdijkstra and its max-heap
// ---------------------------------------------------------------------------

/** C `(DistType)INT_MAX`. @see lib/neatogen/dijkstra.c:MAX_DIST */
export const MAX_DIST = 2147483647;

/**
 * The heap of dijkstra.c: `data[i] = vertexNum <=> index[vertexNum] = i`, with
 * the 0-rooted `left = 2i`, `right = 2i + 1`, `parent = i / 2` numbering.
 * @see lib/neatogen/dijkstra.c:heap
 */
export interface NgHeap {
  data: number[];
  heapSize: number;
  index: Int32Array;
}

/** @see lib/neatogen/dijkstra.c:left */
function ngLeft(i: number): number { return 2 * i; }

/** @see lib/neatogen/dijkstra.c:right */
function ngRight(i: number): number { return 2 * i + 1; }

/** @see lib/neatogen/dijkstra.c:parent */
function ngParent(i: number): number { return Math.trunc(i / 2); }

/** @see lib/neatogen/dijkstra.c:insideHeap */
function ngInsideHeap(h: NgHeap, i: number): boolean { return i < h.heapSize; }

/** @see lib/neatogen/dijkstra.c:greaterPriority */
function ngGreaterPriority(h: NgHeap, i: number, j: number, dist: Int32Array): boolean {
  return dist[h.data[i]!]! < dist[h.data[j]!]!;
}

/** @see lib/neatogen/dijkstra.c:assign */
function ngAssign(h: NgHeap, i: number, j: number): void {
  h.data[i] = h.data[j]!;
  h.index[h.data[i]!] = i;
}

/** @see lib/neatogen/dijkstra.c:exchange */
function ngExchange(h: NgHeap, i: number, j: number): void {
  const t = h.data[i]!;
  h.data[i] = h.data[j]!;
  h.data[j] = t;
  h.index[h.data[i]!] = i;
  h.index[h.data[j]!] = j;
}

/** @see lib/neatogen/dijkstra.c:heapify */
function ngHeapify(h: NgHeap, start: number, dist: Int32Array): void {
  let i = start;
  for (;;) {
    const l = ngLeft(i);
    const r = ngRight(i);
    let largest = ngInsideHeap(h, l) && ngGreaterPriority(h, l, i, dist) ? l : i;
    if (ngInsideHeap(h, r) && ngGreaterPriority(h, r, largest, dist)) largest = r;
    if (largest === i) break;
    ngExchange(h, largest, i);
    i = largest;
  }
}

/** @see lib/neatogen/dijkstra.c:initHeap */
export function ngInitHeap(startVertex: number, dist: Int32Array, n: number): NgHeap {
  const h: NgHeap = {
    data: new Array<number>(Math.max(n - 1, 0)).fill(0),
    heapSize: n - 1,
    index: new Int32Array(n),
  };
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (i !== startVertex) {
      h.data[count] = i;
      h.index[i] = count;
      count++;
    }
  }
  for (let j = Math.trunc((n - 1) / 2); j >= 0; j--) ngHeapify(h, j, dist);
  return h;
}

/**
 * Pops the closest vertex; returns -1 (C `false`) when the heap is empty.
 * @see lib/neatogen/dijkstra.c:extractMax
 */
export function ngExtractMax(h: NgHeap, dist: Int32Array): number {
  if (h.heapSize === 0) return -1;
  const max = h.data[0]!;
  h.data[0] = h.data[h.heapSize - 1]!;
  h.index[h.data[0]] = 0;
  h.heapSize--;
  ngHeapify(h, 0, dist);
  return max;
}

/** @see lib/neatogen/dijkstra.c:increaseKey */
export function ngIncreaseKey(
  h: NgHeap, increasedVertex: number, newDist: number, dist: Int32Array,
): void {
  if (dist[increasedVertex]! <= newDist) return;
  let i = h.index[increasedVertex]!;
  dist[increasedVertex] = newDist;
  while (i > 0 && dist[h.data[ngParent(i)]!]! > newDist) {
    ngAssign(h, i, ngParent(i));
    i = ngParent(i);
  }
  h.data[i] = increasedVertex;
  h.index[increasedVertex] = i;
}

/** C `(DistType)` of a float edge weight (truncation toward zero). */
function toDistType(w: number): number {
  return Math.trunc(Math.fround(w));
}

/**
 * Single-source shortest paths on the int-truncated edge weights `ewgts`;
 * unreachable vertices get `prevClosestDist + 10` (INT_MAX when that would
 * overflow).
 * @see lib/neatogen/dijkstra.c:ngdijkstra
 */
export function ngdijkstra(vertex: number, graph: VtxData[], n: number, dist: Int32Array): void {
  let prevClosestDist = MAX_DIST;
  for (let i = 0; i < n; i++) dist[i] = MAX_DIST;
  dist[vertex] = 0;
  const vd = graph[vertex]!;
  for (let i = 1; i < vd.nedges; i++) dist[vd.edges[i]!] = toDistType(vd.ewgts[i]!);

  const h = ngInitHeap(vertex, dist, n);
  for (let closest = ngExtractMax(h, dist); closest >= 0; closest = ngExtractMax(h, dist)) {
    const closestDist = dist[closest]!;
    if (closestDist === MAX_DIST) break;
    const cd = graph[closest]!;
    for (let i = 1; i < cd.nedges; i++) {
      ngIncreaseKey(h, cd.edges[i]!, (closestDist + toDistType(cd.ewgts[i]!)) | 0, dist);
    }
    prevClosestDist = closestDist;
  }

  for (let i = 0; i < n; i++) {
    if (dist[i] === MAX_DIST) {
      dist[i] = MAX_DIST - prevClosestDist < 10 ? MAX_DIST : prevClosestDist + 10;
    }
  }
}
