// SPDX-License-Identifier: EPL-2.0

/**
 * Given a 1-D layout, construct a graph where close nodes in this layout are
 * adjacent. The only caller is `iterativePCA_1D`, on at least two nodes, with a
 * graph that always has weights, so C's `n == 0` and `graph[0].ewgts == NULL`
 * guards cannot fire here. C's heap capacity and reserved edge space are array
 * growth here.
 *
 * @see lib/neatogen/closest.c
 */

import { crand } from '../../common/crand.js';
import { gvQsort } from '../../util/bsd-qsort.js';
import type { VtxData } from './dijkstra.js';

/** Two nodes in the 1-D layout. @see lib/neatogen/closest.c:Pair */
interface Pair {
  readonly left: number;
  readonly right: number;
  /** Distance between the nodes in the layout. */
  readonly dist: number;
}

/** An auxiliary heap for finding the closest pair. @see lib/neatogen/closest.c:PairHeap */
interface PairHeap {
  data: Pair[];
  heapSize: number;
}

/**
 * `LT(i, j) || (EQ(i, j) && rand() % 2)`: ties draw from the libc stream.
 * @see lib/neatogen/closest.c:greaterPriority
 */
function greaterPriority(h: PairHeap, i: number, j: number): boolean {
  const a = h.data[i]!.dist;
  const b = h.data[j]!.dist;
  return a < b || (a === b && crand() % 2 !== 0);
}

/** @see lib/util/gv_math.h:SWAP */
function swap(h: PairHeap, i: number, j: number): void {
  const t = h.data[i]!;
  h.data[i] = h.data[j]!;
  h.data[j] = t;
}

/**
 * Children are `2*i` and `2*i+1` from a 0-based root, as C's macros, so the root
 * is its own left child and the comparison with itself still draws.
 * @see lib/neatogen/closest.c:heapify
 */
function heapify(h: PairHeap, start: number): void {
  let i = start;
  for (;;) {
    const l = 2 * i;
    const r = 2 * i + 1;
    let largest = l < h.heapSize && greaterPriority(h, l, i) ? l : i;
    if (r < h.heapSize && greaterPriority(h, r, largest)) largest = r;
    if (largest === i) break;
    swap(h, largest, i);
    i = largest;
  }
}

/** @see lib/neatogen/closest.c:initHeap */
function initHeap(place: Float64Array, ordering: readonly number[], n: number): PairHeap {
  const h: PairHeap = { data: [], heapSize: n - 1 };
  for (let i = 0; i < n - 1; i++) {
    const left = ordering[i]!;
    const right = ordering[i + 1]!;
    h.data.push({ left, right, dist: place[right]! - place[left]! });
  }
  for (let j = Math.trunc((n - 1) / 2); j >= 0; j--) heapify(h, j);
  return h;
}

/** @see lib/neatogen/closest.c:extractMax */
function extractMax(h: PairHeap): Pair | null {
  if (h.heapSize === 0) return null;
  const max = h.data[0]!;
  h.data[0] = h.data[h.heapSize - 1]!;
  h.heapSize--;
  heapify(h, 0);
  return max;
}

/** @see lib/neatogen/closest.c:insert */
function insert(h: PairHeap, edge: Pair): void {
  let i = h.heapSize;
  h.heapSize++;
  h.data[i] = edge;
  while (i > 0 && greaterPriority(h, i, Math.trunc(i / 2))) {
    swap(h, i, Math.trunc(i / 2));
    i = Math.trunc(i / 2);
  }
}

/** What `find_closest_pairs` tracks while extracting. */
interface PairScan {
  readonly place: Float64Array;
  readonly n: number;
  readonly ordering: readonly number[];
  readonly invOrdering: Int32Array;
  /** The leftmost neighbour of each node entered into the heap. */
  readonly left: Int32Array;
  /** The rightmost neighbour of each node entered into the heap. */
  readonly right: Int32Array;
  readonly heap: PairHeap;
}

