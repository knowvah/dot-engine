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
