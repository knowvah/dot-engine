// SPDX-License-Identifier: EPL-2.0
/**
 * Tests for lib/pathplan TypeScript port.
 * Expected values derived from C source. Never change assertions to match output.
 * @see ~/git/graphviz/lib/pathplan/
 */

import { describe, it, expect } from "vitest";
import {
  POLYID_NONE,
  POLYID_UNKNOWN,
  shortestPath,
  routeSpline,
  polyBarriers,
  makePolyline,
  obsOpen,
  obsClose,
  obsPath,
  triangulate,
} from "./index.js";
import type { Point, Poly, Edge } from "./index.js";
import { solve3 } from "./solvers.js";

function pt(x: number, y: number): Point { return { x, y }; }
function ptEq(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;
}

// ─── Constants ───────────────────────────────────────────────────────────────

describe("constants", () => {
  it("POLYID_NONE is -1111", () => expect(POLYID_NONE).toBe(-1111));
  it("POLYID_UNKNOWN is -2222", () => expect(POLYID_UNKNOWN).toBe(-2222));
});

// ─── makePolyline — acceptance criterion (util.c:make_polyline) ──────────────
// N=3: [P0,P0, P1,P1,P1, P2,P2] = 7 points

const ML0 = pt(0, 0);
const ML1 = pt(1, 1);
const ML2 = pt(2, 0);
const ML3 = pt(3, 1);

describe("makePolyline / lengths", () => {
  it("[P0,P1,P2] -> length 7", () => expect(makePolyline([ML0, ML1, ML2]).length).toBe(7));
  it("[P0,P1] -> length 4", () => expect(makePolyline([ML0, ML1]).length).toBe(4));
  it("[P0,P1,P2,P3] -> length 10", () => expect(makePolyline([ML0, ML1, ML2, ML3]).length).toBe(10));
});

describe("makePolyline / acceptance: exact pattern for [P0,P1,P2]", () => {
  const r = makePolyline([ML0, ML1, ML2]);
  it("r[0]==P0", () => expect(ptEq(r[0], ML0)).toBe(true));
  it("r[1]==P0", () => expect(ptEq(r[1], ML0)).toBe(true));
  it("r[2]==P1", () => expect(ptEq(r[2], ML1)).toBe(true));
  it("r[3]==P1", () => expect(ptEq(r[3], ML1)).toBe(true));
  it("r[4]==P1", () => expect(ptEq(r[4], ML1)).toBe(true));
  it("r[5]==P2", () => expect(ptEq(r[5], ML2)).toBe(true));
  it("r[6]==P2", () => expect(ptEq(r[6], ML2)).toBe(true));
});

// ─── polyBarriers (util.c:Ppolybarriers) ─────────────────────────────────────

const PB_SQ: Poly = { ps: [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)] };
const PB_TRI: Poly = { ps: [pt(2, 0), pt(3, 0), pt(2.5, 1)] };

describe("polyBarriers / count", () => {
  it("4-vertex polygon -> 4 barriers", () => expect(polyBarriers([PB_SQ]).length).toBe(4));
  it("two polys 4+3 -> 7 barriers", () => expect(polyBarriers([PB_SQ, PB_TRI]).length).toBe(7));
});

describe("polyBarriers / edge values", () => {
  const bars = polyBarriers([PB_SQ]);
  it("bars[0].a == ps[0]", () => expect(ptEq(bars[0].a, pt(0, 0))).toBe(true));
  it("bars[0].b == ps[1]", () => expect(ptEq(bars[0].b, pt(1, 0))).toBe(true));
  it("bars[3].a == ps[3]", () => expect(ptEq(bars[3].a, pt(0, 1))).toBe(true));
  it("bars[3].b == ps[0] (wrap)", () => expect(ptEq(bars[3].b, pt(0, 0))).toBe(true));
});

// ─── triangulate (triang.c:Ptriangulate) ─────────────────────────────────────

function triCount(poly: Poly): number {
  let n = 0;
  triangulate(poly, () => { n++; });
  return n;
}

