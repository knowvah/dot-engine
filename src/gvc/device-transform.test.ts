// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { applyRotation, applyScale, buildPoint } from './device-transform.js';

describe('gvrender_ptf branches', () => {
  it('applyRotation: out = (-(y+ty)*sx, (x+tx)*sy)', () => {
    expect(applyRotation({ x: 1, y: 2 }, 3, 4, 2, 0.5)).toEqual({ x: -12, y: 2 });
  });

  it('applyScale: out = ((x+tx)*sx, (y+ty)*sy)', () => {
    expect(applyScale({ x: 1, y: 2 }, 3, 4, 2, 0.5)).toEqual({ x: 8, y: 3 });
  });

  it('buildPoint returns a fresh point', () => {
    expect(buildPoint(5, -1)).toEqual({ x: 5, y: -1 });
  });
});
