// SPDX-License-Identifier: EPL-2.0

/**
 * T4a — branch-coverage tests for layout/dot/mincross-cross.ts.
 *
 * Extends mincross-cross.test.ts (do not duplicate its cases). Targets the
 * uncovered branches listed in plans/coverage-90/batch-4/T4a.md for this
 * file: crossContrib's three-way compare, the `!== undefined ? x : 0` /
 * `??` default arms scattered through left2right/exchange/rcross, and the
 * early-return guards in exchange, transposeStep, transpose, rcross, ncross.
 *
 * @see lib/dotgen/mincross.c
 */

import { describe, it, expect } from 'vitest';
import {
  val, crossContrib, left2right, left2rightCluster, setReMincross, exchange,
  transposeStep, transpose, localCrossEdgePair, rcrossCount, rcrossRegister,
  rcrossLocal, rcross, ncross, transposeCounts,
} from './mincross-cross.js';
import { newMatrix, matrixSet } from './mincross-utils.js';
import type { MincrossContext } from './mincross-utils.js';
import { MC_SCALE } from './fastgr.js';
import type { Node } from '../../model/node.js';
import type { Graph } from '../../model/graph.js';
import type { Edge } from '../../model/edge.js';
import type { RankEntry } from '../../model/rankEntry.js';
import type { EdgeList } from '../../model/nodeInfo.js';

// ---------------------------------------------------------------------------
// val — VAL macro  @see lib/dotgen/mincross.c:VAL
// ---------------------------------------------------------------------------

