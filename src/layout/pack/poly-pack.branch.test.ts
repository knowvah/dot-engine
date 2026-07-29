// SPDX-License-Identifier: EPL-2.0

/**
 * T4f — branch-coverage tests for layout/pack/poly-pack.ts (polyRects, the
 * rectangle-only polyomino packer — a separate implementation from
 * poly-place.ts's graph-based polyGraphs).
 *
 * poly-pack.test.ts covers the common path; this file targets the
 * degenerate-input branches (undefined bboxes, a negative discriminant,
 * a colliding centered placement forcing the spiral-search fallback, and
 * an immediate (0,0) fit on the second graph).
 *
 * @see lib/pack/pack.c:polyRects / computeStep / placeGraph / fits
 */

import { describe, it, expect } from 'vitest';
import type { Box } from '../../model/geom.js';
import {
  computeStep, genBox, fits, tryCenter, placeGraph, polyRects,
  markCells, type GInfo, type PlaceCtx,
} from './poly-pack.js';
import { type PackInfo, PackMode } from './types.js';

function box(llx: number, lly: number, urx: number, ury: number): Box {
  return { ll: { x: llx, y: lly }, ur: { x: urx, y: ury } };
}

function pinfo(overrides: Partial<PackInfo> = {}): PackInfo {
  return {
    aspect: 1, sz: 0, margin: 0, doSplines: false,
    mode: PackMode.Graph, fixed: null, vals: null, flags: 0,
    ...overrides,
  };
}

describe('computeStep', () => {
  it('skips a hole (bb === undefined) at index i', () => {
    const bbs = [box(0, 0, 10, 10), undefined as unknown as Box];
    // ng=2 but bbs[1] is a hole; must not throw and must still produce a
    // positive step from the one real box.
    expect(computeStep(2, bbs, 0)).toBeGreaterThan(0);
  });

  it('returns 1 when the discriminant is negative (d < 0)', () => {
    // For any real (positive-area) box, W,H >= 0 so c = -(W*H) <= 0 and
    // b = -(W+H) <= 0, which keeps d = b^2 - 4ac >= 0 whenever a > 0 (ng >= 1).
    // A large negative margin can flip the SIGN of one dimension (W or H)
    // while leaving the other positive, making their product negative and
    // therefore c positive — the only way to drive d negative with a > 0.
    // W = 100 - 0 + 2*(-10) = 80 (still positive), H = 1 - 0 + 2*(-10) = -19
    // (flipped negative): W*H = -1520, so c = -(-1520) = 1520 > 0.
    const bbs = [box(0, 0, 100, 1)];
    expect(computeStep(1, bbs, -10)).toBe(1);
  });
});

describe('genBox', () => {
  it('produces a positive-perimeter GInfo for a simple box', () => {
    const info = genBox({ bb: box(0, 0, 10, 10), ssize: 5, margin: 0, idx: 2 });
    expect(info.index).toBe(2);
    expect(info.perim).toBeGreaterThan(0);
    expect(info.cells.length).toBeGreaterThan(0);
  });
});

describe('fits / markCells', () => {
  it('returns null when info.index has no matching bbs entry', () => {
    const info: GInfo = { perim: 4, cells: [{ x: 0, y: 0 }], index: 5 };
    const ctx: PlaceCtx = { ps: new Set(), step: 1, bbs: [box(0, 0, 1, 1)] };
    expect(fits(0, 0, info, ctx)).toBeNull();
  });

  it('markCells skips a hole in the cells array', () => {
    const ps = new Set<string>();
    markCells([{ x: 0, y: 0 }, undefined as unknown as { x: number; y: number }], 1, 1, ps);
    expect(ps.size).toBe(1);
  });
});

describe('tryCenter', () => {
  it('returns null when info.index has no matching bbs entry', () => {
    const info: GInfo = { perim: 4, cells: [{ x: 0, y: 0 }], index: 5 };
    const ctx: PlaceCtx = { ps: new Set(), step: 1, bbs: [box(0, 0, 1, 1)] };
    expect(tryCenter(info, ctx, 0)).toBeNull();
  });
});

describe('placeGraph', () => {
  it('falls back to fits(0,0) when the i===0 centered attempt collides', () => {
    const info: GInfo = { perim: 4, cells: [{ x: 0, y: 0 }], index: 0 };
    const ctx: PlaceCtx = { ps: new Set(), step: 10, bbs: [box(0, 0, 2, 2)] };
    // Pre-occupy the exact cell tryCenter would land on: W=H=gridCells(2,10)=1,
    // so tryCenter tries fits(-floor(1/2), -floor(1/2)) = fits(0,0) — mark
    // that cell occupied first so the centered attempt collides and control
    // falls through to the explicit fits(0,0) retry (also colliding here),
    // then into the spiral search.
    ctx.ps.add('0,0');
    const p = placeGraph(0, info, ctx, 0);
    expect(p).not.toBeNull();
    expect(p).not.toEqual({ x: 0, y: 0 });
  });

  it('the second graph (i!==0) succeeds immediately at fits(0,0) when free', () => {
    const info: GInfo = { perim: 4, cells: [{ x: 5, y: 5 }], index: 1 };
    const ctx: PlaceCtx = { ps: new Set(), step: 10, bbs: [box(0, 0, 2, 2), box(0, 0, 2, 2)] };
    const p = placeGraph(1, info, ctx, 0);
    expect(p).toEqual({ x: 0, y: 0 });
  });

  it('a tall bbox (H > W) drives the tall spiral-search branch', () => {
    const info: GInfo = { perim: 4, cells: [{ x: 0, y: 0 }], index: 0 };
    const ctx: PlaceCtx = { ps: new Set(['0,0', '-0,-0']), step: 10, bbs: [box(0, 0, 2, 20)] };
    const p = placeGraph(0, info, ctx, 0);
    expect(p).not.toBeNull();
  });
});

describe('polyRects', () => {
  it('skips a hole (bb === undefined) both in computeStep and the infos loop', () => {
    const bbs = [box(0, 0, 10, 10), undefined as unknown as Box, box(20, 20, 30, 30)];
    const places = polyRects(3, bbs, pinfo());
    expect(places).not.toBeNull();
    expect(places!.length).toBe(3);
    // The hole's slot keeps the default fill value (never assigned).
    expect(places![1]).toEqual({ x: 0, y: 0 });
  });

  it('ng=0 with no boxes returns an empty placement array (computeStep still returns 1)', () => {
    // Note: computeStep's two early-return paths both fall back to 1, so
    // polyRects's `step <= 0` guard is unreachable through this module's
    // own computeStep — left as itemized residue (not a behavior bug: the
    // guard is defensive against a step of 0/negative that computeStep is
    // structurally incapable of producing).
    const places = polyRects(0, [], pinfo());
    expect(places).toEqual([]);
  });
});
