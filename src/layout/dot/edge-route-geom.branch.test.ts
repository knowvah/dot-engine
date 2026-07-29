// SPDX-License-Identifier: EPL-2.0

/**
 * T4b — branch coverage for layout/dot/edge-route-geom.ts.
 *
 * Pure vector/geometry helpers. Every branch is a direct unit test with
 * hand-computed concrete values.
 *
 * L88's `t === Infinity` guard in the box arm of clipToNodeBox is only
 * reachable when BOTH xClipT and yClipT independently evaluate to
 * Infinity without dir being exactly {0,0} (which the earlier L75 guard
 * already special-cases) — i.e. one axis component is exactly zero
 * (giving the hardcoded Infinity return) while the other is a nonzero
 * value small enough that halfW/halfH divided by it overflows IEEE-754
 * double range. `Number.MIN_VALUE` on one axis with 0 on the other
 * reproduces this deterministically.
 *
 * @see lib/common/splines.c:clip_and_install (box-clipping logic)
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeVec, negateVec, offsetPoint, xClipT, yClipT, clipToNodeBox,
} from './edge-route-geom.js';
import type { NodeBox } from './edge-route-geom.js';

describe('normalizeVec', () => {
  it('normalizes a non-degenerate vector to unit length', () => {
    expect(normalizeVec({ x: 3, y: 4 })).toEqual({ x: 0.6, y: 0.8 });
  });
  it('returns {0,0} for a near-zero vector (d < 1e-10)', () => {
    expect(normalizeVec({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe('negateVec', () => {
  it('flips both components', () => {
    expect(negateVec({ x: 3, y: -4 })).toEqual({ x: -3, y: 4 });
  });
});

describe('offsetPoint', () => {
  it('adds dir * scale to p', () => {
    expect(offsetPoint({ x: 1, y: 2 }, { x: 0, y: 1 }, 5)).toEqual({ x: 1, y: 7 });
  });
});

describe('xClipT', () => {
  it('dirX > 0: halfW / dirX', () => {
    expect(xClipT(5, 10)).toBe(2);
  });
  it('dirX < 0: -halfW / dirX', () => {
    expect(xClipT(-5, 10)).toBe(2);
  });
  it('dirX === 0: Infinity', () => {
    expect(xClipT(0, 10)).toBe(Infinity);
  });
});

describe('yClipT', () => {
  it('dirY > 0: halfH / dirY', () => {
    expect(yClipT(5, 10)).toBe(2);
  });
  it('dirY < 0: -halfH / dirY', () => {
    expect(yClipT(-5, 10)).toBe(2);
  });
  it('dirY === 0: Infinity', () => {
    expect(yClipT(0, 10)).toBe(Infinity);
  });
});

describe('clipToNodeBox', () => {
  const box: NodeBox = { center: { x: 0, y: 0 }, lw: 10, rw: 20, ht: 40 };

  it('returns the center when dir is exactly {0,0}', () => {
    expect(clipToNodeBox(box, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('box shape, dir.x > 0: uses rw as the half-width', () => {
    expect(clipToNodeBox(box, { x: 1, y: 0 })).toEqual({ x: 20, y: 0 });
  });
  it('box shape, dir.x <= 0: uses lw as the half-width', () => {
    expect(clipToNodeBox(box, { x: -1, y: 0 })).toEqual({ x: -10, y: 0 });
  });
  it('box shape falls back to the center when t overflows to Infinity', () => {
    // dir.y === 0 -> yClipT is exactly Infinity; dir.x is nonzero but small
    // enough that halfW/dir.x overflows double range -> xClipT is also
    // Infinity, without dir being exactly {0,0} (which L75 already guards).
    expect(clipToNodeBox(box, { x: Number.MIN_VALUE, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('ellipse shape: standard clip to the ellipse boundary', () => {
    const ell: NodeBox = { center: { x: 5, y: 5 }, lw: 20, rw: 20, ht: 40, isEllipse: true };
    expect(clipToNodeBox(ell, { x: 1, y: 0 })).toEqual({ x: 25, y: 5 });
  });
  it('ellipse shape falls back to the center when d < 1e-10', () => {
    const ell: NodeBox = { center: { x: 5, y: 5 }, lw: 20, rw: 20, ht: 40, isEllipse: true };
    expect(clipToNodeBox(ell, { x: 1e-15, y: 0 })).toEqual({ x: 5, y: 5 });
  });
});
