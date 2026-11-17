// SPDX-License-Identifier: EPL-2.0

/**
 * Auxiliary edge construction and removal for the dot position phase.
 * @see lib/dotgen/position.c
 */

import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';
import type { Edge } from '../../model/edge.js';
import { Node as NodeClass } from '../../model/node.js';
import { Edge as EdgeClass } from '../../model/edge.js';
import { fastEdge, findFastEdge } from './fastgr.js';
import { SLACKNODE, EDGE_LABEL } from './rank.js';
import { selfRightSpace } from '../../common/splines-selfedge.js';
import { lateInt } from '../../common/nodeinit.js';
import { cround } from '../../common/arith.js';
import { agerrorf } from '../../common/agerr.js';
import { printfFixed } from '../../util/printf-round.js';

/** @see lib/common/const.h:CL_OFFSET */
export const CL_OFFSET = 8;

/** C `INT_MAX`: the longest aux edge `make_aux_edge` accepts. */
const INT_MAX = 2147483647;

/**
 * Cluster margin = `late_int(g, G_margin, CL_OFFSET, 0)`. The `margin` attribute
 * is resolved up the subgraph chain (matching `agxget` inheritance), so a
 * cluster with no own `margin` inherits an ancestor's; absent everywhere it
 * falls back to `CL_OFFSET`, and negatives clamp to 0. Used for both the
 * x-coordinate (`make_lrvn`/`make_lrconstraints`/separate clusters) and the
 * rank/y-coordinate (`set_ycoords`) cluster spacing.
 * @see lib/dotgen/position.c:397,436,460,642
 */
export function clusterMarginOf(g: Graph): number {
  let raw: string | undefined;
  for (let s: Graph | null = g; s !== null; s = s.parent) {
    const v = s.attrs.get('margin');
    if (v !== undefined) { raw = v; break; }
  }
  return lateInt(raw, CL_OFFSET, 0);
}

/** @see lib/common/const.h:BOTTOM_IX */
export const BOTTOM_IX = 0;
/** @see lib/common/const.h:RIGHT_IX */
export const RIGHT_IX = 1;
/** @see lib/common/const.h:TOP_IX */
export const TOP_IX = 2;
/** @see lib/common/const.h:LEFT_IX */
export const LEFT_IX = 3;

// ---------------------------------------------------------------------------
// Accessor helpers — each ?? is its own CCN=2 function so callers stay ≤10
// ---------------------------------------------------------------------------

/** @internal */
export function nodeRw(n: Node): number { return n.info.rw ?? 0; }

/** @internal */
export function nodeLw(n: Node): number { return n.info.lw ?? 0; }

/** @internal */
export function nodeOrder(n: Node): number { return n.info.order ?? 0; }

/** @internal */
export function nodeRank(n: Node): number { return n.info.rank ?? 0; }

/** @internal */
export function nodeUfSize(n: Node): number { return n.info.UF_size ?? 1; }

/** @internal */
export function edgeMinlen(e: Edge): number { return e.info.minlen ?? 1; }

/** @internal */
export function edgeWeight(e: Edge): number { return e.info.weight ?? 0; }

/** @internal */
export function edgeDist(e: Edge): number { return e.info.dist ?? 0; }

/** @internal */
export function graphNodesep(g: Graph): number { return g.info.nodesep ?? 0; }

/** @internal */
export function graphMinrank(g: Graph): number { return g.info.minrank ?? 0; }

/** @internal */
export function graphMaxrank(g: Graph): number { return g.info.maxrank ?? 0; }

/** @internal */
export function graphNclust(g: Graph): number { return g.info.n_cluster ?? 0; }

/** @internal */
export function graphHt1(g: Graph): number { return g.info.ht1 ?? 0; }

/** @internal */
export function graphHt2(g: Graph): number { return g.info.ht2 ?? 0; }

/** @internal */
export function graphRanksep(g: Graph): number { return g.info.ranksep ?? 0; }

