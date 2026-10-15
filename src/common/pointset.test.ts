// SPDX-License-Identifier: EPL-2.0

import { describe, expect, it } from 'vitest';
import { PointSet } from './pointset.js';

describe('PointSet', () => {
  it('reports a point absent before insert and present after', () => {
    const ps = new PointSet();
    expect(ps.inPS({ x: 1, y: 2 })).toBe(false);
    ps.addPS(1, 2);
    expect(ps.inPS({ x: 1, y: 2 })).toBe(true);
    expect(ps.inPS({ x: 2, y: 1 })).toBe(false);
    expect(ps.isInPS(1, 2)).toBe(true);
    expect(ps.isInPS(1, 3)).toBe(false);
  });

  it('keeps one entry per point (dtinsert of a duplicate is a no-op)', () => {
    const ps = new PointSet();
    ps.addPS(3, -2);
    ps.addPS(3, -2);
    expect(ps.sizeOf()).toBe(1);
  });

  it('compares coordinates exactly, without rounding (cmppair on pointf)', () => {
    const ps = new PointSet();
    ps.addPS(0.5, 1.25);
    expect(ps.inPS({ x: 0.5, y: 1.25 })).toBe(true);
    expect(ps.inPS({ x: 1, y: 1 })).toBe(false);
    expect(ps.inPS({ x: 0.5, y: 1.5 })).toBe(false);
  });

  it('treats -0 and 0 as the same coordinate, as C double compare does', () => {
    const ps = new PointSet();
    ps.addPS(-0, 0);
    expect(ps.inPS({ x: 0, y: -0 })).toBe(true);
    ps.addPS(0, -0);
    expect(ps.sizeOf()).toBe(1);
  });

  it('lists points in Dtoset order: x ascending, then y ascending', () => {
    const ps = new PointSet();
    ps.addPS(2, 0);
    ps.addPS(-1, 5);
    ps.addPS(2, -3);
    ps.addPS(-1, -4);
    ps.addPS(0, 0);
    expect(ps.pointsOf()).toEqual([
      { x: -1, y: -4 },
      { x: -1, y: 5 },
      { x: 0, y: 0 },
      { x: 2, y: -3 },
      { x: 2, y: 0 },
    ]);
  });
});