describe("triangulate / triangle counts", () => {
  it("CCW triangle -> 1 tri", () =>
    expect(triCount({ ps: [pt(0,0), pt(2,0), pt(1,2)] })).toBe(1));
  it("CCW square -> 2 tris", () =>
    expect(triCount({ ps: [pt(0,0), pt(1,0), pt(1,1), pt(0,1)] })).toBe(2));
  it("CCW pentagon -> 3 tris", () =>
    expect(triCount({ ps: [pt(0,0), pt(2,0), pt(3,1), pt(1,3), pt(-1,1)] })).toBe(3));
  it("returns 0 on valid polygon", () => {
    const poly: Poly = { ps: [pt(0,0), pt(2,0), pt(1,2)] };
    expect(triangulate(poly, () => {})).toBe(0);
  });
});

describe("triangulate / callback receives all vertices", () => {
  const poly: Poly = { ps: [pt(0, 0), pt(2, 0), pt(1, 2)] };
  const tris: Array<[Point, Point, Point]> = [];
  triangulate(poly, (tri) => tris.push(tri));
  const flat = tris.flatMap((t) => t);
  it("contains (0,0)", () => expect(flat.some((p) => ptEq(p, pt(0, 0)))).toBe(true));
  it("contains (2,0)", () => expect(flat.some((p) => ptEq(p, pt(2, 0)))).toBe(true));
  it("contains (1,2)", () => expect(flat.some((p) => ptEq(p, pt(1, 2)))).toBe(true));
});

// triangulate (and shortestPath's triInner) port C's tail-recursive ear-clip.
// The recursion depth equals the vertex count; V8 has no TCO, so a large routing
// polygon — produced e.g. when a weight=0 node floats to the top rank and spawns
// a graph-spanning edge (corpus 2095_1) — overflowed the stack. The iterative
// form must clip an arbitrarily large polygon without recursing. N=8000 is above
// the empirically-observed overflow point of the old recursive form (~6k-8k) and
// must yield exactly N-2 triangles. @see src/pathplan/triang.ts:triangulateInner
describe("triangulate / large polygon is stack-safe (regression: 2095_1)", () => {
  const N = 8000;
  // Regular convex N-gon: every vertex is an ear, so triangulation runs the full
  // depth-N clip sequence and yields N-2 triangles.
  const ps: Point[] = [];
  for (let i = 0; i < N; i++) {
    const a = (2 * Math.PI * i) / N;
    ps.push(pt(Math.cos(a) * 1000, Math.sin(a) * 1000));
  }
  let count = 0;
  let rc = -1;
  // N=8000 through an O(N^2) clip runs ~1s bare but ~10s under the v8 coverage
  // provider's instrumentation, which blows the 5s default and fails only in
  // `npm run coverage`. Timeout raised rather than N lowered: N must stay above
  // the ~6k-8k overflow point for the regression to mean anything. Still
  // bounded, so a real perf regression here fails instead of hanging.
  it("does not overflow the stack and triangulates fully", () => {
    expect(() => { rc = triangulate({ ps }, () => { count++; }); }).not.toThrow();
    expect(rc).toBe(0);
    expect(count).toBe(N - 2);
  }, 30_000);
});

// ─── shortestPath (shortest.c:Pshortestpath) ─────────────────────────────────

const SP_SQ: Poly = { ps: [pt(0,0), pt(10,0), pt(10,10), pt(0,10)] };
const SP_R1 = shortestPath(SP_SQ, [pt(1, 1), pt(9, 9)]);
const SP_R2 = shortestPath(SP_SQ, [pt(1, 1), pt(9, 9)]);

describe("shortestPath / basic", () => {
  it("valid interior -> non-null", () => expect(SP_R1).not.toBeNull());
  it("start outside -> null", () =>
    expect(shortestPath(SP_SQ, [pt(-1, 5), pt(5, 5)])).toBeNull());
  it("end outside -> null", () =>
    expect(shortestPath(SP_SQ, [pt(5, 5), pt(15, 5)])).toBeNull());
  it("at least 2 points", () => expect(SP_R1!.length).toBeGreaterThanOrEqual(2));
});

