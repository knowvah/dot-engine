// SPDX-License-Identifier: EPL-2.0
/**
 * Max-deviation knot of routeSplines (the shared box-channel spline fitter) on
 * the #241_0 non-adjacent flat edge `5:ne->8:nw`.
 *
 * The channel is geometrically symmetric about its mid-x, so the bezier
 * fitter's max-deviation split (routeSpline -> findMaxDev) sees two interior
 * points whose deviations tie to within one ulp. C's own arithmetic decides
 * that tie: strict `d > maxd` (route.c:139), libm `hypot` for `dist`
 * (route.c:448) and clang's fused bezier eval at route.c:137-138. The port
 * mirrors all three bit for bit (.agent-notes/pathplan-fma-contraction-map.md),
 * so, like C, the result depends on absolute coordinates: the fitter is NOT
 * translation-equivariant on such ties, and the knot must be checked in the
 * frame C routes in. The former premises of this file (a "+27 port frame" and
 * a tolerant tie-break that restored equivariance) are stale: the port now
 * routes this edge in C's frame (route start x=375.0169...).
 *
 * Channel + ports below were captured from `routeSplines` during a render of
 * tests/241_0.dot (see plans/nonadjacent-flat-5ne8nw/
 * findings-mirror-mechanism.md) and are re-based to C's frame by C_FRAME_DX.
 * C ground truth: the knot lands TAIL-side at internal x=405.
 *
 * @see lib/common/routespl.c:routesplines
 * @see lib/pathplan/route.c:reallyroutespline (the max-deviation tie-break)
 */

import { describe, it, expect } from 'vitest';
import { makePort } from '../model/edgeInfo.js';
import type { Box } from '../model/geom.js';
import type { Path } from './types.js';
import { routeSplines } from './splines-routespl.js';

// The captured `5:ne->8:nw` channel as originally recorded (+27 from C's
// frame). [ll.x, ll.y, ur.x, ur.y].
const CHANNEL: ReadonlyArray<readonly [number, number, number, number]> = [
  [351, 0, 423, 36], [351, 36, 432, 54], [351, 54, 639, 72],
  [558, 36, 639, 54], [567, 0, 639, 36],
];
const START = { x: 402.0169372558594, y: 34.016937255859375, theta: Math.PI / 4 };
const END = { x: 587.9830627441406, y: 34.016937255859375, theta: (3 * Math.PI) / 4 };

/** Build the captured channel as a Path, shifted by dx in x. */
function channelPath(dx: number): Path {
  const boxes: Box[] = CHANNEL.map(b => ({
    ll: { x: b[0] + dx, y: b[1] }, ur: { x: b[2] + dx, y: b[3] },
  }));
  const start = makePort();
  start.p = { x: START.x + dx, y: START.y };
  start.theta = START.theta;
  start.constrained = true;
  const end = makePort();
  end.p = { x: END.x + dx, y: END.y };
  end.theta = END.theta;
  end.constrained = true;
  return { start, end, nbox: boxes.length, boxes, data: null };
}

/** Shift that re-bases the recorded constants into C's routing frame. */
const C_FRAME_DX = -27;

// Midpoint of the (symmetric) endpoints in C's frame.
const MID_X = (START.x + END.x) / 2 + C_FRAME_DX; // ~468

describe('routeSplines max-deviation knot (#241_0 5:ne->8:nw)', () => {
  it("places the two-bezier knot on the TAIL side in C's frame (matching native dot)", () => {
    const ps = routeSplines(channelPath(C_FRAME_DX));
    expect(ps).not.toBeNull();
    // 7 control points = two cubic beziers; ps[3] is the join (knot).
    expect(ps!.length).toBe(7);
    // C knot x=405 (tail side of MID_X).
    expect(ps![3].x).toBeCloseTo(405, 3);
    expect(ps![3].x).toBeLessThan(MID_X);
  });
});

// ---------------------------------------------------------------------------
// checkPath stale-count semantics (1332 T2, mechanism M2)
//
// C's checkpath takes the box count BY VALUE, compacts degenerate (<0.01)
// boxes in place with STRUCT COPIES, repairs pairs over the reduced local
// count, and never writes the count back; routesplines_ keeps routing over
// its pre-call count, reading the compacted array plus the stale trailing
// slots. That behavior is load-bearing: the resulting degenerate polygon is
// what makes native dot lose 1332's c4251->c4253 edge to its own
// triangulation failure. @see lib/common/routespl.c:318, :683-800
// ---------------------------------------------------------------------------

import { checkPath } from './splines-routespl.js';
import { shortestPath } from '../pathplan/index.js';

/** The 1332 c4251->c4253 corridor (port frame): tail, rank, 0.0068-tall
 *  makeregularend sliver, endpath port box — as assembled pre-checkPath. */
function lostEdgeBoxes(): Box[] {
  return [
    { ll: { x: 712.0, y: 1791.904296875 }, ur: { x: 1879.7, y: 1837.669921875 } },
    { ll: { x: -432.0, y: 1755.904296875 }, ur: { x: 1879.7, y: 1791.904296875 } },
    { ll: { x: 620.0, y: 1755.897460938 }, ur: { x: 688.0, y: 1755.904296875 } },
    { ll: { x: 681.8, y: 1746.147460938 }, ur: { x: 688.0, y: 1755.897460938 } },
  ];
}

