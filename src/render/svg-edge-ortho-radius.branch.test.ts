// SPDX-License-Identifier: EPL-2.0
//
// Branch coverage for the remaining 7 of 8 wedge-orientation cases in
// calculateWedgeParameters (svg-edge-ortho-radius.ts:50-83) not exercised by
// svg-edge-ortho-radius.test.ts (which only covers "right then down").
// Each case is a distinct 90-degree corner orientation; native emit.c
// enumerates all 8 explicitly (calculate_wedge_parameters), so every branch
// is a reachable real-world corner shape.

import { describe, it, expect } from 'vitest';
import { findOrthoCorners } from './svg-edge-ortho-radius.js';

describe('calculateWedgeParameters — horizontal-then-vertical group', () => {
  it('right then up: center=(curr-r, curr+r), a1=-PI/2 a2=0', () => {
    // prev=(0,0) curr=(10,0) next=(10,10): horizontal right, then vertical up.
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
    const c = findOrthoCorners(pts, 4)[0];
    expect(c.wedgeCenter).toEqual({ x: 6, y: 4 });
    expect(c.angle1).toBeCloseTo(-Math.PI / 2, 9);
    expect(c.angle2).toBeCloseTo(0, 9);
  });

  it('left then down: center=(curr+r, curr-r), a1=PI/2 a2=PI', () => {
    // prev=(10,0) curr=(0,0) next=(0,-10): horizontal left, then vertical down.
    const pts = [{ x: 10, y: 0 }, { x: 0, y: 0 }, { x: 0, y: -10 }];
    const c = findOrthoCorners(pts, 4)[0];
    expect(c.wedgeCenter).toEqual({ x: 4, y: -4 });
    expect(c.angle1).toBeCloseTo(Math.PI / 2, 9);
    expect(c.angle2).toBeCloseTo(Math.PI, 9);
  });

  it('left then up: center=(curr+r, curr+r), a1=PI a2=3PI/2', () => {
    // prev=(10,0) curr=(0,0) next=(0,10): horizontal left, then vertical up.
    const pts = [{ x: 10, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 10 }];
    const c = findOrthoCorners(pts, 4)[0];
    expect(c.wedgeCenter).toEqual({ x: 4, y: 4 });
    expect(c.angle1).toBeCloseTo(Math.PI, 9);
    expect(c.angle2).toBeCloseTo((3 * Math.PI) / 2, 9);
  });
});

describe('calculateWedgeParameters — vertical-then-horizontal group', () => {
  it('down then left: center=(curr-r, curr+r), a1=3PI/2 a2=2PI', () => {
    // prev=(0,10) curr=(0,0) next=(-10,0): vertical down, then horizontal left.
    const pts = [{ x: 0, y: 10 }, { x: 0, y: 0 }, { x: -10, y: 0 }];
    const c = findOrthoCorners(pts, 4)[0];
    expect(c.wedgeCenter).toEqual({ x: -4, y: 4 });
    expect(c.angle1).toBeCloseTo((3 * Math.PI) / 2, 9);
    expect(c.angle2).toBeCloseTo(2 * Math.PI, 9);
  });

  it('up then right: center=(curr+r, curr-r), a1=PI/2 a2=PI', () => {
    // prev=(0,-10) curr=(0,0) next=(10,0): vertical up, then horizontal right.
    const pts = [{ x: 0, y: -10 }, { x: 0, y: 0 }, { x: 10, y: 0 }];
    const c = findOrthoCorners(pts, 4)[0];
    expect(c.wedgeCenter).toEqual({ x: 4, y: -4 });
    expect(c.angle1).toBeCloseTo(Math.PI / 2, 9);
    expect(c.angle2).toBeCloseTo(Math.PI, 9);
  });

  it('up then left: center=(curr-r, curr-r), a1=0 a2=PI/2', () => {
    // prev=(0,-10) curr=(0,0) next=(-10,0): vertical up, then horizontal left.
    const pts = [{ x: 0, y: -10 }, { x: 0, y: 0 }, { x: -10, y: 0 }];
    const c = findOrthoCorners(pts, 4)[0];
    expect(c.wedgeCenter).toEqual({ x: -4, y: -4 });
    expect(c.angle1).toBeCloseTo(0, 9);
    expect(c.angle2).toBeCloseTo(Math.PI / 2, 9);
  });
});