describe("shortestPath / endpoint fidelity", () => {
  it("first point == ep0", () => expect(ptEq(SP_R1![0], pt(1, 1))).toBe(true));
  it("last point == ep1", () => expect(ptEq(SP_R1![SP_R1!.length - 1], pt(9, 9))).toBe(true));
});

describe("shortestPath / acceptance: owned arrays", () => {
  it("equal values", () => expect(SP_R1).toEqual(SP_R2));
  it("distinct references", () => expect(SP_R1).not.toBe(SP_R2));
});

// ─── routeSpline (route.c:Proutespline) ──────────────────────────────────────

const NO_BAR: Edge[] = [];
const RS_HORIZ = routeSpline(NO_BAR, [pt(0,0), pt(10,0)], [pt(1,0), pt(1,0)]);
const RS_DIAG1 = routeSpline(NO_BAR, [pt(3,7), pt(8,2)], [pt(0,1), pt(0,-1)]);
const RS_SAME1 = routeSpline(NO_BAR, [pt(0,0), pt(5,5), pt(10,0)], [pt(1,0), pt(1,0)]);
const RS_SAME2 = routeSpline(NO_BAR, [pt(0,0), pt(5,5), pt(10,0)], [pt(1,0), pt(1,0)]);

describe("routeSpline / shape", () => {
  it("two-point route -> 4 points", () => expect(RS_HORIZ.length).toBe(4));
  it("length satisfies 1+3k", () => expect((RS_HORIZ.length - 1) % 3).toBe(0));
  it("first point == route[0]", () => expect(ptEq(RS_DIAG1[0], pt(3, 7))).toBe(true));
  it("last point == route[last]", () => expect(ptEq(RS_DIAG1[RS_DIAG1.length-1], pt(8, 2))).toBe(true));
});

describe("routeSpline / horizontal control points", () => {
  it("all y == 0 for horizontal path", () => {
    for (const p of RS_HORIZ) expect(Math.abs(p.y)).toBeLessThan(1e-9);
  });
});

describe("routeSpline / acceptance: owned arrays", () => {
  it("equal values", () => expect(RS_SAME1).toEqual(RS_SAME2));
  it("distinct references", () => expect(RS_SAME1).not.toBe(RS_SAME2));
});

describe("routeSpline / with barrier", () => {
  const BAR: Edge = { a: pt(5, -2), b: pt(5, 2) };
  const r = routeSpline([BAR], [pt(0,0), pt(5,0), pt(10,0)], [pt(1,0), pt(1,0)]);
  it("at least 4 points", () => expect(r.length).toBeGreaterThanOrEqual(4));
  it("length satisfies 1+3k", () => expect((r.length - 1) % 3).toBe(0));
});

// ─── obsOpen / obsClose / obsPath (cvt.c) ────────────────────────────────────
// CW obstacle required by C spec.

const OBS_CW: Poly = { ps: [pt(3,7), pt(3,3), pt(7,3), pt(7,7)] };

function openRoute(p0: Point, p1: Point, id0 = POLYID_NONE, id1 = POLYID_NONE): Point[] {
  const cfg = obsOpen([OBS_CW]);
  const path = obsPath(cfg, p0, id0, p1, id1);
  obsClose(cfg);
  return path;
}

describe("obsOpen / acceptance", () => {
  it("obsOpen on single convex polygon succeeds", () => {
    const cfg = obsOpen([OBS_CW]);
    expect(cfg).toBeDefined();
    obsClose(cfg);
  });
});

describe("obsPath / routed path", () => {
  const path = openRoute(pt(0, 5), pt(10, 5));
  it("acceptance: at least 2 points", () => expect(path.length).toBeGreaterThanOrEqual(2));
  it("acceptance: start == p0", () => expect(ptEq(path[0], pt(0, 5))).toBe(true));
  it("acceptance: end == p1", () => expect(ptEq(path[path.length-1], pt(10, 5))).toBe(true));
});

