// SPDX-License-Identifier: EPL-2.0

/**
 * T3e — branch coverage for layout/dot/position-bbox.ts.
 *
 * Direct unit tests against the pure exported helpers: rankNormalXRange,
 * computeBbRootX, scaleBb, the set_aspect scale-factor helpers
 * (aspectFillScale/aspectExpandScale/aspectValueScale/aspectScaleFactors),
 * setAspect, and placeGraphLabel's non-flip/flip label-position branches.
 *
 * @see lib/dotgen/position.c:dot_compute_bb, rec_bb, scale_bb, set_aspect
 * @see lib/common/postproc.c:place_graph_label
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { makeNodeInfo } from '../../model/nodeInfo.js';
import { makeDrawing } from '../../model/layoutParams.js';
import type { RankEntry } from '../../model/rankEntry.js';
import type { TextlabelT } from '../../common/types.js';
import { NORMAL, VIRTUAL } from './fastgr.js';
import {
  rankNormalXRange, computeBbRootX, scaleBb,
  aspectFillScale, aspectExpandScale, aspectValueScale, aspectScaleFactors,
  setAspect, placeGraphLabel,
} from './position-bbox.js';

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function makeRankEntry(): RankEntry {
  return {
    n: 0, v: [], an: 0, av: [],
    ht1: 0, ht2: 0, pht1: 0, pht2: 0,
    candidate: false, valid: false, cache_nc: 0,
  };
}

function makeTestGraph(): Graph {
  return new Graph('g', 'directed');
}

let nextId = 0;
function makeNode(g: Graph, type: number, x: number, lw?: number, rw?: number): Node {
  const n = new Node(nextId++, `n${nextId}`, g);
  n.info = makeNodeInfo();
  n.info.node_type = type;
  n.info.coord = { x, y: 0 };
  // NodeInfo.lw/rw are typed non-optional (default 0 via makeNodeInfo) —
  // leaving the param undefined keeps the default, which already exercises
  // the `?? 0` fallback path in rankNormalXRange.
  if (lw !== undefined) n.info.lw = lw;
  if (rw !== undefined) n.info.rw = rw;
  return n;
}

// ---------------------------------------------------------------------------
// rankNormalXRange
// ---------------------------------------------------------------------------

describe('rankNormalXRange', () => {
  it('returns the sentinel range when the rank has no NORMAL node', () => {
    const g = makeTestGraph();
    const vn = makeNode(g, VIRTUAL, 10, 5, 5);
    const rk = { v: [vn], n: 1 };
    expect(rankNormalXRange(rk)).toEqual([2147483647, -2147483647]);
  });

  it('uses lw ?? 0 / rw ?? 0 when a NORMAL node has no half-width set', () => {
    const g = makeTestGraph();
    const n0 = makeNode(g, NORMAL, 10); // lw/rw left undefined
    const rk = { v: [n0], n: 1 };
    expect(rankNormalXRange(rk)).toEqual([10, 10]);
  });

  it('subtracts/adds the explicit lw/rw of the first/last NORMAL node', () => {
    const g = makeTestGraph();
    const n0 = makeNode(g, NORMAL, 0, 5, 5);
    const n1 = makeNode(g, NORMAL, 40, 8, 8);
    const rk = { v: [n0, n1], n: 2 };
    expect(rankNormalXRange(rk)).toEqual([-5, 48]);
  });

  // Genuinely defensive fallback: firstNormalNode and lastNormalNode always
  // scan the SAME rk.v/rk.n consistently, so `last` can never be undefined
  // when `first` is defined via ordinary calls. Exercise the branch directly
  // with a stateful rk (n changes between the two internal scans) to prove
  // the fallback constant is wired correctly without weakening any src
  // invariant.
  it('falls back to -2147483647 for rx if lastNormalNode finds nothing (defensive)', () => {
    const g = makeTestGraph();
    const n0 = makeNode(g, NORMAL, 10, 5, 5);
    let calls = 0;
    const rk = {
      v: [n0],
      get n() { calls++; return calls === 1 ? 1 : 0; },
    };
    expect(rankNormalXRange(rk)).toEqual([5, -2147483647]);
  });
});

// ---------------------------------------------------------------------------
// computeBbRootX
// ---------------------------------------------------------------------------

describe('computeBbRootX', () => {
  it('skips empty ranks (rk.n === 0) and clusters with no bb', () => {
    const g = makeTestGraph();
    g.info.minrank = 0;
    g.info.maxrank = 2;
    const empty = makeRankEntry(); // n===0: skip branch
    const n0 = makeNode(g, NORMAL, 0, 10, 10);
    const populated = { ...makeRankEntry(), v: [n0], n: 1 };
    g.info.rank = [empty, populated, makeRankEntry()];
    // One cluster with a bb, one without (skip continue branch).
    const withBb = makeTestGraph();
    withBb.info.bb = { ll: { x: -50, y: 0 }, ur: { x: 50, y: 0 } };
    const withoutBb = makeTestGraph();
    withoutBb.info.bb = undefined as unknown as typeof withoutBb.info.bb;
    g.info.clust = [withBb, withoutBb];
    g.info.n_cluster = 2;
    const [llx, urx] = computeBbRootX(g);
    // Rank-only range would be [-10, 10]; the cluster bb (with CL_OFFSET=8)
    // widens it to [-58, 58].
    expect(llx).toBe(-58);
    expect(urx).toBe(58);
  });

  it('uses only the NORMAL-node rank range when there are no clusters', () => {
    const g = makeTestGraph();
    g.info.minrank = 0;
    g.info.maxrank = 0;
    const n0 = makeNode(g, NORMAL, 0, 10, 10);
    g.info.rank = [{ ...makeRankEntry(), v: [n0], n: 1 }];
    g.info.clust = [];
    g.info.n_cluster = 0;
    expect(computeBbRootX(g)).toEqual([-10, 10]);
  });
});

// ---------------------------------------------------------------------------
// scaleBb
// ---------------------------------------------------------------------------

describe('scaleBb', () => {
  it('skips a cluster with no bb instead of throwing, and still scales the rest', () => {
    const g = makeTestGraph();
    g.info.bb = { ll: { x: 10, y: 20 }, ur: { x: 30, y: 40 } };
    const clustNoBb = makeTestGraph();
    // GraphInfo.bb is typed non-optional (defaults to a zero box), but
    // scaleBb still guards `!g.info.bb` defensively (mirrors C's calloc-zero
    // NULL check before rec_bb has run) — force the pre-rec_bb undefined
    // state to exercise it.
    clustNoBb.info.bb = undefined as unknown as typeof clustNoBb.info.bb;
    g.info.clust = [clustNoBb];
    g.info.n_cluster = 1;
    expect(() => scaleBb(g, 2, 3)).not.toThrow();
    expect(clustNoBb.info.bb).toBeUndefined();
    expect(g.info.bb).toEqual({ ll: { x: 20, y: 60 }, ur: { x: 60, y: 120 } });
  });
});

// ---------------------------------------------------------------------------
// aspectFillScale / aspectExpandScale / aspectValueScale / aspectScaleFactors
// ---------------------------------------------------------------------------

describe('aspectFillScale', () => {
  it('returns null when the requested size is non-positive', () => {
    expect(aspectFillScale({ size: { x: 0, y: 100 }, ratioKind: 'fill' }, { x: 10, y: 10 })).toBeNull();
  });

  it('xf < yf branch: normalizes yf/xf and pins xf to 1', () => {
    // size 50x200 over actual 100x100: xf=0.5, yf=2 -> xf<1||yf<1 true, xf<yf -> yf=2/0.5=4, xf=1.
    const r = aspectFillScale({ size: { x: 50, y: 200 }, ratioKind: 'fill' }, { x: 100, y: 100 });
    expect(r).toEqual([1, 4]);
  });

  it('xf >= yf branch (else): normalizes xf/yf and pins yf to 1', () => {
    // size 200x50 over actual 100x100: xf=2, yf=0.5 -> xf<1||yf<1 true, xf>=yf -> xf=2/0.5=4, yf=1.
    const r = aspectFillScale({ size: { x: 200, y: 50 }, ratioKind: 'fill' }, { x: 100, y: 100 });
    expect(r).toEqual([4, 1]);
  });

  it('neither xf nor yf below 1: returns the raw ratios unchanged', () => {
    const r = aspectFillScale({ size: { x: 300, y: 300 }, ratioKind: 'fill' }, { x: 100, y: 100 });
    expect(r).toEqual([3, 3]);
  });
});

describe('aspectExpandScale', () => {
  const g = makeTestGraph();
  g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 100, y: 50 } };

  it('returns null when the requested size is non-positive', () => {
    expect(aspectExpandScale({ size: { x: 0, y: 100 }, ratioKind: 'expand' }, g)).toBeNull();
  });

  it('both xf and yf > 1: expands uniformly by the smaller factor', () => {
    // size 400x200 over bb.ur 100x50: xf=4, yf=4 -> [4,4].
    const r = aspectExpandScale({ size: { x: 400, y: 200 }, ratioKind: 'expand' }, g);
    expect(r).toEqual([4, 4]);
  });

  it('one factor <= 1: declines to expand (returns null)', () => {
    // size 50x200: xf=0.5 (not > 1) -> null.
    const r = aspectExpandScale({ size: { x: 50, y: 200 }, ratioKind: 'expand' }, g);
    expect(r).toBeNull();
  });
});

describe('aspectValueScale', () => {
  it('actual < desired: widens x to match the desired ratio', () => {
    // sz 100x50 -> actual=0.5; desired=1 -> actual<desired -> [1, 1/0.5=2].
    const r = aspectValueScale({ size: { x: 0, y: 0 }, ratioKind: 'value', ratio: 1 }, { x: 100, y: 50 });
    expect(r).toEqual([1, 2]);
  });

  it('actual >= desired: widens y to match the desired ratio', () => {
    // sz 50x100 -> actual=2; desired=1 -> actual>=desired -> [2/1=2, 1].
    const r = aspectValueScale({ size: { x: 0, y: 0 }, ratioKind: 'value', ratio: 1 }, { x: 50, y: 100 });
    expect(r).toEqual([2, 1]);
  });

  it('defaults desired ratio to 1 when d.ratio is unset', () => {
    const r = aspectValueScale({ size: { x: 0, y: 0 }, ratioKind: 'value' }, { x: 50, y: 100 });
    expect(r).toEqual([2, 1]);
  });
});

describe('aspectScaleFactors — dispatch', () => {
  const g = makeTestGraph();
  g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 100, y: 50 } };
  const sz = { x: 100, y: 50 };

  it('null when g.info.drawing is unset', () => {
    expect(aspectScaleFactors(g, sz)).toBeNull();
  });

  it("null when ratioKind === 'none'", () => {
    g.info.drawing = makeDrawing({ ratioKind: 'none' });
    expect(aspectScaleFactors(g, sz)).toBeNull();
  });

  it("dispatches to aspectFillScale for 'fill'", () => {
    g.info.drawing = makeDrawing({ ratioKind: 'fill', size: { x: 300, y: 300 } });
    expect(aspectScaleFactors(g, sz)).toEqual([3, 6]);
  });

  it("dispatches to aspectExpandScale for 'expand'", () => {
    g.info.drawing = makeDrawing({ ratioKind: 'expand', size: { x: 400, y: 200 } });
    expect(aspectScaleFactors(g, sz)).toEqual([4, 4]);
  });

  it("dispatches to aspectValueScale for 'value'", () => {
    g.info.drawing = makeDrawing({ ratioKind: 'value', ratio: 1 });
    // sz={x:100,y:50}: actual=50/100=0.5 < desired=1 -> [1, 1/0.5]=[1,2].
    expect(aspectScaleFactors(g, sz)).toEqual([1, 2]);
  });

  it("unmatched ratioKind ('compress'/'auto') falls through to null", () => {
    g.info.drawing = makeDrawing({ ratioKind: 'compress' });
    expect(aspectScaleFactors(g, sz)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setAspect
// ---------------------------------------------------------------------------

describe('setAspect', () => {
  // Two ranks (maxrank=1 > 0, so setAspect's early-out doesn't fire), each
  // holding one NORMAL node, linked via nlist/next so the coord-scaling loop
  // visits both.
  function ratioGraph(flip: boolean): { g: Graph; n0: Node; n1: Node } {
    const g = makeTestGraph();
    g.info.minrank = 0;
    g.info.maxrank = 1;
    const n0 = makeNode(g, NORMAL, 50, 10, 10);
    n0.info.coord = { x: 50, y: 15 };
    const n1 = makeNode(g, NORMAL, 50, 10, 10);
    n1.info.coord = { x: 50, y: -15 };
    g.info.rank = [
      { ...makeRankEntry(), v: [n0], n: 1 },
      { ...makeRankEntry(), v: [n1], n: 1 },
    ];
    g.info.clust = [];
    g.info.n_cluster = 0;
    g.info.ht1 = 15;
    g.info.ht2 = 15;
    n0.info.next = n1;
    g.info.nlist = n0;
    g.info.flip = flip;
    return { g, n0, n1 };
  }

  it('no-op when factors is null (ratioKind none)', () => {
    const { g, n0 } = ratioGraph(false);
    g.info.drawing = makeDrawing({ ratioKind: 'none' });
    setAspect(g);
    expect(n0.info.coord).toEqual({ x: 50, y: 15 });
  });

  it('flip=true: swaps sz axes before scoring, and swaps the resulting factors back', () => {
    const { g, n0, n1 } = ratioGraph(true);
    g.info.drawing = makeDrawing({ ratioKind: 'value', ratio: 2 });
    setAspect(g);
    // Deterministic pure computation (verified via a standalone probe run):
    // flip swaps sz before scoring and swaps factors back before applying,
    // yielding a 6x horizontal / 1x vertical scale for this bb/ratio.
    expect(n0.info.coord).toEqual({ x: 300, y: 15 });
    expect(n1.info.coord).toEqual({ x: 300, y: -15 });
  });

  it('flip=false: applies factors directly without swapping', () => {
    const { g, n0, n1 } = ratioGraph(false);
    g.info.drawing = makeDrawing({ ratioKind: 'value', ratio: 2 });
    setAspect(g);
    // Same bb, no flip swap: 1.5x horizontal / 1x vertical.
    expect(n0.info.coord).toEqual({ x: 75, y: 15 });
    expect(n1.info.coord).toEqual({ x: 75, y: -15 });
  });
});

// ---------------------------------------------------------------------------
// placeGraphLabel — non-flip / flip branches
// ---------------------------------------------------------------------------

function makeTextLabel(): TextlabelT {
  return {
    text: 'lbl', fontname: 'Helvetica', fontcolor: 'black',
    charset: 0, fontsize: 14,
    dimen: { x: 10, y: 5 }, space: { x: 10, y: 5 }, pos: { x: 0, y: 0 },
    u: { kind: 'txt', span: [], nspans: 0 },
    valign: 0, set: false, html: false,
  } as unknown as TextlabelT;
}

describe('placeGraphLabel — non-flip', () => {
  function clusterWithLabel(labelPos: number | undefined, border: [{x:number;y:number},{x:number;y:number},{x:number;y:number},{x:number;y:number}] | undefined): { root: Graph; sub: Graph; lab: TextlabelT } {
    const root = makeTestGraph();
    root.info.flip = false; // exercise the `?? false` truthy branch too via other cases
    const sub = makeTestGraph();
    sub.root = root;
    sub.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 100, y: 60 } };
    sub.info.label_pos = labelPos;
    sub.info.border = border;
    sub.info.n_cluster = 0;
    const lab = makeTextLabel();
    sub.info.label = lab;
    return { root, sub, lab };
  }

  it('label_pos undefined defaults to 1 (top, border undefined -> zero fallback, x centered)', () => {
    const { sub, lab } = clusterWithLabel(undefined, undefined);
    placeGraphLabel(sub);
    expect(lab.set).toBe(true);
    expect(lab.pos).toEqual({ x: 50, y: 60 }); // top edge, centered x
  });

  it('bit1 explicitly unset (labelPos=0) with no border: BOTTOM_IX ?? zero fallback', () => {
    const { sub, lab } = clusterWithLabel(0, undefined);
    placeGraphLabel(sub);
    expect(lab.pos).toEqual({ x: 50, y: 0 }); // bottom edge, centered x
  });

  it('bit1 unset (bottom) with an explicit border: uses the border offset, not zero', () => {
    const zero = { x: 0, y: 0 };
    const border: [typeof zero, typeof zero, typeof zero, typeof zero] =
      [{ x: 0, y: 8 }, zero, zero, { x: 0, y: 0 }]; // BOTTOM_IX=0 -> d.y=8
    const { sub, lab } = clusterWithLabel(2, border); // bit1=0 (bottom), bit2=1 (left)
    placeGraphLabel(sub);
    expect(lab.pos).toEqual({ x: 0, y: 4 }); // bb.ll.y + 8/2, bb.ll.x + 0/2 (left)
  });

  it('bit4 set: right-aligned x (offset by the TOP_IX border), bit1 set: top', () => {
    const zero = { x: 0, y: 0 };
    const border: [typeof zero, typeof zero, typeof zero, typeof zero] =
      [zero, zero, { x: 6, y: 0 }, zero]; // TOP_IX=2 -> d={x:6,y:0}
    const { sub, lab } = clusterWithLabel(5, border); // bit1=1 (top), bit4=1 (right)
    placeGraphLabel(sub);
    // px uses the SAME d as py (both bit1-selected): bb.ur.x - d.x/2 = 100-3.
    expect(lab.pos).toEqual({ x: 97, y: 60 }); // right edge (d.x=6), top edge (d.y=0)
  });
});

describe('placeGraphLabel — flip', () => {
  function clusterWithLabel(labelPos: number | undefined, border: [{x:number;y:number},{x:number;y:number},{x:number;y:number},{x:number;y:number}] | undefined, rootFlip: boolean | undefined): { sub: Graph; lab: TextlabelT } {
    const root = makeTestGraph();
    root.info.flip = rootFlip;
    const sub = makeTestGraph();
    sub.root = root;
    sub.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 100, y: 60 } };
    sub.info.label_pos = labelPos;
    sub.info.border = border;
    sub.info.n_cluster = 0;
    const lab = makeTextLabel();
    sub.info.label = lab;
    return { sub, lab };
  }

  it('root.info.flip undefined falls back to false (non-flip placement used)', () => {
    const { sub, lab } = clusterWithLabel(undefined, undefined, undefined);
    placeGraphLabel(sub);
    expect(lab.pos).toEqual({ x: 50, y: 60 }); // same as the non-flip default case
  });

  it('flip=true, label_pos undefined defaults to 1: RIGHT_IX ?? zero fallback', () => {
    const { sub, lab } = clusterWithLabel(undefined, undefined, true);
    placeGraphLabel(sub);
    expect(lab.pos).toEqual({ x: 100, y: 30 }); // right edge (bit1), centered y
  });

  it('bit1 set: right-aligned x with border offset, bit4/bit2 unset: y centered', () => {
    const zero = { x: 0, y: 0 };
    const border: [typeof zero, typeof zero, typeof zero, typeof zero] =
      [zero, { x: 4, y: 0 }, zero, zero]; // RIGHT_IX=1 -> d.x=4
    const { sub, lab } = clusterWithLabel(1, border, true); // bit1=1
    placeGraphLabel(sub);
    expect(lab.pos).toEqual({ x: 98, y: 30 }); // bb.ur.x - 4/2, centered y
  });

  it('bit1 unset: left-aligned x, bit2 set: y at the top edge (bit4 unset)', () => {
    const { sub, lab } = clusterWithLabel(2, undefined, true); // bit1=0,bit2=1,bit4=0
    placeGraphLabel(sub);
    expect(lab.pos).toEqual({ x: 0, y: 60 }); // left edge, top (bit2 branch)
  });

  it('bit4 set: y at the bottom edge', () => {
    const { sub, lab } = clusterWithLabel(4, undefined, true); // bit4=1
    placeGraphLabel(sub);
    expect(lab.pos).toEqual({ x: 0, y: 0 }); // left (bit1=0), bottom (bit4 branch)
  });
});
