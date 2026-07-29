// SPDX-License-Identifier: EPL-2.0

/**
 * T4b — branch coverage for layout/dot/ns-core.ts.
 *
 * The full network-simplex pipeline already exercises the "explicit value
 * present" outcome of most `?? default` guards here (file starts at 77.5%
 * branch coverage); this file targets the missing outcomes: unset
 * minlen/lim defaults, the treeRemoveEdge "not found" no-swap arm, the
 * addTreeEdge "already a tree edge" early return, and the exchangeTreeEdges
 * "list doesn't exist yet" lazy-init arms.
 *
 * @see lib/common/ns.c
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { makeNodeInfo } from '../../model/nodeInfo.js';
import { makeEdgeInfo, makePort } from '../../model/edgeInfo.js';
import {
  nsSlack, isTreeEdge, treeAppend, treeRemoveEdge, addTreeEdge, invalidatePath,
  exchangeTreeEdges, seq,
} from './ns-core.js';
import type { NsCtx } from './ns-core.js';

let nid = 0;
function makeNode(g: Graph, rank = 0): Node {
  const n = new Node(nid++, `n${nid}`, g);
  n.info = makeNodeInfo();
  n.info.rank = rank;
  return n;
}
function makeEdge(tail: Node, head: Node): Edge {
  const e = new Edge(tail, head, '');
  e.info = makeEdgeInfo(makePort(), makePort());
  return e;
}
function ctxOf(g: Graph): NsCtx {
  return { g, treeEdges: [], sI: 0, nEdges: 0, nNodes: 0, searchSize: 30 };
}

describe('seq', () => {
  it('true when a<=b<=c', () => expect(seq(1, 2, 3)).toBe(true));
  it('false when b<a', () => expect(seq(2, 1, 3)).toBe(false));
  it('false when c<b', () => expect(seq(1, 3, 2)).toBe(false));
});

describe('nsSlack', () => {
  it('defaults minlen to 1 when unset', () => {
    const g = new Graph('g', 'directed');
    const e = makeEdge(makeNode(g, 0), makeNode(g, 3));
    expect(e.info.minlen).toBeUndefined();
    expect(nsSlack(e)).toBe(2); // length(3) - default minlen(1)
  });
});

describe('treeRemoveEdge', () => {
  it('leaves the list unswapped when the edge is not present', () => {
    const g = new Graph('g', 'directed');
    const e1 = makeEdge(makeNode(g), makeNode(g));
    const e2 = makeEdge(makeNode(g), makeNode(g));
    const other = makeEdge(makeNode(g), makeNode(g));
    const el = { list: [e1, e2], size: 2 };
    treeRemoveEdge(el, other);
    expect(el.size).toBe(1);
    expect(el.list[0]).toBe(e1);
  });
  it('swap-removes a present edge', () => {
    const g = new Graph('g', 'directed');
    const e1 = makeEdge(makeNode(g), makeNode(g));
    const e2 = makeEdge(makeNode(g), makeNode(g));
    const el = { list: [e1, e2], size: 2 };
    treeRemoveEdge(el, e1);
    expect(el.size).toBe(1);
    expect(el.list[0]).toBe(e2);
  });
});

describe('addTreeEdge', () => {
  it('returns -1 without side effects when e is already a tree edge', () => {
    const g = new Graph('g', 'directed');
    const ctx = ctxOf(g);
    const e = makeEdge(makeNode(g), makeNode(g));
    e.info.tree_index = 0;
    expect(addTreeEdge(ctx, e)).toBe(-1);
    expect(ctx.treeEdges.length).toBe(0);
  });
  it('registers a new tree edge and lazily creates tree_out/tree_in', () => {
    const g = new Graph('g', 'directed');
    const ctx = ctxOf(g);
    const tail = makeNode(g);
    const head = makeNode(g);
    const e = makeEdge(tail, head);
    expect(isTreeEdge(e)).toBe(false);
    expect(addTreeEdge(ctx, e)).toBe(0);
    expect(e.info.tree_index).toBe(0);
    expect(tail.info.tree_out?.list[0]).toBe(e);
    expect(head.info.tree_in?.list[0]).toBe(e);
  });
});

describe('invalidatePath', () => {
  it('defaults lca.lim to 0 and breaks immediately when toNode.low is already -1', () => {
    const g = new Graph('g', 'directed');
    const lca = makeNode(g);
    expect(lca.info.lim).toBeUndefined();
    const toNode = makeNode(g);
    toNode.info.low = -1;
    invalidatePath(lca, toNode);
    // No-op: low stays -1, nothing else touched.
    expect(toNode.info.low).toBe(-1);
  });

  it('walks one step via pathParent, defaulting unset lim fields to 0', () => {
    const g = new Graph('g', 'directed');
    const lca = makeNode(g);
    lca.info.lim = 10;
    const parent = makeNode(g);
    const toNode = makeNode(g);
    toNode.info.low = 5;
    expect(parent.info.lim).toBeUndefined();
    expect(toNode.info.lim).toBeUndefined();
    const parEdge = makeEdge(parent, toNode);
    toNode.info.par = parEdge;

    invalidatePath(lca, toNode);

    expect(toNode.info.low).toBe(-1);
  });
});

describe('exchangeTreeEdges', () => {
  it('lazily creates tree_out/tree_in on the incoming edge f', () => {
    const g = new Graph('g', 'directed');
    const ctx = ctxOf(g);
    const eTail = makeNode(g);
    const eHead = makeNode(g);
    const e = makeEdge(eTail, eHead);
    e.info.tree_index = 0;
    eTail.info.tree_out = { list: [e], size: 1 };
    eHead.info.tree_in = { list: [e], size: 1 };
    ctx.treeEdges = [e];

    const fTail = makeNode(g);
    const fHead = makeNode(g);
    const f = makeEdge(fTail, fHead);
    expect(fTail.info.tree_out).toBeUndefined();
    expect(fHead.info.tree_in).toBeUndefined();

    exchangeTreeEdges(ctx, e, f);

    expect(f.info.tree_index).toBe(0);
    expect(ctx.treeEdges[0]).toBe(f);
    expect(e.info.tree_index).toBe(-1);
    expect(fTail.info.tree_out?.list[0]).toBe(f);
    expect(fHead.info.tree_in?.list[0]).toBe(f);
  });

  it('appends to existing tree_out/tree_in when already present', () => {
    const g = new Graph('g', 'directed');
    const ctx = ctxOf(g);
    const eTail = makeNode(g);
    const eHead = makeNode(g);
    const e = makeEdge(eTail, eHead);
    e.info.tree_index = 0;
    eTail.info.tree_out = { list: [e], size: 1 };
    eHead.info.tree_in = { list: [e], size: 1 };
    ctx.treeEdges = [e];

    const fTail = makeNode(g);
    const fHead = makeNode(g);
    const f = makeEdge(fTail, fHead);
    const existing = makeEdge(fTail, makeNode(g));
    fTail.info.tree_out = { list: [existing], size: 1 };
    fHead.info.tree_in = { list: [], size: 0 };

    exchangeTreeEdges(ctx, e, f);

    expect(fTail.info.tree_out.list.slice(0, fTail.info.tree_out.size)).toEqual([existing, f]);
  });

  it('exercises treeAppend directly', () => {
    const el = { list: [], size: 0 };
    const g = new Graph('g', 'directed');
    const e = makeEdge(makeNode(g), makeNode(g));
    treeAppend(el, e);
    expect(el.size).toBe(1);
    expect(el.list[0]).toBe(e);
  });
});