describe("obsPath / direct visible path", () => {
  const path = openRoute(pt(1, 9), pt(9, 9));
  it("at least 2 points", () => expect(path.length).toBeGreaterThanOrEqual(2));
  it("start == p0", () => expect(ptEq(path[0], pt(1, 9))).toBe(true));
  it("end == p1", () => expect(ptEq(path[path.length-1], pt(9, 9))).toBe(true));
});

describe("obsPath / POLYID_UNKNOWN", () => {
  it("does not throw", () => {
    expect(() => openRoute(pt(0, 5), pt(10, 5), POLYID_UNKNOWN, POLYID_UNKNOWN)).not.toThrow();
  });
  it("returns at least 2 points", () => {
    const path = openRoute(pt(0, 5), pt(10, 5), POLYID_UNKNOWN, POLYID_UNKNOWN);
    expect(path.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── solve3 (solvers.c) — clang fma contraction ─────────────────────────────
// The native oracle's libpathplan is built by clang with the default
// -ffp-contract=on, which fuses five expressions in solvers.c (lines 41, 43,
// 46, 80, 85). Expected values are what the ORACLE dylib's exported solve3
// returns on the same inputs; toEqual compares doubles exactly. Contraction
// map: .agent-notes/pathplan-fma-contraction-map.md.

function solve3Of(coeff: number[]): number[] {
  const roots = [0, 0, 0];
  const n = solve3(coeff.slice(), roots);
  return n === 4 ? [4] : [n, ...roots.slice(0, n)];
}

describe("solve3 / clang fma contraction", () => {
  it("2646 edge2575: the fused discriminant (solvers.c:43) keeps one root", () => {
    // Captured from the oracle on tests/2646.dot (final routesplines leg of
    // edge2575): points2coeff's cubic for the barrier the spline is tangent
    // to. Strict IEEE gives disc < 0 and three roots, a spurious one at
    // t = 0.99999998708 inside [0, 1].
    const got = solve3Of([85.90000000000009, -687.5964425284483,
      1117.4928850568963, -515.7964425284481]);
    expect(got).toEqual([1, 0.1665385662198754]);
  });

  // Each case below differs from the oracle if ONLY the named site is
  // evaluated strictly (the other fused sites kept).
  it("fuses 2*b_over_3a*p into q (solvers.c:41)", () => {
    const got = solve3Of([9.690728187561035, -9.8750638961792,
      5.217271372675896, -2.949957847595215]);
    expect(got).toEqual([1, 1.2250131745648647]);
  });

  it("fuses q*q into disc (solvers.c:43)", () => {
    const got = solve3Of([-777.3227691650391, -59.22502279281616,
      462.66627311706543, -267.9731845855713]);
    expect(got).toEqual([1, -0.9929523684946855]);
  });

  it("fuses -disc + q*q in the three-real-roots branch (solvers.c:46)", () => {
    const got = solve3Of([87.5338077545166, -89.99056816101074,
      -71.88581824302673, 69.52203512191772]);
    expect(got).toEqual([3, 1.2745001521884785, -1.1214296782932105, 0.8809300141077625]);
  });

  it("solve2 fall-through fuses b2a*b2a - c/a (solvers.c:80)", () => {
    const got = solve3Of([93.9143419265747, 40.119004249572754,
      3.6244630813598633, 3.261071443557739e-8]);
    expect(got).toEqual([2, -3.362108925262225, -7.706842074928538]);
  });

  it("solve2 fall-through fuses -2*b2a - roots[0] (solvers.c:85)", () => {
    const got = solve3Of([76.5833854675293, -622.8585243225098,
      931.9186806678772, -3.9134967327117916e-8]);
    expect(got).toEqual([2, 0.5059322147444226, 0.1624292391499519]);
  });
});