// ---------------------------------------------------------------------------
// make_aux_edge — @see lib/dotgen/position.c:make_aux_edge
// ---------------------------------------------------------------------------

/**
 * The edge's two ports are the shared default port: C zeroes them inside the
 * Agedgeinfo_t it allocates here and never writes them. Its attributes are the
 * shared empty map: C binds no attribute record to an aux edge, only the
 * Agedgeinfo_t (issue #145).
 *
 * A length above INT_MAX is refused: the error prints and the result is null,
 * with no edge linked into the fast lists (graphviz 16.1.1, upstream
 * f86899fcc; 16.1.0 clamped the length). make_LR_constraints and
 * make_edge_pairs test the result and fail the layout; every other caller
 * ignores it, as C does, and simply has no edge there. The `%f` is
 * `printfFixed`: `toFixed` goes exponential at 1e21, and corpus 2781's length
 * is 7.2e25.
 * @see lib/dotgen/position.c:make_aux_edge
 */
export function makeAuxEdge(u: Node, v: Node, len: number, wt: number): Edge | null {
  if (len > INT_MAX) {
    agerrorf(
      `Edge length ${printfFixed(len, 6)} larger than maximum ${INT_MAX} allowed.\n`
      + 'Check for overwide node(s).',
    );
    return null;
  }
  const e = new EdgeClass(u, v, '', true, true);
  // C ROUND() is half away from zero. @see lib/dotgen/position.c:195
  e.info.minlen = cround(len);
  e.info.weight = wt;
  fastEdge(e);
  return e;
}

// ---------------------------------------------------------------------------
// allocate_aux_edges — @see lib/dotgen/position.c:allocate_aux_edges
// ---------------------------------------------------------------------------

/** @see lib/dotgen/position.c:allocate_aux_edges */
export function allocateAuxEdges(g: Graph): void {
  for (let n = g.info.nlist; n !== undefined; n = n.info.next) {
    n.info.save_in = n.info.in;
    n.info.save_out = n.info.out;
    const ni = n.info.out?.size ?? 0;
    const nj = n.info.in?.size ?? 0;
    n.info.in = { list: new Array(ni + nj + 3), size: 0 };
    n.info.out = { list: new Array(3), size: 0 };
  }
}

// ---------------------------------------------------------------------------
// make_LR_constraints helpers
// ---------------------------------------------------------------------------

/** LR node separation for a rank (accounts for edge labels).
 * C uses smaller separation (5) on odd ranks when the graph has edge labels
 * (real nodes sit on even ranks 0,2,4…). `abomination` inserts a flat-label
 * rank at -1 in C, but this 0-based port shifts every rank up by 1 instead
 * (AD-2), inverting the parity; `abomShift` undoes that so the parity matches C.
 *
 * The EDGE_LABEL gate reads `g.root`, not `g`: C is `GD_has_labels(g->root)`.
 * Under `pack` the layout graph is a component whose own has_labels is 0 (C
 * scopes only `edgelabel_ranks`, rank.c:170, to the layout graph) while the true
 * root carries the flag — so reading `g` here silently used the full nodesep on
 * odd ranks instead of C's `sep[1] = 5`, widening every packed component that
 * contains an edge label.
 * @see lib/dotgen/position.c:make_LR_constraints (GD_has_labels(g->root)) */
export function lrSep(g: Graph, rankIdx: number): number {
  const nodesep = graphNodesep(g);
  if (!((g.root.info.has_labels ?? 0) & EDGE_LABEL)) return nodesep;
  return (rankIdx + (g.info.abomShift ?? 0)) & 1 ? 5 : nodesep;
}

/**
 * Returns -1 when the aux edge is refused (16.1.1, upstream e62e35be5), else 0.
 * @see lib/dotgen/position.c:make_LR_constraints (single flat-edge constraint)
 */
