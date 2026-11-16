// SPDX-License-Identifier: EPL-2.0

/**
 * T4b — branch coverage for layout/dot/self-loop.ts.
 *
 * The full pipeline already exercises the "explicit value present" outcome
 * of every `?? default` guard here (file starts at 68.75%); this file
 * targets the missing "unset -> default" outcomes only, across
 * collectOtherEdges and the three computeSizey rank-position cases
 * (maxrank-at-0, maxrank>0, minrank, midrank).
 *
 * @see lib/dotgen/dotsplines.c:305-409
 */

import { describe, it, expect } from 'vitest';
// Import order workaround: self-loop.ts <-> splines.ts <-> ortho-adapter.ts
// form a module cycle where ortho-adapter's top-level `buildDotSinfo()` call
// can observe splines.ts's swapEndsP/splineMerge exports mid-TDZ if
// self-loop.ts is the graph's entry point (as it is when this file is run
// in isolation). Priming ortho-adapter.js first — which is how the full
// pipeline always loads it (via index.ts) — reproduces the working
// initialization order.
import './ortho-adapter.js';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { makeNodeInfo } from '../../model/nodeInfo.js';
import { makeEdgeInfo, makePort } from '../../model/edgeInfo.js';
import type { RankEntry } from '../../model/rankEntry.js';
import { collectOtherEdges, computeSizey } from './self-loop.js';

function makeRankEntry(nodes: Node[]): RankEntry {
  return {
    n: nodes.length, v: [...nodes], an: 0, av: [],
    ht1: 20, ht2: 20, pht1: 20, pht2: 20, candidate: false, valid: false, cache_nc: 0,
  };
}
let nid = 0;
function makeNode(g: Graph): Node {
  const n = new Node(nid++, `n${nid}`, g);
  n.info = makeNodeInfo();
  return n;
}
function makeSelfEdge(n: Node): Edge {
  const e = new Edge(n, n, '');
  e.info = makeEdgeInfo(makePort(), makePort());
  return e;
}

describe('collectOtherEdges', () => {
  it('defaults rw and mval to 0 when unset before swapping them', () => {
    const g = new Graph('g', 'directed');
    const n = makeNode(g);
    const loop = makeSelfEdge(n);
    n.info.other = { list: [loop], size: 1 };
    // rw is a required field (always 0-initialized by makeNodeInfo); force it
    // unset to exercise the defensive `?? 0` guard, matching mval which is
    // genuinely optional and already unset.
    n.info.rw = undefined as unknown as number;
    expect(n.info.mval).toBeUndefined();

    const edges: Edge[] = [];
    collectOtherEdges(n, edges);

    // SWAP(&rw, &mval) starting from (undefined??0, undefined??0) = (0, 0).
    expect(n.info.rw).toBe(0);
    expect(n.info.mval).toBe(0);
    expect(edges).toEqual([loop]);
  });
});

describe('computeSizey', () => {
  it('defaults n.info.rank, g.info.minrank and g.info.maxrank to 0 when unset', () => {
    const g = new Graph('g', 'directed');
    const n = makeNode(g);
    n.info.ht = 40;
    expect(n.info.rank).toBeUndefined();
    expect(g.info.minrank).toBeUndefined();
    expect(g.info.maxrank).toBeUndefined();
    // r(0) === maxrank(0) === minrank(0) -> maxrank branch fires first;
    // r > 0 is false -> sizeyAtMaxrank falls back to n.info.ht.
    expect(computeSizey(g, n)).toBe(40);
  });

  it('maxrank branch at r===0 falls back to n.info.ht when coord/ht are default', () => {
    const g = new Graph('g', 'directed');
    g.info.minrank = 0;
    g.info.maxrank = 0;
    const n = makeNode(g);
    n.info.rank = 0;
    // ht is a required field (0-initialized); force it unset to exercise
    // the defensive `?? 0` guard.
    n.info.ht = undefined as unknown as number;
    expect(computeSizey(g, n)).toBe(0);
  });

  it('maxrank branch at r>0 defaults both coord.y reads to 0 when coord is unset', () => {
    const g = new Graph('g', 'directed');
    const upper = makeNode(g); // rank r-1's first node; coord forced unset
    upper.info.coord = undefined as unknown as { x: number; y: number };
    g.info.rank = [makeRankEntry([upper]), makeRankEntry([])];
    g.info.minrank = 0;
    g.info.maxrank = 1;
    const n = makeNode(g);
    n.info.rank = 1;
    n.info.coord = undefined as unknown as { x: number; y: number };
    // rankY(g,0) defaults to 0; n.info.coord?.y defaults to 0 -> 0 - 0 = 0.
    expect(computeSizey(g, n)).toBe(0);
  });

  it('minrank branch (r===minrank, r!==maxrank) defaults coord.y reads to 0', () => {
    const g = new Graph('g', 'directed');
    const lower = makeNode(g); // rank r+1's first node; coord forced unset
    lower.info.coord = undefined as unknown as { x: number; y: number };
    g.info.rank = [makeRankEntry([]), makeRankEntry([lower])];
    g.info.minrank = 0;
    g.info.maxrank = 1;
    const n = makeNode(g);
    n.info.rank = 0;
    n.info.coord = undefined as unknown as { x: number; y: number };
    expect(computeSizey(g, n)).toBe(0);
  });

  it('midrank branch takes the min of the up/down gaps with real coordinates', () => {
    const g = new Graph('g', 'directed');
    const above = makeNode(g);
    above.info.coord = { x: 0, y: 100 };
    const below = makeNode(g);
    below.info.coord = { x: 0, y: 20 };
    g.info.rank = [makeRankEntry([above]), makeRankEntry([]), makeRankEntry([below])];
    g.info.minrank = 0;
    g.info.maxrank = 2;
    const n = makeNode(g);
    n.info.rank = 1;
    n.info.coord = { x: 0, y: 60 };
    // upy = 100-60=40; dwny = 60-20=40; min=40.
    expect(computeSizey(g, n)).toBe(40);
  });
});

