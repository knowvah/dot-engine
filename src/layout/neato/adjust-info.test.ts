// SPDX-License-Identifier: EPL-2.0

/**
 * Info_t machinery of adjust.c (makeInfo, rmEquality, countOverlap, rePos,
 * sAdjust) against the native oracle. Expected positions are native
 * `neato -n1 -Goverlap=oscale -Tplain` node centres on fixtures with pos in
 * points (only the adjuster runs); both sides are translated so the node
 * bounding box starts at (0,0), as gv_postprocess does.
 *
 * @see lib/neatogen/adjust.c
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { parse } from '../../index.js';
import { createDefaultContext } from '../../gvc/default-context.js';
import type { Graph } from '../../model/graph.js';
import {
  chkBoundBox, countOverlap, countOverlapIn, geomUpdate, makeInfo, newInfoState,
  rePos, rmEquality, sAdjust, sAdjustGraph, sortSites,
} from './adjust-info.js';

const PT = 72;
const TOL = 0.5 / PT;

/** Lay out with neato (sizes the nodes), then set pos from `points` (points). */
function prepared(src: string, points: [number, number][]): Graph {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const g = parse(src);
  createDefaultContext().layout(g, 'neato');
  warn.mockRestore();
  [...g.nodes.values()].forEach((n, i) => {
    n.info.pos = [points[i]![0] / PT, points[i]![1] / PT];
  });
  return g;
}

function normalised(g: Graph): [number, number][] {
  const ns = [...g.nodes.values()];
  const mx = Math.min(...ns.map((n) => n.info.pos![0] - n.info.width! / 2));
  const my = Math.min(...ns.map((n) => n.info.pos![1] - n.info.height! / 2));
  return ns.map((n) => [n.info.pos![0] - mx, n.info.pos![1] - my]);
}

function expectClose(g: Graph, want: [number, number][]): void {
  const got = normalised(g);
  expect(got.length).toBe(want.length);
  got.forEach(([x, y], i) => {
    expect(Math.abs(x - want[i]![0])).toBeLessThanOrEqual(TOL);
    expect(Math.abs(y - want[i]![1])).toBeLessThanOrEqual(TOL);
  });
}

const BOXES = 'graph G { node[shape=box]; a; b; c; d; e; f }';
const BOX_PTS: [number, number][] = [[100, 100], [130, 110], [160, 90], [400, 300], [420, 310], [250, 200]];
const BOX_WANT: [number, number][] = [
  [0.375, 0.69793], [1.7188, 1.1459], [3.0626, 0.25], [13.813, 9.6565], [14.709, 10.104], [7.094, 5.1772],
];
const ELLIPSES = 'graph G { node[shape=ellipse]; a; b; c; d; e [width=1.5 height=0.8]; f; g }';
const ELL_PTS: [number, number][] = [[100, 100], [120, 105], [140, 95], [300, 300], [330, 310], [200, 200], [210, 215]];
const ELL_WANT: [number, number][] = [
  [0.375, 0.45314], [1.1876, 0.65629], [2.0001, 0.25], [8.5007, 8.5789], [9.7196, 8.9852], [4.4379, 4.516], [4.8441, 5.1254],
];
const CLUSTER = 'graph G { node[shape=ellipse]; a; b; c; d; e; f }';
const CLUSTER_PTS: [number, number][] = [[100, 100], [150, 100], [150, 100], [150, 100], [300, 100], [300, 100]];
const CLUSTER_WANT: [number, number][] = [
  [0.375, 0.25], [1.2613, 0.25], [2.1476, 0.25], [3.0339, 0.25], [3.9202, 0.25], [5.0192, 0.25],
];
const COINCIDENT = 'graph G { node[shape=ellipse]; a; b; c }';
const COINC_PTS: [number, number][] = [[100, 100], [100, 100], [100, 100]];
const COINC_WANT: [number, number][] = [[0.375, 0.25], [1.2792, 0.25], [2.1833, 0.25]];

