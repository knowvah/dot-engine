// SPDX-License-Identifier: EPL-2.0

/**
 * T4b — branch coverage for layout/dot/compound-geom.ts.
 *
 * Pure geometry helpers extracted from lib/dotgen/compound.c
 * (splineIntersectf / boxIntersectf machinery). All functions are
 * side-effect-free (aside from tryUpdateIntersect's explicit output-buffer
 * mutation), so every case here is a direct unit test with hand- and
 * scratch-verified concrete expected values (De Casteljau triangle
 * arithmetic, sign-change crossing counts, cround-based side intersection).
 *
 * @see lib/dotgen/compound.c
 */

import { describe, it, expect } from 'vitest';
import type { Box } from '../../model/geom.js';
import {
  fcmp, inBoxf, midPointf, casteljauStep, subdivideBezier,
  countVertCross, countHorzCross, endpointInRange, endpointNearLine,
  countCrossings, findAxisCrossing, tryUpdateIntersect, boxLineSpecs,
  splineIntersectf, tryLeftSide, tryRightSide, tryBottomSide, tryTopSide,
  boxIntersectf,
} from './compound-geom.js';

const bb: Box = { ll: { x: 0, y: 0 }, ur: { x: 20, y: 10 } };

describe('fcmp', () => {
  it('returns -1 when a < b', () => expect(fcmp(1, 2)).toBe(-1));
  it('returns 1 when a > b', () => expect(fcmp(2, 1)).toBe(1));
  it('returns 0 when a === b', () => expect(fcmp(2, 2)).toBe(0));
});

describe('inBoxf', () => {
  it('true for a point strictly inside', () => {
    expect(inBoxf({ x: 5, y: 5 }, bb)).toBe(true);
  });
  it('true for a point exactly on the ll corner', () => {
    expect(inBoxf({ x: 0, y: 0 }, bb)).toBe(true);
  });
  it('false when x < ll.x', () => {
    expect(inBoxf({ x: -1, y: 5 }, bb)).toBe(false);
  });
  it('false when x > ur.x', () => {
    expect(inBoxf({ x: 21, y: 5 }, bb)).toBe(false);
  });
  it('false when y < ll.y', () => {
    expect(inBoxf({ x: 5, y: -1 }, bb)).toBe(false);
  });
  it('false when y > ur.y', () => {
    expect(inBoxf({ x: 5, y: 11 }, bb)).toBe(false);
  });
});

describe('midPointf', () => {
  it('averages both coordinates', () => {
    expect(midPointf({ x: 0, y: 0 }, { x: 4, y: 6 })).toEqual({ x: 2, y: 3 });
  });
});

describe('casteljauStep', () => {
  it('computes one De Casteljau triangle row at t=0.5', () => {
    const prev: [{ x: number; y: number }, { x: number; y: number },
      { x: number; y: number }, { x: number; y: number }] =
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 1 }, { x: 3, y: 1 }];
    const row = casteljauStep(prev, 0.5);
    expect(row[0]).toEqual({ x: 0.5, y: 0 });
    expect(row[1]).toEqual({ x: 1.5, y: 0.5 });
    expect(row[2]).toEqual({ x: 2.5, y: 1 });
  });
});

describe('subdivideBezier', () => {
  const v = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 1 }, { x: 3, y: 1 }];
  it('left half at t=0.5', () => {
    expect(subdivideBezier(v, 0.5, 'left')).toEqual([
      { x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 1, y: 0.25 }, { x: 1.5, y: 0.5 },
    ]);
  });
  it('right half at t=0.5 (shares the split point with the left half)', () => {
    expect(subdivideBezier(v, 0.5, 'right')).toEqual([
      { x: 1.5, y: 0.5 }, { x: 2, y: 0.75 }, { x: 2.5, y: 1 }, { x: 3, y: 1 },
    ]);
  });
});

describe('countVertCross', () => {
  it('counts one sign change, seeding count from a non-zero start sign', () => {
    expect(countVertCross(
      [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 3, y: 0 }, { x: 5, y: 0 }], 2,
    )).toBe(1);
  });
  it('seeds count=1 when pts[0] lies exactly on the line, then counts the next change', () => {
    expect(countVertCross(
      [{ x: 2, y: 0 }, { x: 1, y: 0 }, { x: 3, y: 0 }, { x: 5, y: 0 }], 2,
    )).toBe(2);
  });
  it('counts zero when every point is on the same side', () => {
    expect(countVertCross(
      [{ x: 1, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0 }], 5,
    )).toBe(0);
  });
});

describe('countHorzCross', () => {
  it('counts one sign change on the y axis', () => {
    expect(countHorzCross(
      [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: 0, y: 3 }, { x: 0, y: 5 }], 2,
    )).toBe(1);
  });
  it('seeds count=1 when pts[0].y lies exactly on the line', () => {
    expect(countHorzCross(
      [{ x: 0, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 3 }, { x: 0, y: 5 }], 2,
    )).toBe(2);
  });
});

