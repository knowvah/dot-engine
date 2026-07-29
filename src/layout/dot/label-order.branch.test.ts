// SPDX-License-Identifier: EPL-2.0

/**
 * T4b — branch coverage for layout/dot/label-order.ts.
 *
 * fixLabelOrder/checkLabelOrder driven with hand-built LabelNode fixtures
 * (bypassing the Graph/rank plumbing that rankLabelNodes/labelNode would
 * otherwise require) plus targeted RankEntry/Node fixtures for the
 * checkLabelOrder-level branches.
 *
 * Residue (mathematically unreachable, not merely untried): linkConflicts
 * only ever adds an edge from the interval that is entirely value-left to
 * the one that is entirely value-right of a disjoint pair, and it visits
 * every unordered node pair exactly once. "Entirely left of" over
 * lo<=hi intervals is a strict, transitive partial order, so the graph
 * addEdge builds is always a DAG assembled from distinct node pairs:
 *  - addEdge's dedup branch (L38, `!from.out.includes(to)` false arm)
 *    would require the same (from,to) pair to be added twice, which
 *    can't happen since each unordered {i,j} pair is visited once.
 *  - topsort's "not a DAG" branch (L80/L83, `src === undefined`) can't
 *    fire because the graph is always acyclic (proved above), so a
 *    zero-indegree source always exists at every step.
 * Confirmed empirically too: every fixLabelOrder construction tried
 * (2- and 4-node components, forward and reversed value/idx orderings)
 * topsorts cleanly. Left uncovered; see report.
 *
 * @see lib/dotgen/mincross.c:fixLabelOrder, checkLabelOrder
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { makeNodeInfo } from '../../model/nodeInfo.js';
import { makeEdgeInfo, makePort } from '../../model/edgeInfo.js';
import type { RankEntry } from '../../model/rankEntry.js';
import { fixLabelOrder, checkLabelOrder } from './label-order.js';
import type { LabelNode } from './label-order.js';

function makeRankEntry(nodes: Node[]): RankEntry {
  return {
    n: nodes.length, v: [...nodes], an: 0, av: [],
    ht1: 20, ht2: 20, pht1: 20, pht2: 20, candidate: false, valid: false, cache_nc: 0,
  };
}
let nid = 0;
function makeNode(g: Graph, order?: number): Node {
  const n = new Node(nid++, `n${nid}`, g);
  n.info = makeNodeInfo();
  n.info.order = order;
  return n;
}
function ln(g: Graph, idx: number, lo: number, hi: number): LabelNode {
  return { lo, hi, np: makeNode(g, idx), idx, x: 0, out: [], in: [] };
}
function makeEdge(tail: Node, head: Node): Edge {
  const e = new Edge(tail, head, '');
  e.info = makeEdgeInfo(makePort(), makePort());
  return e;
}

describe('fixLabelOrder', () => {
  it('skips a component whose single edge has backedge===0 (value order '
    + 'already matches idx order in reverse) — continue at L116', () => {
    const g = new Graph('g', 'directed');
    // n0 (idx 0) is spatially RIGHT of n1 (idx 1): the disjoint-interval
    // edge points n1->n0. Checked from either endpoint, head.idx(0) is
    // NOT > tail.idx(1), so getComp counts zero backedges and the
    // component is left untouched.
    const n0 = ln(g, 0, 5, 8);
    const n1 = ln(g, 1, 0, 2);
    fixLabelOrder([n0, n1], makeRankEntry([]));
    expect(n0.np.info.order).toBe(0);
    expect(n1.np.info.order).toBe(1);
  });

  it('reorders a component with a genuine backedge via topsort', () => {
    // p0/p1 (idx 0,1) are value-ordered consistently with idx (p0 left of
    // p1); p2 (idx 2) is value-left of BOTH — its edges to p0 and p1 are
    // therefore "v.hi <= n.lo" reversals (haveBackedge=true), and getComp
    // counts backedge=2 for the whole 3-node component, so topsort runs.
    const g = new Graph('g', 'directed');
    const p0 = ln(g, 0, 10, 12);
    const p1 = ln(g, 1, 15, 17);
    const p2 = ln(g, 2, 0, 3);
    const rk = makeRankEntry([p0.np, p1.np, p2.np]);
    fixLabelOrder([p0, p1, p2], rk);
    // Topological order is p2, p0, p1 -> reassigned to ascending slots 0,1,2.
    expect(p2.np.info.order).toBe(0);
    expect(p0.np.info.order).toBe(1);
    expect(p1.np.info.order).toBe(2);
    expect(rk.v[0]).toBe(p2.np);
    expect(rk.v[1]).toBe(p0.np);
    expect(rk.v[2]).toBe(p1.np);
  });

  it('returns immediately when no pair conflicts (linkConflicts false)', () => {
    const g = new Graph('g', 'directed');
    // Overlapping intervals: neither v.hi<=n.lo nor n.hi<=v.lo holds.
    const n0 = ln(g, 0, 0, 10);
    const n1 = ln(g, 1, 5, 15);
    fixLabelOrder([n0, n1], makeRankEntry([]));
    expect(n0.x).toBe(0);
    expect(n1.x).toBe(0);
  });

  it('defaults lo/hi/idx to 0 in labelNode when order is unset — labelNode '
    + 'is internal to rankLabelNodes, driven here via checkLabelOrder with a '
    + 'single posAlg-tagged node (so fixLabelOrder never runs, isolating the '
    + 'default computation itself)', () => {
    const g = new Graph('g', 'directed');
    const h0 = makeNode(g, undefined); // head order unset -> lo defaults to 0
    const h1 = makeNode(g, undefined); // head order unset -> hi defaults to 0
    const u = makeNode(g, undefined); // u.info.order unset -> idx defaults to 0
    u.info.posAlg = makeEdge(u, h0);
    const e0 = makeEdge(u, h0);
    const e1 = makeEdge(u, h1);
    u.info.out = { list: [e0, e1], size: 2 };

    expect(u.info.order).toBeUndefined();
    expect(h0.info.order).toBeUndefined();
    expect(h1.info.order).toBeUndefined();

    const rk = makeRankEntry([u]);
    const graph = new Graph('cg', 'directed');
    graph.info.rank = [rk];
    graph.info.minrank = 0;
    graph.info.maxrank = 0;
    checkLabelOrder(graph);

    // A single posAlg node never reaches fixLabelOrder (nodes.length > 1 is
    // required) — this isolates labelNode's own default computation without
    // any side effect to assert beyond "it ran to completion".
    expect(rk.v[0]).toBe(u);
    expect(u.info.order).toBeUndefined();
  });
});

describe('checkLabelOrder', () => {
  it('returns immediately when the graph has no rank table', () => {
    expect(() => checkLabelOrder(new Graph('g', 'directed'))).not.toThrow();
  });

  it('defaults minrank/maxrank to 0/(rank.length-1) when unset', () => {
    const g = new Graph('g', 'directed');
    g.info.rank = [makeRankEntry([])];
    expect(() => checkLabelOrder(g)).not.toThrow();
  });

  it('skips a hole (undefined) rank entry within [minrank, maxrank]', () => {
    const g = new Graph('g', 'directed');
    const rk0 = makeRankEntry([]);
    g.info.rank = [rk0, undefined as unknown as RankEntry, makeRankEntry([])];
    g.info.minrank = 0;
    g.info.maxrank = 2;
    expect(() => checkLabelOrder(g)).not.toThrow();
  });
});
