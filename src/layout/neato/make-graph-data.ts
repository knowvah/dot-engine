// SPDX-License-Identifier: EPL-2.0
/**
 * Neato's sparse graph (`vtx_data`) construction: `makeGraphData` and the
 * DIGCOLA edge-direction pass (`dfsCycle`, `acyclic`) it ends with.
 *
 * @see lib/neatogen/neatoinit.c
 */

import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';
import type { DirectedVtxData } from './opt-arrangement.js';

/** `MODE_IPSEP`, restated: init.ts imports this module. @see lib/neatogen/neatoprocs.h */
const MODE_IPSEP = 3;

/** `edists` value of an edge seen from its head (an in-edge). */
const EDIST_IN = 1;
/** `edists` value of an edge seen from its tail (an out-edge). */
const EDIST_OUT = -1;
/** `edists` value of an edge with `dir=none`. */
const EDIST_NONE = 0;

/** Any edge carries a len attr (C: agattr_text(g, AGEDGE, "len")). */
export function graphHasLen(g: Graph): boolean {
  for (const e of g.edges) {
    if (e.attrs.has('len')) return true;
  }
  return false;
}

/** `edists` of a graph built with `haveDir` (always an array there; `NULL` otherwise). */
const edistsOf = (v: DirectedVtxData): number[] => v.edists as number[];

/** One `dfsCycle` activation: the vertex and the next `edges` slot to examine. */
interface DfsFrame {
  readonly i: number;
  e: number;
}

/** The visit state C keeps in `ND_mark` / `ND_onstack`. */
interface DfsState {
  readonly mode: number;
  readonly mark: Uint8Array;
  readonly onstack: Uint8Array;
}

/**
 * Back edge `i -> j` (slot `e` of `i`): reverse it. In IPSEP mode make it an
 * in-edge at both ends, so that an edge constraint won't be generated!
 * @see lib/neatogen/neatoinit.c:dfsCycle
 */
function reverseBackEdge(graph: DirectedVtxData[], i: number, e: number, mode: number): void {
  const node = graph[i]!;
  const j = node.edges[e]!;
  edistsOf(node)[e] = mode === MODE_IPSEP ? EDIST_OUT : EDIST_IN;
  const target = graph[j]!;
  let f = 1;
  while (f < target.nedges && target.edges[f] !== i) f++;
  if (f >= target.nedges) throw new Error(`neato: edge ${i}-${j} has no reverse entry`);
  edistsOf(target)[f] = EDIST_OUT;
}

/**
 * dfs for breaking cycles in vtxdata. C recurses; the recursion is replaced by
 * an explicit stack of (vertex, next edge slot) frames, which visits in the
 * same order but cannot overflow the JS stack on a long path.
 * @see lib/neatogen/neatoinit.c:dfsCycle
 */
export function dfsCycle(graph: DirectedVtxData[], start: number, st: DfsState): void {
  const { mode, mark, onstack } = st;
  const stack: DfsFrame[] = [{ i: start, e: 1 }];
  mark[start] = 1;
  onstack[start] = 1;
  for (let frame = stack.at(-1); frame !== undefined; frame = stack.at(-1)) {
    const { i } = frame;
    const node = graph[i]!;
    if (frame.e >= node.nedges) {
      onstack[i] = 0;
      stack.pop();
      continue;
    }
    const e = frame.e++;
    if (edistsOf(node)[e] === EDIST_IN) continue; // in edge
    const j = node.edges[e]!;
    if (onstack[j]) {
      reverseBackEdge(graph, i, e, mode);
    } else if (!mark[j]) {
      mark[j] = 1;
      onstack[j] = 1;
      stack.push({ i: j, e: 1 });
    }
  }
}

/**
 * do a dfs of the vtx_data, looking for cycles, reversing edges. C keeps the
 * visit state in `ND_mark`/`ND_onstack`; it is local to this pass here.
 * @see lib/neatogen/neatoinit.c:acyclic
 */
export function acyclic(graph: DirectedVtxData[], nv: number, mode: number): void {
  const st: DfsState = { mode, mark: new Uint8Array(nv), onstack: new Uint8Array(nv) };
  for (let i = 0; i < nv; i++) {
    if (st.mark[i]) continue;
    dfsCycle(graph, i, st);
  }
}

/** `edists` of the edge `ep` as seen from `np`. @see lib/neatogen/neatoinit.c:makeGraphData */
function edgeDist(dir: string | undefined, np: Node, head: Node): number {
  if (dir !== undefined && dir.startsWith('none')) return EDIST_NONE;
  return np === head ? EDIST_IN : EDIST_OUT;
}

/** What `makeGraphData` was asked to build. */
interface GraphDataOpts {
  readonly haveLen: boolean;
  readonly haveDir: boolean;
}

/**
 * Append `np`'s neighbours (out-edges then in-edges, loops skipped, multi-edges
 * merged) to its entry.
 * @see lib/neatogen/neatoinit.c:makeGraphData
 */
function addNeighbours(g: Graph, np: Node, entry: DirectedVtxData, o: GraphDataOpts): void {
  const seen = new Map<number, number>();
  for (const ep of [...np.outEdges(g), ...np.inEdges(g)]) {
    if (ep.head === ep.tail) continue;
    const vp = ep.tail === np ? ep.head : ep.tail;
    const vid = vp.info.id!;
    const dist = o.haveLen ? (ep.info.dist ?? 0) : 1.0; // ED_dist (calloc 0)
    const idx = seen.get(vid);
    if (idx !== undefined) {
      if (o.haveLen) entry.ewgts[idx] = Math.max(entry.ewgts[idx]!, dist);
      continue;
    }
    seen.set(vid, entry.nedges);
    entry.edges.push(vid);
    if (o.haveLen || o.haveDir) entry.ewgts.push(dist); // C neatoinit.c:827: haveDir 1.0
    if (o.haveDir) edistsOf(entry).push(edgeDist(ep.attrs.get('dir'), np, ep.head));
    entry.nedges++;
  }
}

/**
 * C makeGraphData's vtx_data: per node out-edges then in-edges (agfstedge order), self at
 * index 0, duplicate neighbours merged (len keeps the max). ewgts: lens (default 1.0) if any
 * len attr, else 1.0 under haveDir (hier/ipsep), else absent (C NULL). Under haveDir `edists`
 * holds the direction of each first-seen edge (-1 tail, +1 head, 0 for dir=none) and the
 * graph is then made acyclic. eweights (haveWt) are not built: nothing on a supported path
 * reads them.
 * @see lib/neatogen/neatoinit.c:makeGraphData
 * @see lib/neatogen/stuff.c:setEdgeLen
 */
export function makeGraphDataC(
  g: Graph, nodeList: Node[], haveLen: boolean, haveDir: boolean, mode: number = -1,
): DirectedVtxData[] {
  const vtx: DirectedVtxData[] = nodeList.map((_, i) => ({
    nedges: 1, edges: [i], ewgts: haveLen || haveDir ? [0] : [],
    ...(haveDir ? { edists: [0] } : {}),
  }));
  for (const np of nodeList) addNeighbours(g, np, vtx[np.info.id!]!, { haveLen, haveDir });
  if (haveDir) acyclic(vtx, nodeList.length, mode); // make graph acyclic
  return vtx;
}
