// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ptToLine2 } from './splines-geom.js';

describe('ptToLine2 (native arm64 fusion)', () => {
  it('fuses numerator and denominator as libgvc _ptToLine2 does', () => {
    const a = { x: 25.963019020855427, y: 141.44928394816816 };
    const b = { x: 116.57741917297244, y: 75.86248652078211 };
    const p = { x: 52.589599415659904, y: 150.18094587139785 };
    // The unfused expression yields 514.6208404573881 for this input.
    expect(ptToLine2(a, b, p)).toBe(514.620840457388);
  });

  it('returns 0 when the squared numerator is below SMALL', () => {
    expect(ptToLine2({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 })).toBe(0);
  });

  it('returns the exact squared distance for a simple case', () => {
    expect(ptToLine2({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 3 })).toBe(9);
  });
});