function lostEdgePath(boxes: Box[]): Path {
  const start = makePort();
  start.p = { x: 856.0, y: 1836.67 };
  const end = makePort();
  end.p = { x: 682.8, y: 1746.147460938 };
  end.constrained = true;
  end.theta = Math.PI / 2;
  return { start, end, nbox: boxes.length, boxes, data: null };
}

describe('checkPath keeps C\'s stale box count (1332 lost-edge corridor)', () => {
  it('does not write the compacted count back to pp.nbox', () => {
    const boxes = lostEdgeBoxes();
    const pp = lostEdgePath(boxes);
    expect(checkPath(pp.nbox, boxes, pp)).toBe(false);
    // The 0.0068-tall sliver is compacted out (local count 3), but the path
    // keeps routing over the original 4 slots, exactly as C.
    expect(pp.nbox).toBe(4);
  });

  it('compacts by struct copy so the stale trailing slot stays independent', () => {
    const boxes = lostEdgeBoxes();
    const pp = lostEdgePath(boxes);
    checkPath(pp.nbox, boxes, pp);
    // Slot 2 now holds the shifted-down port box, pair-repaired against the
    // rank box (its ur.y swaps up to the rank bottom, .904); slot 3 is the
    // STALE copy keeping the original .897 top. Aliasing the two slots would
    // repair both and lose C's near-duplicate pair.
    expect(boxes[2]).not.toBe(boxes[3]);
    expect(boxes[2].ur.y).toBeCloseTo(1755.904296875, 9);
    expect(boxes[3].ur.y).toBeCloseTo(1755.897460938, 9);
    expect(boxes[2].ll.y).toBeCloseTo(boxes[3].ll.y, 9);
  });

  it('shortestPath fails on the resulting degenerate polygon, matching native dot', () => {
    // C's exact 16-point polygon for the lost edge (from the DUMP1332
    // instrumentation run); its faithful triangulation must fail exactly as
    // shortest.c:333 does — the edge is then LOST, not straight-line drawn.
    const ps = [
      [1879.700, 1829.670], [1879.700, 1783.904], [1879.700, 1783.904], [1879.700, 1747.904],
      [688.000, 1747.904], [688.000, 1738.147], [688.000, 1747.897], [688.000, 1738.147],
      [681.800, 1738.147], [681.800, 1747.897], [681.800, 1738.147], [681.800, 1747.904],
      [-432.000, 1747.904], [-432.000, 1783.904], [712.000, 1783.904], [712.000, 1829.670],
    ].map(([x, y]) => ({ x, y }));
    const pl = shortestPath({ ps }, [
      { x: 856.0, y: 1828.67 }, { x: 682.8, y: 1738.147 },
    ]);
    expect(pl).toBeNull();
  });
});

import { limitBoxes } from './splines-routespl.js';

describe('limitBoxes samples with clang\'s fused lerp', () => {
  // Expected extents: C limitBoxes (routespl.c:238-274) compiled by clang -O2,
  // whose 12 `sp.x += t * (b - a)` updates contract to fma(t, b - a, a) as in
  // the oracle's `_limitBoxes` (fsub + fmadd). Unfused arithmetic differs on
  // segment-0 band-0 UR.x (…605) and band-2 LL.x (…788).
  const pps = [
    { x: 12.345678901234567, y: 3.14159265358979 }, { x: 47.1234567891011, y: 41.4213562373095 },
    { x: 88.80000000000001, y: 77.7777777777777 }, { x: 101.10101010101, y: 123.456789012345 },
    { x: 133.3333333333333, y: 151.0101010101 }, { x: 97.5310864197531, y: 188.8888888888889 },
    { x: 141.42135623730951, y: 222.22222222222223 },
  ];
  const expected: Record<number, [number, number][]> = {
    10: [[12.345678901234567, 60.181183538896597], [62.686029592106181, 96.565715375843268],
      [97.852873926704774, 116.74527589268035], [116.81335992846255, 141.42135623730951]],
    20: [[12.345678901234567, 60.181183538896597], [61.438236923799288, 97.221576619397609],
      [97.852873926704774, 116.77918234453955], [116.81335992846255, 141.42135623730951]],
    40: [[12.345678901234567, 60.810841252832752], [61.438236923799288, 97.221576619397609],
      [97.540322333171758, 116.79612904644311], [116.81335992846255, 141.42135623730951]],
  };
  for (const delta of [10, 20, 40]) {
    it(`matches native extents at delta ${delta}`, () => {
      const boxes: Box[] = Array.from({ length: 4 }, (_, i) => ({
        ll: { x: 2147483647, y: i * 56 }, ur: { x: -2147483648, y: i * 56 + 56 },
      }));
      limitBoxes(boxes, 4, pps, 7, delta);
      expect(boxes.map((b) => [b.ll.x, b.ur.x])).toEqual(expected[delta]);
    });
  }
});
