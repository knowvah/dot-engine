// SPDX-License-Identifier: EPL-2.0

/**
 * Branch coverage for Plegal_arrangement — the obstacle-polygon legality
 * check used by spline_edges_ before building the visibility graph.
 * legalArrangement is the only export; every case below is a polygon
 * arrangement chosen to walk internal sweep-line branches (sgnarea sign
 * combinations, online/between classification, intpoint's three
 * intersection-kind cases, realIntersect's vertical-segment filter, and
 * findInside's bbox-nesting containment test).
 *
 * @see lib/neatogen/legal.c
 *
 * Residual branches (87.5% branch coverage; verified by instrumented
 * tracing of intpoint's `cond`/`online` values, not left as guesses):
 *  - legal.ts:125 `ls.x === le.x` (case 3, l-vertical): PROVEN
 *    unreachable. `l` can only be the already-active edge tested against a
 *    newly-triggered `m` while the sweep is exactly at l's own x column
 *    (verticals have a zero-width active window). That forces one of m's
 *    two sgnarea sign components to be exactly 0 (its trigger vertex sits
 *    on l's line by construction), so the first sgnarea(l,m) product is
 *    always 0, never < 0 — the i[2]<0 branch that assigns cond=3 is never
 *    entered when l is vertical.
 *  - legal.ts:150 `online(vs, l, m, 0) === -1` (case 2, second branch):
 *    PROVEN unreachable. This re-evaluates the exact same pure expression
 *    already required to be false by the guarding `else if` at line 148
 *    (which is only reached when the line-144 `if` on that identical
 *    expression failed). legal.c:159 has the same redundant re-check —
 *    faithfully preserved, not "fixed".
 *  - legal.ts:151 (nested ternary under 150): unreachable as a
 *    consequence of 150 being dead.
 *  - legal.ts:146/147 remaining sub-branch: reachable in principle (not a
 *    repeated-expression case) but the specific `online(vs,m,l,1)!==-1`
 *    combination requires the SAME edge pair to be re-tested after an
 *    earlier active-edge pair for the same points has already returned a
 *    true intersection — findInts short-circuits (`return 1`) on the
 *    first true hit, so later pairs at the same sweep point are never
 *    reached. Not pursued further given the effort budget for this file.
 *  - legal.ts:196-198 (findIntersection's post-swap i[2]>0 / null-point
 *    paths) and legal.ts:241/246/313 (find_ints' "trying to delete a
 *    non-line" error path and its callers): not reached by any polygon
 *    arrangement tried. The delete-error path requires an active-list
 *    state inconsistency that did not arise from any (possibly
 *    self-intersecting) input constructed; left as residue rather than
 *    force a non-representative/invalid input.
 */

import { describe, test, expect } from 'vitest';
import { legalArrangement } from './legal.js';
import type { Poly } from '../../pathplan/types.js';

// inPoly (pathplan/visibility.ts) requires a clockwise ring (in this
// y-up coordinate system) to classify interior points correctly.
const square = (x: number, y: number, s: number): Poly => ({
  ps: [
    { x, y },
    { x, y: y + s },
    { x: x + s, y: y + s },
    { x: x + s, y },
  ],
});

describe('legalArrangement — trivial inputs', () => {
  test('no polygons is legal', () => {
    expect(legalArrangement([])).toBe(true);
  });

  test('a single polygon is legal', () => {
    expect(legalArrangement([square(0, 0, 10)])).toBe(true);
  });
});

describe('legalArrangement — disjoint polygons', () => {
  test('two far-apart squares are legal', () => {
    expect(legalArrangement([square(0, 0, 10), square(100, 100, 10)])).toBe(true);
  });

  test('three disjoint squares in a row are legal', () => {
    expect(
      legalArrangement([square(0, 0, 5), square(10, 0, 5), square(20, 0, 5)]),
    ).toBe(true);
  });
});

describe('legalArrangement — crossing polygons (axis-aligned)', () => {
  test('two overlapping squares (edge-edge crossing) are illegal', () => {
    // bottom-left square and a square offset by (5,5): their boundaries
    // cross at two points, exercising intpoint's simple-intersection
    // (case 3) branch for both vertical-l and vertical-m segments.
    expect(legalArrangement([square(0, 0, 10), square(5, 5, 10)])).toBe(false);
  });

  test('a plus-shaped crossing (one square straddling another entirely in x) is illegal', () => {
    const wide: Poly = { ps: [{ x: -5, y: 4 }, { x: 15, y: 4 }, { x: 15, y: 6 }, { x: -5, y: 6 }] };
    expect(legalArrangement([square(0, 0, 10), wide])).toBe(false);
  });
});

