// SPDX-License-Identifier: EPL-2.0
/**
 * T4a — branch-coverage tests for layout/dot/position-aux.ts.
 *
 * D1: pure/small-fixture helpers, so unit-tested directly against
 * hand-built Graph/Node/Edge fixtures (mirroring rank.branch.test.ts /
 * ns.branch.test.ts conventions). Each describe block covers one exported
 * function and drives every conditional branch to a concrete value.
 *
 * @see lib/dotgen/position.c
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import type { RankEntry } from '../../model/rankEntry.js';
import { fastEdge } from './fastgr.js';
import { EDGE_LABEL, SLACKNODE } from './rank.js';
import {
  CL_OFFSET, clusterMarginOf,
  nodeRw, nodeLw, nodeOrder, nodeRank, nodeUfSize,
  edgeMinlen, edgeWeight, edgeDist,
  graphNodesep, graphMinrank, graphMaxrank, graphNclust, graphHt1, graphHt2, graphRanksep,
  makeAuxEdge, allocateAuxEdges,
  lrSep, processFlatEdge, makeFlatEdgeConstraints, applyFlatLabel, makeFlatLabelConstraints,
  go, canReach, selfWidth, lrRankPair, makeLrRankConstraints, makeLrConstraints,
  addEdgePair, makeEdgePairs, makeSlackNode, createAuxEdges,
  removeSlackNodes, removeAuxEdgesNode, removeAuxEdges,
} from './position-aux.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeRankEntry(v: Node[]): RankEntry {
  return {
    n: v.length, v, an: v.length, av: v,
    ht1: 0, ht2: 0, pht1: 0, pht2: 0,
    candidate: false, valid: true, cache_nc: 0,
  };
}

/** Wire tail->head chain into fast-graph out/in edge lists (fastEdge). */
function link(tail: Node, head: Node): Edge {
  const e = new Edge(tail, head, '');
  fastEdge(e);
  return e;
}

// ---------------------------------------------------------------------------
// clusterMarginOf  @see position.c:397,436,460,642
// ---------------------------------------------------------------------------

