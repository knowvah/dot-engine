// SPDX-License-Identifier: EPL-2.0
/**
 * T4a — branch-coverage tests for layout/dot/flat.ts.
 *
 * Mixed mode (D1): pure leaf helpers (shiftSlotRight, findlr, setBoundsFlat,
 * setBoundsForward, setBounds, hasInterveningNode, rankHasNonAdjacentLabel,
 * needsAbomination, applyLabelDist, processFlatOutLabel, processOtherLabel,
 * processNodes, graphRanksep) are unit-tested against lightweight
 * `{ info: {...} } as unknown as Node/Edge/Graph` fakes, mirroring flat.test.ts's
 * `rankOf` helper. Functions that must mutate a real fast-graph linked list
 * (makeVnSlot, flatNode, flatNodeDims, flatNodeEdges, flatLabelYpos,
 * abomination, shiftClusterRanks) are driven against real Graph/Node/Edge
 * fixtures via the shared makeTestGraph/addTestEdge/setupRanks helpers.
 *
 * This file EXTENDS flat.test.ts — it does not repeat any assertion already
 * made there (hasInterveningNode node-type cases, abomination 0-based
 * renumber, cluster-rank shift, sentinel preservation, flat_limits #1213).
 *
 * @see lib/dotgen/flat.c
 */

import { describe, it, expect } from 'vitest';
import type { Node } from '../../model/node.js';
import type { Edge } from '../../model/edge.js';
import type { Graph } from '../../model/graph.js';
import type { RankEntry } from '../../model/rankEntry.js';
import { NORMAL, VIRTUAL, FLATORDER, fastNode } from './fastgr.js';
import { makeTestGraph, addTestEdge, setupRanks } from './position.test.js';
import {
  shiftSlotRight, makeVnSlot, findlr, setBoundsFlat, setBoundsForward, setBounds,
  flatLimits, graphRanksep, flatLabelYpos, flatNodeDims, flatNodeEdges, flatNode,
  emptyRankEntry, shiftClusterRanks, abomination, hasInterveningNode,
  checkFlatAdjacent, isLabeledFlat, markEdgeList, markAdjacent,
  rankHasNonAdjacentLabel, needsAbomination, applyLabelDist,
  processFlatOutLabel, processOtherLabel, processNodes, flatEdges,
} from './flat.js';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** Fake node with only `.info` populated — for pure leaf-function tests. */
function fakeNode(info: Record<string, unknown>): Node {
  return { info } as unknown as Node;
}

function fakeEdge(tail: Node, head: Node, info: Record<string, unknown> = {}): Edge {
  return { tail, head, info } as unknown as Edge;
}

function emptyRank(v: Node[]): RankEntry {
  return {
    n: v.length, v, an: 0, av: [], ht1: 1, ht2: 1, pht1: 1, pht2: 1,
    candidate: false, valid: false, cache_nc: 0, vStart: 0,
  };
}

// ---------------------------------------------------------------------------
// shiftSlotRight  @see lib/dotgen/flat.c:make_vn_slot
// ---------------------------------------------------------------------------

