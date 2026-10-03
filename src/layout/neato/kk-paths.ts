// SPDX-License-Identifier: EPL-2.0
/**
 * Kamada-Kawai ideal-distance setup: Dijkstra over edge lengths with C's
 * binary heap (`neato_enqueue`/`neato_dequeue`, `shortest_path`, `s1`,
 * `make_spring`) and `mds_model`.
 *
 * The C keeps the heap, its size and the source node in file-statics and the
 * per-node `ND_dist`/`ND_hops`/`ND_heapindex` in node records; here they live
 * in one {@link PathState} per run (no module state), indexed by `ND_id`.
 *
 * @see lib/neatogen/stuff.c
 */

/** One neighbour of a node: its id and the edge's `ED_dist`. */
export interface Neighbour {
  readonly id: number;
  readonly len: number;
}

/** Heap + per-node Dijkstra state. @see lib/neatogen/stuff.c (Heap, Heapsize) */
export interface PathState {
  readonly n: number;
  /** `GD_dist` as a flat n*n matrix. */
  readonly dist: Float64Array;
  /** `agfstedge` neighbours of each node, in C's iteration order. */
  readonly adj: readonly (readonly Neighbour[])[];
  /** `Initial_dist`. */
  readonly initialDist: number;
  readonly heap: Int32Array;
  heapSize: number;
  /** `ND_heapindex` (-1 = not queued). */
  readonly heapIndex: Int32Array;
  /** `ND_dist`. */
  readonly nd: Float64Array;
  /** `ND_hops`. */
  readonly hops: Int32Array;
}

/** Fresh path state for `n` nodes. @see lib/neatogen/stuff.c:shortest_path */
export function newPathState(
  n: number, dist: Float64Array, adj: readonly (readonly Neighbour[])[], initialDist: number,
): PathState {
  return {
    n, dist, adj, initialDist,
    heap: new Int32Array(n + 1), heapSize: 0,
    heapIndex: new Int32Array(n).fill(-1),
    nd: new Float64Array(n), hops: new Int32Array(n),
  };
}

/** @see lib/neatogen/stuff.c:heapup */
function heapUp(s: PathState, v: number): void {
  for (let i = s.heapIndex[v]!, par: number; i > 0; i = par) {
    par = (i - 1) >> 1;
    const u = s.heap[par]!;
    if (s.nd[u]! <= s.nd[v]!) break;
    s.heap[par] = v;
    s.heapIndex[v] = par;
    s.heap[i] = u;
    s.heapIndex[u] = i;
  }
}

/** @see lib/neatogen/stuff.c:heapdown */
function heapDown(s: PathState, v: number): void {
  let i = s.heapIndex[v]!;
  for (let left = 2 * i + 1; left < s.heapSize; left = 2 * i + 1) {
    const right = left + 1;
    const c = right < s.heapSize && s.nd[s.heap[right]!]! < s.nd[s.heap[left]!]! ? right : left;
    const u = s.heap[c]!;
    if (s.nd[v]! <= s.nd[u]!) break;
    s.heap[c] = v;
    s.heapIndex[v] = c;
    s.heap[i] = u;
    s.heapIndex[u] = i;
    i = c;
  }
}

/** @see lib/neatogen/stuff.c:neato_enqueue */
function enqueue(s: PathState, v: number): void {
  const i = s.heapSize++;
  s.heapIndex[v] = i;
  s.heap[i] = v;
  if (i > 0) heapUp(s, v);
}

/** Returns -1 when empty (C: NULL). @see lib/neatogen/stuff.c:neato_dequeue */
function dequeue(s: PathState): number {
  if (s.heapSize === 0) return -1;
  const rv = s.heap[0]!;
  const i = --s.heapSize;
  const v = s.heap[i]!;
  s.heap[0] = v;
  s.heapIndex[v] = 0;
  if (i > 1) heapDown(s, v);
  s.heapIndex[rv] = -1;
  return rv;
}

/** @see lib/neatogen/stuff.c:make_spring */
function makeSpring(s: PathState, u: number, v: number, f: number): void {
  s.dist[u * s.n + v] = f;
  s.dist[v * s.n + u] = f;
}

/** Single-source shortest paths from `src`. @see lib/neatogen/stuff.c:s1 */
function s1(s: PathState, src: number): void {
  s.nd.fill(s.initialDist);
  s.nd[src] = 0;
  s.hops[src] = 0;
  enqueue(s, src);
  for (let v = dequeue(s); v >= 0; v = dequeue(s)) {
    if (v !== src) makeSpring(s, src, v, s.nd[v]!);
    for (const { id: u, len } of s.adj[v]!) {
      const f = s.nd[v]! + len;
      if (s.nd[u]! <= f) continue;
      s.nd[u] = f;
      if (s.heapIndex[u]! >= 0) heapUp(s, u);
      else {
        s.hops[u] = s.hops[v]! + 1;
        enqueue(s, u);
      }
    }
  }
}

/** All-pairs shortest paths into `GD_dist`. @see lib/neatogen/stuff.c:shortest_path */
export function shortestPath(s: PathState): void {
  for (let v = 0; v < s.n; v++) s1(s, v);
}

/**
 * Overwrite `GD_dist` with edge lengths. C indexes the matrix with `AGSEQ`
 * (1-based), so the last node's row falls outside the n*n allocation (heap
 * overflow in C); out-of-range writes are dropped here.
 * @see lib/neatogen/neatoinit.c:mds_model
 */
export function mdsModel(
  dist: Float64Array, n: number, edges: readonly { tailSeq: number; headSeq: number; len: number }[],
): void {
  for (const { tailSeq: i, headSeq: j, len } of edges) {
    if (i === j) continue;
    for (const k of [i * n + j, j * n + i]) if (k < dist.length) dist[k] = len;
  }
}