describe('clusterMarginOf', () => {
  it('reads margin from the graph itself', () => {
    const g = new Graph('g', 'directed');
    g.attrs.set('margin', '20');
    expect(clusterMarginOf(g)).toBe(20);
  });
  it('walks up to an ancestor when the graph itself has no margin', () => {
    const root = new Graph('root', 'directed');
    root.attrs.set('margin', '12');
    const sub = new Graph('sub', 'directed');
    sub.parent = root;
    expect(clusterMarginOf(sub)).toBe(12);
  });
  it('falls back to CL_OFFSET when no ancestor has margin', () => {
    const g = new Graph('g', 'directed');
    expect(clusterMarginOf(g)).toBe(CL_OFFSET);
  });
  it('clamps a negative margin to 0', () => {
    const g = new Graph('g', 'directed');
    g.attrs.set('margin', '-5');
    expect(clusterMarginOf(g)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Accessor helpers — each ?? exercised both defined and undefined
// ---------------------------------------------------------------------------

describe('accessor helpers — defined and undefined branches', () => {
  it('nodeRw / nodeLw read defined values', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    n.info.rw = 7; n.info.lw = 3;
    expect(nodeRw(n)).toBe(7);
    expect(nodeLw(n)).toBe(3);
  });
  it('nodeRw / nodeLw fall back to 0 (rw/lw are required fields, defaulted ' +
    'to 0 by makeNodeInfo — force undefined at runtime to reach the ?? arm, ' +
    'matching the rank.branch.test.ts dotRank convention)', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    n.info.rw = undefined as unknown as number;
    n.info.lw = undefined as unknown as number;
    expect(nodeRw(n)).toBe(0);
    expect(nodeLw(n)).toBe(0);
  });
  it('nodeOrder / nodeRank defined vs undefined', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    expect(nodeOrder(n)).toBe(0);
    expect(nodeRank(n)).toBe(0);
    n.info.order = 2; n.info.rank = 4;
    expect(nodeOrder(n)).toBe(2);
    expect(nodeRank(n)).toBe(4);
  });
  it('nodeUfSize defaults to 1, overridable', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    expect(nodeUfSize(n)).toBe(1);
    n.info.UF_size = 5;
    expect(nodeUfSize(n)).toBe(5);
  });
  it('edgeMinlen / edgeWeight / edgeDist defined vs undefined', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g); const b = new Node(1, 'b', g);
    const e = new Edge(a, b, '');
    expect(edgeMinlen(e)).toBe(1);
    expect(edgeWeight(e)).toBe(0);
    expect(edgeDist(e)).toBe(0);
    e.info.minlen = 3; e.info.weight = 9; e.info.dist = 2;
    expect(edgeMinlen(e)).toBe(3);
    expect(edgeWeight(e)).toBe(9);
    expect(edgeDist(e)).toBe(2);
  });
  it('graphNodesep / graphMinrank / graphMaxrank defined vs undefined', () => {
    const g = new Graph('g', 'directed');
    expect(graphNodesep(g)).toBe(0);
    expect(graphMinrank(g)).toBe(0);
    expect(graphMaxrank(g)).toBe(0);
    g.info.nodesep = 18; g.info.minrank = 1; g.info.maxrank = 3;
    expect(graphNodesep(g)).toBe(18);
    expect(graphMinrank(g)).toBe(1);
    expect(graphMaxrank(g)).toBe(3);
  });
  it('graphNclust / graphHt1 / graphHt2 / graphRanksep defined vs undefined', () => {
    const g = new Graph('g', 'directed');
    expect(graphNclust(g)).toBe(0);
    expect(graphHt1(g)).toBe(0);
    expect(graphHt2(g)).toBe(0);
    expect(graphRanksep(g)).toBe(0);
    g.info.n_cluster = 2; g.info.ht1 = 10; g.info.ht2 = 11; g.info.ranksep = 36;
    expect(graphNclust(g)).toBe(2);
    expect(graphHt1(g)).toBe(10);
    expect(graphHt2(g)).toBe(11);
    expect(graphRanksep(g)).toBe(36);
  });
});

// ---------------------------------------------------------------------------
// makeAuxEdge  @see position.c:make_aux_edge
// ---------------------------------------------------------------------------

describe('makeAuxEdge', () => {
  it('rounds len half-away-from-zero and links tail/head fast edges', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g); const v = new Node(1, 'v', g);
    const e = makeAuxEdge(u, v, 4.5, 7);
    expect(e.info.minlen).toBe(5); // half away from zero
    expect(e.info.weight).toBe(7);
    expect(u.info.out?.list).toContain(e);
    expect(v.info.in?.list).toContain(e);
  });
  it('clamps len to INT32_MAX before rounding', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g); const v = new Node(1, 'v', g);
    const e = makeAuxEdge(u, v, 1e20, 0);
    expect(e.info.minlen).toBe(2147483647);
  });
});

// ---------------------------------------------------------------------------
// allocateAuxEdges  @see position.c:allocate_aux_edges
// ---------------------------------------------------------------------------

