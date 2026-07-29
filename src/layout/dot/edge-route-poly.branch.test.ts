// SPDX-License-Identifier: EPL-2.0

/**
 * T4b — branch coverage for layout/dot/edge-route-poly.ts.
 *
 * Direct unit tests against the box-to-polygon conversion (addForwardPolyPts
 * / addReversePolyPts / boxesToPolygon) and the spline-fit helpers
 * (polyEdgesFromPts, linearBezier, tryRouteSpline, computeSpline). Box
 * sequences are hand-chosen so that the internal prev/next direction codes
 * (fwdDirs/revDirs, not exported) sweep every ternary and if/else branch of
 * emitFwdBox/emitRevBox/emitAllCorners; every expected polygon is scratch-
 * verified against the actual function output and independently traced
 * against the prev/next formulas by hand before being pinned here.
 *
 * Residue: tryRouteSpline's `raw.length < 4` defensive null branch (and
 * computeSpline's paired `?? linearBezier` fallback at the same call site)
 * could not be triggered. `routeSpline`'s ops array starts at length 1
 * (route[0]) and every successful `splineFits` leaf call appends exactly 3
 * points (appendSps), and splineFits always succeeds once recursion
 * bisects an input down to a 2-point segment (forceflag). So ops.length is
 * always of the form 1 + 3k with k >= 1 for every wpts/barrier combination
 * tried (including 0-, 1- and 2-point wpts with real and degenerate
 * barriers) — never < 4. Left uncovered; see report.
 *
 * @see lib/common/routespl.c:routesplines_
 */

import { describe, it, expect } from 'vitest';
import type { Box, Point } from '../../model/geom.js';
import {
  addForwardPolyPts, addReversePolyPts, boxesToPolygon, polyEdgesFromPts,
  linearBezier, tryRouteSpline, computeSpline,
} from './edge-route-poly.js';

function box(llx: number, lly: number, urx: number, ury: number): Box {
  return { ll: { x: llx, y: lly }, ur: { x: urx, y: ury } };
}

// A single box: prev===next===0 in both passes (the "endpoints" case).
const single = [box(0, 0, 10, 4)];
// Strictly increasing ll.y: exercises the "inner ternary true" / bi=0,n-1
// boundary branches, and the emitFwdBox/emitRevBox "cond false -> else"
// (ur.x variant) and "cond true" (ll.x variant) arms.
const increasing = [box(0, 0, 10, 4), box(0, 5, 10, 9), box(0, 10, 10, 14)];
// Strictly decreasing ll.y: mirrors increasing, exercising the inner
// ternary "false" arm and swapping which pass hits which cond outcome.
const decreasing = [box(0, 10, 10, 14), box(0, 5, 10, 9), box(0, 0, 10, 4)];
// Peak (up then down): middle box has prev===next!==0 in both passes,
// exercising the forward "no push" no-op and the reverse emitAllCorners
// four-corner branch.
const peak = [box(0, 0, 10, 4), box(0, 10, 10, 14), box(0, 5, 10, 9)];

describe('addForwardPolyPts', () => {
  it('single box: prev===next===0 pushes the ll.x pair', () => {
    const pts: Point[] = [];
    addForwardPolyPts(single, pts);
    expect(pts).toEqual([{ x: 0, y: 4 }, { x: 0, y: 0 }]);
  });
  it('increasing sequence', () => {
    const pts: Point[] = [];
    addForwardPolyPts(increasing, pts);
    expect(pts).toEqual([
      { x: 10, y: 0 }, { x: 10, y: 4 }, { x: 10, y: 5 }, { x: 10, y: 9 },
      { x: 10, y: 10 }, { x: 10, y: 14 },
    ]);
  });
  it('decreasing sequence', () => {
    const pts: Point[] = [];
    addForwardPolyPts(decreasing, pts);
    expect(pts).toEqual([
      { x: 0, y: 14 }, { x: 0, y: 10 }, { x: 0, y: 9 }, { x: 0, y: 5 },
      { x: 0, y: 4 }, { x: 0, y: 0 },
    ]);
  });
  it('peak: the middle box contributes no points (prev===next===-1)', () => {
    const pts: Point[] = [];
    addForwardPolyPts(peak, pts);
    expect(pts).toEqual([
      { x: 10, y: 0 }, { x: 10, y: 4 }, { x: 0, y: 9 }, { x: 0, y: 5 },
    ]);
  });
});