describe('sAdjustGraph (overlap=oscale)', () => {
  it.each([
    ['boxes', BOXES, BOX_PTS, BOX_WANT],
    ['ellipses', ELLIPSES, ELL_PTS, ELL_WANT],
    ['coincident groups (rmEquality)', CLUSTER, CLUSTER_PTS, CLUSTER_WANT],
    ['all coincident', COINCIDENT, COINC_PTS, COINC_WANT],
  ])('matches native on %s', (_name, src, pts, want) => {
    const g = prepared(src, pts);
    expect(sAdjustGraph(g)).toBe(1);
    expectClose(g, want);
  });

  it('returns 0 and leaves positions when nothing overlaps', () => {
    const g = prepared('graph G { a; b }', [[0, 0], [300, 0]]);
    expect(sAdjustGraph(g)).toBe(0);
    expect(g.nodes.get('b')!.info.pos![0]).toBeCloseTo(300 / PT, 12);
  });
});

describe('countOverlapIn', () => {
  it('counts exact polygon overlaps', () => {
    expect(countOverlapIn(prepared(BOXES, BOX_PTS))).toBe(4);
    expect(countOverlapIn(prepared(ELLIPSES, ELL_PTS))).toBe(5);
    expect(countOverlapIn(prepared(CLUSTER, CLUSTER_PTS))).toBe(7);
  });

  it('returns 0 for rounded shapes whose boxes touch but outlines do not', () => {
    // two ellipses 0.75in wide, centres 0.7in apart on the diagonal:
    // bounding boxes intersect, ellipse outlines (plus sep 4pt) do not.
    const g = prepared('graph G { node[shape=ellipse]; a; b }', [[0, 0], [52, 32]]);
    expect(countOverlapIn(g)).toBe(0);
    const boxes = prepared('graph G { node[shape=box]; a; b }', [[0, 0], [52, 32]]);
    expect(countOverlapIn(boxes)).toBe(1);
  });

  it('returns 0 for a single node', () => {
    expect(countOverlapIn(prepared('graph G { a }', [[0, 0]]))).toBe(0);
  });
});