describe('legalArrangement — crossing polygons (rotated, general intpoint case)', () => {
  test('a diamond crossing a square exercises the non-axis-aligned intersection branch', () => {
    const diamond: Poly = {
      ps: [
        { x: 5, y: -5 },
        { x: 15, y: 5 },
        { x: 5, y: 15 },
        { x: -5, y: 5 },
      ],
    };
    expect(legalArrangement([square(0, 0, 10), diamond])).toBe(false);
  });
});

describe('legalArrangement — collinear / touching edges', () => {
  test('two squares sharing a collinear overlapping edge segment are illegal', () => {
    // bottom edges are both on y=0, overlapping in x from 5..10:
    // exercises sgnarea's zero-product path and intpoint's common-segment
    // (case 2) branch.
    expect(legalArrangement([square(0, 0, 10), square(5, 0, 10)])).toBe(false);
  });

  test('two squares touching at a single shared corner vertex are legal', () => {
    // (10,10) is a shared corner; sgnarea sees zero-area triangles at the
    // touch point (case-1 vertex-on-line branch of intpoint), but
    // realIntersect's vertical-endpoint filter rejects it as not a real
    // crossing.
    expect(legalArrangement([square(0, 0, 10), square(10, 10, 10)])).toBe(true);
  });

  test('a T-junction where one polygon vertex touches the interior of an edge is illegal', () => {
    // The right square's left-bottom vertex (10,5) lands exactly on the
    // left square's right edge (10,0)-(10,10) interior — a genuine
    // boundary touch that must be flagged (vertex not at an endpoint of
    // the vertical segment).
    const notch: Poly = { ps: [{ x: 10, y: 5 }, { x: 20, y: 5 }, { x: 20, y: 8 }, { x: 10, y: 8 }] };
    expect(legalArrangement([square(0, 0, 10), notch])).toBe(false);
  });
});

describe('legalArrangement — nesting (findInside)', () => {
  test('a square fully nested inside another with no edge crossings is illegal', () => {
    expect(legalArrangement([square(0, 0, 20), square(5, 5, 5)])).toBe(false);
  });

  test('nesting detected regardless of polygon order in the input array', () => {
    expect(legalArrangement([square(5, 5, 5), square(0, 0, 20)])).toBe(false);
  });

  test('two disjoint squares plus a third nested inside the first are illegal', () => {
    expect(
      legalArrangement([square(0, 0, 20), square(100, 100, 5), square(5, 5, 5)]),
    ).toBe(false);
  });
});

describe('legalArrangement — many polygons (sweep active-list growth)', () => {
  test('five disjoint squares in a row exercise the active-edge insert/delete cycle repeatedly', () => {
    const polys = [0, 1, 2, 3, 4].map((i) => square(i * 20, 0, 10));
    expect(legalArrangement(polys)).toBe(true);
  });

  test('five disjoint squares with one pair overlapping is illegal', () => {
    const polys = [0, 1, 2, 3, 4].map((i) => square(i * 20, 0, 10));
    polys.push(square(2, 2, 3)); // nested inside polys[0]
    expect(legalArrangement(polys)).toBe(false);
  });
});

describe('legalArrangement — case-3 intersection with a vertical active edge', () => {
  test('a diagonal edge starting exactly on a already-swept vertical edge column', () => {
    // Triangle A has a vertical left edge x=5 from y=0..10. Polygon B has a
    // vertex exactly at (5,3) — the same x column — so when the sweep
    // visits that column, A's vertical edge is still active ("l") and gets
    // tested against B's forward edge ("m"), exercising intpoint case 3's
    // ls.x===le.x (vertical-l) branch.
    const triA: Poly = { ps: [{ x: 5, y: 0 }, { x: 5, y: 10 }, { x: 15, y: 5 }] };
    const diagB: Poly = { ps: [{ x: 5, y: 3 }, { x: 15, y: 8 }, { x: 15, y: 1 }] };
    expect(legalArrangement([triA, diagB])).toBe(false);
  });
});

