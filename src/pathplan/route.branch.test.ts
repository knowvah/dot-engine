// SPDX-License-Identifier: EPL-2.0

/**
 * T4f — branch-coverage tests for pathplan/route.ts (RouteHelper, internal
 * spline/barrier-intersection root-finding).
 *
 * pathplan.test.ts exercises routeSpline with ordinary (non-axis-aligned,
 * non-degenerate) barriers, which always lands in silXzeroYnonzero or
 * silGeneral with a genuinely-solvable cubic. This file targets
 * silBothZero's degenerate-cubic branches: only reachable when a barrier
 * edge is a single point (zero-length: a === b), which drives
 * splineIntersectsLine's `lc.xc1 === 0 && lc.yc1 === 0` case, AND the
 * resulting per-axis cubic coefficients are ALL zero (solve3 returns 4,
 * meaning "every t satisfies").
 *
 * Residue (not pursued — see mission report): silBothZero's `yn === 4`
 * branch requires BOTH axes degenerate simultaneously, which for a real
 * spline means a zero-length route (start === end), a configuration that
 * hits division-by-zero elsewhere (initTnas's total-distance normalization,
 * normv) before reaching this code path. silGeneral's exact-root-coincidence
 * branch (xr[i] === yr[j]) needs two independently-solved cubics (via
 * distinct trig/algebraic solvers) to agree bit-for-bit — impractical to
 * construct deterministically. reallyRoute's recursive-failure branches
 * (route.ts ~231, 247-248) require a spline-fit failure deep enough to
 * force a second level of recursive splitting, which no available fixture
 * reliably reproduces without also changing the fit tolerance.
 *
 * @see lib/pathplan/route.c
 */

import { describe, it, expect } from 'vitest';
import { routeSpline, polyBarriers } from './index.js';
import type { Point, Edge } from './index.js';

function pt(x: number, y: number): Point { return { x, y }; }

/** Proutespline's "no slope constraint" end vectors, as dot passes them. */
const FREE_SLOPES: [Point, Point] = [pt(0, 0), pt(0, 0)];

// ---------------------------------------------------------------------------
// reallyroutespline max-deviation split on a one-ulp tie (route.c:130-143).
// Inputs were captured from the routeSpline call the port makes while
// rendering the plantuml-ts repros; the full renders match the native oracle
// (test/golden/pt-issue-{23,32}.test.ts). On both, the two interior route
// points deviate from the fitted bezier by values one ulp apart, the SECOND
// being larger once `dist` is libm hypot and the bezier eval at route.c:137-138
// is fused the way clang contracts it. C's strict `d > maxd` (route.c:139)
// therefore splits at the second point; the former tolerant tie-break kept
// the first and produced the mirrored spline.
// ---------------------------------------------------------------------------

describe('routeSpline — max-deviation split decided by C arithmetic', () => {
  it('pt-issue-32 corridor: 18.024045578329428 > ...424 splits at route[2]', () => {
    // Deviations seen in findMaxDev: i=1 18.024045578329424, i=2 18.024045578329428.
    const corridor = [pt(0, 9), pt(0, -15), pt(68, -15), pt(68, 9),
      pt(37, 9), pt(37, -9), pt(31, -9), pt(31, 9)];
    const route = [pt(0, 9), pt(31, -9), pt(37, -9), pt(68, 9)];
    const out = routeSpline(polyBarriers([{ ps: corridor }]), route, FREE_SLOPES);
    expect(out).toEqual([
      pt(0, 9), pt(0, 9), pt(19.341825418752496, -13.754852631218373),
      pt(37, -9),
      pt(52.38398653207799, -4.8575226162753635), pt(68, 9), pt(68, 9),
    ]);
  });

  it('pt-issue-23 width 20 corridor: 58.77218121509931 > ...0993 splits at route[2]', () => {
    // Deviations seen in findMaxDev: i=1 58.7721812150993, i=2 58.77218121509931.
    // Math.hypot + strict `>` alone still keeps route[1] here: the fused
    // bezier eval (route.c:137-138) is what flips the comparison.
    const lo = 24.000012000000005, mid = 48.00002400000001;
    const hi = 82.75002200000002, top = 93.00002400000001;
    const xr = 145.681244, xl = -81.68124399999999;
    const corridor = [pt(-7, lo), pt(-7, mid), pt(22, mid), pt(22, hi), pt(42, hi),
      pt(42, mid), pt(71, mid), pt(71, lo), pt(xr, lo), pt(xr, mid), pt(xr, mid),
      pt(xr, hi), pt(xr, hi), pt(xr, top), pt(xl, top), pt(xl, hi), pt(xl, hi),
      pt(xl, mid), pt(xl, mid), pt(xl, lo)];
    const route = [pt(-45, lo), pt(22, hi), pt(42, hi), pt(109, lo)];
    const out = routeSpline(polyBarriers([{ ps: corridor }]), route, FREE_SLOPES);
    expect(out).toEqual([
      pt(-45, lo), pt(-45, lo), pt(-1.6673357116069099, 99.18368435860124),
      pt(42, hi),
      pt(79.06640419424835, 68.8005386745539), pt(109, lo), pt(109, lo),
    ]);
  });
});

