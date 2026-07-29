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
import { routeSpline } from './index.js';
import type { Point, Edge } from './index.js';

function pt(x: number, y: number): Point { return { x, y }; }

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
