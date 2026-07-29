// SPDX-License-Identifier: EPL-2.0
/**
 * T4a — branch-coverage tests for layout/dot/ns.ts (network simplex core).
 *
 * Mixed mode (D1): leaf accessors/helpers are unit-tested directly against
 * hand-built Node/Edge `.info` fixtures (mirroring ns-range.test.ts /
 * ns-subtree.test.ts). Composite entry points (initGraph, rank2Loop,
 * rank2Balance, rank2, rank, tbBalance, lrBalance) are driven end-to-end
 * through a small real Graph/Node/Edge fixture wired via fastNode/fastEdge
 * (the same nlist/in/out wiring the dotgen pipeline uses before calling
 * ns.ts), asserting on concrete final rank values.
 *
 * @see lib/common/ns.c
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import type { NsCtx } from './ns-core.js';
import { addTreeEdge } from './ns-core.js';
import { dfsRangeInit } from './ns-range.js';
import { feasibleTree } from './ns-subtree.js';
import { fastNode, fastEdge } from './fastgr.js';
import {
  nodeRank, nodeLow, nodeLim, nodeType, nodeInSize, nodeOutSize, nodeTreeSize,
  edgeCv, edgeWeight, edgeMinlen,
  initRankIn, initRankOut, initRank,
  leaveEdgeScan, leaveEdge,
  dfsEnterOutScan, dfsEnterOutTreeIn, dfsEnterOutedge,
  dfsEnterInScan, dfsEnterInTreeOut, dfsEnterInedge,
  enterEdge, treeupdate, rerank, updateRerank, nsUpdate,
  scanAndNormalize, freeTreeNode, resetLists, freeTreeList,
  lrBalance, tbGetAdj, tbForceAdj, tbSortCompare, tbSortNodes,
  tbComputeBounds, tbMoveNode, tbBalance,
  initGraphEdge, initGraph, rank2Loop, rank2Balance, rank2, rank,
} from './ns.js';

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

/** Build a small real Graph wired for ns.ts (nlist via fastNode, in/out via
 *  fastEdge) — the same shape dotgen sets up before calling rank(). */
function buildNsGraph(n: number, edges: readonly [number, number, number?][]): [Graph, Node[]] {
  const g = new Graph('g', 'directed');
  const nodes: Node[] = [];
  for (let i = 0; i < n; i++) nodes.push(new Node(i, `n${i}`, g));
  for (let i = n - 1; i >= 0; i--) fastNode(g, nodes[i]);
  for (const [t, h, minlen] of edges) {
    const e = new Edge(nodes[t], nodes[h], '');
    e.info.minlen = minlen ?? 1;
    fastEdge(e);
  }
  return [g, nodes];
}

function mkCtx(g?: Graph): NsCtx {
  return { g: g as Graph, treeEdges: [], sI: 0, nEdges: 0, nNodes: 0, searchSize: 30 };
}

// ---------------------------------------------------------------------------
// Accessor helpers — both sides of every `??`
// ---------------------------------------------------------------------------