// ---------------------------------------------------------------------------
// tests/2646.dot (accepted divergence A8): the final routesplines leg of three
// smode edges ends ON the corridor's bottom wall with its tangent parallel to
// it, so every splinefits candidate is tangent to that barrier at t=1 and the
// intersection cubic has a near-double root. points2coeff builds the cubic by
// catastrophic cancellation, and the root count then depends on clang's fma
// contraction in points2coeff (route.c:397-398), splineintersectsline
// (route.c:360-384) and solve3 (solvers.c:41-46). Inputs and expected outputs
// were captured from the native oracle's Proutespline (instrumented copy of
// libpathplan loaded into the unmodified dot; its SVG is byte-identical to
// the oracle's) and are asserted exactly.
// ---------------------------------------------------------------------------

/** The 20-vertex rank-box corridor the three 2646 legs route through. */
function corridor2646(xs: readonly number[], ys: readonly number[]): Edge[] {
  const [xA, xB, xC, xD, xE, xF] = xs;
  const [yT, y1, y2, y3, y4, yB] = ys;
  const R = 373148, L = -585149;
  const ring = [pt(xA, yT), pt(xA, y1), pt(R, y1), pt(R, y2), pt(xB, y2),
    pt(xB, y3), pt(R, y3), pt(R, y4), pt(xC, y4), pt(xC, yB), pt(xD, yB),
    pt(xD, y4), pt(L, y4), pt(L, y3), pt(xE, y3), pt(xE, y2), pt(L, y2),
    pt(L, y1), pt(xF, y1), pt(xF, yT)];
  return polyBarriers([{ ps: ring }]);
}

/** Proutespline's endpoint slopes for these legs (down, then right). */
const SLOPES_2646: [Point, Point] = [
  pt(6.123233995736766e-17, -1), pt(1, -1.2246467991473532e-16)];
const YS_RANK2 = [1926.5000000000002, 1926.0000000000002, 1890.0000000000002,
  1889.0000000000002, 1853.0000000000002, 1840.1000000000001];

describe('routeSpline — 2646 tangent legs follow clang fma contraction', () => {
  it('edge2575: one root, no extra a-halving', () => {
    const bars = corridor2646(
      [-468573, -468573, -468729, -472781, -472815, -472815], YS_RANK2);
    const out = routeSpline(bars,
      [pt(-470791, 1926.0000000000002), pt(-468730, 1840.1000000000001)], SLOPES_2646);
    expect(out).toEqual([
      pt(-470791, 1926.0000000000002), pt(-470791, 1868.7002964559629),
      pt(-468787.29970354406, 1840.1000000000001), pt(-468730, 1840.1000000000001)]);
  });

  it('edge3905: one root, no extra a-halving', () => {
    const bars = corridor2646(
      [-404613, -404599, -405158, -405493, -405579, -405573],
      [1037.7, 1037.2, 1001.2, 1000.2, 964.2, 951.3]);
    const out = routeSpline(bars, [pt(-405402, 1037.2), pt(-405159, 951.3)], SLOPES_2646);
    expect(out).toEqual([
      pt(-405402, 1037.2), pt(-405402, 1008.5626743610183),
      pt(-405187.63732563896, 951.3), pt(-405159, 951.3)]);
  });

  it('edge15467: one root, no extra a-halving', () => {
    const bars = corridor2646(
      [115709, 115587, 110481, 106189, 104543, 104236], YS_RANK2);
    const out = routeSpline(bars,
      [pt(107390, 1926.0000000000002), pt(110480, 1840.1000000000001)], SLOPES_2646);
    expect(out).toEqual([
      pt(107390, 1926.0000000000002), pt(107390, 1883.066753449845),
      pt(110437.06675344985, 1840.1000000000001), pt(110480, 1840.1000000000001)]);
  });
});

describe('routeSpline — degenerate zero-length barrier (silBothZero)', () => {
  it('a point-barrier exactly on a vertical route drives the all-zero x-cubic (xn=4) path', () => {
    // route is a pure vertical line (constant x=0); slopes vertical too,
    // so mkspline's control points are also all x=0. A barrier that is a
    // single POINT (a === b) at x=0 makes both lc.xc1 and lc.yc1 zero,
    // routing splineIntersectsLine into silBothZero. The x-cubic
    // (all control points x=0, barrier x=0) is identically zero -> solve3
    // returns 4 (xn===4); the y-cubic is a real (non-degenerate) cubic
    // since y varies along the route, so yn !== 4 — covering silBothZero's
    // `if (xn === 4) { if (yn === 4) ... } else ... }` true-then-false path.
    const route = [pt(0, 0), pt(0, 10)];
    const slopes: [Point, Point] = [pt(0, 1), pt(0, 1)];
    const barrier: Edge = { a: pt(0, 5), b: pt(0, 5) }; // degenerate point
    const result = routeSpline([barrier], route, slopes);
    expect(result.length).toBeGreaterThan(0);
    // Every emitted point must stay on the vertical line (faithful to the
    // constant-x spline this degenerate scenario produces).
    for (const p of result) expect(p.x).toBeCloseTo(0, 6);
  });

  it('a point-barrier exactly on a horizontal route drives the all-zero y-cubic path', () => {
    // Mirror case: horizontal route/slopes make the y-cubic identically
    // zero (yn===4) while the x-cubic is real (xn!==4) — the sibling
    // branch of silBothZero's if/else-if chain.
    const route = [pt(0, 0), pt(10, 0)];
    const slopes: [Point, Point] = [pt(1, 0), pt(1, 0)];
    const barrier: Edge = { a: pt(5, 0), b: pt(5, 0) };
    const result = routeSpline([barrier], route, slopes);
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) expect(p.y).toBeCloseTo(0, 6);
  });
});