describe('endpointInRange', () => {
  it('v axis reads the endpoint y and checks the perpendicular range', () => {
    const pts = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 5, y: 5 }];
    expect(endpointInRange(pts, { axis: 'v', lineCoord: 0, rangeMin: 0, rangeMax: 10 })).toBe(true);
    expect(endpointInRange(pts, { axis: 'v', lineCoord: 0, rangeMin: 0, rangeMax: 3 })).toBe(false);
  });
  it('h axis reads the endpoint x', () => {
    const pts = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 5, y: 5 }];
    expect(endpointInRange(pts, { axis: 'h', lineCoord: 0, rangeMin: 0, rangeMax: 10 })).toBe(true);
  });
});

describe('endpointNearLine', () => {
  const pts = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 3, y: 1 }];
  it('v axis: true within 0.005', () => {
    expect(endpointNearLine(pts, { axis: 'v', lineCoord: 3, rangeMin: 0, rangeMax: 0 })).toBe(true);
  });
  it('v axis: false beyond 0.005', () => {
    expect(endpointNearLine(pts, { axis: 'v', lineCoord: 3.1, rangeMin: 0, rangeMax: 0 })).toBe(false);
  });
  it('h axis reads the endpoint y', () => {
    expect(endpointNearLine(pts, { axis: 'h', lineCoord: 1, rangeMin: 0, rangeMax: 0 })).toBe(true);
  });
});

describe('countCrossings', () => {
  const pts = [{ x: -1, y: -1 }, { x: 1, y: 1 }, { x: 3, y: 3 }, { x: 5, y: 5 }];
  it('dispatches to countVertCross for axis v', () => {
    expect(countCrossings(pts, { axis: 'v', lineCoord: 2, rangeMin: 0, rangeMax: 0 })).toBe(1);
  });
  it('dispatches to countHorzCross for axis h', () => {
    expect(countCrossings(pts, { axis: 'h', lineCoord: 2, rangeMin: 0, rangeMax: 0 })).toBe(1);
  });
});

describe('findAxisCrossing', () => {
  it('returns tmin immediately when tmin === tmax', () => {
    const pts = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
    expect(findAxisCrossing(pts, 0.5, 0.5, { axis: 'v', lineCoord: 0, rangeMin: 0, rangeMax: 0 }))
      .toBe(0.5);
  });
  it('returns -1 when the control polygon never crosses the line', () => {
    const pts = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
    expect(findAxisCrossing(pts, 0, 1,
      { axis: 'v', lineCoord: 100, rangeMin: -10, rangeMax: 10 })).toBe(-1);
  });
  it('returns tmax for a single near-endpoint crossing within range', () => {
    const straight = [{ x: 0, y: 0 }, { x: 1, y: 1 / 3 }, { x: 2, y: 2 / 3 }, { x: 3, y: 1 }];
    expect(findAxisCrossing(straight, 0, 1,
      { axis: 'v', lineCoord: 3, rangeMin: 0, rangeMax: 2 })).toBe(1);
  });
  it('returns -1 for a single near-endpoint crossing outside range', () => {
    const straight = [{ x: 0, y: 0 }, { x: 1, y: 1 / 3 }, { x: 2, y: 2 / 3 }, { x: 3, y: 1 }];
    expect(findAxisCrossing(straight, 0, 1,
      { axis: 'v', lineCoord: 3, rangeMin: 1.5, rangeMax: 2 })).toBe(-1);
  });
  it('recurses and finds the crossing in the left half (tL >= 0)', () => {
    const pts = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: -2, y: 0 }, { x: 2, y: 0 }];
    expect(findAxisCrossing(pts, 0, 1,
      { axis: 'v', lineCoord: 1, rangeMin: -10, rangeMax: 10 })).toBeCloseTo(0.11328125, 8);
  });
  it('recurses past a failed left half (tL < 0) into the right half', () => {
    const mono = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 6, y: 0 }, { x: 10, y: 0 }];
    expect(findAxisCrossing(mono, 0, 1,
      { axis: 'v', lineCoord: 8, rangeMin: -10, rangeMax: 10 })).toBeCloseTo(0.832763671875, 8);
  });
});

describe('tryUpdateIntersect', () => {
  const orig = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 1 }, { x: 3, y: 1 }];
  it('leaves tmin unchanged and pts untouched when t < 0', () => {
    const pts = orig.map(p => ({ ...p }));
    expect(tryUpdateIntersect(-1, 0.5, orig, pts)).toBe(0.5);
    expect(pts).toEqual(orig);
  });
  it('leaves tmin unchanged when t >= tmin', () => {
    const pts = orig.map(p => ({ ...p }));
    expect(tryUpdateIntersect(0.9, 0.5, orig, pts)).toBe(0.5);
    expect(pts).toEqual(orig);
  });
  it('updates tmin and overwrites pts with the left-subdivision at t', () => {
    const pts = orig.map(p => ({ ...p }));
    expect(tryUpdateIntersect(0.3, 0.5, orig, pts)).toBe(0.3);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[1]).toEqual({ x: 0.3, y: 0 });
    expect(pts[2]).toEqual({ x: 0.6, y: 0.09 });
    expect(pts[3].x).toBeCloseTo(0.9, 10);
    expect(pts[3].y).toBeCloseTo(0.216, 10);
  });
});

