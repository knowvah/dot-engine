// SPDX-License-Identifier: EPL-2.0
//
// T3b (coverage-90, batch-3): branch coverage for layout/neato/overlap-prism.ts.
// Only callTri and removeOverlapPrism are exported; every other helper
// (get_overlap_graph's scan-line clash detection, ideal_distance_avoid_overlap,
// overlap_scaling's bisection, OverlapSmoother_new/smooth) is reached only
// through removeOverlapPrism's pipeline. Scenarios below vary node count,
// initial spacing, and label sizes to walk that pipeline through its
// no-overlap / partial-overlap / full-overlap branches; expected values are
// captured from the (deterministic, csrand-seeded) reference execution of
// the port itself, matching the golden-fixture convention used for
// pipeline-only branches elsewhere in this batch.
// @see lib/neatogen/overlap.c

import { describe, it, expect } from 'vitest';
import { csrand } from '../../common/crand.js';
import { callTri, removeOverlapPrism } from './overlap-prism.js';

// ---------------------------------------------------------------------------
// callTri — n=0/1/2/3+ branches (L52 cond-expr, L58 n===2 special case)
// ---------------------------------------------------------------------------

describe('callTri', () => {
  it('n=0: empty matrix (no edgelist, no n===2 case, no diagonal)', () => {
    const A = callTri(0, []);
    expect(A.m).toBe(0);
    expect(A.nz).toBe(0);
  });

  it('n=1: only the diagonal self-entry (edgelist and n===2 both skipped)', () => {
    const A = callTri(1, [5, 5]);
    expect(A.m).toBe(1);
    expect(A.nz).toBe(1);
  });

  it('n=2: the n===2 special-cased edge plus two diagonal entries, symmetrized', () => {
    const A = callTri(2, [0, 0, 4, 0]);
    expect(A.m).toBe(2);
    expect(A.nz).toBe(4); // (0,0) (1,1) (0,1) (1,0)
  });

  it('n=3: delaunayTri triangulation edges (all 3 pairs) plus diagonal, symmetrized', () => {
    const A = callTri(3, [0, 0, 4, 0, 2, 3]);
    expect(A.m).toBe(3);
    expect(A.nz).toBe(9); // 3 diagonal + 3 edges * 2 (symmetrized)
  });
});

// ---------------------------------------------------------------------------
// removeOverlapPrism — top-level guards
// ---------------------------------------------------------------------------

describe('removeOverlapPrism: top-level guards', () => {
  it('labelSizes === null: returns immediately, x untouched', () => {
    const x0 = [0, 0, 4, 0];
    const A = callTri(2, x0);
    const x = x0.slice();
    removeOverlapPrism(2, A, x, null, 3, -4, true);
    expect(x).toEqual([0, 0, 4, 0]);
  });

  it('initialScaling > 0: scales by the positive value directly', () => {
    const x0 = [0, 0, 4, 0];
    const A = callTri(2, x0);
    const x = x0.slice();
    removeOverlapPrism(2, A, x, [0.5, 0.5, 0.5, 0.5], 0, 10, true);
    expect(x[0]).toBeCloseTo(0, 10);
    expect(x[1]).toBeCloseTo(0, 10);
    expect(x[2]).toBeCloseTo(11.7157287525381, 8);
    expect(x[3]).toBeCloseTo(0, 10);
  });

  it('initialScaling < 0: scales by -initialScaling * avgLabelSize / avgEdgeLen', () => {
    const x0 = [0, 0, 4, 0];
    const A = callTri(2, x0);
    const x = x0.slice();
    removeOverlapPrism(2, A, x, [0.5, 0.5, 0.5, 0.5], 0, -4, true);
    expect(x[2]).toBeCloseTo(4.68629150101524, 8);
  });

  it('initialScaling === 0: neither scaling branch runs, x unchanged by scaling', () => {
    const x0 = [0, 0, 4, 0];
    const A = callTri(2, x0);
    const x = x0.slice();
    removeOverlapPrism(2, A, x, [0.5, 0.5, 0.5, 0.5], 0, 0, true);
    expect(x).toEqual([0, 0, 4, 0]);
  });

  it('ntry === 0: returns after any initial scaling, before the majorization loop', () => {
    const x0 = [0, 0, 4, 0];
    const A = callTri(2, x0);
    const x = x0.slice();
    removeOverlapPrism(2, A, x, [0.5, 0.5, 0.5, 0.5], 0, -4, true);
    // Scaled once (see previous test) then returned — a second call with
    // ntry>0 on the same input would additionally run majorization, so this
    // asserts the early return by re-deriving the ntry=0-only expectation.
    expect(x[2]).toBeCloseTo(4.68629150101524, 8);
  });
});

// ---------------------------------------------------------------------------
// removeOverlapPrism: no-overlap pipeline (neighborhoodOnly toggle, break,
// doShrinking true/false, overlap_scaling's "no overlap at all" branch)
// ---------------------------------------------------------------------------

describe('removeOverlapPrism: no-overlap layouts', () => {
  it('doShrinking=true, ntry=3: nodes stay well-separated, shrink path exercised', () => {
    csrand(1);
    const x0 = [0, 0, 20, 0, 10, 17, 30, 17];
    const A = callTri(4, x0);
    const x = x0.slice();
    const sizes = [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2];
    removeOverlapPrism(2, A, x, sizes, 3, -4, true);
    expect(x[0]).toBeCloseTo(0, 6);
    expect(x[1]).toBeCloseTo(0, 6);
    expect(x[2]).toBeCloseTo(1.91585336, 6);
    expect(x[3]).toBeCloseTo(0, 6);
    expect(x[4]).toBeCloseTo(0.95792668, 6);
    expect(x[5]).toBeCloseTo(1.62847536, 6);
    expect(x[6]).toBeCloseTo(2.87378004, 6);
    expect(x[7]).toBeCloseTo(1.62847536, 6);
  });

  it('doShrinking=false, ntry=3: shrink stays false, "no overlap" scaling branch skipped', () => {
    csrand(1);
    const x0 = [0, 0, 20, 0, 10, 17, 30, 17];
    const A = callTri(4, x0);
    const x = x0.slice();
    const sizes = [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2];
    removeOverlapPrism(2, A, x, sizes, 3, -4, false);
    expect(x[2]).toBeCloseTo(1.91585336, 6);
    expect(x[4]).toBeCloseTo(0.95792668, 6);
  });
});