describe('allocateAuxEdges', () => {
  it('sizes in/out arrays using existing out/in sizes (defined branch)', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    n.info.out = { list: [new Edge(n, n, '')], size: 1 };
    n.info.in = { list: [new Edge(n, n, ''), new Edge(n, n, '')], size: 2 };
    g.info.nlist = n;
    allocateAuxEdges(g);
    expect(n.info.save_out?.size).toBe(1);
    expect(n.info.save_in?.size).toBe(2);
    expect(n.info.in?.list.length).toBe(1 + 2 + 3); // ni+nj+3
    expect(n.info.out?.list.length).toBe(3);
    expect(n.info.in?.size).toBe(0);
    expect(n.info.out?.size).toBe(0);
  });
  it('defaults ni/nj to 0 when out/in are undefined, and walks the chain', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g);
    a.info.next = b;
    g.info.nlist = a;
    allocateAuxEdges(g);
    expect(a.info.in?.list.length).toBe(3); // 0+0+3
    expect(b.info.save_in).toBeUndefined();
    expect(b.info.in?.list.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// lrSep  @see position.c:make_LR_constraints (sep[] selection)
// ---------------------------------------------------------------------------

describe('lrSep', () => {
  it('returns plain nodesep when has_labels lacks EDGE_LABEL', () => {
    const g = new Graph('g', 'directed');
    g.root = g;
    g.info.nodesep = 18;
    g.info.has_labels = 0;
    expect(lrSep(g, 1)).toBe(18);
  });
  it('returns 5 on an odd rank when EDGE_LABEL is set (abomShift unset -> 0)', () => {
    const g = new Graph('g', 'directed');
    g.root = g;
    g.info.nodesep = 18;
    g.info.has_labels = EDGE_LABEL;
    expect(lrSep(g, 1)).toBe(5);
    expect(lrSep(g, 2)).toBe(18); // even rank -> full nodesep
  });
  it('abomShift flips the odd/even parity', () => {
    const g = new Graph('g', 'directed');
    g.root = g;
    g.info.nodesep = 18;
    g.info.has_labels = EDGE_LABEL;
    g.info.abomShift = 1;
    expect(lrSep(g, 1)).toBe(18); // (1+1)&1 == 0 -> full nodesep
    expect(lrSep(g, 2)).toBe(5); // (2+1)&1 == 1 -> 5
  });
  it('falls back to 0 when g.root.info.has_labels is undefined at runtime', () => {
    const g = new Graph('g', 'directed');
    g.root = g;
    g.info.nodesep = 9;
    g.info.has_labels = undefined as unknown as number;
    expect(lrSep(g, 1)).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// processFlatEdge  @see position.c:make_LR_constraints (flat-edge constraint)
// ---------------------------------------------------------------------------

describe('processFlatEdge', () => {
  it('orders t0/h0 by node order (u.order < head.order -> tail/head as-is)', () => {
    const g = new Graph('g', 'directed');
    g.info.nodesep = 10;
    const u = new Node(0, 'u', g); u.info.order = 0;
    const h = new Node(1, 'h', g); h.info.order = 1;
    const e = new Edge(u, h, '');
    e.info.minlen = 1;
    processFlatEdge(g, u, e);
    expect(u.info.out?.size).toBe(1); // new aux edge created (no fast edge existed)
  });
  it('orders t0/h0 swapped when u.order >= head.order', () => {
    const g = new Graph('g', 'directed');
    g.info.nodesep = 10;
    const u = new Node(0, 'u', g); u.info.order = 5;
    const h = new Node(1, 'h', g); h.info.order = 1;
    const e = new Edge(u, h, '');
    e.info.minlen = 1;
    processFlatEdge(g, u, e);
    expect(h.info.out?.size).toBe(1); // aux edge from h (t0) to u (h0)
  });
  it('updates an existing fast edge, defaulting its minlen/weight when unset', () => {
    const g = new Graph('g', 'directed');
    g.info.nodesep = 10;
    const t0 = new Node(0, 't0', g); t0.info.order = 0;
    const h0 = new Node(1, 'h0', g); h0.info.order = 1;
    const existing = link(t0, h0); // registered via fastEdge, minlen/weight left unset
    const e = new Edge(t0, h0, '');
    e.info.minlen = 2; e.info.weight = 4; e.info.dist = 1.5;
    processFlatEdge(g, t0, e);
    // ex.info.minlen ?? 1 and ex.info.weight ?? 0 both exercised (were undefined)
    expect(existing.info.minlen).toBeGreaterThan(1);
    expect(existing.info.weight).toBe(4);
  });
  it('updates an existing fast edge that already has minlen/weight set', () => {
    const g = new Graph('g', 'directed');
    g.info.nodesep = 10;
    const t0 = new Node(0, 't0', g); t0.info.order = 0;
    const h0 = new Node(1, 'h0', g); h0.info.order = 1;
    const existing = link(t0, h0);
    existing.info.minlen = 100;
    existing.info.weight = 50;
    const e = new Edge(t0, h0, '');
    e.info.minlen = 1; e.info.weight = 1;
    processFlatEdge(g, t0, e);
    expect(existing.info.minlen).toBe(100); // Math.max keeps the larger value
    expect(existing.info.weight).toBe(50);
  });
  it('adds no edge when no fast edge exists and the flat edge carries a label', () => {
    const g = new Graph('g', 'directed');
    g.info.nodesep = 10;
    const u = new Node(0, 'u', g); u.info.order = 0;
    const h = new Node(1, 'h', g); h.info.order = 1;
    const e = new Edge(u, h, '');
    e.info.minlen = 1;
    e.info.label = { text: 'x' } as never;
    processFlatEdge(g, u, e);
    expect(u.info.out).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// makeFlatEdgeConstraints  @see position.c:make_LR_constraints (flat-out loop)
// ---------------------------------------------------------------------------

describe('makeFlatEdgeConstraints', () => {
  it('is a no-op when flat_out is undefined', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g);
    expect(() => makeFlatEdgeConstraints(g, u)).not.toThrow();
    expect(u.info.out).toBeUndefined();
  });
  it('processes every flat_out edge', () => {
    const g = new Graph('g', 'directed');
    g.info.nodesep = 10;
    const u = new Node(0, 'u', g); u.info.order = 0;
    const h = new Node(1, 'h', g); h.info.order = 1;
    const e = new Edge(u, h, '');
    e.info.minlen = 1;
    u.info.flat_out = { list: [e], size: 1 };
    makeFlatEdgeConstraints(g, u);
    expect(u.info.out?.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// go / canReach  @see position.c:go / canreach
// ---------------------------------------------------------------------------

describe('go / canReach', () => {
  it('u === v returns true immediately', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g);
    expect(go(u, u)).toBe(true);
  });
  it('returns false when out is undefined (no path)', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g); const v = new Node(1, 'v', g);
    expect(go(u, v)).toBe(false);
  });
  it('finds v through a single hop, bubbling the true result up', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g); const v = new Node(1, 'v', g);
    const e = new Edge(u, v, '');
    u.info.out = { list: [e], size: 1 };
    expect(canReach(u, v)).toBe(true);
  });
  it('exhausts the out-edge loop without finding v', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g); const mid = new Node(1, 'mid', g);
    const v = new Node(2, 'v', g); // unreachable
    const e = new Edge(u, mid, '');
    u.info.out = { list: [e], size: 1 };
    expect(canReach(u, v)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applyFlatLabel  @see position.c:make_LR_constraints (flat-label body)
// ---------------------------------------------------------------------------

describe('applyFlatLabel', () => {
  it('keeps e0raw/e1raw order when e0raw.head.order <= e1raw.head.order', () => {
    const g = new Graph('g', 'directed');
    g.info.nodesep = 10;
    const lbl = new Node(0, 'lbl', g);
    const h0 = new Node(1, 'h0', g); h0.info.order = 0;
    const h1 = new Node(2, 'h1', g); h1.info.order = 1;
    const e = new Edge(lbl, lbl, ''); e.info.minlen = 4;
    const e0raw = new Edge(lbl, h0, '');
    const e1raw = new Edge(lbl, h1, '');
    applyFlatLabel(g, e, e0raw, e1raw);
    // both endpoints unreachable via out edges -> both aux edges created
    expect(h0.info.out?.size).toBe(1);
    expect(lbl.info.out?.size).toBe(1);
  });
  it('swaps e0raw/e1raw order when e0raw.head.order > e1raw.head.order', () => {
    const g = new Graph('g', 'directed');
    g.info.nodesep = 10;
    const lbl = new Node(0, 'lbl', g);
    const h0 = new Node(1, 'h0', g); h0.info.order = 5;
    const h1 = new Node(2, 'h1', g); h1.info.order = 1;
    const e = new Edge(lbl, lbl, ''); e.info.minlen = 4;
    const e0raw = new Edge(lbl, h0, '');
    const e1raw = new Edge(lbl, h1, '');
    applyFlatLabel(g, e, e0raw, e1raw);
    expect(h1.info.out?.size).toBe(1);
  });
  it('skips the e0 aux edge when e0.tail already canReach e0.head', () => {
    const g = new Graph('g', 'directed');
    g.info.nodesep = 10;
    const lbl = new Node(0, 'lbl', g);
    const h0 = new Node(1, 'h0', g); h0.info.order = 0;
    const h1 = new Node(2, 'h1', g); h1.info.order = 1;
    const e = new Edge(lbl, lbl, ''); e.info.minlen = 4;
    const e0raw = new Edge(lbl, h0, '');
    const e1raw = new Edge(lbl, h1, '');
    // e0 = e0raw (order 0<=1): e0.tail=lbl, e0.head=h0 -> make lbl canReach h0
    const direct = new Edge(lbl, h0, '');
    lbl.info.out = { list: [direct], size: 1 };
    applyFlatLabel(g, e, e0raw, e1raw);
    expect(h0.info.out).toBeUndefined(); // makeAuxEdge(h0, lbl, ...) skipped
  });
  it('skips the e1 aux edge when e1.head already canReach e1.tail', () => {
    const g = new Graph('g', 'directed');
    g.info.nodesep = 10;
    const lbl = new Node(0, 'lbl', g);
    const h0 = new Node(1, 'h0', g); h0.info.order = 0;
    const h1 = new Node(2, 'h1', g); h1.info.order = 1;
    const e = new Edge(lbl, lbl, ''); e.info.minlen = 4;
    const e0raw = new Edge(lbl, h0, '');
    const e1raw = new Edge(lbl, h1, '');
    // e1 = e1raw: e1.tail=lbl, e1.head=h1 -> make h1 canReach lbl
    const direct = new Edge(h1, lbl, '');
    h1.info.out = { list: [direct], size: 1 };
    applyFlatLabel(g, e, e0raw, e1raw);
    // makeAuxEdge(lbl, h1, ...) skipped -> h1.info.out keeps only the direct edge
    expect(h1.info.out?.size).toBe(1);
    expect(lbl.info.out).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// makeFlatLabelConstraints  @see position.c:make_LR_constraints (ND_alg gate)
// ---------------------------------------------------------------------------

describe('makeFlatLabelConstraints', () => {
  it('is a no-op when posAlg is unset', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g);
    expect(() => makeFlatLabelConstraints(g, u)).not.toThrow();
  });
  it('returns early when save_out is undefined', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g);
    const h0 = new Node(1, 'h0', g); const h1 = new Node(2, 'h1', g);
    u.info.posAlg = new Edge(u, u, '');
    expect(() => makeFlatLabelConstraints(g, u)).not.toThrow();
    expect(h0.info.out).toBeUndefined();
    expect(h1.info.out).toBeUndefined();
  });
  it('returns early when save_out has fewer than 2 entries', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g);
    u.info.posAlg = new Edge(u, u, '');
    u.info.save_out = { list: [new Edge(u, u, '')], size: 1 };
    expect(() => makeFlatLabelConstraints(g, u)).not.toThrow();
  });
  it('invokes applyFlatLabel when posAlg and >=2 save_out entries are present', () => {
    const g = new Graph('g', 'directed');
    g.info.nodesep = 10;
    const u = new Node(0, 'u', g);
    const h0 = new Node(1, 'h0', g); h0.info.order = 0;
    const h1 = new Node(2, 'h1', g); h1.info.order = 1;
    u.info.posAlg = new Edge(u, u, '');
    u.info.posAlg.info.minlen = 2;
    const e0raw = new Edge(u, h0, '');
    const e1raw = new Edge(u, h1, '');
    u.info.save_out = { list: [e0raw, e1raw], size: 2 };
    makeFlatLabelConstraints(g, u);
    expect(h0.info.out?.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// selfWidth  @see position.c:make_LR_constraints (self-edge width accumulation)
// ---------------------------------------------------------------------------

describe('selfWidth', () => {
  it('returns 0 when other is undefined', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g);
    expect(selfWidth(u)).toBe(0);
  });
  it('returns 0 when other is defined but empty', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g);
    u.info.other = { list: [], size: 0 };
    expect(selfWidth(u)).toBe(0);
  });
  it('sums selfRightSpace only for true self-loop edges, skipping non-self ones', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g);
    const w = new Node(1, 'w', g);
    const selfLoop = new Edge(u, u, '');
    const notSelf = new Edge(u, w, '');
    u.info.other = { list: [selfLoop, notSelf], size: 2 };
    expect(selfWidth(u)).toBe(18); // SELF_EDGE_SIZE, no label
  });
});

// ---------------------------------------------------------------------------
// lrRankPair  @see position.c:make_LR_constraints (per-rank inner loop pair)
// ---------------------------------------------------------------------------

describe('lrRankPair', () => {
  it('computes width, creates the aux edge, and truncates the accumulated rank', () => {
    const g = new Graph('g', 'directed');
    g.root = g;
    g.info.nodesep = 10;
    const u = new Node(0, 'u', g); u.info.rw = 2.7;
    const v = new Node(1, 'v', g); v.info.lw = 1.3;
    const next = lrRankPair(g, 0, u, v, 5.9);
    // width = 2.7 + 1.3 + 10 = 14, last = trunc(5.9+14) = 19
    expect(next).toBe(19);
    expect(v.info.rank).toBe(19);
    expect(u.info.out?.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// makeLrRankConstraints  @see position.c:make_LR_constraints (per-rank loop)
// ---------------------------------------------------------------------------

// NOTE (unreachable-by-design): the `if (rk.v[0])` false branch (L266) can
// never be exercised. `rk.v[0]` is read as a fixed reference throughout the
// loop; for the j=0 iteration to reach that check at all, `u = rk.v[0]` must
// already have been dereferenced successfully two lines earlier
// (`u.info.mval = u.info.rw`), which requires rk.v[0] to be truthy. Since
// rk.v[0] never changes mid-loop, every later iteration (j>=1) observes the
// same already-proven-truthy value. Forcing rk.v[0] to be falsy while rk.n>0
// crashes at `u.info.mval` (j=0) before this line is ever reached — the
// guard is a structural invariant, not a reachable false branch.

describe('makeLrRankConstraints', () => {
  it('assigns rank=0 to the last node when the rank is non-empty (v defined false branch)', () => {
    const g = new Graph('g', 'directed');
    g.root = g;
    g.info.nodesep = 10;
    const a = new Node(0, 'a', g);
    const rk = makeRankEntry([a]);
    g.info.rank = [rk];
    makeLrRankConstraints(g, 0);
    expect(a.info.rank).toBe(0); // final unconditional reset (L272)
  });
  it('is a no-op (skips the final rank reset) for an empty rank', () => {
    const g = new Graph('g', 'directed');
    g.root = g;
    const rk = makeRankEntry([]);
    g.info.rank = [rk];
    expect(() => makeLrRankConstraints(g, 0)).not.toThrow();
  });
  it('chains multiple nodes, calling lrRankPair for each adjacent v', () => {
    const g = new Graph('g', 'directed');
    g.root = g;
    g.info.nodesep = 10;
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g);
    const rk = makeRankEntry([a, b]);
    g.info.rank = [rk];
    makeLrRankConstraints(g, 0);
    expect(a.info.out?.size).toBe(1); // lrRankPair(a,b) made an aux edge
    expect(b.info.rank).toBeGreaterThan(0);
    expect(a.info.rank).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// makeLrConstraints  @see position.c:make_LR_constraints (rank loop)
// ---------------------------------------------------------------------------

describe('makeLrConstraints', () => {
  it('defaults minrank/maxrank to 0 when unset, covering a single rank', () => {
    const g = new Graph('g', 'directed');
    g.root = g;
    const a = new Node(0, 'a', g);
    g.info.rank = [makeRankEntry([a])];
    expect(() => makeLrConstraints(g)).not.toThrow();
    expect(a.info.rank).toBe(0);
  });
  it('iterates every rank between explicit minrank and maxrank', () => {
    const g = new Graph('g', 'directed');
    g.root = g;
    g.info.minrank = 0; g.info.maxrank = 1;
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g);
    g.info.rank = [makeRankEntry([a]), makeRankEntry([b])];
    makeLrConstraints(g);
    expect(a.info.rank).toBe(0);
    expect(b.info.rank).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// addEdgePair  @see position.c:make_edge_pairs (per-edge)
// ---------------------------------------------------------------------------

describe('addEdgePair', () => {
  it('handles a positive port-x delta (head right of tail)', () => {
    const g = new Graph('g', 'directed');
    const t = new Node(0, 't', g); t.info.rank = 10;
    const h = new Node(1, 'h', g); h.info.rank = 20;
    const e = new Edge(t, h, '');
    e.info.head_port.p.x = 8;
    e.info.tail_port.p.x = 2;
    addEdgePair(g, e);
    const sn = g.info.nlist!;
    expect(sn.info.node_type).toBe(SLACKNODE);
    // d=6 -> m0=6,m1=0 -> sn.rank = min(10-6-1, 20-0-1) = 3
    expect(sn.info.rank).toBe(3);
  });
  it('handles a negative port-x delta (head left of tail)', () => {
    const g = new Graph('g', 'directed');
    const t = new Node(0, 't', g); t.info.rank = 10;
    const h = new Node(1, 'h', g); h.info.rank = 20;
    const e = new Edge(t, h, '');
    e.info.head_port.p.x = 2;
    e.info.tail_port.p.x = 8;
    addEdgePair(g, e);
    const sn = g.info.nlist!;
    // d=-6 -> m0=0,m1=6 -> sn.rank = min(10-0-1, 20-6-1) = 9
    expect(sn.info.rank).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// makeEdgePairs  @see position.c:make_edge_pairs
// ---------------------------------------------------------------------------

describe('makeEdgePairs', () => {
  it('skips nodes with no save_out (continue branch)', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    g.info.nlist = n;
    expect(() => makeEdgePairs(g)).not.toThrow();
    expect(g.info.nlist).toBe(n); // no slack node was prepended
  });
  it('processes every save_out edge for every node in the chain', () => {
    const g = new Graph('g', 'directed');
    const t = new Node(0, 't', g); t.info.rank = 5;
    const h = new Node(1, 'h', g); h.info.rank = 6;
    const e = new Edge(t, h, '');
    t.info.save_out = { list: [e], size: 1 };
    t.info.next = undefined;
    g.info.nlist = t;
    makeEdgePairs(g);
    expect(g.info.nlist?.info.node_type).toBe(SLACKNODE); // slack node prepended
  });
});

// ---------------------------------------------------------------------------
// makeSlackNode  @see position-aux.ts (SLACKNODE creation + nlist prepend)
// ---------------------------------------------------------------------------

describe('makeSlackNode', () => {
  it('prepends to an empty nlist (nlist undefined -> else branch)', () => {
    const g = new Graph('g', 'directed');
    const sn = makeSlackNode(g);
    expect(g.info.nlist).toBe(sn);
    expect(sn.info.node_type).toBe(SLACKNODE);
  });
  it('prepends to a non-empty nlist, wiring prev on the old head', () => {
    const g = new Graph('g', 'directed');
    const first = new Node(0, 'first', g);
    g.info.nlist = first;
    const sn = makeSlackNode(g);
    expect(g.info.nlist).toBe(sn);
    expect(sn.info.next).toBe(first);
    expect(first.info.prev).toBe(sn);
  });
});

// ---------------------------------------------------------------------------
// createAuxEdges  @see position.c:create_aux_edges
// ---------------------------------------------------------------------------

describe('createAuxEdges', () => {
  it('calls each phase in order: allocate, LR, edge-pairs, posClusters, compress', () => {
    const g = new Graph('g', 'directed');
    g.root = g;
    g.info.minrank = 0; g.info.maxrank = 0;
    g.info.rank = [makeRankEntry([])];
    const calls: string[] = [];
    createAuxEdges(
      g,
      (gg) => { expect(gg).toBe(g); calls.push('posClusters'); },
      (gg) => { expect(gg).toBe(g); calls.push('compressGraph'); },
    );
    expect(calls).toEqual(['posClusters', 'compressGraph']);
  });
});

// ---------------------------------------------------------------------------
// removeSlackNodes  @see position.c:remove_aux_edges (SLACKNODE loop)
// ---------------------------------------------------------------------------

describe('removeSlackNodes', () => {
  it('leaves a chain of ordinary nodes (node_type undefined) untouched', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g); const b = new Node(1, 'b', g);
    a.info.next = b; b.info.prev = a;
    g.info.nlist = a;
    removeSlackNodes(g);
    expect(g.info.nlist).toBe(a);
    expect(a.info.next).toBe(b);
  });
  it('removes a SLACKNODE at the head (nprev undefined -> nlist retargeted)', () => {
    const g = new Graph('g', 'directed');
    const sn = new Node(0, 'sn', g); sn.info.node_type = SLACKNODE;
    const b = new Node(1, 'b', g);
    sn.info.next = b; b.info.prev = sn;
    g.info.nlist = sn;
    removeSlackNodes(g);
    expect(g.info.nlist).toBe(b);
    expect(b.info.prev).toBeUndefined();
  });
  it('removes a SLACKNODE in the middle (nprev defined -> restitch nprev.next)', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g);
    const sn = new Node(1, 'sn', g); sn.info.node_type = SLACKNODE;
    const c = new Node(2, 'c', g);
    a.info.next = sn; sn.info.prev = a; sn.info.next = c; c.info.prev = sn;
    g.info.nlist = a;
    removeSlackNodes(g);
    expect(a.info.next).toBe(c);
    expect(c.info.prev).toBe(a);
  });
  it('removes a SLACKNODE at the tail (nnext undefined -> skip nnext.prev write)', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g);
    const sn = new Node(1, 'sn', g); sn.info.node_type = SLACKNODE;
    a.info.next = sn; sn.info.prev = a; sn.info.next = undefined;
    g.info.nlist = a;
    removeSlackNodes(g);
    expect(a.info.next).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// removeAuxEdgesNode  @see position.c:remove_aux_edges (per-node cleanup)
// ---------------------------------------------------------------------------

describe('removeAuxEdgesNode', () => {
  it('clears weights and restores save_out/save_in when out/in are defined', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    const outE = new Edge(n, n, ''); outE.info.weight = 42;
    n.info.out = { list: [outE], size: 1 };
    n.info.in = { list: [new Edge(n, n, '')], size: 1 };
    const savedOut = { list: [], size: 0 };
    const savedIn = { list: [], size: 0 };
    n.info.save_out = savedOut; n.info.save_in = savedIn;
    removeAuxEdgesNode(n);
    expect(outE.info.weight).toBeUndefined();
    expect(n.info.out).toBe(savedOut);
    expect(n.info.in).toBe(savedIn);
  });
  it('is a no-op on out/in when both are undefined', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    expect(() => removeAuxEdgesNode(n)).not.toThrow();
    expect(n.info.out).toBeUndefined();
    expect(n.info.in).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// removeAuxEdges  @see position.c:remove_aux_edges
// ---------------------------------------------------------------------------

describe('removeAuxEdges', () => {
  it('cleans up every node in the chain and strips slack nodes', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g);
    const sn = new Node(1, 'sn', g); sn.info.node_type = SLACKNODE;
    a.info.next = sn; sn.info.prev = a;
    g.info.nlist = a;
    removeAuxEdges(g);
    expect(g.info.nlist).toBe(a);
    expect(a.info.next).toBeUndefined();
  });
});