export function processFlatEdge(g: Graph, u: Node, e: Edge): number {
  const nodesep = graphNodesep(g);
  const isOrdered = nodeOrder(u) < nodeOrder(e.head);
  const t0 = isOrdered ? e.tail : e.head;
  const h0 = isOrdered ? e.head : e.tail;
  const width = nodeRw(t0) + nodeLw(h0);
  // C declares `int m0` in make_LR_constraints (position.c), and ED_minlen is
  // also int, so every assignment of the double `…+ width` (width is fractional
  // from node rw/lw) truncates toward zero. Keeping m0 a float let a fractional
  // minlen (e.g. 180.4138 on the multiline-label Octagon/Parallelogram pair)
  // reach the x-coord network simplex, producing a fractional x-coordinate and a
  // sub-pixel shift exposed by set_aspect (pgram). @see position.c:make_LR_constraints
  let m0 = Math.trunc(edgeMinlen(e) * nodesep + width);
  const ex = findFastEdge(t0, h0);
  if (ex !== undefined) {
    // C ROUND(ED_dist(e)) — half away from zero. @see lib/dotgen/position.c:307
    m0 = Math.trunc(Math.max(m0, width + nodesep + cround(edgeDist(e))));
    ex.info.minlen = Math.max(ex.info.minlen ?? 1, m0);
    ex.info.weight = Math.max(ex.info.weight ?? 0, edgeWeight(e));
  } else if (!e.info.label) {
    if (makeAuxEdge(t0, h0, m0, edgeWeight(e)) === null) return -1;
  }
  return 0;
}

/**
 * Returns -1 at the first refused aux edge, else 0.
 * @see lib/dotgen/position.c:make_LR_constraints (flat-edge endpoint loop)
 */
export function makeFlatEdgeConstraints(g: Graph, u: Node): number {
  const flatOut = u.info.flat_out;
  if (!flatOut) return 0;
  for (let k = 0; k < flatOut.size; k++) {
    if (processFlatEdge(g, u, flatOut.list[k]) !== 0) return -1;
  }
  return 0;
}

/**
 * Returns -1 when either aux edge is refused (16.1.1, upstream e62e35be5); the
 * second is not tried after the first fails. Else 0.
 * @see lib/dotgen/position.c:make_LR_constraints (flat-label constraint body)
 */
export function applyFlatLabel(
  g: Graph,
  e: Edge,
  e0raw: Edge,
  e1raw: Edge,
): number {
  const nodesep = graphNodesep(g);
  const e0 = nodeOrder(e0raw.head) <= nodeOrder(e1raw.head) ? e0raw : e1raw;
  const e1 = e0 === e0raw ? e1raw : e0raw;
  // C: int m0 (position.c:222,276), so the half truncates
  const m0 = Math.trunc(edgeMinlen(e) * nodesep / 2);
  const m1a = m0 + nodeRw(e0.head) + nodeLw(e0.tail);
  if (!canReach(e0.tail, e0.head)) {
    if (makeAuxEdge(e0.head, e0.tail, m1a, edgeWeight(e)) === null) return -1;
  }
  const m1b = m0 + nodeRw(e1.tail) + nodeLw(e1.head);
  if (!canReach(e1.head, e1.tail)) {
    if (makeAuxEdge(e1.tail, e1.head, m1b, edgeWeight(e)) === null) return -1;
  }
  return 0;
}

/**
 * Returns -1 when a label aux edge is refused, else 0.
 * @see lib/dotgen/position.c:make_LR_constraints (flat-label constraints via ND_alg)
 */
export function makeFlatLabelConstraints(g: Graph, u: Node): number {
  const e = u.info.posAlg;
  if (!e) return 0;
  const so = u.info.save_out;
  if (!so || so.size < 2) return 0;
  return applyFlatLabel(g, e, so.list[0], so.list[1]);
}

/** @see lib/dotgen/position.c:go */
export function go(u: Node, v: Node): boolean {
  if (u === v) return true;
  const out = u.info.out;
  if (!out) return false;
  for (let i = 0; i < out.size; i++) {
    if (go(out.list[i].head, v)) return true;
  }
  return false;
}