describe('val', () => {
  it('scales node order by MC_SCALE and adds portOrder', () => {
    const n = { info: { order: 2 } } as unknown as Node;
    expect(val(n, 5)).toBe(2 * MC_SCALE + 5);
  });
  it('defaults order to 0 when undefined', () => {
    const n = { info: { order: undefined } } as unknown as Node;
    expect(val(n, 3)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// crossContrib — @see lib/dotgen/mincross.c (VAL-based sign helper)
// ---------------------------------------------------------------------------

describe('crossContrib', () => {
  it('returns +penalty product when aVal > bVal', () => {
    expect(crossContrib(5, 2, 3, 4)).toBe(8);
  });
  it('returns -penalty product when aVal < bVal', () => {
    expect(crossContrib(3, 2, 5, 4)).toBe(-8);
  });
  it('returns 0 on a tie', () => {
    expect(crossContrib(4, 2, 4, 9)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// left2rightCluster — same-cluster remincross fallthrough
// @see lib/dotgen/mincross.c:left2right
// ---------------------------------------------------------------------------

const cA = {} as unknown as Graph;

describe('left2rightCluster — remincross, same cluster', () => {
  it('does not force when both nodes share a cluster (falls to return 0)', () => {
    setReMincross(true);
    const v = { info: { clust: cA } } as unknown as Node;
    const w = { info: { clust: cA } } as unknown as Node;
    expect(left2rightCluster(v, w)).toBe(0);
    setReMincross(false); // restore module global for other tests
  });
});

// ---------------------------------------------------------------------------
// left2right — early returns + undefined rank/low default to 0
// @see mincross.c:left2right
// ---------------------------------------------------------------------------

describe('left2right — guards', () => {
  it('returns 1 immediately when left2rightCluster forces the pair', () => {
    setReMincross(false);
    const clusterA = {} as unknown as Graph;
    const clusterB = {} as unknown as Graph;
    const g = { info: { rank: [] } } as unknown as Graph; // never reached
    const v = { info: { clust: clusterA, rank: 0 } } as unknown as Node;
    const w = { info: { clust: clusterB, rank: 0 } } as unknown as Node;
    expect(left2right(g, v, w)).toBe(1);
  });

  it('returns 0 when g.info.rank is undefined', () => {
    setReMincross(false);
    const g = { info: { rank: undefined } } as unknown as Graph;
    const v = { info: { clust: undefined, rank: 0 } } as unknown as Node;
    const w = { info: { clust: undefined, rank: 0 } } as unknown as Node;
    expect(left2right(g, v, w)).toBe(0);
  });
});

describe('left2right — undefined rank/low default to 0', () => {
  it('defaults v.rank to 0 and both v/w.low to 0 when unset', () => {
    setReMincross(false);
    const flat = newMatrix(2, 2);
    matrixSet(flat, 0, 0); // cell (low=0, low=0): forced
    const g = { info: { rank: [{ flat, vStart: 0, v: [], n: 0 }] } } as unknown as Graph;
    const v = { info: { rank: undefined, low: undefined, clust: undefined } } as unknown as Node;
    const w = { info: { rank: undefined, low: undefined, clust: undefined } } as unknown as Node;
    expect(left2right(g, v, w)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// transposeCounts / endOrder / endPx — head-endpoint branch + `??` default
// @see mincross.c:in_cross/out_cross (ND_order, ED_*_port.p.x)
// ---------------------------------------------------------------------------

function outEdgeNode(headOrder: number | undefined, headPx = 0): Node {
  const e = {
    head: { info: { order: headOrder } }, info: { head_port: { p: { x: headPx, y: 0 } } },
  } as unknown as Edge;
  return { info: { out: { list: [e], size: 1 }, in: undefined } } as unknown as Node;
}

describe('transposeCounts — head-endpoint (out-edge) branch', () => {
  it('exercises endOrder/endPx head=true via out-edges', () => {
    // v's out-edge to order 5, w's to order 2: crosses in current order.
    expect(transposeCounts(outEdgeNode(5), outEdgeNode(2), false, true)).toEqual([1, 0]);
  });
});

describe('transposeCounts — undefined endpoint order defaults to 0', () => {
  it('treats an in-edge with an undefined tail order as order 0', () => {
    const undefinedOrderIn = {
      info: {
        in: {
          list: [{ tail: { info: { order: undefined } }, info: { tail_port: { p: { x: 0, y: 0 } } } }],
          size: 1,
        },
        out: undefined,
      },
    } as unknown as Node;
    const definedOrderIn = {
      info: {
        in: {
          list: [{ tail: { info: { order: 2 } }, info: { tail_port: { p: { x: 0, y: 0 } } } }],
          size: 1,
        },
        out: undefined,
      },
    } as unknown as Node;
    // undefined -> 0 vs 2: 0 < 2, so crossing only in the swapped order (c1=1).
    expect(transposeCounts(undefinedOrderIn, definedOrderIn, true, true)).toEqual([0, 1]);
  });
});

// ---------------------------------------------------------------------------
// exchange — undefined-default arms + defined arms + guard
// @see mincross.c:exchange
// ---------------------------------------------------------------------------

describe('exchange', () => {
  it('no-ops (returns undefined) when ctx.root.info.rank is undefined', () => {
    const v = { info: { rank: 0, order: 0 } } as unknown as Node;
    const w = { info: { rank: 0, order: 1 } } as unknown as Node;
    const ctx = { root: { info: { rank: undefined } } } as unknown as MincrossContext;
    expect(exchange(ctx, v, w)).toBeUndefined();
    expect(v.info.order).toBe(0);
    expect(w.info.order).toBe(1);
  });

  it('defaults v.rank, v.order, and w.order to 0 when unset', () => {
    const rootRank = [{ v: [], n: 2 }] as unknown as RankEntry[];
    const v = { info: { rank: undefined, order: undefined } } as unknown as Node;
    const w = { info: { rank: 0, order: undefined } } as unknown as Node;
    const ctx = { root: { info: { rank: rootRank } } } as unknown as MincrossContext;
    exchange(ctx, v, w);
    // Both orders default to 0, so the second write (v into slot wOrd=0)
    // wins the slot; both nodes end up assigned order 0.
    expect(rootRank[0]!.v[0]).toBe(v);
    expect(v.info.order).toBe(0);
    expect(w.info.order).toBe(0);
  });

  it('swaps two nodes with defined rank/order in rootRank.v', () => {
    const v = { info: { rank: 0, order: 0 } } as unknown as Node;
    const w = { info: { rank: 0, order: 1 } } as unknown as Node;
    const rootRank = [{ v: [v, w], n: 2 }] as unknown as RankEntry[];
    const ctx = { root: { info: { rank: rootRank } } } as unknown as MincrossContext;
    exchange(ctx, v, w);
    expect(rootRank[0]!.v[0]).toBe(w);
    expect(rootRank[0]!.v[1]).toBe(v);
    expect(v.info.order).toBe(1);
    expect(w.info.order).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// transposeStep — guard, skip/swap/no-swap branches, invalidateValid
// @see mincross.c:transpose_step
// ---------------------------------------------------------------------------

function tailInEdge(order: number): Edge {
  return {
    tail: { info: { order } }, info: { tail_port: { p: { x: 0, y: 0 } } },
  } as unknown as Edge;
}

function headOutEdge(order: number): Edge {
  return {
    head: { info: { order } }, info: { head_port: { p: { x: 0, y: 0 } } },
  } as unknown as Edge;
}

describe('transposeStep', () => {
  it('returns 0 when g.info.rank is undefined', () => {
    const ctx = { root: { info: { rank: undefined } } } as unknown as MincrossContext;
    const g = { info: { rank: undefined } } as unknown as Graph;
    expect(transposeStep(ctx, g, 0, false)).toBe(0);
  });

  it('skips a pair blocked by left2right (forced cluster ordering)', () => {
    setReMincross(false);
    const clusterA = {} as unknown as Graph;
    const clusterB = {} as unknown as Graph;
    const v = { info: { rank: 0, order: 0, clust: clusterA } } as unknown as Node;
    const w = { info: { rank: 0, order: 1, clust: clusterB } } as unknown as Node;
    const rank0 = { n: 2, v: [v, w], vStart: 0, candidate: false } as unknown as RankEntry;
    const g = { info: { rank: [rank0], minrank: 0, maxrank: 0 } } as unknown as Graph;
    const ctx = { root: { info: { rank: undefined } } } as unknown as MincrossContext;
    expect(transposeStep(ctx, g, 0, false)).toBe(0);
  });

  it('does not swap when shouldSwap is false (c0 <= c1)', () => {
    const v = {
      info: {
        rank: 1, order: 0, low: 0, clust: undefined, in: { list: [tailInEdge(2)], size: 1 }, out: undefined,
      },
    } as unknown as Node;
    const w = {
      info: {
        rank: 1, order: 1, low: 1, clust: undefined, in: { list: [tailInEdge(5)], size: 1 }, out: undefined,
      },
    } as unknown as Node;
    const rank1 = { n: 2, v: [v, w], vStart: 0, candidate: false } as unknown as RankEntry;
    const g = {
      info: { rank: [undefined as unknown as RankEntry, rank1], minrank: 0, maxrank: 1 },
    } as unknown as Graph;
    const ctx = { root: { info: { rank: undefined } } } as unknown as MincrossContext;
    expect(transposeStep(ctx, g, 1, false)).toBe(0);
    expect(v.info.order).toBe(0); // unchanged: no swap
  });

  it('swaps, defaults minrank/maxrank/useOut to their fallbacks, and '
    + 'no-ops invalidateValid when ctx.root.info.rank is undefined', () => {
    const v = {
      info: {
        rank: 1, order: 0, low: 0, clust: undefined, in: { list: [tailInEdge(5)], size: 1 }, out: undefined,
      },
    } as unknown as Node;
    const w = {
      info: {
        rank: 1, order: 1, low: 1, clust: undefined, in: { list: [tailInEdge(2)], size: 1 }, out: undefined,
      },
    } as unknown as Node;
    const rank0 = { candidate: false } as unknown as RankEntry;
    const rank1 = { n: 2, v: [v, w], vStart: 0, candidate: false } as unknown as RankEntry;
    // minrank/maxrank left undefined so rankBounds's two `?? 0` arms fire;
    // rank[2] is absent so useOut's `?? 0` arm fires too.
    const g = { info: { rank: [rank0, rank1], minrank: undefined, maxrank: undefined } } as unknown as Graph;
    const ctx = { root: { info: { rank: undefined } } } as unknown as MincrossContext;
    // c0 (in-order crossings, tail orders 5 vs 2) = 1, c1 = 0 -> swap.
    expect(transposeStep(ctx, g, 1, false)).toBe(1);
    expect(rank0.candidate).toBe(true); // markCandidates: r(1) > mn(0)
  });

  it('invalidates neighbouring ranks and marks candidates when r is '
    + 'interior (r > mn and r < mx both true)', () => {
    const v = {
      info: {
        rank: 1, order: 0, low: 0, clust: undefined, in: { list: [tailInEdge(5)], size: 1 }, out: undefined,
      },
    } as unknown as Node;
    const w = {
      info: {
        rank: 1, order: 1, low: 1, clust: undefined, in: { list: [tailInEdge(2)], size: 1 }, out: undefined,
      },
    } as unknown as Node;
    const gRank0 = { candidate: false } as unknown as RankEntry;
    const gRank1 = { n: 2, v: [v, w], vStart: 0, candidate: false } as unknown as RankEntry;
    const gRank2 = { candidate: false } as unknown as RankEntry;
    const g = { info: { rank: [gRank0, gRank1, gRank2], minrank: 0, maxrank: 2 } } as unknown as Graph;
    const rootRank0 = { valid: true } as unknown as RankEntry;
    const rootRank1 = { valid: true, v: [v, w] } as unknown as RankEntry;
    const rootRank2 = { valid: true } as unknown as RankEntry;
    const ctx = {
      root: { info: { rank: [rootRank0, rootRank1, rootRank2] } },
    } as unknown as MincrossContext;
    expect(transposeStep(ctx, g, 1, false)).toBe(1); // c0=1,c1=0 -> swap
    expect(gRank0.candidate).toBe(true);
    expect(gRank2.candidate).toBe(true);
    expect(rootRank0.valid).toBe(false);
    expect(rootRank1.valid).toBe(false);
    expect(rootRank2.valid).toBe(false);
  });

  it('does not invalidate/mark neighbours when r equals both mn and mx '
    + '(r > mn and r < mx both false)', () => {
    const v = {
      info: {
        rank: 0, order: 0, low: 0, clust: undefined, in: undefined, out: { list: [headOutEdge(5)], size: 1 },
      },
    } as unknown as Node;
    const w = {
      info: {
        rank: 0, order: 1, low: 1, clust: undefined, in: undefined, out: { list: [headOutEdge(2)], size: 1 },
      },
    } as unknown as Node;
    const gRank0 = { n: 2, v: [v, w], vStart: 0, candidate: false } as unknown as RankEntry;
    const gRank1 = { n: 1 } as unknown as RankEntry; // makes useOut true (r=0, so useIn=false)
    const g = { info: { rank: [gRank0, gRank1], minrank: 0, maxrank: 0 } } as unknown as Graph;
    const rootRank0 = { valid: true, v: [v, w] } as unknown as RankEntry;
    const ctx = { root: { info: { rank: [rootRank0] } } } as unknown as MincrossContext;
    expect(transposeStep(ctx, g, 0, false)).toBe(1); // c0=1,c1=0 via out-crossings
    expect(gRank0.candidate).toBe(true);
    expect(rootRank0.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// transpose — guard + candidate-hole skip  @see mincross.c:transpose
// ---------------------------------------------------------------------------

describe('transpose', () => {
  it('returns undefined immediately when g.info.rank is undefined', () => {
    const g = { info: { rank: undefined } } as unknown as Graph;
    const ctx = {} as unknown as MincrossContext;
    expect(transpose(ctx, g, false)).toBeUndefined();
  });

  it('skips a hole in the rank array during initCandidates without throwing', () => {
    const rank0 = { n: 0, v: [], candidate: false } as unknown as RankEntry;
    const rank2 = { n: 0, v: [], candidate: false } as unknown as RankEntry;
    // rank[1] is a hole: initCandidates's `if (rank[r])` must skip it.
    const rank: RankEntry[] = [rank0, undefined as unknown as RankEntry, rank2];
    const g = { info: { rank, minrank: 0, maxrank: 2 } } as unknown as Graph;
    const ctx = { root: { info: { rank: undefined } } } as unknown as MincrossContext;
    expect(() => transpose(ctx, g, false)).not.toThrow();
    // transposeStep ran on rank0/rank2 (n=0, no pairs) and cleared candidate.
    expect(rank0.candidate).toBe(false);
    expect(rank2.candidate).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// localCrossEdgePair — undefined-order defaults + crossing on both branches
// @see mincross.c:local_cross
// ---------------------------------------------------------------------------

describe('localCrossEdgePair', () => {
  it('isOut=true: defaults undefined head order to 0 for e and f (no cross)', () => {
    const e = {
      head: { info: { order: undefined } },
      info: { tail_port: { p: { x: 5, y: 0 } }, xpenalty: 2 },
    } as unknown as Edge;
    const f = {
      head: { info: { order: undefined } },
      info: { tail_port: { p: { x: 5, y: 0 } }, xpenalty: 3 },
    } as unknown as Edge;
    // Both default to order 0: (0-0)*(5-5)=0, not < 0 -> no crossing.
    expect(localCrossEdgePair(e, f, true)).toBe(0);
  });

  it('isOut=true: detects a crossing with defined head orders and returns xpen(e)*xpen(f)', () => {
    const e = {
      head: { info: { order: 0 } },
      info: { tail_port: { p: { x: 5, y: 0 } }, xpenalty: 2 },
    } as unknown as Edge;
    const f = {
      head: { info: { order: 1 } },
      info: { tail_port: { p: { x: 0, y: 0 } }, xpenalty: 3 },
    } as unknown as Edge;
    // (1-0)*(0-5) = -5 < 0 -> crossing.
    expect(localCrossEdgePair(e, f, true)).toBe(6);
  });

  it('isOut=false: defaults undefined tail order to 0 for e and f (no cross)', () => {
    const e = {
      tail: { info: { order: undefined } },
      info: { head_port: { p: { x: 5, y: 0 } }, xpenalty: 2 },
    } as unknown as Edge;
    const f = {
      tail: { info: { order: undefined } },
      info: { head_port: { p: { x: 0, y: 0 } }, xpenalty: 3 },
    } as unknown as Edge;
    expect(localCrossEdgePair(e, f, false)).toBe(0);
  });

  it('isOut=false: detects a crossing and returns xpen(e)*xpen(f)', () => {
    const e = {
      tail: { info: { order: 0 } },
      info: { head_port: { p: { x: 5, y: 0 } }, xpenalty: 2 },
    } as unknown as Edge;
    const f = {
      tail: { info: { order: 1 } },
      info: { head_port: { p: { x: 0, y: 0 } }, xpenalty: 3 },
    } as unknown as Edge;
    // (1-0)*(0-5) = -5 < 0 -> crossing.
    expect(localCrossEdgePair(e, f, false)).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// rcrossCount / rcrossRegister — order default + defined-order branch
// @see mincross.c:rcross
// ---------------------------------------------------------------------------

describe('rcrossCount', () => {
  it('defaults an undefined head order to 0 before subtracting vs', () => {
    const e = { head: { info: { order: undefined } }, info: { xpenalty: 2 } } as unknown as Edge;
    const out = { list: [e], size: 1 } as unknown as EdgeList;
    const Count = [0, 5, 5];
    // headOrd = 0 - vs(0) = 0; sums Count[1..2] * xpen(e) = (5+5)*2.
    expect(rcrossCount(out, Count, 2, 0)).toBe(20);
  });

  it('uses the actual head order when defined', () => {
    const e = { head: { info: { order: 2 } }, info: { xpenalty: 1 } } as unknown as Edge;
    const out = { list: [e], size: 1 } as unknown as EdgeList;
    const Count = [0, 0, 5, 5];
    // headOrd = 2 - vs(0) = 2; sums Count[3..3] * xpen(e) = 5.
    expect(rcrossCount(out, Count, 3, 0)).toBe(5);
  });
});

describe('rcrossRegister', () => {
  it('defaults an undefined head order to 0 before subtracting vs', () => {
    const e = { head: { info: { order: undefined } }, info: { xpenalty: 3 } } as unknown as Edge;
    const out = { list: [e], size: 1 } as unknown as EdgeList;
    const Count = [0];
    const max = rcrossRegister(out, Count, 0, 0);
    expect(max).toBe(0); // inv=0, not > max(0)
    expect(Count[0]).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// rcrossLocal — has_port skip vs process, dir>0 (out) vs dir<=0 (in)
// @see mincross.c:rcross (local_cross call sites)
// ---------------------------------------------------------------------------

describe('rcrossLocal', () => {
  it('processes a has_port node using out-edges when dir > 0', () => {
    const e1 = { head: { info: { order: 0 } }, info: { tail_port: { p: { x: 5, y: 0 } }, xpenalty: 1 } } as unknown as Edge;
    const e2 = { head: { info: { order: 1 } }, info: { tail_port: { p: { x: 0, y: 0 } }, xpenalty: 1 } } as unknown as Edge;
    const v = { info: { has_port: true, out: { list: [e1, e2], size: 2 } } } as unknown as Node;
    const rk = { n: 1, v: [v], vStart: 0 } as unknown as RankEntry;
    // (1-0)*(0-5) = -5 < 0 -> one crossing.
    expect(rcrossLocal(rk, 1)).toBe(1);
  });

  it('processes a has_port node using in-edges when dir <= 0', () => {
    const e1 = { tail: { info: { order: 0 } }, info: { head_port: { p: { x: 5, y: 0 } }, xpenalty: 1 } } as unknown as Edge;
    const e2 = { tail: { info: { order: 1 } }, info: { head_port: { p: { x: 0, y: 0 } }, xpenalty: 1 } } as unknown as Edge;
    const v = { info: { has_port: true, in: { list: [e1, e2], size: 2 } } } as unknown as Node;
    const rk = { n: 1, v: [v], vStart: 0 } as unknown as RankEntry;
    expect(rcrossLocal(rk, -1)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// rcross — guards + `??`/`!== undefined` defaults + max>0 accumulation
// @see mincross.c:rcross
// ---------------------------------------------------------------------------

describe('rcross', () => {
  it('returns 0 when g.info.rank is undefined', () => {
    const ctx = { root: { info: {} } } as unknown as MincrossContext;
    const g = { info: { rank: undefined } } as unknown as Graph;
    expect(rcross(ctx, g, 0)).toBe(0);
  });

  it('returns 0 when ctx.root.info.rank is undefined', () => {
    const gRank = [{ n: 0, v: [] }] as unknown as RankEntry[];
    const g = { info: { rank: gRank } } as unknown as Graph;
    const ctx = { root: { info: { rank: undefined } } } as unknown as MincrossContext;
    expect(rcross(ctx, g, 0)).toBe(0);
  });

  it('defaults nextN/headVs to 0 and skips a v with no out-edges when the '
    + 'next rank is absent', () => {
    const noOut = { info: { out: undefined } } as unknown as Node;
    const withOut = {
      info: {
        out: { list: [{ head: { info: { order: 0 } }, info: { xpenalty: 1 } }], size: 1 },
        has_port: false,
      },
    } as unknown as Node;
    const rk0 = { n: 2, v: [noOut, withOut], vStart: 0 } as unknown as RankEntry;
    const gRank = [rk0]; // gRank[1] absent: nextRk/gRank[r+1] both undefined
    const g = { info: { rank: gRank } } as unknown as Graph;
    const ctx = { root: { info: { rank: gRank } } } as unknown as MincrossContext;
    expect(rcross(ctx, g, 0)).toBe(0);
  });

  it('defaults headVs to 0 when the head rank exists but vStart is unset', () => {
    const withOut = {
      info: {
        out: { list: [{ head: { info: { order: 2 } }, info: { xpenalty: 1 } }], size: 1 },
        has_port: false,
      },
    } as unknown as Node;
    const rk0 = { n: 1, v: [withOut], vStart: 0 } as unknown as RankEntry;
    const rk1 = { n: 0, v: [], vStart: undefined } as unknown as RankEntry;
    const gRank = [rk0, rk1];
    const g = { info: { rank: gRank } } as unknown as Graph;
    const ctx = { root: { info: { rank: gRank } } } as unknown as MincrossContext;
    expect(rcross(ctx, g, 0)).toBe(0);
  });

  it('accumulates rcrossCount across two out-edge nodes once max > 0', () => {
    const edgeA = { head: { info: { order: 2 } }, info: { xpenalty: 1 } } as unknown as Edge;
    const edgeB = { head: { info: { order: 1 } }, info: { xpenalty: 1 } } as unknown as Edge;
    const a = { info: { out: { list: [edgeA], size: 1 }, has_port: false } } as unknown as Node;
    const b = { info: { out: { list: [edgeB], size: 1 }, has_port: false } } as unknown as Node;
    const rk0 = { n: 2, v: [a, b], vStart: 0 } as unknown as RankEntry;
    const rk1 = { n: 2, v: [], vStart: 0 } as unknown as RankEntry;
    const gRank = [rk0, rk1];
    const g = { info: { rank: gRank } } as unknown as Graph;
    const ctx = { root: { info: { rank: gRank } } } as unknown as MincrossContext;
    // top=0 (a): registers headOrd=2, max becomes 2 (no rcrossCount yet).
    // top=1 (b): max(2)>0 -> rcrossCount sums Count[2..2] = 1 crossing.
    expect(rcross(ctx, g, 0)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// ncross — guard + cached vs recomputed branch  @see mincross.c:ncross
// ---------------------------------------------------------------------------

describe('ncross', () => {
  it('returns 0 when ctx.root.info.rank is undefined', () => {
    const ctx = {
      root: { info: { rank: undefined } }, globalMinRank: 0, globalMaxRank: 2,
    } as unknown as MincrossContext;
    expect(ncross(ctx)).toBe(0);
  });

  it('sums a cached rank and a recomputed rank, caching the recomputed value', () => {
    const rootRank = [
      { valid: true, cache_nc: 3, n: 0, v: [] },
      { valid: false, cache_nc: 0, n: 0, v: [] },
    ] as unknown as RankEntry[];
    const g = { info: { rank: rootRank } } as unknown as Graph;
    const ctx = { root: g, globalMinRank: 0, globalMaxRank: 2 } as unknown as MincrossContext;
    expect(ncross(ctx)).toBe(3);
    expect(rootRank[1]!.valid).toBe(true); // rcross ran and cached the result
    expect(rootRank[1]!.cache_nc).toBe(0);
  });
});
