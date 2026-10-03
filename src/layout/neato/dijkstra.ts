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