/** @see lib/dotgen/position.c:canreach */
export function canReach(u: Node, v: Node): boolean {
  return go(u, v);
}

/** @see lib/dotgen/position.c:make_LR_constraints (self-edge width accumulation) */
export function selfWidth(u: Node): number {
  const other = u.info.other;
  if (!other || other.size === 0) return 0;
  let sw = 0;
  for (let k = 0; k < other.size; k++) {
    const e = other.list[k];
    if (e.tail === e.head) sw += selfRightSpace(e);
  }
  return sw;
}

/**
 * Returns the next `last`, or null when the adjacent-pair aux edge is refused
 * (16.1.1, upstream e62e35be5, 92ef8d508). C tests the edge before the
 * `ND_rank(v)` assignment, so `v`'s rank is not written on failure.
 * @see lib/dotgen/position.c:make_LR_constraints (per-rank inner loop, one node pair)
 */
export function lrRankPair(g: Graph, r: number, u: Node, v: Node, last: number): number | null {
  const nodesep = lrSep(g, r);
  const width = nodeRw(u) + nodeLw(v) + nodesep;
  if (makeAuxEdge(u, v, width, 0) === null) return null;
  /* C: `last = (ND_rank(v) = last + width)`. ND_rank is an int, so the
   * double `last + width` truncates toward zero on assignment, and the
   * truncated *integer* flows back into `last` — positions accumulate as
   * integers. The port's info.rank is a float, so without this truncation the
   * fractional node widths accumulate, perturbing the initial feasible ranks
   * (slack/tight-edge detection) and selecting a different vertex of the
   * x-coord NS optimal face (honda-tokoro weight=0 degeneracy).
   * @see lib/dotgen/position.c:make_LR_constraints */
  const next = Math.trunc(last + width);
  v.info.rank = next;
  return next;
}

/**
 * 16.1.1 skips a rank with no leader (`rank[i].v[0] == NULL` → `continue`).
 * The per-rank body is its own function here, so C's `continue` is a `return`.
 * @see lib/dotgen/position.c:make_LR_constraints (per-rank inner loop;
 *   16.1.1 :240-243, d49e3a529 "anticipate empty ranks")
 */
export function makeLrRankConstraints(g: Graph, r: number): number {
  const rank = g.info.rank!;
  const rk = rank[r];
  if (rk.v[0] == null) return 0;
  let last = 0;
  for (let j = 0; j < rk.n; j++) {
    const u = rk.v[j];
    u.info.mval = u.info.rw;
    u.info.rw = nodeRw(u) + selfWidth(u);
    if (rk.v[0]) u.info.rank = last;
    const v = rk.v[j + 1];
    if (v) {
      const next = lrRankPair(g, r, u, v, last);
      if (next === null) return -1;
      last = next;
    }
    if (makeFlatLabelConstraints(g, u) !== 0) return -1;
    if (makeFlatEdgeConstraints(g, u) !== 0) return -1;
  }
  if (rk.n > 0) rk.v[0].info.rank = 0;
  return 0;
}

/**
 * Returns -1 at the first refused aux edge (C's `return -1` from inside the
 * rank loops), else 0.
 * @see lib/dotgen/position.c:make_LR_constraints
 */