/**
 * Insert to the heap the "descendant" pairs of an extracted pair.
 * @see lib/neatogen/closest.c:find_closest_pairs
 */
function insertDescendants(s: PairScan, pair: Pair): void {
  const { place, ordering, invOrdering, left, right, heap } = s;
  const leftIndex = invOrdering[pair.left]!;
  const rightIndex = invOrdering[pair.right]!;
  if (leftIndex > 0) {
    const neighbor = ordering[leftIndex - 1]!;
    if (invOrdering[right[neighbor]!]! < rightIndex) { // we have a new pair
      insert(heap, { left: neighbor, right: pair.right, dist: place[pair.right]! - place[neighbor]! });
      right[neighbor] = pair.right;
      left[pair.right] = neighbor;
    }
  }
  if (rightIndex < s.n - 1) {
    const neighbor = ordering[rightIndex + 1]!;
    if (invOrdering[left[neighbor]!]! > leftIndex) { // we have a new pair
      insert(heap, { left: pair.left, right: neighbor, dist: place[neighbor]! - place[pair.left]! });
      left[neighbor] = pair.left;
      right[pair.left] = neighbor;
    }
  }
}

/** Order the nodes by place, with libc qsort's permutation of ties. @see lib/neatogen/closest.c:cmp */
function orderByPlace(place: Float64Array, n: number): number[] {
  const ordering = Array.from({ length: n }, (_, i) => i);
  return gvQsort(ordering, (x, y) => {
    if (place[x]! < place[y]!) return -1;
    if (place[x]! > place[y]!) return 1;
    return 0;
  });
}

/**
 * The `numPairs` closest pairs in the 1-D layout `place`, as a stack.
 * @see lib/neatogen/closest.c:find_closest_pairs
 */
export function findClosestPairs(place: Float64Array, n: number, numPairs: number): Pair[] {
  const ordering = orderByPlace(place, n);
  const invOrdering = new Int32Array(n);
  for (let i = 0; i < n; i++) invOrdering[ordering[i]!] = i;
  const left = new Int32Array(n);
  const right = new Int32Array(n);
  const heap = initHeap(place, ordering, n);
  for (let i = 1; i < n; i++) left[ordering[i]!] = ordering[i - 1]!;
  for (let i = 0; i < n - 1; i++) right[ordering[i]!] = ordering[i + 1]!;

  const scan: PairScan = { place, n, ordering, invOrdering, left, right, heap };
  const stack: Pair[] = [];
  for (let i = 0; i < numPairs; i++) {
    const pair = extractMax(heap);
    if (pair === null) break; // not enough pairs
    stack.push(pair);
    insertDescendants(scan, pair);
  }
  return stack;
}

/** @see lib/neatogen/closest.c:add_edge */
function addEdge(graph: VtxData[], u: number, v: number): void {
  const gu = graph[u]!;
  const gv = graph[v]!;
  if (gu.edges.includes(v)) return; // edge already exists
  gu.edges.push(v);
  gu.ewgts.push(1);
  gu.nedges++;
  gv.edges.push(u);
  gv.ewgts.push(1);
  gv.nedges++;
  gu.ewgts[0]!--;
  gv.ewgts[0]!--;
}

/**
 * An unweighted graph of the popped edges, each node's self loop first.
 * @see lib/neatogen/closest.c:construct_graph
 */
function constructGraph(n: number, edgesStack: Pair[]): VtxData[] {
  const graph: VtxData[] = Array.from({ length: n }, (_, i) => ({ nedges: 1, edges: [i], ewgts: [0] }));
  for (let top = edgesStack.length - 1; top >= 0; top--) {
    addEdge(graph, edgesStack[top]!.left, edgesStack[top]!.right);
  }
  return graph;
}

/**
 * A graph with edges between the `numPairs` closest pairs in the 1-D space `place`.
 * @see lib/neatogen/closest.c:closest_pairs2graph
 */
export function closestPairs2Graph(place: Float64Array, n: number, numPairs: number): VtxData[] {
  return constructGraph(n, findClosestPairs(place, n, numPairs));
}
