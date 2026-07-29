// SPDX-License-Identifier: EPL-2.0

/**
 * Branch coverage for the CDT surface (constrained Delaunay triangulation)
 * ported from GTS's cdt.c. `mkSurface` is the only exported entry point;
 * every scenario below is a geometric configuration chosen to walk a
 * specific internal branch (point location, incircle swap, constraint
 * insertion / crossing, duplicate-vertex handling, hole removal).
 *
 * @see lib/neatogen/delaunay.c:tri / mkSurface
 * @see gts-0.7.6/src/cdt.c
 */

import { describe, test, expect } from 'vitest';
import { mkSurface } from './cdt-surface.js';

describe('mkSurface — degenerate point counts', () => {
  test('a single point triangulates to nothing (all faces touch the enclosing triangle)', () => {
    const sf = mkSurface([0], [0], 1, [], 0);
    expect(sf).toBeNull();
  });

  test('two points triangulate to nothing', () => {
    const sf = mkSurface([0, 10], [0, 0], 2, [], 0);
    expect(sf).toBeNull();
  });
});

describe('mkSurface — basic triangulation, no constraints', () => {
  test('three non-collinear points form exactly one face', () => {
    const sf = mkSurface([0, 10, 5], [0, 0, 10], 3, [], 0);
    expect(sf).not.toBeNull();
    expect(sf!.nfaces).toBe(1);
    expect(sf!.faces).toEqual([2, 0, 1]);
    expect(sf!.neigh).toEqual([-1, -1, -1]);
  });

  test('a convex quad triangulates to two faces sharing a diagonal', () => {
    const sf = mkSurface([0, 10, 10, 0], [0, 0, 10, 10], 4, [], 0);
    expect(sf).not.toBeNull();
    expect(sf!.nfaces).toBe(2);
    // the two faces must be mutual neighbors across the chosen diagonal
    expect(sf!.neigh[0]).toBe(1);
    expect(sf!.neigh[3]).toBe(0);
  });

  test('a near-cocircular quad still resolves to two faces (incircle swap path)', () => {
    // A slightly non-square quad forces swapIfInCircle's incircle test to
    // decide the diagonal — exercises the `inCircle(...) > 0` true branch.
    const sf = mkSurface([0, 10, 11, -1], [0, 0, 10, 10], 4, [], 0);
    expect(sf).not.toBeNull();
    expect(sf!.nfaces).toBe(2);
  });

  test('a 3x3 grid produces the expected face count and swap-stable surface', () => {
    const gx = [0, 10, 20, 0, 10, 20, 0, 10, 20];
    const gy = [0, 0, 0, 10, 10, 10, 20, 20, 20];
    const sf = mkSurface(gx, gy, 9, [], 0);
    expect(sf).not.toBeNull();
    // 9 points, convex hull is the 8 boundary points (4 corners are hull
    // vertices) -> a triangulation of a convex polygon with 1 interior point:
    // Euler's formula for a triangulated point set: 2n - 2 - h faces
    // (h = hull vertex count = 8, n = 9) = 2*9-2-8 = 8.
    expect(sf!.nfaces).toBe(8);
  });
});

describe('mkSurface — point-location walk (closestFace / pointLocateWalk)', () => {
  test('inserting into a larger fan exercises the multi-face point-location walk', () => {
    // A ring of points around a center forces closestFace's sampled-scan and
    // the pointLocateWalk's neighbor-hopping loop for later insertions.
    const n = 12;
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i++) {
      const theta = (2 * Math.PI * i) / n;
      x.push(50 * Math.cos(theta));
      y.push(50 * Math.sin(theta));
    }
    const sf = mkSurface(x, y, n, [], 0);
    expect(sf).not.toBeNull();
    // convex polygon of n hull points, 0 interior -> n - 2 faces
    expect(sf!.nfaces).toBe(n - 2);
  });

  test('a point landing exactly on a triangle edge exercises the onSummit walk restart', () => {
    // Three points define a base triangle: (0,0),(20,0),(10,20). A fourth
    // point at (10,0) lies exactly on the edge between the first two,
    // forcing triangleNextEdge's orient===0 / onSummit path.
    const sf = mkSurface([0, 20, 10, 10], [0, 0, 20, 0], 4, [], 0);
    expect(sf).not.toBeNull();
    expect(sf!.nfaces).toBe(2);
  });
});

describe('mkSurface — duplicate vertices', () => {
  test('a duplicate point (no constraint reference) collapses without error', () => {
    const sf = mkSurface([0, 10, 5, 0], [0, 0, 10, 0], 4, [], 0);
    expect(sf).not.toBeNull();
    // point 3 duplicates point 0 exactly -> triangulation is unchanged
    expect(sf!.nfaces).toBe(1);
    expect(sf!.faces).toEqual([2, 0, 1]);
  });

  test('a duplicate point referenced by a constraint is rewired to the original', () => {
    // point 3 duplicates point 0; the constraint (3,1) must be rewired to
    // (0,1) — an existing triangle edge — so it collapses harmlessly.
    const sf = mkSurface([0, 10, 5, 0], [0, 0, 10, 0], 4, [3, 1], 1);
    expect(sf).not.toBeNull();
    expect(sf!.nfaces).toBe(1);
  });

  test('two duplicate points whose rewired constraint becomes degenerate (v1===v2) is skipped', () => {
    // points 3 and 4 both duplicate point 0; the constraint (3,4) rewires to
    // (0,0) and must be dropped rather than inserted.
    const sf = mkSurface([0, 10, 5, 0, 0], [0, 0, 10, 0, 0], 5, [3, 4], 1);
    expect(sf).not.toBeNull();
    expect(sf!.nfaces).toBe(1);
  });

  test('a duplicate mid-triangulation forces rewireVertex to rekey an existing constraint edge', () => {
    // point 4 duplicates point 1; constraints (4,2) and (0,1) both touch the
    // duplicate/original vertex pair, exercising rewireVertex's branch where
    // some constraints reference `from` and others do not.
    const sf = mkSurface(
      [0, 10, 5, -5, 10],
      [0, 0, 10, 5, 0],
      5,
      [4, 2, 0, 1],
      2,
    );
    expect(sf).not.toBeNull();
    expect(sf!.nfaces).toBeGreaterThan(0);
  });
});