// Graphviz 16.1.1 tests the neighbouring rank's leader for NULL before it
// reads it (upstream ca3353d80 "anticipate an empty rank above", 1a77ac9df
// "anticipate an empty rank below"; issue #160). An empty rank has `v[0]`
// absent (`v` is `[]`) or null in the port; both stand for C's `v[0] == NULL`.
// @see lib/dotgen/dotsplines.c:dot_splines_ (16.1.1, :399-411)
describe('computeSizey with an empty neighbouring rank (16.1.1)', () => {
  /** Ranks 0..2 with `n` on rank 1; `above`/`below` are the leaders' y. */
  function midGraph(above: number | null, below: number | null): { g: Graph; n: Node } {
    const g = new Graph('g', 'directed');
    const leader = (y: number | null): Node[] => {
      if (y === null) return [];
      const v = makeNode(g);
      v.info.coord = { x: 0, y };
      return [v];
    };
    const n = makeNode(g);
    n.info.rank = 1;
    n.info.coord = { x: 0, y: 60 };
    n.info.ht = 36;
    g.info.rank = [makeRankEntry(leader(above)), makeRankEntry([n]), makeRankEntry(leader(below))];
    g.info.minrank = 0;
    g.info.maxrank = 2;
    return { g, n };
  }

  it('takes the max-rank branch when rank r+1 is empty and r is not the max rank', () => {
    const { g, n } = midGraph(100, null);
    // C: `r == GD_maxrank(g) || GD_rank(g)[r + 1].v[0] == NULL`, then
    // `r > 0 && GD_rank(g)[r - 1].v[0] != NULL`: rank[0].y - n.y = 100 - 60.
    expect(computeSizey(g, n)).toBe(40);
  });

  it('gives ND_ht when rank r+1 and rank r-1 are both empty', () => {
    const { g, n } = midGraph(null, null);
    expect(computeSizey(g, n)).toBe(36);
  });

  it('takes the min-rank branch when rank r-1 is empty and r is not the min rank', () => {
    const { g, n } = midGraph(null, 20);
    // C: `r == GD_minrank(g) || GD_rank(g)[r - 1].v[0] == NULL`:
    // n.y - rank[2].y = 60 - 20.
    expect(computeSizey(g, n)).toBe(40);
  });

  it('gives ND_ht at the max rank when rank r-1 is empty', () => {
    const g = new Graph('g', 'directed');
    const n = makeNode(g);
    n.info.rank = 1;
    n.info.coord = { x: 0, y: 60 };
    n.info.ht = 36;
    g.info.rank = [makeRankEntry([]), makeRankEntry([n])];
    g.info.minrank = 0;
    g.info.maxrank = 1;
    expect(computeSizey(g, n)).toBe(36);
  });

  it('reads a null leader (v[0] === null) as an empty rank too', () => {
    const { g, n } = midGraph(100, null);
    g.info.rank![2].v = [null as unknown as Node];
    expect(computeSizey(g, n)).toBe(40);
    g.info.rank![0].v = [null as unknown as Node];
    expect(computeSizey(g, n)).toBe(36);
  });
});