describe('boxLineSpecs', () => {
  it('builds the four axis-aligned side specs in ll-x, ur-x, ll-y, ur-y order', () => {
    const specs = boxLineSpecs({ ll: { x: 1, y: 2 }, ur: { x: 9, y: 8 } });
    expect(specs).toEqual([
      { axis: 'v', lineCoord: 1, rangeMin: 2, rangeMax: 8 },
      { axis: 'v', lineCoord: 9, rangeMin: 2, rangeMax: 8 },
      { axis: 'h', lineCoord: 2, rangeMin: 1, rangeMax: 9 },
      { axis: 'h', lineCoord: 8, rangeMin: 1, rangeMax: 9 },
    ]);
  });
});

describe('splineIntersectf', () => {
  it('truncates pts and returns true when the spline crosses the box', () => {
    const pts = [{ x: -5, y: 5 }, { x: 0, y: 5 }, { x: 5, y: 5 }, { x: 10, y: 5 }];
    expect(splineIntersectf(pts, bb)).toBe(true);
  });
  it('returns false when the spline never crosses the box boundary', () => {
    const pts = [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }];
    expect(splineIntersectf(pts, bb)).toBe(false);
  });
});

describe('tryLeftSide / tryRightSide / tryBottomSide / tryTopSide', () => {
  it('tryLeftSide returns null when cp is not left of the box (guard)', () => {
    expect(tryLeftSide({ x: 5, y: 5 }, { x: 1, y: 2 }, bb)).toBeNull();
  });
  it('tryLeftSide computes the intersection y with cround rounding', () => {
    expect(tryLeftSide({ x: 5, y: 5 }, { x: -5, y: 2 }, bb)).toEqual({ x: 0, y: 3 });
  });
  it('tryLeftSide returns null when the computed y falls outside the box', () => {
    expect(tryLeftSide({ x: 5, y: 5 }, { x: -5, y: 100 }, bb)).toBeNull();
  });

  it('tryRightSide returns null when cp is not right of the box (guard)', () => {
    expect(tryRightSide({ x: 5, y: 5 }, { x: 15, y: 2 }, bb)).toBeNull();
  });
  it('tryRightSide computes the intersection y', () => {
    expect(tryRightSide({ x: 5, y: 5 }, { x: 25, y: 2 }, bb)).toEqual({ x: 20, y: 3 });
  });
  it('tryRightSide returns null when the computed y falls outside the box', () => {
    expect(tryRightSide({ x: 5, y: 5 }, { x: 25, y: 100 }, bb)).toBeNull();
  });

  it('tryBottomSide returns null when cp is not below the box (guard)', () => {
    expect(tryBottomSide({ x: 5, y: 5 }, { x: 5, y: 1 }, bb)).toBeNull();
  });
  it('tryBottomSide computes the intersection x', () => {
    expect(tryBottomSide({ x: 5, y: 5 }, { x: 5, y: -5 }, bb)).toEqual({ x: 5, y: 0 });
  });
  it('tryBottomSide returns null when the computed x falls outside the box', () => {
    expect(tryBottomSide({ x: 5, y: 5 }, { x: 100, y: -5 }, bb)).toBeNull();
  });

  it('tryTopSide returns null when cp is not above the box (guard)', () => {
    expect(tryTopSide({ x: 5, y: 5 }, { x: 5, y: 9 }, bb)).toBeNull();
  });
  it('tryTopSide computes the intersection x', () => {
    expect(tryTopSide({ x: 5, y: 5 }, { x: 5, y: 25 }, bb)).toEqual({ x: 5, y: 10 });
  });
  it('tryTopSide returns null when the computed x falls outside the box', () => {
    expect(tryTopSide({ x: 5, y: 5 }, { x: 100, y: 25 }, bb)).toBeNull();
  });
});

describe('boxIntersectf', () => {
  it('picks the left-side intersection', () => {
    expect(boxIntersectf({ x: 5, y: 5 }, { x: -5, y: 5 }, bb)).toEqual({ x: 0, y: 5 });
  });
  it('picks the right-side intersection', () => {
    expect(boxIntersectf({ x: 5, y: 5 }, { x: 25, y: 5 }, bb)).toEqual({ x: 20, y: 5 });
  });
  it('picks the bottom-side intersection', () => {
    expect(boxIntersectf({ x: 5, y: 5 }, { x: 5, y: -5 }, bb)).toEqual({ x: 5, y: 0 });
  });
  it('picks the top-side intersection', () => {
    expect(boxIntersectf({ x: 5, y: 5 }, { x: 5, y: 25 }, bb)).toEqual({ x: 5, y: 10 });
  });
  it('falls back to pp when no side yields a valid intersection', () => {
    expect(boxIntersectf({ x: 5, y: 5 }, { x: 5, y: 5 }, bb)).toEqual({ x: 5, y: 5 });
  });
});