describe('ns.ts accessor helpers — ?? fallback, both sides', () => {
  it('nodeRank/nodeLow/nodeLim default to 0 when unset', () => {
    const n = { info: {} } as unknown as Node;
    expect(nodeRank(n)).toBe(0);
    expect(nodeLow(n)).toBe(0);
    expect(nodeLim(n)).toBe(0);
  });
  it('nodeRank/nodeLow/nodeLim read the stored value when set', () => {
    const n = { info: { rank: 7, low: 3, lim: 9 } } as unknown as Node;
    expect(nodeRank(n)).toBe(7);
    expect(nodeLow(n)).toBe(3);
    expect(nodeLim(n)).toBe(9);
  });
  it('nodeType defaults to 0 (NORMAL) when unset, else reads node_type', () => {
    expect(nodeType({ info: {} } as unknown as Node)).toBe(0);
    expect(nodeType({ info: { node_type: 2 } } as unknown as Node)).toBe(2);
  });
  it('nodeInSize/nodeOutSize chain through the optional list then ??', () => {
    expect(nodeInSize({ info: {} } as unknown as Node)).toBe(0);
    expect(nodeInSize({ info: { in: { list: [], size: 4 } } } as unknown as Node)).toBe(4);
    expect(nodeOutSize({ info: {} } as unknown as Node)).toBe(0);
    expect(nodeOutSize({ info: { out: { list: [], size: 5 } } } as unknown as Node)).toBe(5);
  });
  it('nodeTreeSize sums tree_in/tree_out sizes, each independently defaulted', () => {
    expect(nodeTreeSize({ info: {} } as unknown as Node)).toBe(0);
    expect(nodeTreeSize({ info: { tree_in: { list: [], size: 2 } } } as unknown as Node)).toBe(2);
    expect(nodeTreeSize({ info: { tree_out: { list: [], size: 3 } } } as unknown as Node)).toBe(3);
    expect(nodeTreeSize({
      info: { tree_in: { list: [], size: 2 }, tree_out: { list: [], size: 3 } },
    } as unknown as Node)).toBe(5);
  });
  it('edgeCv defaults 0, edgeWeight defaults 1, edgeMinlen defaults 1', () => {
    expect(edgeCv({ info: {} } as unknown as Edge)).toBe(0);
    expect(edgeCv({ info: { cutvalue: -4 } } as unknown as Edge)).toBe(-4);
    expect(edgeWeight({ info: {} } as unknown as Edge)).toBe(1);
    expect(edgeWeight({ info: { weight: 6 } } as unknown as Edge)).toBe(6);
    expect(edgeMinlen({ info: {} } as unknown as Edge)).toBe(1);
    expect(edgeMinlen({ info: { minlen: 3 } } as unknown as Edge)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// initRankIn / initRankOut / initRank
// ---------------------------------------------------------------------------

describe('initRankIn', () => {
  it('leaves rank at 0 when the node has no in-list', () => {
    const v = { info: {} } as unknown as Node;
    initRankIn(v);
    expect(v.info.rank).toBe(0);
  });
  it('takes the max of tail.rank+minlen across in-edges, ignoring non-improving ones', () => {
    const t1 = { info: { rank: 1 } } as unknown as Node;
    const t2 = { info: { rank: 5 } } as unknown as Node;
    const t3 = { info: { rank: 0 } } as unknown as Node;
    const e1 = { tail: t1, info: { minlen: 1 } } as unknown as Edge; // r=2
    const e2 = { tail: t2, info: { minlen: 1 } } as unknown as Edge; // r=6, improves
    const e3 = { tail: t3, info: { minlen: 1 } } as unknown as Edge; // r=1, does not
    const v = { info: { in: { list: [e1, e2, e3], size: 3 } } } as unknown as Node;
    initRankIn(v);
    expect(v.info.rank).toBe(6);
  });
});

describe('initRankOut', () => {
  it('does nothing when the node has no out-list', () => {
    const q: Node[] = [];
    initRankOut({ info: {} } as unknown as Node, q);
    expect(q).toEqual([]);
  });
  it('enqueues a head only when its decremented priority drops to <=0', () => {
    const h1 = { info: { priority: 1 } } as unknown as Node; // -> 0, enqueued
    const h2 = { info: { priority: 5 } } as unknown as Node; // -> 4, not enqueued
    const e1 = { head: h1 } as unknown as Edge;
    const e2 = { head: h2 } as unknown as Edge;
    const q: Node[] = [];
    initRankOut({ info: { out: { list: [e1, e2], size: 2 } } } as unknown as Node, q);
    expect(q).toEqual([h1]);
    expect(h1.info.priority).toBe(0);
    expect(h2.info.priority).toBe(4);
  });
  it('treats an unset head priority as 0, so it enqueues immediately (0-1=-1<=0)', () => {
    const h = { info: {} } as unknown as Node; // priority ?? 0 fallback side
    const e = { head: h } as unknown as Edge;
    const q: Node[] = [];
    initRankOut({ info: { out: { list: [e], size: 1 } } } as unknown as Node, q);
    expect(q).toEqual([h]);
    expect(h.info.priority).toBe(-1);
  });
});

describe('initRank — topological BFS seeded from priority-0 nodes', () => {
  it('propagates ranks forward through a 3-node chain', () => {
    const a = { info: {} } as unknown as Node; // unset priority ?? 0 fallback -> seeded
    const b = { info: { priority: 1 } } as unknown as Node;
    const c = { info: { priority: 1 } } as unknown as Node;
    const eab = { tail: a, head: b, info: { minlen: 1 } } as unknown as Edge;
    const ebc = { tail: b, head: c, info: { minlen: 2 } } as unknown as Edge;
    a.info.out = { list: [eab], size: 1 };
    b.info.in = { list: [eab], size: 1 };
    b.info.out = { list: [ebc], size: 1 };
    c.info.in = { list: [ebc], size: 1 };
    a.info.next = b; b.info.next = c;
    const g = { info: { nlist: a } } as unknown as Graph;
    initRank(mkCtx(g));
    expect(a.info.rank).toBe(0);
    expect(b.info.rank).toBe(1);
    expect(c.info.rank).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// leaveEdge / leaveEdgeScan
// ---------------------------------------------------------------------------

describe('leaveEdge — no-wrap scan picks the most-negative cutvalue', () => {
  it('skips non-negative edges and improves rv only on strictly smaller cutvalue', () => {
    const e1 = { info: { cutvalue: 3 } } as unknown as Edge;
    const e2 = { info: { cutvalue: -2 } } as unknown as Edge;
    const e3 = { info: { cutvalue: -7 } } as unknown as Edge;
    const e4 = { info: { cutvalue: -1 } } as unknown as Edge; // worse than e3, ignored
    const ctx = { treeEdges: [e1, e2, e3, e4], sI: 0, searchSize: 10 } as unknown as NsCtx;
    expect(leaveEdge(ctx)).toBe(e3);
  });
  it('returns immediately once searchSize candidates are seen, leaving sI unmoved', () => {
    const e1 = { info: { cutvalue: -1 } } as unknown as Edge;
    const e2 = { info: { cutvalue: -2 } } as unknown as Edge;
    const ctx = { treeEdges: [e1, e2], sI: 0, searchSize: 1 } as unknown as NsCtx;
    expect(leaveEdge(ctx)).toBe(e1);
    expect(ctx.sI).toBe(0);
  });
  it('wraps from sI back to the original start once the tail is exhausted', () => {
    // sI starts at 1 (j=1); main pass over [1,3) finds only e3(cv=-1); wrap
    // rescans [0,1) and finds e1(cv=-5), which beats the running best.
    const e1 = { info: { cutvalue: -5 } } as unknown as Edge;
    const e2 = { info: { cutvalue: 2 } } as unknown as Edge;
    const e3 = { info: { cutvalue: -1 } } as unknown as Edge;
    const ctx = { treeEdges: [e1, e2, e3], sI: 1, searchSize: 5 } as unknown as NsCtx;
    expect(leaveEdge(ctx)).toBe(e1);
    expect(ctx.sI).toBe(1);
  });
  it('returns undefined when there is no negative-cutvalue tree edge', () => {
    const e1 = { info: { cutvalue: 4 } } as unknown as Edge;
    const ctx = { treeEdges: [e1], sI: 0, searchSize: 30 } as unknown as NsCtx;
    expect(leaveEdge(ctx)).toBeUndefined();
  });
});

describe('leaveEdgeScan — direct unit test of the wrap-around helper', () => {
  it('honors searchSize inside the wrapped range', () => {
    const e0 = { info: { cutvalue: -3 } } as unknown as Edge;
    const e1 = { info: { cutvalue: -9 } } as unknown as Edge;
    const ctx = { treeEdges: [e0, e1], sI: 0, searchSize: 1 } as unknown as NsCtx;
    const [rv, cnt] = leaveEdgeScan(ctx, 2, 0, undefined);
    expect(rv).toBe(e0);
    expect(cnt).toBe(1);
  });
  it('leaves a running-best rv untouched when no candidate in range improves it', () => {
    const e0 = { info: { cutvalue: 5 } } as unknown as Edge; // not negative
    const prior = { info: { cutvalue: -100 } } as unknown as Edge;
    const ctx = { treeEdges: [e0], sI: 0, searchSize: 30 } as unknown as NsCtx;
    const [rv, cnt] = leaveEdgeScan(ctx, 1, 3, prior);
    expect(rv).toBe(prior);
    expect(cnt).toBe(3);
  });
  it('does not replace rv when a negative candidate is still worse (not strictly less)', () => {
    const prior = { info: { cutvalue: -100 } } as unknown as Edge;
    const worse = { info: { cutvalue: -1 } } as unknown as Edge; // negative, but not < -100
    const ctx = { treeEdges: [worse], sI: 0, searchSize: 30 } as unknown as NsCtx;
    const [rv, cnt] = leaveEdgeScan(ctx, 1, 0, prior);
    expect(rv).toBe(prior);
    expect(cnt).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// dfsEnterOutScan / dfsEnterOutTreeIn / dfsEnterOutedge
// ---------------------------------------------------------------------------

describe('dfsEnterOutScan', () => {
  it('returns immediately when the node has no out-list', () => {
    const todo: Node[] = [];
    const best = { e: undefined, slack: Infinity };
    dfsEnterOutScan({ info: { lim: 5 } } as unknown as Node, 0, 5, todo, best);
    expect(todo).toEqual([]);
    expect(best.e).toBeUndefined();
  });
  it('pushes a tree-edge head that is inside the subtree (lim < nLim)', () => {
    const head = { info: { lim: 2 } } as unknown as Node;
    const e = { info: { tree_index: 0 }, head } as unknown as Edge;
    const n = { info: { lim: 10, out: { list: [e], size: 1 } } } as unknown as Node;
    const todo: Node[] = [];
    const best = { e: undefined, slack: Infinity };
    dfsEnterOutScan(n, 0, 10, todo, best);
    expect(todo).toEqual([head]);
  });
  it('does not push a tree-edge head that is outside the subtree', () => {
    const head = { info: { lim: 20 } } as unknown as Node; // not < nLim
    const e = { info: { tree_index: 0 }, head } as unknown as Edge;
    const n = { info: { lim: 10, out: { list: [e], size: 1 } } } as unknown as Node;
    const todo: Node[] = [];
    dfsEnterOutScan(n, 0, 10, todo, { e: undefined, slack: Infinity });
    expect(todo).toEqual([]);
  });
  it('records a non-tree edge whose head lim is outside [low,lim] as a slack candidate', () => {
    const tail = { info: { rank: 1 } } as unknown as Node;
    const head = { info: { lim: 99, rank: 4 } } as unknown as Node; // outside [0,10]
    const e = { info: { tree_index: -1, minlen: 1 }, tail, head } as unknown as Edge;
    const n = { info: { lim: 10, out: { list: [e], size: 1 } } } as unknown as Node;
    const best = { e: undefined as Edge | undefined, slack: Infinity };
    dfsEnterOutScan(n, 0, 10, [], best);
    expect(best.e).toBe(e);
    expect(best.slack).toBe(2); // 4 - 1 - 1
  });
  it('ignores a non-tree edge whose head lim is inside [low,lim]', () => {
    const tail = { info: { rank: 1 } } as unknown as Node;
    const head = { info: { lim: 5, rank: 4 } } as unknown as Node; // inside [0,10]
    const e = { info: { tree_index: -1, minlen: 1 }, tail, head } as unknown as Edge;
    const n = { info: { lim: 10, out: { list: [e], size: 1 } } } as unknown as Node;
    const best = { e: undefined as Edge | undefined, slack: Infinity };
    dfsEnterOutScan(n, 0, 10, [], best);
    expect(best.e).toBeUndefined();
  });
  it('replaces the best candidate only when strictly less slack is found', () => {
    const tail = { info: { rank: 0 } } as unknown as Node;
    const h1 = { info: { lim: 99, rank: 5 } } as unknown as Node;
    const h2 = { info: { lim: 99, rank: 9 } } as unknown as Node; // worse slack
    const e1 = { info: { tree_index: -1, minlen: 1 }, tail, head: h1 } as unknown as Edge; // slack 4
    const e2 = { info: { tree_index: -1, minlen: 1 }, tail, head: h2 } as unknown as Edge; // slack 8
    const n = { info: { lim: 10, out: { list: [e1, e2], size: 2 } } } as unknown as Node;
    const best = { e: undefined as Edge | undefined, slack: Infinity };
    dfsEnterOutScan(n, 0, 10, [], best);
    expect(best.e).toBe(e1);
    expect(best.slack).toBe(4);
  });
  it('treats an unset tree_index as non-tree (-1) and unset rank/minlen as 0/0/1', () => {
    const tail = { info: {} } as unknown as Node; // rank ?? 0
    const head = { info: { lim: 99 } } as unknown as Node; // rank ?? 0, outside [0,10]
    const e = { info: {}, tail, head } as unknown as Edge; // tree_index ?? -1, minlen ?? 1
    const n = { info: { lim: 10, out: { list: [e], size: 1 } } } as unknown as Node;
    const best = { e: undefined as Edge | undefined, slack: Infinity };
    dfsEnterOutScan(n, 0, 10, [], best);
    expect(best.e).toBe(e);
    expect(best.slack).toBe(-1); // 0 - 0 - 1
  });
});

describe('dfsEnterOutTreeIn', () => {
  it('does nothing when tree_in is absent', () => {
    const todo: Node[] = [];
    dfsEnterOutTreeIn({ info: {} } as unknown as Node, todo, 5);
    expect(todo).toEqual([]);
  });
  it('does nothing when bestSlack is already <= 0 (search can stop)', () => {
    const tail = { info: { lim: 1 } } as unknown as Node;
    const e = { tail } as unknown as Edge;
    const todo: Node[] = [];
    dfsEnterOutTreeIn({ info: { lim: 10, tree_in: { list: [e], size: 1 } } } as unknown as Node, todo, 0);
    expect(todo).toEqual([]);
  });
  it('pushes tree_in tails that are inside the subtree when bestSlack > 0', () => {
    const inTail = { info: { lim: 2 } } as unknown as Node;
    const outTail = { info: { lim: 50 } } as unknown as Node;
    const e1 = { tail: inTail } as unknown as Edge;
    const e2 = { tail: outTail } as unknown as Edge;
    const todo: Node[] = [];
    dfsEnterOutTreeIn(
      { info: { lim: 10, tree_in: { list: [e1, e2], size: 2 } } } as unknown as Node, todo, 5,
    );
    expect(todo).toEqual([inTail]);
  });
});

describe('dfsEnterOutedge — small DFS integration', () => {
  it('finds the minimal-slack out-of-range non-tree edge reachable via tree_in', () => {
    // v (lim=10) --tree_in--> u (lim=1) --out(non-tree)--> far (lim=50)
    const far = { info: { lim: 50, rank: 20 } } as unknown as Node;
    const nonTree = {
      info: { tree_index: -1, minlen: 1 }, tail: { info: { rank: 0 } } as unknown as Node, head: far,
    } as unknown as Edge;
    const u = { info: { lim: 1, out: { list: [nonTree], size: 1 } } } as unknown as Node;
    (nonTree as unknown as { tail: Node }).tail = u;
    u.info.rank = 0;
    const treeInEdge = { tail: u } as unknown as Edge;
    const v = { info: { lim: 10, tree_in: { list: [treeInEdge], size: 1 } } } as unknown as Node;
    const found = dfsEnterOutedge(v, 0, 10);
    expect(found).toBe(nonTree);
  });
});

// ---------------------------------------------------------------------------
// dfsEnterInScan / dfsEnterInTreeOut / dfsEnterInedge (mirror of the out family)
// ---------------------------------------------------------------------------

describe('dfsEnterInScan', () => {
  it('returns immediately when the node has no in-list', () => {
    const todo: Node[] = [];
    dfsEnterInScan({ info: { lim: 5 } } as unknown as Node, 0, 5, todo, { e: undefined, slack: Infinity });
    expect(todo).toEqual([]);
  });
  it('pushes a tree-edge tail inside the subtree, skips one outside it', () => {
    const inTail = { info: { lim: 2 } } as unknown as Node;
    const outTail = { info: { lim: 50 } } as unknown as Node;
    const e1 = { info: { tree_index: 0 }, tail: inTail } as unknown as Edge;
    const e2 = { info: { tree_index: 0 }, tail: outTail } as unknown as Edge;
    const n = { info: { lim: 10, in: { list: [e1, e2], size: 2 } } } as unknown as Node;
    const todo: Node[] = [];
    dfsEnterInScan(n, 0, 10, todo, { e: undefined, slack: Infinity });
    expect(todo).toEqual([inTail]);
  });
  it('records and then improves a non-tree in-edge slack candidate', () => {
    const head = { info: { rank: 10 } } as unknown as Node;
    const worseTail = { info: { lim: 99, rank: 1 } } as unknown as Node; // slack 8
    const betterTail = { info: { lim: 99, rank: 3 } } as unknown as Node; // slack 6
    const e1 = { info: { tree_index: -1, minlen: 1 }, tail: worseTail, head } as unknown as Edge;
    const e2 = { info: { tree_index: -1, minlen: 1 }, tail: betterTail, head } as unknown as Edge;
    const n = { info: { lim: 10, in: { list: [e1, e2], size: 2 } } } as unknown as Node;
    const best = { e: undefined as Edge | undefined, slack: Infinity };
    dfsEnterInScan(n, 0, 10, [], best);
    expect(best.e).toBe(e2);
    expect(best.slack).toBe(6);
  });
  it('ignores a non-tree in-edge whose tail lim is inside [low,lim]', () => {
    const head = { info: { rank: 10 } } as unknown as Node;
    const tail = { info: { lim: 5, rank: 1 } } as unknown as Node; // inside [0,10]
    const e = { info: { tree_index: -1, minlen: 1 }, tail, head } as unknown as Edge;
    const n = { info: { lim: 10, in: { list: [e], size: 1 } } } as unknown as Node;
    const best = { e: undefined as Edge | undefined, slack: Infinity };
    dfsEnterInScan(n, 0, 10, [], best);
    expect(best.e).toBeUndefined();
  });
  it('treats an unset tree_index as non-tree (-1) and unset rank/minlen as 0/0/1', () => {
    const head = { info: {} } as unknown as Node; // rank ?? 0
    const tail = { info: { lim: 99 } } as unknown as Node; // rank ?? 0, outside [0,10]
    const e = { info: {}, tail, head } as unknown as Edge; // tree_index ?? -1, minlen ?? 1
    const n = { info: { lim: 10, in: { list: [e], size: 1 } } } as unknown as Node;
    const best = { e: undefined as Edge | undefined, slack: Infinity };
    dfsEnterInScan(n, 0, 10, [], best);
    expect(best.e).toBe(e);
    expect(best.slack).toBe(-1); // 0 - 0 - 1
  });
});

describe('dfsEnterInTreeOut', () => {
  it('does nothing when tree_out is absent', () => {
    const todo: Node[] = [];
    dfsEnterInTreeOut({ info: {} } as unknown as Node, todo, 5);
    expect(todo).toEqual([]);
  });
  it('does nothing when bestSlack <= 0', () => {
    const head = { info: { lim: 1 } } as unknown as Node;
    const e = { head } as unknown as Edge;
    const todo: Node[] = [];
    dfsEnterInTreeOut({ info: { lim: 10, tree_out: { list: [e], size: 1 } } } as unknown as Node, todo, 0);
    expect(todo).toEqual([]);
  });
  it('pushes tree_out heads inside the subtree, skips one outside it, when bestSlack > 0', () => {
    const inHead = { info: { lim: 2 } } as unknown as Node;
    const outHead = { info: { lim: 50 } } as unknown as Node; // not < nLim
    const e1 = { head: inHead } as unknown as Edge;
    const e2 = { head: outHead } as unknown as Edge;
    const todo: Node[] = [];
    dfsEnterInTreeOut(
      { info: { lim: 10, tree_out: { list: [e1, e2], size: 2 } } } as unknown as Node, todo, 5,
    );
    expect(todo).toEqual([inHead]);
  });
});

describe('dfsEnterInedge — small DFS integration', () => {
  it('finds the minimal-slack out-of-range non-tree in-edge reachable via tree_out', () => {
    const far = { info: { lim: 50, rank: -5 } } as unknown as Node;
    const nonTree = {
      info: { tree_index: -1, minlen: 1 }, tail: far, head: { info: { rank: 0 } } as unknown as Node,
    } as unknown as Edge;
    const u = { info: { lim: 1, in: { list: [nonTree], size: 1 } } } as unknown as Node;
    (nonTree as unknown as { head: Node }).head = u;
    u.info.rank = 0;
    const treeOutEdge = { head: u } as unknown as Edge;
    const v = { info: { lim: 10, tree_out: { list: [treeOutEdge], size: 1 } } } as unknown as Node;
    const found = dfsEnterInedge(v, 0, 10);
    expect(found).toBe(nonTree);
  });
});

describe('enterEdge — dispatches to in-DFS or out-DFS by lim(tail) vs lim(head)', () => {
  it('uses dfsEnterInedge when lim(tail) < lim(head)', () => {
    const tail = { info: { lim: 1 } } as unknown as Node;
    const head = { info: { lim: 10 } } as unknown as Node;
    const e = { tail, head, info: {} } as unknown as Edge;
    // tail has no in-list, so the in-DFS terminates with no candidate.
    expect(enterEdge(e)).toBeUndefined();
  });
  it('uses dfsEnterOutedge when lim(tail) >= lim(head)', () => {
    const tail = { info: { lim: 10 } } as unknown as Node;
    const head = { info: { lim: 1 } } as unknown as Node;
    const e = { tail, head, info: {} } as unknown as Edge;
    expect(enterEdge(e)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// treeupdate
// ---------------------------------------------------------------------------

describe('treeupdate — walks the tree path to the LCA, updating cutvalues', () => {
  it('adds cutvalue when n is the tail of its parent edge and dir is true', () => {
    // n(low=5,lim=5) --par--> parent(low=0,lim=10); w has lim=8 (inside parent's range)
    const parent = { info: { low: 0, lim: 10 } } as unknown as Node;
    const n = { info: { low: 5, lim: 5 } } as unknown as Node;
    const par = { tail: n, head: parent, info: { cutvalue: 3 } } as unknown as Edge;
    n.info.par = par;
    const w = { info: { lim: 8 } } as unknown as Node;
    const result = treeupdate(n, w, 4, true);
    expect(par.info.cutvalue).toBe(7); // 3 + 4, d=true (n===tail, dir=true)
    expect(result).toBe(parent); // lim(parent)=10 > lim(n)=5
  });
  it('subtracts cutvalue when n is the head of its parent edge (d flips)', () => {
    const parent = { info: { low: 0, lim: 10 } } as unknown as Node;
    const n = { info: { low: 5, lim: 5 } } as unknown as Node;
    const par = { tail: parent, head: n, info: { cutvalue: 3 } } as unknown as Edge;
    n.info.par = par;
    const w = { info: { lim: 8 } } as unknown as Node;
    treeupdate(n, w, 4, true); // n===head, dir=true -> d=!dir=false -> subtract
    expect(par.info.cutvalue).toBe(-1); // 3 - 4
  });
  it('stops immediately when SEQ(low(v), lim(w), lim(v)) already holds', () => {
    const v = { info: { low: 0, lim: 10 } } as unknown as Node;
    const w = { info: { lim: 5 } } as unknown as Node; // 0 <= 5 <= 10
    expect(treeupdate(v, w, 99, true)).toBe(v);
  });
});

// ---------------------------------------------------------------------------
// updateRerank
// ---------------------------------------------------------------------------

describe('rerank — treats an unset node rank as 0 before subtracting delta', () => {
  it('sets rank to -delta when the starting rank is unset', () => {
    const v = { info: {} } as unknown as Node; // rank ?? 0 fallback
    rerank(v, 4);
    expect(v.info.rank).toBe(-4);
  });
});

describe('updateRerank', () => {
  it('does nothing when delta <= 0', () => {
    const tail = { info: { rank: 5, tree_in: undefined, tree_out: undefined } } as unknown as Node;
    updateRerank({ tail, head: tail, info: {} } as unknown as Edge, 0);
    expect(tail.info.rank).toBe(5);
  });
  it('reranks from e.tail when its tree-degree is 1', () => {
    const tail = { info: { rank: 5, tree_in: { list: [], size: 1 }, tree_out: { list: [], size: 0 } } } as unknown as Node;
    const head = { info: { rank: 0 } } as unknown as Node;
    updateRerank({ tail, head, info: {} } as unknown as Edge, 3);
    expect(tail.info.rank).toBe(2);
  });
  it('reranks from e.head with -delta when tail is not degree-1 but head is', () => {
    const tail = { info: { rank: 5, tree_in: { list: [], size: 2 }, tree_out: { list: [], size: 0 } } } as unknown as Node;
    const head = { info: { rank: 5, tree_in: { list: [], size: 1 }, tree_out: { list: [], size: 0 } } } as unknown as Node;
    updateRerank({ tail, head, info: {} } as unknown as Edge, 3);
    expect(head.info.rank).toBe(8); // rerank(head, -3) => rank - (-3)
    expect(tail.info.rank).toBe(5);
  });
  it('picks the lower-lim endpoint when neither is degree-1', () => {
    const tail = {
      info: { rank: 5, lim: 1, tree_in: { list: [], size: 2 }, tree_out: { list: [], size: 0 } },
    } as unknown as Node;
    const head = {
      info: { rank: 5, lim: 9, tree_in: { list: [], size: 2 }, tree_out: { list: [], size: 0 } },
    } as unknown as Node;
    updateRerank({ tail, head, info: {} } as unknown as Edge, 3);
    expect(tail.info.rank).toBe(2); // lim(tail)=1 < lim(head)=9 -> rerank(tail, +delta)
    expect(head.info.rank).toBe(5);
  });
  it('picks head with -delta when lim(tail) >= lim(head)', () => {
    const tail = {
      info: { rank: 5, lim: 9, tree_in: { list: [], size: 2 }, tree_out: { list: [], size: 0 } },
    } as unknown as Node;
    const head = {
      info: { rank: 5, lim: 1, tree_in: { list: [], size: 2 }, tree_out: { list: [], size: 0 } },
    } as unknown as Node;
    updateRerank({ tail, head, info: {} } as unknown as Edge, 3);
    expect(head.info.rank).toBe(8); // rerank(head, -3) => rank - (-3)
    expect(tail.info.rank).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// nsUpdate — full pivot, via a small real tight tree (addTreeEdge + real Graph)
// ---------------------------------------------------------------------------

describe('nsUpdate — one simplex pivot on a 3-node path with a shortcut edge', () => {
  it('exchanges the leaving/entering edges and re-derives ranks', () => {
    // Path a-b-c is the tight tree; a->c is a non-tree entering edge with slack.
    const [g, [a, b, c]] = buildNsGraph(3, [[0, 1, 1], [1, 2, 1], [0, 2, 1]]);
    // Assign ranks satisfying all three edges' minlen (a=0,b=1,c=2) BEFORE
    // initGraph, since feasibility is checked against the current ranks.
    a.info.rank = 0; b.info.rank = 1; c.info.rank = 2;
    const ctx = mkCtx(g);
    expect(initGraph(ctx, g)).toBe(true);
    const ab = a.info.out!.list[0];
    const bc = b.info.out!.list[0];
    const ac = a.info.out!.list[1];
    addTreeEdge(ctx, ab);
    addTreeEdge(ctx, bc);
    dfsRangeInit(a); // computes consistent low/lim/par for the real tight tree
    const bcTreeIndex = bc.info.tree_index;
    ab.info.cutvalue = 1; bc.info.cutvalue = 1;
    const uerr = nsUpdate(ctx, bc, ac);
    expect(uerr).toBe(0);
    expect(ac.info.tree_index).toBe(bcTreeIndex);
    expect(bc.info.tree_index).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// scanAndNormalize / free* / resetLists
// ---------------------------------------------------------------------------

describe('scanAndNormalize', () => {
  it('shifts all NORMAL-node ranks so the minimum lands at 0, ignoring non-NORMAL', () => {
    const [g, [a, b, c]] = buildNsGraph(3, []);
    a.info.rank = 5; b.info.rank = 2; c.info.rank = 8;
    c.info.node_type = 1; // not NORMAL -> excluded from min/max scan
    const spread = scanAndNormalize(mkCtx(g));
    expect(spread).toBe(3); // max(5,2)-min(5,2) among NORMAL nodes only
    expect(a.info.rank).toBe(3);
    expect(b.info.rank).toBe(0);
  });
});

describe('freeTreeNode / resetLists / freeTreeList', () => {
  it('clears tree_in/tree_out/mark on every node and resets the tree-edge list', () => {
    const [g, [a, b]] = buildNsGraph(2, [[0, 1, 1]]);
    const ctx = mkCtx(g);
    initGraph(ctx, g);
    addTreeEdge(ctx, a.info.out!.list[0]);
    expect(ctx.treeEdges.length).toBe(1);
    a.info.mark = 1;
    freeTreeList(ctx);
    expect(a.info.tree_in).toBeUndefined();
    expect(a.info.tree_out).toBeUndefined();
    expect(a.info.mark).toBe(0);
    expect(b.info.tree_out).toBeUndefined();
    expect(ctx.treeEdges.length).toBe(0);
    expect(ctx.sI).toBe(0);
  });
  it('resetLists alone truncates treeEdges and rewinds sI without touching nodes', () => {
    const ctx = { treeEdges: [{}, {}] as unknown as Edge[], sI: 5 } as unknown as NsCtx;
    resetLists(ctx);
    expect(ctx.treeEdges.length).toBe(0);
    expect(ctx.sI).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// lrBalance
// ---------------------------------------------------------------------------

describe('lrBalance', () => {
  it('skips tree edges with non-zero cutvalue and frees the tree list at the end', () => {
    const [g, [a, b]] = buildNsGraph(2, [[0, 1, 1]]);
    const ctx = mkCtx(g);
    initGraph(ctx, g);
    const e = a.info.out!.list[0];
    addTreeEdge(ctx, e);
    e.info.cutvalue = 5; // non-zero -> `continue`, no rebalancing happens
    a.info.rank = 0; b.info.rank = 1;
    lrBalance(ctx);
    expect(ctx.treeEdges.length).toBe(0); // freeTreeList always runs at the end
  });
  it('rebalances a mid-slack edge toward the tail side (lim(tail) < lim(head))', () => {
    // A 6-node graph (including a parallel n4->n5 pair) whose post-simplex
    // tight tree has a zero-cutvalue edge whose enterEdge() replacement has
    // tailLim<headLim, exercising the `rerank(e.tail, half)` arm of
    // lrBalance's final ternary (the diamond fixture below only ever hits
    // the else arm). Found by exhaustive search over small DAGs and
    // confirmed by direct rank2(g,2,...) execution.
    const [g, nodes] = buildNsGraph(6, [
      [0, 1, 1], [1, 2, 3], [0, 3, 1], [3, 4, 1], [4, 5, 1], [4, 5, 2], [0, 2, 1], [2, 5, 3],
    ]);
    expect(rank2(g, 2, 100, 30)).toBe(0);
    expect(nodes.map((n) => n.info.rank)).toEqual([0, 1, 4, 3, 5, 7]);
  });
  it('rebalances a mid-slack edge toward the head side (lim(tail) >= lim(head))', () => {
    const [g, [a, b, c, d]] = buildNsGraph(4, [[0, 1, 1], [0, 2, 1], [1, 3, 1], [2, 3, 3]]);
    expect(rank2(g, 2, 100, 30)).toBe(0);
    expect([a, b, c, d].map((n) => n.info.rank)).toEqual([0, 2, 1, 4]);
  });
  it('leaves ranks untouched when the entering-edge slack is <=1 (nothing to balance)', () => {
    const [g, [a, b, c, d]] = buildNsGraph(4, [[0, 1, 1], [0, 2, 1], [1, 3, 1], [2, 3, 2]]);
    expect(rank2(g, 2, 100, 30)).toBe(0);
    expect([a, b, c, d].map((n) => n.info.rank)).toEqual([0, 1, 1, 3]);
  });
});

// ---------------------------------------------------------------------------
// TB_balance family
// ---------------------------------------------------------------------------

describe('tbGetAdj', () => {
  it('maps TBbalance=min to 1, TBbalance=max to 2, anything else (incl. unset) to 0', () => {
    const gMin = { attrs: new Map([['TBbalance', 'min']]) } as unknown as Graph;
    const gMax = { attrs: new Map([['TBbalance', 'max']]) } as unknown as Graph;
    const gOther = { attrs: new Map([['TBbalance', 'bogus']]) } as unknown as Graph;
    const gUnset = { attrs: new Map() } as unknown as Graph;
    expect(tbGetAdj(gMin)).toBe(1);
    expect(tbGetAdj(gMax)).toBe(2);
    expect(tbGetAdj(gOther)).toBe(0);
    expect(tbGetAdj(gUnset)).toBe(0);
  });
});

describe('tbForceAdj', () => {
  it('does nothing when adj is 0', () => {
    const [g, [a]] = buildNsGraph(1, []);
    a.info.rank = 7;
    tbForceAdj(mkCtx(g), 0, 10);
    expect(a.info.rank).toBe(7);
  });
  it('forces in-degree-0 NORMAL nodes to rank 0 when adj=1', () => {
    const [g, [a, b]] = buildNsGraph(2, [[0, 1, 1]]); // b has an in-edge, a does not
    a.info.rank = 7; b.info.rank = 8; b.info.node_type = 1; // b excluded (not NORMAL)
    tbForceAdj(mkCtx(g), 1, 10);
    expect(a.info.rank).toBe(0);
    expect(b.info.rank).toBe(8); // untouched: not NORMAL
  });
  it('forces out-degree-0 NORMAL nodes to maxrank when adj=2', () => {
    const [g, [a, b]] = buildNsGraph(2, [[0, 1, 1]]); // a has an out-edge, b does not
    a.info.rank = 3; b.info.rank = 3;
    tbForceAdj(mkCtx(g), 2, 10);
    expect(b.info.rank).toBe(10);
    expect(a.info.rank).toBe(3); // a has an out-edge, so untouched
  });
});

describe('tbSortCompare', () => {
  it('sorts descending by rank when adj > 1, ascending otherwise', () => {
    const lo = { info: { rank: 1 } } as unknown as Node;
    const hi = { info: { rank: 5 } } as unknown as Node;
    expect(tbSortCompare(lo, hi, 2)).toBeGreaterThan(0); // descending
    expect(tbSortCompare(lo, hi, 0)).toBeLessThan(0); // ascending
    expect(tbSortCompare(lo, hi, 1)).toBeLessThan(0); // adj=1 is not >1
  });
});

describe('tbSortNodes', () => {
  it('counts only NORMAL nodes into the per-rank histogram', () => {
    const [g, [a, b]] = buildNsGraph(2, []);
    a.info.rank = 0; b.info.rank = 0; b.info.node_type = 1; // b excluded
    const nrank = [0];
    tbSortNodes(mkCtx(g), nrank, 0);
    expect(nrank[0]).toBe(1);
  });
});

describe('tbComputeBounds', () => {
  it('sums in/out weights and tightens [low,high] from both sides', () => {
    const [g, [a, b, c]] = buildNsGraph(3, [[0, 1, 2], [1, 2, 3]]);
    a.info.rank = 0; b.info.rank = 2; c.info.rank = 10;
    const [inw, outw, low, high] = tbComputeBounds(b, 20);
    expect(inw).toBe(1); // default edge weight
    expect(outw).toBe(1);
    expect(low).toBe(2); // a.rank(0)+minlen(2)
    expect(high).toBe(7); // c.rank(10)-minlen(3)
  });
  it('clamps low to 0 and defaults bounds to [0,maxrank] with no in/out edges', () => {
    const [g, [a]] = buildNsGraph(1, []);
    a.info.rank = -5;
    const [inw, outw, low, high] = tbComputeBounds(a, 10);
    expect(inw).toBe(0);
    expect(outw).toBe(0);
    expect(low).toBe(0);
    expect(high).toBe(10);
  });
});

describe('tbMoveNode', () => {
  it('moves directly to low (adj=1) or high (adj=2) without consulting nrank', () => {
    const n = { info: { rank: 3 } } as unknown as Node;
    const nrank = [0, 0, 0, 1, 0, 0];
    tbMoveNode(n, 1, 5, nrank, 1);
    expect(n.info.rank).toBe(1);
    n.info.rank = 3;
    tbMoveNode(n, 1, 5, nrank, 2);
    expect(n.info.rank).toBe(5);
  });
  it('picks the least-occupied rank in [low,high] when adj=0', () => {
    const n = { info: { rank: 2 } } as unknown as Node;
    const nrank = [5, 5, 3, 0, 5]; // rank 3 is least occupied
    tbMoveNode(n, 1, 4, nrank, 0);
    expect(n.info.rank).toBe(3);
    expect(nrank[2]).toBe(2); // decremented from old rank
    expect(nrank[3]).toBe(1); // incremented at new rank
  });
});

describe('tbBalance — end-to-end TB balance modes', () => {
  it('balance=1 (TBbalance=min) forces roots to rank 0', () => {
    const [g, [a, b]] = buildNsGraph(2, [[0, 1, 1]]);
    g.attrs.set('TBbalance', 'min');
    a.info.rank = 0; b.info.rank = 1;
    tbBalance(mkCtx(g));
    expect(a.info.rank).toBe(0);
  });
  it('balance=0 (no TBbalance) still normalizes and redistributes non-tied nodes', () => {
    const [g, [a, b, c]] = buildNsGraph(3, [[0, 1, 1], [0, 2, 1]]);
    a.info.rank = 0; b.info.rank = 1; c.info.rank = 1;
    tbBalance(mkCtx(g));
    expect(a.info.rank).toBe(0);
  });
  it('skips a non-NORMAL node (just frees its tree fields) instead of moving it', () => {
    const [g, [a, b]] = buildNsGraph(2, [[0, 1, 1]]);
    a.info.rank = 0; b.info.rank = 1;
    b.info.node_type = 1; // not NORMAL
    b.info.mark = 1;
    tbBalance(mkCtx(g));
    expect(b.info.mark).toBe(0); // freeTreeNode ran via the non-NORMAL branch
    expect(b.info.rank).toBe(1); // untouched by tbMoveNode
  });
});

// ---------------------------------------------------------------------------
// initGraphEdge / initGraph
// ---------------------------------------------------------------------------

describe('initGraphEdge', () => {
  it('reports infeasible when head.rank - tail.rank < minlen', () => {
    const tail = { info: { rank: 0 } } as unknown as Node;
    const head = { info: { rank: 0 } } as unknown as Node; // 0-0=0 < 1
    const n = { info: { priority: 0 } } as unknown as Node;
    const e = { tail, head, info: { minlen: 1 } } as unknown as Edge;
    expect(initGraphEdge(n, e)).toBe(true);
    expect(n.info.priority).toBe(1);
    expect(e.info.cutvalue).toBe(0);
    expect(e.info.tree_index).toBe(-1);
  });
  it('reports feasible when the length already satisfies minlen', () => {
    const tail = { info: { rank: 0 } } as unknown as Node;
    const head = { info: { rank: 2 } } as unknown as Node; // 2-0=2 >= 1
    const n = { info: { priority: 0 } } as unknown as Node;
    const e = { tail, head, info: { minlen: 1 } } as unknown as Edge;
    expect(initGraphEdge(n, e)).toBe(false);
  });
  it('treats an unset node priority as 0 before incrementing', () => {
    const tail = { info: { rank: 0 } } as unknown as Node;
    const head = { info: { rank: 2 } } as unknown as Node;
    const n = { info: {} } as unknown as Node; // priority ?? 0 fallback
    const e = { tail, head, info: { minlen: 1 } } as unknown as Edge;
    initGraphEdge(n, e);
    expect(n.info.priority).toBe(1);
  });
});

describe('initGraph', () => {
  it('returns true (feasible) and wires tree_in/tree_out for a node with no edges', () => {
    const [g, [a]] = buildNsGraph(1, []);
    const ctx = mkCtx(g);
    expect(initGraph(ctx, g)).toBe(true);
    expect(a.info.tree_in).toEqual({ list: [], size: 0 });
    expect(a.info.tree_out).toEqual({ list: [], size: 0 });
    expect(ctx.nNodes).toBe(1);
    expect(ctx.nEdges).toBe(0);
  });
  it('returns false when any in-edge is infeasible, and counts out-edges into nEdges', () => {
    const [g, [a, b]] = buildNsGraph(2, [[0, 1, 5]]); // minlen 5, ranks default 0
    const ctx = mkCtx(g);
    expect(initGraph(ctx, g)).toBe(false);
    expect(ctx.nEdges).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// rank2Loop / rank2Balance / rank2 / rank — composite entry points
// ---------------------------------------------------------------------------

describe('rank2Loop', () => {
  it('returns 0 immediately when there is no negative-cutvalue tree edge to pivot on', () => {
    const ctx = { treeEdges: [], sI: 0, searchSize: 30 } as unknown as NsCtx;
    expect(rank2Loop(ctx, 100)).toBe(0);
  });
  it('breaks out (returns 0) when leaveEdge finds a candidate but enterEdge finds none', () => {
    // e is a negative-cutvalue tree edge with no candidate replacement (isolated).
    const tail = { info: { lim: 1, low: 1 } } as unknown as Node;
    const head = { info: { lim: 2 } } as unknown as Node;
    const e = { tail, head, info: { cutvalue: -1 } } as unknown as Edge;
    const ctx = { treeEdges: [e], sI: 0, searchSize: 30 } as unknown as NsCtx;
    expect(rank2Loop(ctx, 100)).toBe(0);
  });
  it('performs a real pivot (uerr===0) then stops at maxiter=1', () => {
    // A 6-node graph whose feasible tight tree (built by feasibleTree) leaves
    // exactly one negative-cutvalue tree edge with a valid entering
    // replacement, so rank2Loop must reach `nsUpdate` and the `++iter >=
    // maxiter` break — not just the `!f` early break covered above.
    const [g, nodes] = buildNsGraph(6, [
      [0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 4, 1], [4, 5, 1], [5, 3, 1], [1, 5, 1],
    ]);
    const ctx = mkCtx(g);
    if (!initGraph(ctx, g)) initRank(ctx);
    expect(feasibleTree(ctx)).toBe(0);
    expect(ctx.treeEdges.some((e) => edgeCv(e) < 0)).toBe(true);
    expect(rank2Loop(ctx, 1)).toBe(0); // uerr===0 path, then maxiter break (iter>=1)
    expect(nodes.map((n) => n.info.rank)).toEqual([0, 1, 2, 3, 1, 2]);
  });
  it('continues past a completed pivot (iter<maxiter) until leaveEdge is exhausted', () => {
    const [g, nodes] = buildNsGraph(6, [
      [0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 4, 1], [4, 5, 1], [5, 3, 1], [1, 5, 1],
    ]);
    const ctx = mkCtx(g);
    if (!initGraph(ctx, g)) initRank(ctx);
    feasibleTree(ctx);
    expect(rank2Loop(ctx, 100)).toBe(0); // iter(1)>=100 false -> loop re-checks leaveEdge
    expect(nodes.map((n) => n.info.rank)).toEqual([0, 1, 2, 3, 1, 2]);
  });
  it('propagates nsUpdate\'s mismatched-lca error (uerr=2) when the tree invariant is broken', () => {
    // nsUpdate's `mismatched lca in treeupdates` check (ns.c:729, agerrorf) is
    // a pure internal-consistency assertion: with a correctly built tight
    // tree it can never fire. It is exercised here by building a REAL valid
    // tree via feasibleTree and then deliberately corrupting one node's
    // `lim` afterward, breaking the invariant the two treeupdate() DFS
    // walks depend on to agree on the LCA — the only way to reach this
    // defensive branch without a genuine port bug.
    const [g, nodes] = buildNsGraph(6, [
      [0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 4, 1], [4, 5, 1], [5, 3, 1], [1, 5, 1],
    ]);
    const ctx = mkCtx(g);
    if (!initGraph(ctx, g)) initRank(ctx);
    feasibleTree(ctx);
    const negEdge = ctx.treeEdges.find((e) => edgeCv(e) < 0)!;
    negEdge.head.info.lim = 999; // corrupt the tree invariant
    expect(rank2Loop(ctx, 5)).toBe(2);
  });
});

describe('rank2Balance', () => {
  it('dispatches to tbBalance for balance=1', () => {
    const [g, [a, b]] = buildNsGraph(2, [[0, 1, 1]]);
    g.attrs.set('TBbalance', 'min');
    const ctx = mkCtx(g);
    initGraph(ctx, g);
    a.info.rank = 0; b.info.rank = 1;
    rank2Balance(ctx, 1);
    expect(a.info.rank).toBe(0);
  });
  it('dispatches to lrBalance for balance=2', () => {
    const [g, [a, b]] = buildNsGraph(2, [[0, 1, 1]]);
    const ctx = mkCtx(g);
    initGraph(ctx, g);
    const e = a.info.out!.list[0];
    addTreeEdge(ctx, e);
    a.info.rank = 0; b.info.rank = 1;
    rank2Balance(ctx, 2);
    expect(ctx.treeEdges.length).toBe(0); // lrBalance always ends in freeTreeList
  });
  it('falls back to scanAndNormalize+freeTreeList for any other balance value', () => {
    const [g, [a, b]] = buildNsGraph(2, [[0, 1, 1]]);
    const ctx = mkCtx(g);
    initGraph(ctx, g);
    a.info.rank = 3; b.info.rank = 5;
    rank2Balance(ctx, 0);
    expect(a.info.rank).toBe(0); // normalized to the minimum
  });
});

describe('rank2 — end-to-end network simplex on small real graphs', () => {
  it('ranks a 3-node chain, exercising the full feasible-tree + rank2Loop path', () => {
    const [g, [a, b, c]] = buildNsGraph(3, [[0, 1, 1], [1, 2, 1]]);
    expect(rank2(g, 0, 100, 30)).toBe(0);
    expect(a.info.rank).toBe(0);
    expect(b.info.rank).toBe(1);
    expect(c.info.rank).toBe(2);
  });
  it('returns 0 without ranking further when maxiter <= 0', () => {
    const [g, [a, b]] = buildNsGraph(2, [[0, 1, 1]]);
    expect(rank2(g, 0, 0, 30)).toBe(0);
  });
  it('propagates a non-zero feasibleTree error (disconnected graph) without ranking', () => {
    const [g] = buildNsGraph(2, []); // two isolated nodes: mergeSubtrees can't connect them
    expect(rank2(g, 0, 100, 30)).toBe(1);
  });
  it('uses the provided searchSize when >= 0, applying TB balance across a diamond', () => {
    const [g, [a, b, c, d]] = buildNsGraph(4, [[0, 1, 1], [0, 2, 1], [1, 3, 1], [2, 3, 3]]);
    g.attrs.set('TBbalance', 'max');
    expect(rank2(g, 1, 100, 5)).toBe(0);
    expect(a.info.rank).toBe(0);
    expect(d.info.rank).toBe(4);
  });
});

describe('rank — reads searchsize from graph attrs, defaulting when absent/invalid', () => {
  it('parses a numeric searchsize attr', () => {
    const [g, [a, b]] = buildNsGraph(2, [[0, 1, 1]]);
    g.attrs.set('searchsize', '7');
    expect(rank(g, 0, 100)).toBe(0);
    expect(a.info.rank).toBe(0);
    expect(b.info.rank).toBe(1);
  });
  it('defaults to SEARCHSIZE when the attr is unset', () => {
    const [g, [a, b]] = buildNsGraph(2, [[0, 1, 1]]);
    expect(rank(g, 0, 100)).toBe(0);
    expect(a.info.rank).toBe(0);
  });
});