describe('addReversePolyPts', () => {
  it('single box: prev===next===0 pushes the ur.x pair', () => {
    const pts: Point[] = [];
    addReversePolyPts(single, pts);
    expect(pts).toEqual([{ x: 10, y: 0 }, { x: 10, y: 4 }]);
  });
  it('increasing sequence', () => {
    const pts: Point[] = [];
    addReversePolyPts(increasing, pts);
    expect(pts).toEqual([
      { x: 0, y: 14 }, { x: 0, y: 10 }, { x: 0, y: 9 }, { x: 0, y: 5 },
      { x: 0, y: 4 }, { x: 0, y: 0 },
    ]);
  });
  it('decreasing sequence', () => {
    const pts: Point[] = [];
    addReversePolyPts(decreasing, pts);
    expect(pts).toEqual([
      { x: 10, y: 0 }, { x: 10, y: 4 }, { x: 10, y: 5 }, { x: 10, y: 9 },
      { x: 10, y: 10 }, { x: 10, y: 14 },
    ]);
  });
  it('peak: the middle box hits emitAllCorners (prev===next===-1)', () => {
    const pts: Point[] = [];
    addReversePolyPts(peak, pts);
    expect(pts).toEqual([
      { x: 10, y: 5 }, { x: 10, y: 9 },
      { x: 10, y: 10 }, { x: 10, y: 14 }, { x: 0, y: 14 }, { x: 0, y: 10 },
      { x: 0, y: 4 }, { x: 0, y: 0 },
    ]);
  });
});

describe('boxesToPolygon', () => {
  it('returns [] for an empty box list', () => {
    expect(boxesToPolygon([])).toEqual([]);
  });
  it('concatenates the forward and reverse passes', () => {
    expect(boxesToPolygon(increasing)).toEqual([
      { x: 10, y: 0 }, { x: 10, y: 4 }, { x: 10, y: 5 }, { x: 10, y: 9 },
      { x: 10, y: 10 }, { x: 10, y: 14 },
      { x: 0, y: 14 }, { x: 0, y: 10 }, { x: 0, y: 9 }, { x: 0, y: 5 },
      { x: 0, y: 4 }, { x: 0, y: 0 },
    ]);
  });
});

describe('polyEdgesFromPts', () => {
  it('builds consecutive closed edges', () => {
    const poly = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
    expect(polyEdgesFromPts(poly)).toEqual([
      { a: { x: 0, y: 0 }, b: { x: 10, y: 0 } },
      { a: { x: 10, y: 0 }, b: { x: 10, y: 10 } },
      { a: { x: 10, y: 10 }, b: { x: 0, y: 0 } },
    ]);
  });
});

describe('linearBezier', () => {
  it('places control points at 1/3 and 2/3', () => {
    expect(linearBezier({ x: 0, y: 0 }, { x: 9, y: 3 })).toEqual([
      { x: 0, y: 0 }, { x: 3, y: 1 }, { x: 6, y: 2 }, { x: 9, y: 3 },
    ]);
  });
});

describe('tryRouteSpline', () => {
  it('fits a degenerate straight bezier for a 2-point route', () => {
    const poly = boxesToPolygon(increasing);
    const result = tryRouteSpline(polyEdgesFromPts(poly), [{ x: 5, y: 2 }, { x: 5, y: 12 }]);
    expect(result).toEqual([
      { x: 5, y: 2 }, { x: 5, y: 2 }, { x: 5, y: 12 }, { x: 5, y: 12 },
    ]);
  });
});

describe('computeSpline', () => {
  it('falls back to linearBezier when boxes is empty (polygon.length < 3)', () => {
    expect(computeSpline([], { x: 0, y: 0 }, { x: 10, y: 10 })).toEqual([
      { x: 0, y: 0 },
      { x: 10 / 3, y: 10 / 3 },
      { x: 20 / 3, y: 20 / 3 },
      { x: 10, y: 10 },
    ]);
  });
  it('routes through a real box corridor via tryRouteSpline', () => {
    expect(computeSpline(increasing, { x: 5, y: 2 }, { x: 5, y: 12 })).toEqual([
      { x: 5, y: 2 }, { x: 5, y: 2 }, { x: 5, y: 12 }, { x: 5, y: 12 },
    ]);
  });
  it('falls back to linearBezier when the endpoint lies outside the polygon '
    + '(shortestPath returns null)', () => {
    const result = computeSpline(increasing, { x: 5, y: 2 }, { x: 1000, y: 1000 });
    expect(result).toEqual(linearBezier({ x: 5, y: 2 }, { x: 1000, y: 1000 }));
    expect(result[0]).toEqual({ x: 5, y: 2 });
    expect(result[3]).toEqual({ x: 1000, y: 1000 });
  });
});