describe('mkSurface — constraint insertion: already-realized edge', () => {
  test('a constraint pre-registered as the natural diagonal needs no polygon fill', () => {
    // (0,2) is created as a constraint edge BEFORE point insertion (tri()
    // creates constraints up front), so swapIfInCircle's `e1.constraint`
    // guard keeps it as the diagonal chosen during insertion. addConstraint
    // then finds it already realized: removeIntersectedVertex's `o3 >= 0`
    // fast path returns immediately (ref.inSurface stays true), skipping
    // triangulatePolygon entirely. Because the constraint direction (0->2)
    // only matches ONE adjacent face's stored ring direction, dropHoles'
    // directional check (v1 !== f.v[i]) removes the other face as a "hole" —
    // a real interaction of an unpaired interior constraint with the hole
    // heuristic, distinct from the bbox/obstacle-boundary case below.
    const sf = mkSurface([0, 10, 10, 0], [0, 0, 10, 10], 4, [0, 2], 1);
    expect(sf).not.toBeNull();
    expect(sf!.nfaces).toBe(1);
    expect(sf!.faces).toEqual([0, 2, 3]);
  });
});

describe('mkSurface — constraint insertion: crossing multiple triangles', () => {
  test('a long diagonal constraint across a grid triangulates via the polygon-fill walk', () => {
    // Perturbed 3x3 grid (row y-values slightly offset) so the (0,8)
    // diagonal is NOT collinear with any interior grid point — the
    // constraint must cross several triangles, exercising
    // removeIntersectedEdge's o1>0 / o2>=0 / else branches and
    // triangulatePolygon's ear-search loop on both cavities.
    const gx = [0, 10, 20, 0, 10, 20, 0, 10, 20];
    const gy = [0, 0, 0, 9, 10, 11, 20, 20, 20];
    const sf = mkSurface(gx, gy, 9, [0, 8], 1);
    expect(sf).not.toBeNull();
    expect(sf!.nfaces).toBeGreaterThan(0);
    // the constraint edge (0,8) must appear as a side of some face in the
    // final surface (both windings)
    const hasEdge01 = (a: number, b: number): boolean => {
      for (let i = 0; i < sf!.nfaces; i++) {
        const v = [sf!.faces[3 * i]!, sf!.faces[3 * i + 1]!, sf!.faces[3 * i + 2]!];
        for (let k = 0; k < 3; k++) {
          const p = v[k]!;
          const q = v[(k + 1) % 3]!;
          if ((p === a && q === b) || (p === b && q === a)) return true;
        }
      }
      return false;
    };
    expect(hasEdge01(0, 8)).toBe(true);
  });

  test('two crossing constraint edges are rejected as an invalid triangulation', () => {
    expect(() => mkSurface([0, 10, 10, 0], [0, 0, 10, 10], 4, [0, 2, 1, 3], 2))
      .toThrow('cdt: constraint edges cross');
  });
});

describe('mkSurface — hole removal (dropHoles)', () => {
  test('a CW interior boundary opposite the bbox winding is dropped as a hole', () => {
    // bbox 0..3 stored CCW by construction; interior triangle 4,5,6 wound
    // CW is an obstacle "hole" per delaunay_remove_holes and its two
    // interior faces must not survive.
    const sf = mkSurface(
      [0, 20, 20, 0, 8, 12, 10],
      [0, 0, 20, 20, 8, 8, 14],
      7,
      [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 4],
      7,
    );
    expect(sf).not.toBeNull();
    // 7 faces triangulate the square-minus-triangle region before hole
    // removal; the CW interior triangle's 2 interior faces are dropped.
    expect(sf!.nfaces).toBe(5);
    // the hole boundary vertices (4,5,6) remain as shared ring vertices of
    // the surrounding annulus faces, only the triangle's own interior is gone
    expect(sf!.faces).toContain(4);
    expect(sf!.faces).toContain(5);
    expect(sf!.faces).toContain(6);
  });

  test('an interior boundary matching the bbox winding is NOT dropped', () => {
    const sf = mkSurface(
      [0, 20, 20, 0, 8, 10, 12],
      [0, 0, 20, 20, 8, 14, 8],
      7,
      [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 4],
      7,
    );
    expect(sf).not.toBeNull();
    expect(sf!.nfaces).toBe(7);
  });
});

describe('mkSurface — triangulatePolygon ear rejection (concave cavity)', () => {
  test('a concave hexagon boundary constraint forces ear-search past a rejected candidate', () => {
    // A concave ("arrow") hexagon: the ear-clipping ray from the first edge
    // must skip at least one candidate vertex whose orientation or
    // in-circle test fails before finding a valid ear.
    const sf = mkSurface(
      [0, 10, 20, 15, 10, 5],
      [0, 0, 0, 10, 5, 10],
      6,
      [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 0],
      6,
    );
    expect(sf).not.toBeNull();
    // a simple hexagon triangulates to exactly 4 faces
    expect(sf!.nfaces).toBe(4);
  });
});