// ---------------------------------------------------------------------------
// removeOverlapPrism: real overlaps — coincident / axis-aligned clashes
// (ideal_distance_avoid_overlap's coincident + dx-only/dy-only branches,
// stressMajorizationSmooth's dist===0 perturbation, expansion weights)
// ---------------------------------------------------------------------------

describe('removeOverlapPrism: overlapping layouts', () => {
  it('two exactly coincident nodes separate under a third anchor node', () => {
    csrand(1);
    const x0 = [0, 0, 0, 0, 10, 10];
    const A = callTri(3, x0);
    const x = x0.slice();
    const sizes = [1, 1, 1, 1, 1, 1];
    removeOverlapPrism(2, A, x, sizes, 3, -4, true);
    expect(x[0]).toBeCloseTo(-0.00081923, 6);
    expect(x[1]).toBeCloseTo(-1.00013786, 6);
    expect(x[2]).toBeCloseTo(0.00081916, 6);
    expect(x[3]).toBeCloseTo(1.00006214, 6);
    // The coincident pair separated: no longer at the same position.
    expect(x[0]).not.toBeCloseTo(x[2], 4);
  });

  it('same-x overlap (dx below MACHINEACC*wx) resolves along y', () => {
    csrand(1);
    const x0 = [0, 0, 0, 0.5, 8, 8];
    const A = callTri(3, x0);
    const x = x0.slice();
    const sizes = [1, 1, 1, 1, 1, 1];
    removeOverlapPrism(2, A, x, sizes, 3, -4, true);
    expect(x[1]).toBeCloseTo(-0.60789781, 6);
    expect(x[3]).toBeCloseTo(1.39208672, 6);
  });

  it('same-y overlap (dy below MACHINEACC*wy) resolves along x', () => {
    csrand(1);
    const x0 = [0, 0, 0.5, 0, 8, 8];
    const A = callTri(3, x0);
    const x = x0.slice();
    const sizes = [1, 1, 1, 1, 1, 1];
    removeOverlapPrism(2, A, x, sizes, 3, -4, true);
    expect(x[0]).toBeCloseTo(-0.60789781, 6);
    expect(x[2]).toBeCloseTo(1.39208672, 6);
  });

  it('scan-line insertion tie: a lower-index node processed after a ' +
     'higher-index one at the same y hits the node > comparator branch', () => {
    // idx1 (x=0) is swept before idx0 (x=100): idx1's y-scanpoints enter the
    // rbtree first, so inserting idx0's tied y-scanpoint compares an
    // EXISTING higher node id against the new (lower) one — the
    // pp.node > qq.node arm of compScanPoints (getOverlapGraph's tie-break).
    csrand(1);
    const x0 = [100, 0, 0, 0];
    const A = callTri(2, x0);
    const x = x0.slice();
    const sizes = [1, 1, 1, 1];
    removeOverlapPrism(2, A, x, sizes, 3, -4, true);
    expect(x[0]).toBeCloseTo(9.372583002030483, 9);
    expect(x[1]).toBeCloseTo(0, 10);
    expect(x[2]).toBeCloseTo(0, 10);
    expect(x[3]).toBeCloseTo(0, 10);
  });

  it('a single isolated node never overlaps: overlap_scaling\'s ' +
     'scaleSta<=0 branch and the bisection "no overlap" arm both fire', () => {
    // With A.m===1 there is no neighbour to clash with, so getOverlapGraph
    // always reports nz===0: idealDistanceAvoidOverlap's tmax stays 0
    // (< 1), and once shrink flips on (2nd outer iteration) overlap_scaling
    // runs with scaleSta = min(1, 0*1.0001) = 0 (the scaleSta<=0 branch),
    // and every bisection probe finds no overlap (the else arm of the
    // "if (overlap)" bisection check).
    csrand(1);
    const x0 = [5, 5];
    const A = callTri(1, x0);
    const x = x0.slice();
    const sizes = [1, 1];
    removeOverlapPrism(2, A, x, sizes, 2, -4, true);
    expect(x[0]).toBeCloseTo(24414062500000, -6);
    expect(x[1]).toBeCloseTo(24414062500000, -6);
  });

  it('a touching row of 5 nodes (scan-line boundary ties) spreads out', () => {
    csrand(1);
    const x0 = [0, 0, 2, 0, 4, 0, 6, 0, 8, 0];
    const A = callTri(5, x0);
    const x = x0.slice();
    const sizes = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    removeOverlapPrism(2, A, x, sizes, 4, -4, true);
    expect(x[0]).toBeCloseTo(0, 6);
    expect(x[2]).toBeCloseTo(3.61761478, 6);
    expect(x[4]).toBeCloseTo(7.23522955, 6);
    expect(x[6]).toBeCloseTo(10.85284433, 6);
    expect(x[8]).toBeCloseTo(14.4704591, 6);
    // Strictly increasing x order preserved and separated.
    expect(x[2]!).toBeGreaterThan(x[0]!);
    expect(x[4]!).toBeGreaterThan(x[2]!);
  });
});