export function makeLrConstraints(g: Graph): number {
  for (let i = (g.info.minrank ?? 0); i <= (g.info.maxrank ?? 0); i++) {
    if (makeLrRankConstraints(g, i) !== 0) return -1;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// make_edge_pairs — @see lib/dotgen/position.c:make_edge_pairs
// ---------------------------------------------------------------------------

/**
 * Returns -1 when either aux edge is refused (16.1.1, upstream 73c1fd4d1,
 * f0d837f19), leaving the slack node unranked. Else 0.
 * @see lib/dotgen/position.c:make_edge_pairs (per-edge)
 */
export function addEdgePair(g: Graph, e: Edge): number {
  const sn = makeSlackNode(g);
  const hp = e.info.head_port.p;
  const tp = e.info.tail_port.p;
  // C: `int m0 = (ED_head_port(e).p.x - ED_tail_port(e).p.x)` truncates the
  // fractional port offset toward zero BEFORE the +1 and the aux-edge minlen
  // round (position.c:338). Keeping it as a float and letting makeAuxEdge round
  // m0+1 inflates the tail/head separation by 1pt for any fractional port
  // offset (e.g. a record field center), shifting the ported node's x by 1.
  const d = Math.trunc(hp.x - tp.x);
  const m0 = Math.max(0, d);
  const m1 = Math.max(0, -d);
  if (makeAuxEdge(sn, e.tail, m0 + 1, edgeWeight(e)) === null) return -1;
  if (makeAuxEdge(sn, e.head, m1 + 1, edgeWeight(e)) === null) return -1;
  sn.info.rank = Math.min(nodeRank(e.tail) - m0 - 1, nodeRank(e.head) - m1 - 1);
  return 0;
}

/**
 * Returns -1 at the first refused aux edge, else 0.
 * @see lib/dotgen/position.c:make_edge_pairs
 */
export function makeEdgePairs(g: Graph): number {
  for (let n = g.info.nlist; n !== undefined; n = n.info.next) {
    const so = n.info.save_out;
    if (!so) continue;
    for (let i = 0; i < so.size; i++) {
      if (addEdgePair(g, so.list[i]) !== 0) return -1;
    }
  }
  return 0;
}

/** Create a SLACKNODE virtual node and prepend to nlist. */
export function makeSlackNode(g: Graph): Node {
  const sn = new NodeClass(0, '', g);
  sn.info.node_type = SLACKNODE;
  sn.info.in = { list: [], size: 0 };
  sn.info.out = { list: [], size: 0 };
  sn.info.next = g.info.nlist;
  if (g.info.nlist !== undefined) g.info.nlist.info.prev = sn;
  g.info.nlist = sn;
  return sn;
}

// ---------------------------------------------------------------------------
// create_aux_edges / remove_aux_edges
// ---------------------------------------------------------------------------

/** @see lib/dotgen/position.c:create_aux_edges */
export function createAuxEdges(
  g: Graph,
  posClusters: (g: Graph) => void,
  compressGraph: (g: Graph) => void,
): number {
  allocateAuxEdges(g);
  const lrRc = makeLrConstraints(g);
  if (lrRc !== 0) return lrRc;
  const pairRc = makeEdgePairs(g);
  if (pairRc !== 0) return pairRc;
  posClusters(g);
  compressGraph(g);
  return 0;
}

/** @see lib/dotgen/position.c:remove_aux_edges (SLACKNODE removal loop) */
export function removeSlackNodes(g: Graph): void {
  let nprev: Node | undefined;
  let n = g.info.nlist;
  while (n !== undefined) {
    const nnext = n.info.next;
    if ((n.info.node_type ?? 0) === SLACKNODE) {
      if (nprev !== undefined) nprev.info.next = nnext;
      else g.info.nlist = nnext;
      if (nnext !== undefined) nnext.info.prev = nprev;
    } else {
      nprev = n;
    }
    n = nnext;
  }
}

/** @see lib/dotgen/position.c:remove_aux_edges (per-node cleanup) */
export function removeAuxEdgesNode(n: Node): void {
  const out = n.info.out;
  if (out) {
    for (let i = 0; i < out.size; i++) {
      out.list[i].info.weight = undefined;
    }
    out.list.length = 0; out.size = 0;
  }
  const inn = n.info.in;
  if (inn) { inn.list.length = 0; inn.size = 0; }
  n.info.out = n.info.save_out;
  n.info.in = n.info.save_in;
}

/** @see lib/dotgen/position.c:remove_aux_edges */
export function removeAuxEdges(g: Graph): void {
  for (let n = g.info.nlist; n !== undefined; n = n.info.next) {
    removeAuxEdgesNode(n);
  }
  removeSlackNodes(g);
}