describe('shiftSlotRight (flat.c:make_vn_slot)', () => {
  it('increments order when curOrd is defined', () => {
    // The loop copies v[i-1] into v[i] then bumps the MOVED node's order —
    // so with n=1 the source is v[0] (a), landing at v[1].
    const a = fakeNode({ order: 3 });
    const b = fakeNode({ order: 5 });
    const rk = { n: 1, v: [a, b] } as unknown as RankEntry;
    shiftSlotRight(rk, 0);
    expect(rk.v[1]).toBe(a);
    expect(a.info.order).toBe(4);
  });

  it('sets order to 1 when curOrd is undefined', () => {
    const a = fakeNode({});
    const b = fakeNode({});
    const rk = { n: 1, v: [a, b] } as unknown as RankEntry;
    shiftSlotRight(rk, 0);
    expect(rk.v[1]).toBe(a);
    expect(a.info.order).toBe(1);
  });

  it('is a no-op loop when pos === rk.n', () => {
    const a = fakeNode({ order: 0 });
    const rk = { n: 0, v: [a] } as unknown as RankEntry;
    shiftSlotRight(rk, 0);
    expect(a.info.order).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// makeVnSlot  @see lib/dotgen/flat.c:make_vn_slot
// ---------------------------------------------------------------------------

describe('makeVnSlot (flat.c:make_vn_slot)', () => {
  it('pushes a new slot when rk.v.length <= rk.n + 1', () => {
    const [g, nodes] = makeTestGraph(1);
    setupRanks(g, [0]);
    const rk = g.info.rank![0];
    expect(rk.v.length).toBe(1); // == rk.n(1) ... covers rk.v.length <= rk.n+1
    const vn = makeVnSlot(g, 0, 1);
    expect(rk.n).toBe(2);
    expect(rk.v[1]).toBe(vn);
    expect(nodes[0]).toBeDefined();
  });

  it('does not push when rk.v already has spare capacity', () => {
    const [g] = makeTestGraph(1);
    setupRanks(g, [0]);
    const rk = g.info.rank![0];
    // n=1; length must exceed n+1(=2) for the push branch to be skipped.
    rk.v.push(null as unknown as Node, null as unknown as Node);
    const lenBefore = rk.v.length;
    makeVnSlot(g, 0, 1);
    expect(rk.v.length).toBe(lenBefore); // no push branch taken
  });
});

// ---------------------------------------------------------------------------
// findlr  @see lib/dotgen/flat.c:findlr
// ---------------------------------------------------------------------------

describe('findlr (flat.c:findlr)', () => {
  it('sorts [lo, hi] regardless of argument order', () => {
    expect(findlr(fakeNode({ order: 7 }), fakeNode({ order: 2 }))).toEqual([2, 7]);
    expect(findlr(fakeNode({ order: 2 }), fakeNode({ order: 7 }))).toEqual([2, 7]);
  });
});

// ---------------------------------------------------------------------------
// setBoundsFlat  @see lib/dotgen/flat.c:setbounds (flat branch)
// ---------------------------------------------------------------------------

describe('setBoundsFlat (flat.c:setbounds flat branch)', () => {
  const HLB = 0; const HRB = 1; const SLB = 2; const SRB = 3;

  function vWithOut(order: number, h0Order: number, h1Order: number): Node {
    const h0 = fakeNode({ order: h0Order });
    const h1 = fakeNode({ order: h1Order });
    return fakeNode({
      order,
      out: { size: 2, list: [{ head: h0 }, { head: h1 }] },
    });
  }

  it('returns early when out is undefined', () => {
    const v = fakeNode({ order: 5 });
    const bounds = [-1, 99, -1, 99];
    setBoundsFlat(v, bounds, 0, 10);
    expect(bounds).toEqual([-1, 99, -1, 99]);
  });

  it('returns early when out.size < 2', () => {
    const v = fakeNode({ order: 5, out: { size: 1, list: [{ head: fakeNode({ order: 0 }) }] } });
    const bounds = [-1, 99, -1, 99];
    setBoundsFlat(v, bounds, 0, 10);
    expect(bounds).toEqual([-1, 99, -1, 99]);
  });

  it('sets HLB/SLB when r <= lpos (entirely left of span)', () => {
    const v = vWithOut(3, 0, 1);
    const bounds = [-1, 99, -1, 99];
    setBoundsFlat(v, bounds, 5, 10);
    expect(bounds[HLB]).toBe(3);
    expect(bounds[SLB]).toBe(3);
  });

  it('sets HRB/SRB when l >= rpos (entirely right of span)', () => {
    const v = vWithOut(20, 15, 16);
    const bounds = [-1, 99, -1, 99];
    setBoundsFlat(v, bounds, 5, 10);
    expect(bounds[HRB]).toBe(20);
    expect(bounds[SRB]).toBe(20);
  });

  it('ignores a node whose endpoints span the whole [lpos,rpos] window', () => {
    const v = vWithOut(8, 0, 20);
    const bounds = [-1, 99, -1, 99];
    setBoundsFlat(v, bounds, 5, 10);
    expect(bounds).toEqual([-1, 99, -1, 99]);
  });

  it('sets SLB only when l < lpos and r within [lpos,rpos]', () => {
    const v = vWithOut(2, 3, 7); // l=3 < lpos(5); r=7 in [5,10]
    const bounds = [-1, 99, -1, 99];
    setBoundsFlat(v, bounds, 5, 10);
    expect(bounds[SLB]).toBe(2);
    expect(bounds[SRB]).toBe(99); // unchanged
  });

  it('sets SLB when l === lpos and r < rpos', () => {
    const v = vWithOut(2, 5, 7); // l=5===lpos; r=7<rpos(10)
    const bounds = [-1, 99, -1, 99];
    setBoundsFlat(v, bounds, 5, 10);
    expect(bounds[SLB]).toBe(2);
  });

  it('sets SRB only when r > rpos and l within [lpos,rpos]', () => {
    const v = vWithOut(9, 6, 12); // l=6 in range; r=12 > rpos(10)
    const bounds = [-1, 99, -1, 99];
    setBoundsFlat(v, bounds, 5, 10);
    expect(bounds[SRB]).toBe(9);
    expect(bounds[SLB]).toBe(-1); // unchanged
  });

  it('sets SRB when r === rpos and l > lpos', () => {
    const v = vWithOut(9, 6, 10); // l=6>lpos(5); r=10===rpos
    const bounds = [-1, 99, -1, 99];
    setBoundsFlat(v, bounds, 5, 10);
    expect(bounds[SRB]).toBe(9);
  });

  it('leaves bounds unchanged when neither SLB nor SRB condition holds', () => {
    // l===lpos and r===rpos: neither "l<lpos||(l===lpos&&r<rpos)" nor
    // "r>rpos||(r===rpos&&l>lpos)" is true.
    const v = vWithOut(9, 5, 10);
    const bounds = [-1, 99, -1, 99];
    setBoundsFlat(v, bounds, 5, 10);
    expect(bounds).toEqual([-1, 99, -1, 99]);
  });
});

// ---------------------------------------------------------------------------
// setBoundsForward  @see lib/dotgen/flat.c:setbounds (forward branch)
// ---------------------------------------------------------------------------

describe('setBoundsForward (flat.c:setbounds forward branch)', () => {
  const HLB = 0; const HRB = 1;

  it('uses size 0 when out is undefined (no loop iterations)', () => {
    const v = fakeNode({ order: 4 });
    const bounds = [-1, 99, -1, 99];
    setBoundsForward(v, bounds, 0, 10);
    expect(bounds).toEqual([-1, 99, -1, 99]);
  });

  it('sets onleft and HLB when every out-head order <= lpos', () => {
    const v = fakeNode({
      order: 4,
      out: { size: 1, list: [{ head: fakeNode({ order: 2 }) }] },
    });
    const bounds = [-1, 99, -1, 99];
    setBoundsForward(v, bounds, 5, 10);
    expect(bounds[HLB]).toBe(5); // ord(4) + 1
  });

  it('sets onright and HRB when every out-head order >= rpos', () => {
    const v = fakeNode({
      order: 4,
      out: { size: 1, list: [{ head: fakeNode({ order: 12 }) }] },
    });
    const bounds = [-1, 99, -1, 99];
    setBoundsForward(v, bounds, 5, 10);
    expect(bounds[HRB]).toBe(3); // ord(4) - 1
  });

  it('sets neither HLB nor HRB when both onleft and onright are true', () => {
    const v = fakeNode({
      order: 4,
      out: {
        size: 2,
        list: [{ head: fakeNode({ order: 2 }) }, { head: fakeNode({ order: 12 }) }],
      },
    });
    const bounds = [-1, 99, -1, 99];
    setBoundsForward(v, bounds, 5, 10);
    expect(bounds).toEqual([-1, 99, -1, 99]);
  });

  it('sets neither bound when an out-head falls strictly inside [lpos,rpos]', () => {
    const v = fakeNode({
      order: 4,
      out: { size: 1, list: [{ head: fakeNode({ order: 7 }) }] },
    });
    const bounds = [-1, 99, -1, 99];
    setBoundsForward(v, bounds, 5, 10);
    expect(bounds).toEqual([-1, 99, -1, 99]);
  });
});

// ---------------------------------------------------------------------------
// setBounds  @see lib/dotgen/flat.c:setbounds
// ---------------------------------------------------------------------------

describe('setBounds (flat.c:setbounds)', () => {
  it('returns immediately for a NORMAL node (node_type defaults to NORMAL)', () => {
    const v = fakeNode({ order: 1 });
    const bounds = [-1, 99, -1, 99];
    setBounds(v, bounds, 0, 10);
    expect(bounds).toEqual([-1, 99, -1, 99]);
  });

  it('returns immediately for an explicit NORMAL node_type', () => {
    const v = fakeNode({ order: 1, node_type: NORMAL });
    const bounds = [-1, 99, -1, 99];
    setBounds(v, bounds, 0, 10);
    expect(bounds).toEqual([-1, 99, -1, 99]);
  });

  it('dispatches to setBoundsFlat for a VIRTUAL node with no in-edges', () => {
    const h0 = fakeNode({ order: 0 });
    const h1 = fakeNode({ order: 1 });
    const v = fakeNode({
      order: 5, node_type: VIRTUAL,
      out: { size: 2, list: [{ head: h0 }, { head: h1 }] },
    });
    const bounds = [-1, 99, -1, 99];
    setBounds(v, bounds, 5, 10); // r=1 <= lpos(5) -> HLB/SLB path
    expect(bounds[0]).toBe(5);
  });

  it('dispatches to setBoundsFlat when in.size === 0 explicitly', () => {
    const h0 = fakeNode({ order: 0 });
    const h1 = fakeNode({ order: 1 });
    const v = fakeNode({
      order: 5, node_type: VIRTUAL, in: { size: 0, list: [] },
      out: { size: 2, list: [{ head: h0 }, { head: h1 }] },
    });
    const bounds = [-1, 99, -1, 99];
    setBounds(v, bounds, 5, 10);
    expect(bounds[0]).toBe(5);
  });

  it('dispatches to setBoundsForward for a VIRTUAL node with in-edges', () => {
    const v = fakeNode({
      order: 4, node_type: VIRTUAL, in: { size: 1, list: [{}] },
      out: { size: 1, list: [{ head: fakeNode({ order: 2 }) }] },
    });
    const bounds = [-1, 99, -1, 99];
    setBounds(v, bounds, 5, 10);
    expect(bounds[0]).toBe(5); // HLB = ord(4) + 1, only setBoundsForward sets this shape
  });
});

// ---------------------------------------------------------------------------
// flatLimits  @see lib/dotgen/flat.c:flat_limits
// ---------------------------------------------------------------------------

describe('flatLimits (flat.c:flat_limits)', () => {
  it('returns 0 when r < 0 (tail at rank 0)', () => {
    const [g, nodes] = makeTestGraph(2);
    setupRanks(g, [0, 0]);
    const e = addTestEdge(g, nodes[0], nodes[1]);
    expect(flatLimits(g, e)).toBe(0);
  });

  it('returns 0 when g.info.rank is undefined', () => {
    const [g, nodes] = makeTestGraph(2);
    nodes[0].info.rank = 1;
    nodes[1].info.rank = 1;
    const e = addTestEdge(g, nodes[0], nodes[1]);
    g.info.rank = undefined;
    expect(flatLimits(g, e)).toBe(0);
  });

  it('returns the HLB/HRB midpoint when HLB <= HRB after the scan', () => {
    const [g] = makeTestGraph(0);
    g.info.minrank = 0;
    g.info.maxrank = 1;
    const left = fakeNode({ order: 0, node_type: VIRTUAL, out: { size: 2, list: [{ head: fakeNode({ order: 3 }) }, { head: fakeNode({ order: 4 }) }] } });
    g.info.rank = [
      emptyRank([left]),
      emptyRank([]),
    ];
    const tail = fakeNode({ order: 5, rank: 1 });
    const head = fakeNode({ order: 6, rank: 1 });
    const e = fakeEdge(tail, head);
    // left node: r=4 <= lpos(5) -> HLB=SLB=0; rnode===lnode so loop runs once.
    // HRB stays at its default rnode+1 = 0+1 = 1; HLB(0) <= HRB(1) -> true branch.
    const result = flatLimits(g, e);
    expect(result).toBe(Math.trunc((0 + 1 + 1) / 2));
  });

  it('falls back to the SLB/SRB midpoint when the scan crosses (HLB > HRB)', () => {
    // Two rank-(r-1) forward vnodes, scanned from both ends inward in a
    // single loop iteration (lnode=0, rnode=1): the left one is "onleft"-only
    // (out-head order <= lpos), setting HLB = ord+1; the right one is
    // "onright"-only (out-head order >= rpos), setting HRB = ord-1. Choosing
    // a HIGH-order left node and a LOW-order right node crosses the hard
    // bounds (HLB=6 > HRB=-1), forcing the SLB/SRB fallback branch.
    const [g] = makeTestGraph(0);
    g.info.minrank = 0;
    g.info.maxrank = 1;
    const n0 = fakeNode({
      order: 5, node_type: VIRTUAL, in: { size: 1, list: [{}] },
      out: { size: 1, list: [{ head: fakeNode({ order: 3 }) }] }, // head order(3) <= lpos(5) -> onleft only
    });
    const n1 = fakeNode({
      order: 0, node_type: VIRTUAL, in: { size: 1, list: [{}] },
      out: { size: 1, list: [{ head: fakeNode({ order: 12 }) }] }, // head order(12) >= rpos(10) -> onright only
    });
    g.info.rank = [emptyRank([n0, n1]), emptyRank([])];
    const tail = fakeNode({ order: 5, rank: 1 });
    const head = fakeNode({ order: 10, rank: 1 });
    const e = fakeEdge(tail, head);
    // HLB = 5+1 = 6, HRB = 0-1 = -1 -> crossed (6 > -1). SLB/SRB stay at their
    // untouched initial values -1 and (rnode+1)=2, so the fallback midpoint
    // is trunc((-1 + 2 + 1) / 2) = 1.
    const result = flatLimits(g, e);
    expect(result).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// graphRanksep  @see lib/dotgen/flat.c:flat_node
// ---------------------------------------------------------------------------

describe('graphRanksep (flat.c:flat_node)', () => {
  it('returns g.info.ranksep when set', () => {
    const g = { info: { ranksep: 0.75 } } as unknown as Graph;
    expect(graphRanksep(g)).toBe(0.75);
  });

  it('returns 0 when g.info.ranksep is undefined', () => {
    const g = { info: {} } as unknown as Graph;
    expect(graphRanksep(g)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// flatLabelYpos  @see lib/dotgen/flat.c:flat_node 154-159
// ---------------------------------------------------------------------------

describe('flatLabelYpos (flat.c:flat_node)', () => {
  it('uses the above-rank node coord.y - ht1 when rank[r-1].v[0] exists', () => {
    const [g] = makeTestGraph(0);
    const above = fakeNode({ coord: { x: 0, y: 100 } });
    g.info.rank = [emptyRank([above]), emptyRank([])];
    g.info.rank[0].ht1 = 5;
    expect(flatLabelYpos(g, 1)).toBe(95);
  });

  it('falls back to rank[r].v[0] coord + ht2 + ranksep when rank[r-1] is empty', () => {
    const [g] = makeTestGraph(0);
    const here = fakeNode({ coord: { x: 0, y: 10 } });
    g.info.rank = [emptyRank([]), emptyRank([here])];
    g.info.rank[1].ht2 = 3;
    g.info.ranksep = 1;
    expect(flatLabelYpos(g, 1)).toBe(14);
  });
});

// ---------------------------------------------------------------------------
// flatNodeDims  @see lib/dotgen/flat.c:flat_node 161-167
// ---------------------------------------------------------------------------

describe('flatNodeDims (flat.c:flat_node)', () => {
  it('does not swap dx/dy when g.info.flip is not true', () => {
    const g = { info: {} } as unknown as Graph;
    const vn = fakeNode({});
    const half = flatNodeDims(g, vn, { dimen: { x: 10, y: 4 } } as never);
    expect(vn.info.ht).toBe(4);
    expect(vn.info.lw).toBe(5);
    expect(half).toBe(2);
  });

  it('swaps dx/dy when g.info.flip === true', () => {
    const g = { info: { flip: true } } as unknown as Graph;
    const vn = fakeNode({});
    const half = flatNodeDims(g, vn, { dimen: { x: 10, y: 4 } } as never);
    expect(vn.info.ht).toBe(10);
    expect(vn.info.lw).toBe(2);
    expect(half).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// flatNodeEdges  @see lib/dotgen/flat.c:flat_node 170-177
// ---------------------------------------------------------------------------

describe('flatNodeEdges (flat.c:flat_node)', () => {
  it('creates two FLATORDER virtual edges with mirrored ports', () => {
    const [g, nodes] = makeTestGraph(3);
    setupRanks(g, [0, 0, 0]);
    const e = addTestEdge(g, nodes[0], nodes[1]);
    const vn = nodes[2];
    vn.info.lw = 3;
    vn.info.rw = 4;
    nodes[0].info.rw = 7;
    nodes[1].info.lw = 8;
    flatNodeEdges(vn, e);
    expect(vn.info.out!.size).toBe(2);
    const et = vn.info.out!.list[0];
    expect(et.info.edge_type).toBe(FLATORDER);
    expect(et.info.tail_port.p.x).toBe(-3);
    expect(et.info.head_port.p.x).toBe(7);
    const eh = vn.info.out!.list[1];
    expect(eh.info.edge_type).toBe(FLATORDER);
    expect(eh.info.tail_port.p.x).toBe(4);
    expect(eh.info.head_port.p.x).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// flatNode  @see lib/dotgen/flat.c:flat_node
// ---------------------------------------------------------------------------

describe('flatNode (flat.c:flat_node)', () => {
  it('returns without inserting a vnode when the edge has no label', () => {
    const [g, nodes] = makeTestGraph(2);
    setupRanks(g, [0, 0]);
    const e = addTestEdge(g, nodes[0], nodes[1]);
    const rk = g.info.rank![0];
    const nBefore = rk.n;
    flatNode(g, e);
    expect(rk.n).toBe(nBefore);
  });

  it('inserts a label vnode and grows rank[r-1].ht1/ht2 when they are smaller', () => {
    const [g, nodes] = makeTestGraph(2);
    setupRanks(g, [1, 1]);
    // Give rank 0 (r-1) a placeholder node so flatLabelYpos takes the
    // above-rank branch, and rank 1 the flat-edge endpoints.
    const above = fakeNode({ coord: { x: 0, y: 50 } });
    g.info.rank!.unshift(emptyRank([above]));
    g.info.rank![0].ht1 = 1;
    g.info.minrank = 0;
    g.info.maxrank = 1;
    nodes[0].info.rank = 1;
    nodes[1].info.rank = 1;
    const e = addTestEdge(g, nodes[0], nodes[1]);
    e.info.label = { dimen: { x: 6, y: 20 } } as never;
    const rk0 = g.info.rank![0];
    const nBefore = rk0.n;
    flatNode(g, e);
    expect(rk0.n).toBe(nBefore + 1); // the label vnode was inserted
    expect(rk0.ht1).toBe(10); // h2 = 20/2 = 10 > previous ht1(1)
    expect(rk0.ht2).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// emptyRankEntry  @see lib/dotgen/flat.c:abomination
// ---------------------------------------------------------------------------

describe('emptyRankEntry (flat.c:abomination, vacated-slot factory)', () => {
  it('returns a fresh zero-node rank entry', () => {
    const rk = emptyRankEntry();
    expect(rk.n).toBe(0);
    expect(rk.v).toEqual([]);
    expect(rk.valid).toBe(false);
    expect(rk.flat).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// shiftClusterRanks  @see lib/dotgen/flat.c:abomination
// ---------------------------------------------------------------------------

describe('shiftClusterRanks (flat.c:abomination, cluster branch)', () => {
  it('is a no-op when n_cluster is undefined (default 0)', () => {
    const [g] = makeTestGraph(0);
    expect(() => shiftClusterRanks(g)).not.toThrow();
  });

  it('skips the rank shift for a cluster with no rank table', () => {
    const [g] = makeTestGraph(0);
    const [sub] = makeTestGraph(0);
    sub.info.minrank = 0;
    sub.info.maxrank = 0;
    sub.info.rank = undefined;
    g.info.clust = [sub];
    g.info.n_cluster = 1;
    shiftClusterRanks(g);
    expect(sub.info.minrank).toBe(1);
    expect(sub.info.maxrank).toBe(1);
  });

  it('skips the rankleader shift when rankleader is undefined', () => {
    const [g] = makeTestGraph(0);
    const [sub] = makeTestGraph(0);
    sub.info.minrank = 0;
    sub.info.maxrank = 0;
    sub.info.rank = [emptyRank([])];
    sub.info.rankleader = undefined;
    g.info.clust = [sub];
    g.info.n_cluster = 1;
    expect(() => shiftClusterRanks(g)).not.toThrow();
    expect(sub.info.rankleader).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// abomination  @see lib/dotgen/flat.c:abomination
// ---------------------------------------------------------------------------

describe('abomination: node rank bump (flat.c:abomination)', () => {
  it('bumps an already-set ND_rank by 1', () => {
    const [g, nodes] = makeTestGraph(1);
    nodes[0].info.rank = 3;
    fastNode(g, nodes[0]); // wire into g.info.nlist (abomination walks nlist)
    g.info.minrank = 0;
    g.info.maxrank = 0;
    g.info.rank = [emptyRank([])];
    abomination(g);
    expect(nodes[0].info.rank).toBe(4);
  });

  it('treats an undefined ND_rank as 0 before bumping to 1', () => {
    const [g, nodes] = makeTestGraph(1);
    nodes[0].info.rank = undefined;
    fastNode(g, nodes[0]);
    g.info.minrank = 0;
    g.info.maxrank = 0;
    g.info.rank = [emptyRank([])];
    abomination(g);
    expect(nodes[0].info.rank).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// hasInterveningNode  @see lib/dotgen/flat.c:checkFlatAdjacent
// ---------------------------------------------------------------------------

describe('hasInterveningNode: out-of-window nodes are skipped (flat.c:checkFlatAdjacent)', () => {
  it('skips a node at or below lo and one at or above hi', () => {
    const rk = emptyRank([
      fakeNode({ order: 0, node_type: NORMAL }),
      fakeNode({ order: 5, node_type: NORMAL }),
      fakeNode({ order: 10, node_type: NORMAL }),
    ]);
    // lo=0, hi=10: only order=5 is strictly between; order 0 and 10 skip via
    // `ord <= lo || ord >= hi`.
    expect(hasInterveningNode(rk, 0, 10)).toBe(true);
  });

  it('defaults an intervening node with no node_type to NORMAL and blocks', () => {
    const rk = emptyRank([fakeNode({ order: 0 }), fakeNode({ order: 5 }), fakeNode({ order: 10 })]);
    expect(hasInterveningNode(rk, 0, 10)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkFlatAdjacent / markEdgeList / markAdjacent  @see lib/dotgen/flat.c
// ---------------------------------------------------------------------------

describe('markEdgeList (flat.c:flat_edges, markAdjacent helper)', () => {
  it('is a no-op when edges is undefined', () => {
    const [g] = makeTestGraph(0);
    expect(() => markEdgeList(g, undefined)).not.toThrow();
  });
});

describe('markAdjacent: ND_other cross-rank guard (flat.c:272-276)', () => {
  it('does not mark a 2-cycle ND_other edge whose endpoints are on different ranks', () => {
    const [g, nodes] = makeTestGraph(2);
    setupRanks(g, [0, 1]);
    fastNode(g, nodes[1]);
    fastNode(g, nodes[0]); // markAdjacent walks g.info.nlist
    const e = addTestEdge(g, nodes[0], nodes[1]);
    nodes[0].info.other = { size: 1, list: [e] };
    markAdjacent(g);
    expect(e.info.adjacent).toBeUndefined();
  });

  it('marks a same-rank ND_other edge as adjacent', () => {
    const [g, nodes] = makeTestGraph(2);
    setupRanks(g, [0, 0]);
    fastNode(g, nodes[1]);
    fastNode(g, nodes[0]);
    const e = addTestEdge(g, nodes[0], nodes[1]);
    nodes[0].info.order = 0;
    nodes[1].info.order = 1;
    nodes[0].info.other = { size: 1, list: [e] };
    markAdjacent(g);
    expect(e.info.adjacent).toBe(1);
  });

  it('skips a node with no ND_other list entirely', () => {
    const [g, nodes] = makeTestGraph(1);
    setupRanks(g, [0]);
    fastNode(g, nodes[0]);
    nodes[0].info.other = undefined;
    expect(() => markAdjacent(g)).not.toThrow();
  });
});

describe('checkFlatAdjacent: marks the full to_virt chain (flat.c:checkFlatAdjacent)', () => {
  it('marks e and every edge reachable via to_virt when adjacent', () => {
    const [g, nodes] = makeTestGraph(2);
    setupRanks(g, [0, 0]);
    nodes[0].info.order = 0;
    nodes[1].info.order = 1;
    const rep = addTestEdge(g, nodes[0], nodes[1]);
    const leaf = addTestEdge(g, nodes[0], nodes[1]);
    leaf.info.to_virt = rep;
    checkFlatAdjacent(g, leaf);
    expect(leaf.info.adjacent).toBe(1);
    expect(rep.info.adjacent).toBe(1);
  });

  it('does nothing when the endpoints are not adjacent', () => {
    const [g, nodes] = makeTestGraph(3);
    setupRanks(g, [0, 0, 0]);
    nodes[0].info.order = 0;
    nodes[1].info.order = 1;
    nodes[2].info.order = 2;
    const e = addTestEdge(g, nodes[0], nodes[2]);
    checkFlatAdjacent(g, e);
    expect(e.info.adjacent).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// rankHasNonAdjacentLabel / needsAbomination  @see lib/dotgen/flat.c:flat_edges 279
// ---------------------------------------------------------------------------

describe('rankHasNonAdjacentLabel (flat.c:flat_edges gate)', () => {
  it('skips a node with no flat_out list', () => {
    const rk = emptyRank([fakeNode({ flat_out: undefined })]);
    expect(rankHasNonAdjacentLabel(rk)).toBe(false);
  });

  it('returns false when the labeled flat edge is already adjacent', () => {
    const e = fakeEdge(fakeNode({}), fakeNode({}), { label: {}, adjacent: 1 });
    const rk = emptyRank([fakeNode({ flat_out: { size: 1, list: [e] } })]);
    expect(rankHasNonAdjacentLabel(rk)).toBe(false);
  });

  it('returns false when the flat edge has no label', () => {
    const e = fakeEdge(fakeNode({}), fakeNode({}), { label: undefined });
    const rk = emptyRank([fakeNode({ flat_out: { size: 1, list: [e] } })]);
    expect(rankHasNonAdjacentLabel(rk)).toBe(false);
  });

  it('returns true for a labeled, non-adjacent flat edge', () => {
    const e = fakeEdge(fakeNode({}), fakeNode({}), { label: {}, adjacent: undefined });
    const rk = emptyRank([fakeNode({ flat_out: { size: 1, list: [e] } })]);
    expect(rankHasNonAdjacentLabel(rk)).toBe(true);
  });
});

describe('needsAbomination (flat.c:flat_edges 279)', () => {
  it('returns false when g.info.rank is undefined', () => {
    const g = { info: { minrank: 0, rank: undefined } } as unknown as Graph;
    expect(needsAbomination(g)).toBe(false);
  });

  it('returns false when rank[minrank] is undefined', () => {
    const g = { info: { minrank: 2, rank: [] } } as unknown as Graph;
    expect(needsAbomination(g)).toBe(false);
  });

  it('returns true when rank[minrank] has a labeled non-adjacent flat edge', () => {
    const e = fakeEdge(fakeNode({}), fakeNode({}), { label: {}, adjacent: undefined });
    const rk = emptyRank([fakeNode({ flat_out: { size: 1, list: [e] } })]);
    const g = { info: { minrank: 0, rank: [rk] } } as unknown as Graph;
    expect(needsAbomination(g)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyLabelDist / labelWidth (private)  @see lib/dotgen/flat.c:300
// ---------------------------------------------------------------------------

describe('applyLabelDist (flat.c:300, exercises private labelWidth)', () => {
  it('stores 0 when the edge has no label', () => {
    const e = fakeEdge(fakeNode({}), fakeNode({}), {});
    const g = { info: {} } as unknown as Graph;
    applyLabelDist(g, e);
    expect(e.info.dist).toBe(0);
  });

  it('stores 0 when the label has no dimen', () => {
    const e = fakeEdge(fakeNode({}), fakeNode({}), { label: {} });
    const g = { info: {} } as unknown as Graph;
    applyLabelDist(g, e);
    expect(e.info.dist).toBe(0);
  });

  it('stores dimen.x when g.info.flip is not true', () => {
    const e = fakeEdge(fakeNode({}), fakeNode({}), { label: { dimen: { x: 12, y: 4 } } });
    const g = { info: {} } as unknown as Graph;
    applyLabelDist(g, e);
    expect(e.info.dist).toBe(12);
  });

  it('stores dimen.y when g.info.flip === true', () => {
    const e = fakeEdge(fakeNode({}), fakeNode({}), { label: { dimen: { x: 12, y: 4 } } });
    const g = { info: { flip: true } } as unknown as Graph;
    applyLabelDist(g, e);
    expect(e.info.dist).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// processFlatOutLabel  @see lib/dotgen/flat.c:flat_edges 296-307
// ---------------------------------------------------------------------------

describe('processFlatOutLabel (flat.c:flat_edges 296-307)', () => {
  it('passes reset through unchanged for an unlabeled edge', () => {
    const g = { info: {} } as unknown as Graph;
    const e = fakeEdge(fakeNode({}), fakeNode({}), { label: undefined });
    expect(processFlatOutLabel(g, e, true)).toBe(true);
    expect(processFlatOutLabel(g, e, false)).toBe(false);
  });

  it('applies label dist and preserves reset for an adjacent labeled edge', () => {
    const g = { info: {} } as unknown as Graph;
    const e = fakeEdge(fakeNode({}), fakeNode({}), { label: { dimen: { x: 9, y: 2 } }, adjacent: 1 });
    expect(processFlatOutLabel(g, e, false)).toBe(false);
    expect(e.info.dist).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// processOtherLabel  @see lib/dotgen/flat.c:flat_edges 309-326
// ---------------------------------------------------------------------------

describe('processOtherLabel (flat.c:flat_edges 309-326)', () => {
  it('returns reset unchanged for a cross-rank edge', () => {
    const [g, nodes] = makeTestGraph(2);
    nodes[0].info.rank = 0;
    nodes[1].info.rank = 1;
    const e = addTestEdge(g, nodes[0], nodes[1]);
    expect(processOtherLabel(g, e, true)).toBe(true);
  });

  it('returns reset unchanged for a self-edge', () => {
    const [g, nodes] = makeTestGraph(1);
    nodes[0].info.rank = 0;
    const e = addTestEdge(g, nodes[0], nodes[0]);
    expect(processOtherLabel(g, e, true)).toBe(true);
  });

  it('inherits adjacency from the class rep via the to_virt chain', () => {
    const [g, nodes] = makeTestGraph(2);
    nodes[0].info.rank = 0;
    nodes[1].info.rank = 0;
    const rep = addTestEdge(g, nodes[0], nodes[1]);
    rep.info.adjacent = 1;
    const e = addTestEdge(g, nodes[0], nodes[1]);
    e.info.to_virt = rep;
    processOtherLabel(g, e, false);
    expect(e.info.adjacent).toBe(1);
  });

  it('returns reset unchanged for an unlabeled same-rank edge', () => {
    const [g, nodes] = makeTestGraph(2);
    nodes[0].info.rank = 0;
    nodes[1].info.rank = 0;
    const e = addTestEdge(g, nodes[0], nodes[1]);
    expect(processOtherLabel(g, e, true)).toBe(true);
  });

  it('MAXes label width onto the rep dist for an adjacent labeled edge, seeding dist from ?? 0', () => {
    const [g, nodes] = makeTestGraph(2);
    nodes[0].info.rank = 0;
    nodes[1].info.rank = 0;
    const e = addTestEdge(g, nodes[0], nodes[1]);
    e.info.adjacent = 1;
    e.info.label = { dimen: { x: 15, y: 3 } } as never;
    const reset = processOtherLabel(g, e, false);
    expect(reset).toBe(false);
    expect(e.info.dist).toBe(15); // le === e (no to_virt); ?? 0 branch taken
  });

  it('keeps the larger existing rep dist over a smaller new label width', () => {
    const [g, nodes] = makeTestGraph(2);
    nodes[0].info.rank = 0;
    nodes[1].info.rank = 0;
    const e = addTestEdge(g, nodes[0], nodes[1]);
    e.info.adjacent = 1;
    e.info.dist = 40;
    e.info.label = { dimen: { x: 5, y: 3 } } as never;
    processOtherLabel(g, e, false);
    expect(e.info.dist).toBe(40); // Math.max(5, 40)
  });

  it('inserts a label vnode and returns true for a non-adjacent labeled edge', () => {
    const [g, nodes] = makeTestGraph(2);
    setupRanks(g, [1, 1]);
    const above = fakeNode({ coord: { x: 0, y: 30 } });
    g.info.rank!.unshift(emptyRank([above]));
    g.info.minrank = 0;
    g.info.maxrank = 1;
    nodes[0].info.rank = 1;
    nodes[1].info.rank = 1;
    const e = addTestEdge(g, nodes[0], nodes[1]);
    e.info.adjacent = undefined;
    e.info.label = { dimen: { x: 8, y: 6 } } as never;
    const rk0 = g.info.rank![0];
    const nBefore = rk0.n;
    const reset = processOtherLabel(g, e, false);
    expect(reset).toBe(true);
    expect(rk0.n).toBe(nBefore + 1);
  });
});

// ---------------------------------------------------------------------------
// processNodes  @see lib/dotgen/flat.c:flat_edges 288-330
// ---------------------------------------------------------------------------

describe('processNodes (flat.c:flat_edges 288-330)', () => {
  it('skips a node with no flat_out entirely (both loops)', () => {
    const [g, nodes] = makeTestGraph(1);
    fastNode(g, nodes[0]); // processNodes walks g.info.nlist
    nodes[0].info.flat_out = undefined;
    nodes[0].info.other = { size: 1, list: [] };
    expect(processNodes(g)).toBe(false);
  });

  it('processes flat_out but skips the other loop when ND_other is undefined', () => {
    const [g, nodes] = makeTestGraph(2);
    fastNode(g, nodes[1]);
    fastNode(g, nodes[0]);
    nodes[0].info.rank = 0;
    nodes[1].info.rank = 0;
    const e = addTestEdge(g, nodes[0], nodes[1]);
    nodes[0].info.flat_out = { size: 1, list: [e] };
    nodes[0].info.other = undefined;
    expect(processNodes(g)).toBe(false);
  });

  it('reduces reset=true across flat_out and other loops on the same node', () => {
    const [g, nodes] = makeTestGraph(3);
    setupRanks(g, [1, 1, 1]);
    fastNode(g, nodes[2]);
    fastNode(g, nodes[1]);
    fastNode(g, nodes[0]);
    const above = fakeNode({ coord: { x: 0, y: 30 } });
    g.info.rank!.unshift(emptyRank([above]));
    g.info.minrank = 0;
    g.info.maxrank = 1;
    nodes[0].info.rank = 1;
    nodes[1].info.rank = 1;
    nodes[2].info.rank = 1;
    const eFlat = addTestEdge(g, nodes[0], nodes[1]);
    eFlat.info.label = { dimen: { x: 4, y: 4 } } as never;
    const eOther = addTestEdge(g, nodes[0], nodes[2]);
    eOther.info.label = { dimen: { x: 4, y: 4 } } as never;
    nodes[0].info.flat_out = { size: 1, list: [eFlat] };
    nodes[0].info.other = { size: 1, list: [eOther] };
    expect(processNodes(g)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// flatEdges  @see lib/dotgen/flat.c:flat_edges
// ---------------------------------------------------------------------------

describe('flatEdges: reset=false skips checkLabelOrder/recResetVlists (flat.c:flat_edges)', () => {
  it('returns false when no flat-edge label vnodes are inserted', () => {
    const [g, nodes] = makeTestGraph(2);
    setupRanks(g, [0, 1]);
    fastNode(g, nodes[1]);
    fastNode(g, nodes[0]);
    addTestEdge(g, nodes[0], nodes[1]); // regular cross-rank edge, no flat_out
    expect(flatEdges(g)).toBe(false);
  });
});