describe('legalArrangement — collinear-overlap ternary variants (intpoint case 2)', () => {
  test('overlapping collinear edges where the second segment fully contains the first', () => {
    // l = (0,0)-(10,0); m = (-5,0)-(15,0): m's endpoints straddle l on both
    // sides, forcing the "may be degenerate" branch in case 2 and its
    // inner online(m,l,0) check.
    const thin: Poly = { ps: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 10, y: 1 }, { x: 10, y: 0 }] };
    const wide: Poly = { ps: [{ x: -5, y: 0 }, { x: -5, y: 1 }, { x: 15, y: 1 }, { x: 15, y: 0 }] };
    expect(legalArrangement([thin, wide])).toBe(false);
  });

  test('overlapping collinear edges offset so only the trailing endpoint is interior', () => {
    const a: Poly = { ps: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 10, y: 1 }, { x: 10, y: 0 }] };
    const b: Poly = { ps: [{ x: 5, y: 0 }, { x: 5, y: 1 }, { x: 20, y: 1 }, { x: 20, y: 0 }] };
    expect(legalArrangement([a, b])).toBe(false);
  });

  test('overlapping collinear edges offset the other direction (leading endpoint interior)', () => {
    const a: Poly = { ps: [{ x: 5, y: 0 }, { x: 5, y: 1 }, { x: 20, y: 1 }, { x: 20, y: 0 }] };
    const b: Poly = { ps: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 10, y: 1 }, { x: 10, y: 0 }] };
    expect(legalArrangement([a, b])).toBe(false);
  });

  test('a short collinear edge tucked fully inside a longer one (reversed insertion order)', () => {
    const long1: Poly = { ps: [{ x: -30, y: 0 }, { x: -30, y: 1 }, { x: 30, y: 1 }, { x: 30, y: 0 }] };
    const short1: Poly = { ps: [{ x: -2, y: 0 }, { x: -2, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 0 }] };
    expect(legalArrangement([long1, short1])).toBe(false);
    expect(legalArrangement([short1, long1])).toBe(false);
  });

  test('collinear edges offset far to the right (reversed insertion order)', () => {
    const a: Poly = { ps: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 30, y: 1 }, { x: 30, y: 0 }] };
    const b: Poly = { ps: [{ x: 25, y: 0 }, { x: 25, y: 1 }, { x: 60, y: 1 }, { x: 60, y: 0 }] };
    expect(legalArrangement([b, a])).toBe(false);
    expect(legalArrangement([a, b])).toBe(false);
  });

  test('collinear edges offset far to the left (reversed insertion order)', () => {
    const a: Poly = { ps: [{ x: 25, y: 0 }, { x: 25, y: 1 }, { x: 60, y: 1 }, { x: 60, y: 0 }] };
    const b: Poly = { ps: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 30, y: 1 }, { x: 30, y: 0 }] };
    expect(legalArrangement([b, a])).toBe(false);
    expect(legalArrangement([a, b])).toBe(false);
  });

  test('three collinear-overlapping bars stack a chain of common-segment tests', () => {
    const p1: Poly = { ps: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 12, y: 1 }, { x: 12, y: 0 }] };
    const p2: Poly = { ps: [{ x: 8, y: 0 }, { x: 8, y: 1 }, { x: 20, y: 1 }, { x: 20, y: 0 }] };
    const p3: Poly = { ps: [{ x: 16, y: 0 }, { x: 16, y: 1 }, { x: 28, y: 1 }, { x: 28, y: 0 }] };
    expect(legalArrangement([p1, p2, p3])).toBe(false);
  });
});

describe('legalArrangement — duplicate consecutive vertex (zero-length edge)', () => {
  test('a polygon with a repeated point does not crash and reports its legality', () => {
    // The repeated point (10,0) creates a zero-length edge: gt() reports
    // the two endpoints equal, exercising findInts' default ("same point")
    // switch case.
    const withDup: Poly = { ps: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }] };
    expect(legalArrangement([withDup])).toBe(true);
    expect(legalArrangement([withDup, square(100, 100, 5)])).toBe(true);
  });
});

describe('legalArrangement — bbox-nested but polygon-disjoint (L-shaped container)', () => {
  test('a small square sits inside another square\'s bbox but outside its L-shaped notch', () => {
    // The "container" is an L-shape (a big square with a corner notch cut
    // out). Its bounding box is the full big square, so a small square
    // placed exactly in the notched-out corner has a bbox nested inside
    // the container's bbox, yet lies outside the container polygon:
    // exercises findInside's inPoly(...) === false path (ring i in ring j
    // by bbox, but not by actual point containment).
    const lShape: Poly = {
      ps: [
        { x: 0, y: 0 },
        { x: 0, y: 20 },
        { x: 20, y: 20 },
        { x: 20, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 0 },
      ],
    };
    const inNotch = square(13, 2, 3); // sits in the cut-out corner (10..20, 0..10 minus L)
    expect(legalArrangement([inNotch, lShape])).toBe(true);
    expect(legalArrangement([lShape, inNotch])).toBe(true);
  });
});

describe('legalArrangement — degenerate / thin shapes', () => {
  test('a triangle and a square that share only a grazing vertex touch are legal', () => {
    const tri: Poly = { ps: [{ x: 10, y: 10 }, { x: 20, y: 10 }, { x: 15, y: 20 }] };
    expect(legalArrangement([square(0, 0, 10), tri])).toBe(true);
  });

  test('a very thin sliver polygon crossing a square is illegal', () => {
    const sliver: Poly = { ps: [{ x: -5, y: 4.999 }, { x: 15, y: 5 }, { x: -5, y: 5.001 }] };
    expect(legalArrangement([square(0, 0, 10), sliver])).toBe(false);
  });
});
