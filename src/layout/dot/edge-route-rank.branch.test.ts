// SPDX-License-Identifier: EPL-2.0

/**
 * T4b — branch coverage for layout/dot/edge-route-rank.ts.
 *
 * The full-pipeline path already exercises the "happy" outcome of most
 * branches here (file starts at 50% branch coverage); this file targets the
 * missing outcomes only: the minrank/maxrank `??` defaults, the falsy-`n`
 * arms of computeLeftBound/computeRightBound's per-rank loop, rankHt's
 * `<= 0` arm, and rankEdgeInfoOf's three early-`undefined` guards
 * (missing rank table, missing tail/head rank, missing rank-table entry).
 *
 * @see lib/dotgen/dotsplines.c:make_regular_edge
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { makeNodeInfo } from '../../model/nodeInfo.js';
import type { RankEntry } from '../../model/rankEntry.js';
import {
  computeLeftBound, computeRightBound, rankHt, rankEdgeInfoOf, getSplineBounds,
  resetSplineBounds,
} from './edge-route-rank.js';

function makeRankEntry(nodes: Node[], ht1 = 20, ht2 = 20): RankEntry {
  return {
    n: nodes.length, v: [...nodes], an: 0, av: [],
    ht1, ht2, pht1: ht1, pht2: ht2, candidate: false, valid: false, cache_nc: 0,
  };
}

let nid = 0;
function makeNode(g: Graph, x: number, lw = 20, rw = 20): Node {
  const n = new Node(nid++, `n${nid}`, g);
  n.info = makeNodeInfo();
  n.info.coord = { x, y: 0 };
  n.info.lw = lw;
  n.info.rw = rw;
  n.info.ht = 36;
  return n;
}

describe('computeLeftBound', () => {
  it('defaults minrank/maxrank to 0/(ranks.length-1) when unset', () => {
    const g = new Graph('g1', 'directed');
    g.info.rank = [makeRankEntry([makeNode(g, 100, 20, 20)])];
    expect(computeLeftBound(g)).toBe(-16);
  });
  it('uses explicit minrank/maxrank when set', () => {
    const g = new Graph('g2', 'directed');
    g.info.rank = [makeRankEntry([makeNode(g, 100, 20, 20)])];
    g.info.minrank = 0;
    g.info.maxrank = 0;
    expect(computeLeftBound(g)).toBe(-16);
  });
  it('still subtracts MINW when the rank has no first node (n falsy)', () => {
    const g = new Graph('g3', 'directed');
    g.info.rank = [makeRankEntry([])];
    expect(computeLeftBound(g)).toBe(-16);
  });
  it('returns the -32 default when the graph has no rank table', () => {
    expect(computeLeftBound(new Graph('g4', 'directed'))).toBe(-32);
  });
});

describe('computeRightBound', () => {
  it('defaults minrank/maxrank and takes the last node of each rank', () => {
    const g = new Graph('g5', 'directed');
    g.info.rank = [makeRankEntry([makeNode(g, 200, 20, 30)])];
    expect(computeRightBound(g)).toBe(246);
  });
  it('still adds MINW when rk.n === 0 (cond-expr false arm)', () => {
    const g = new Graph('g6', 'directed');
    g.info.rank = [makeRankEntry([])];
    expect(computeRightBound(g)).toBe(16);
  });
  it('returns the 60 default when the graph has no rank table', () => {
    expect(computeRightBound(new Graph('g7', 'directed'))).toBe(60);
  });
});

describe('rankHt', () => {
  it('uses rankVal when it is positive', () => {
    expect(rankHt(15, 40)).toBe(15);
  });
  it('falls back to nodeHt/2 when rankVal is zero', () => {
    expect(rankHt(0, 40)).toBe(20);
  });
  it('falls back to nodeHt/2 when rankVal is negative', () => {
    expect(rankHt(-5, 40)).toBe(20);
  });
});

describe('rankEdgeInfoOf', () => {
  it('returns undefined when the graph has no rank table', () => {
    const g = new Graph('gA', 'directed');
    expect(rankEdgeInfoOf(g, makeNode(g, 0), makeNode(g, 0))).toBeUndefined();
  });

  const g = new Graph('gB', 'directed');
  g.info.rank = [makeRankEntry([makeNode(g, 0)])];

  it('returns undefined when the tail node has no rank', () => {
    const tailNoRank = makeNode(g, 0);
    const headOk = makeNode(g, 0);
    headOk.info.rank = 0;
    expect(rankEdgeInfoOf(g, tailNoRank, headOk)).toBeUndefined();
  });
  it('returns undefined when the head node has no rank', () => {
    const tailOk = makeNode(g, 0);
    tailOk.info.rank = 0;
    const headNoRank = makeNode(g, 0);
    expect(rankEdgeInfoOf(g, tailOk, headNoRank)).toBeUndefined();
  });
  it('returns undefined when the tail rank has no table entry', () => {
    const tailBadRank = makeNode(g, 0);
    tailBadRank.info.rank = 5;
    const headOk = makeNode(g, 0);
    headOk.info.rank = 0;
    expect(rankEdgeInfoOf(g, tailBadRank, headOk)).toBeUndefined();
  });
  it('returns undefined when the head rank has no table entry', () => {
    const tailOk = makeNode(g, 0);
    tailOk.info.rank = 0;
    const headBadRank = makeNode(g, 0);
    headBadRank.info.rank = 5;
    expect(rankEdgeInfoOf(g, tailOk, headBadRank)).toBeUndefined();
  });
  it('returns a full RankEdgeInfo when both ranks resolve', () => {
    const tailOk = makeNode(g, 0);
    tailOk.info.rank = 0;
    const headOk = makeNode(g, 0);
    headOk.info.rank = 0;
    expect(rankEdgeInfoOf(g, tailOk, headOk)).toEqual({
      leftBound: -36, rightBound: 36,
      tailHt1: 20, tailHt2: 20, headHt1: 20, headHt2: 20,
    });
  });

  it('memoizes the bounds snapshot per graph until reset', () => {
    const snap1 = getSplineBounds(g);
    const snap2 = getSplineBounds(g);
    expect(snap2).toBe(snap1);
    resetSplineBounds(g);
    const snap3 = getSplineBounds(g);
    expect(snap3).not.toBe(snap1);
    expect(snap3).toEqual(snap1);
  });
});