describe('Info_t state', () => {
  it('makeInfo mirrors positions and polygons, in node order', () => {
    const g = prepared(BOXES, BOX_PTS);
    const st = newInfoState();
    expect(makeInfo(st, g)).toBe(true);
    expect(st.nodeInfo.map((i) => i.site.sitenbr)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(st.nodeInfo[1]!.site.coord).toEqual({ x: 130 / PT, y: 110 / PT });
    // box 0.75x0.5in plus 4pt sep each side
    expect(st.nodeInfo[0]!.poly.corner.x).toBeCloseTo(0.375 + 4 / PT, 9);
    expect(st.nodeInfo[0]!.poly.origin.y).toBeCloseTo(-0.25 - 4 / PT, 9);
  });

  it('makeInfo uses a multiplicative margin when sep has no "+"', () => {
    const g = prepared(BOXES, BOX_PTS);
    g.attrs.set('sep', '0.5');
    const st = newInfoState();
    expect(makeInfo(st, g)).toBe(true);
    expect(st.nodeInfo[0]!.poly.corner.x).toBeCloseTo(0.375 * 1.5, 9);
  });

  it('chkBoundBox pads the node extremes by voro_margin (default 0.05)', () => {
    const g = prepared(BOXES, BOX_PTS);
    const st = newInfoState();
    makeInfo(st, g);
    chkBoundBox(st, g);
    const xMin = 100 / PT - 0.375 - 4 / PT;
    const xMax = 420 / PT + 0.375 + 4 / PT;
    expect(st.pxmin).toBeCloseTo(xMin - 0.05 * (xMax - xMin), 9);
    expect(st.pxmax).toBeCloseTo(xMax + 0.05 * (xMax - xMin), 9);
    expect(st.nw).toEqual({ x: st.pxmin, y: st.pymax });
    expect(st.se).toEqual({ x: st.pxmax, y: st.pymin });
    g.attrs.set('voro_margin', '0.5');
    chkBoundBox(st, g);
    expect(st.pxmax).toBeCloseTo(xMax + 0.5 * (xMax - xMin), 9);
  });

  it('sortSites orders by y then x; geomUpdate computes ranges', () => {
    const g = prepared(BOXES, [[5, 9], [1, 3], [2, 3], [7, 1], [4, 1], [0, 20]]);
    const st = newInfoState();
    makeInfo(st, g);
    sortSites(st);
    expect(st.sites.map((s) => s.sitenbr)).toEqual([4, 3, 1, 2, 0, 5]);
    geomUpdate(st, false);
    expect([st.xmin, st.xmax, st.ymin, st.ymax]).toEqual([0, 7 / PT, 1 / PT, 20 / PT]);
    expect(st.deltax).toBeCloseTo(7 / PT, 12);
    geomUpdate(st, true);
    expect(st.sites[0]!.sitenbr).toBe(4);
  });

  it('rmEquality spreads coincident nodes toward the next one on the row', () => {
    const g = prepared(CLUSTER, CLUSTER_PTS);
    const st = newInfoState();
    makeInfo(st, g);
    rmEquality(st);
    const xs = st.nodeInfo.map((i) => i.site.coord.x * PT);
    // b,c,d share x=150 and e sits at 300 on the same row: cnt=3, xdel=50
    expect(xs[0]).toBeCloseTo(100, 9);
    expect(xs[1]).toBeCloseTo(150, 9);
    expect(xs[2]).toBeCloseTo(200, 9);
    expect(xs[3]).toBeCloseTo(250, 9);
  });

  it('rmEquality lays out coincident nodes by polygon width when nothing is to the right', () => {
    const g = prepared(COINCIDENT, COINC_PTS);
    const st = newInfoState();
    makeInfo(st, g);
    rmEquality(st);
    const w = 0.75 + 8 / PT;
    const xs = st.nodeInfo.map((i) => i.site.coord.x);
    expect(xs[0]).toBeCloseTo(100 / PT, 12);
    expect(xs[1]).toBeCloseTo(100 / PT + w, 9);
    expect(xs[2]).toBeCloseTo(100 / PT + 2 * w, 9);
  });

  it('countOverlap flags overlapping nodes; rePos scales by 1.05', () => {
    const g = prepared(BOXES, BOX_PTS);
    const st = newInfoState();
    makeInfo(st, g);
    expect(countOverlap(st, 0)).toBe(4);
    expect(st.nodeInfo.map((i) => i.overlaps)).toEqual([true, true, true, true, true, false]);
    rePos(st);
    expect(st.nodeInfo[0]!.site.coord.x).toBeCloseTo((100 / PT) * 1.05, 12);
    expect(sAdjust(st)).toBe(1);
  });

  it('sAdjust returns 0 without touching sites when there is no overlap', () => {
    const g = prepared('graph G { a; b }', [[0, 0], [300, 0]]);
    const st = newInfoState();
    makeInfo(st, g);
    expect(sAdjust(st)).toBe(0);
    expect(st.nodeInfo[1]!.site.coord.x).toBeCloseTo(300 / PT, 12);
  });

  it('makeInfo reports failure for an unsupported shape', () => {
    const g = prepared('graph G { a; b }', [[0, 0], [10, 0]]);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    g.nodes.get('a')!.info.shape = { name: 'bogus' } as never;
    const st = newInfoState();
    expect(makeInfo(st, g)).toBe(false);
    expect(countOverlapIn(g)).toBe(0);
    vi.restoreAllMocks();
  });
});

beforeAll(() => {
  /* node order is declaration order; guard against Map reordering */
  expect(prepared(BOXES, BOX_PTS).nodes.size).toBe(6);
});
