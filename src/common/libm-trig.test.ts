// SPDX-License-Identifier: EPL-2.0

import { describe, it, expect } from 'vitest';
import { libmCos, libmSin } from './libm-trig.js';

/**
 * Host-libm (macOS arm64 libSystem) cos/sin at the nine angles
 * 2π·(k + 0.5)/8, k = -1..7, that neatosplines.c's 8-gon obstacle corner
 * feeds them, printed with `%a` by a clang -O2 harness of the same
 * expression (graphviz 16.1.0 native build host).
 */
const HOST: ReadonlyArray<readonly [number, number, number]> = [
  [-0.39269908169872414, 0.9238795325112867, -0.3826834323650898],
  [0.39269908169872414, 0.9238795325112867, 0.3826834323650898],
  [1.1780972450961724, 0.38268343236508984, 0.9238795325112867],
  [1.9634954084936207, -0.3826834323650897, 0.9238795325112867],
  [2.748893571891069, -0.9238795325112867, 0.3826834323650899],
  [3.5342917352885173, -0.9238795325112868, -0.38268343236508967],
  [4.319689898685965, -0.38268343236509034, -0.9238795325112865],
  [5.105088062083414, 0.38268343236509, -0.9238795325112866],
  [5.890486225480862, 0.9238795325112865, -0.3826834323650904],
];

describe('libmCos / libmSin', () => {
  it('return the host libm value at each 8-gon corner angle', () => {
    for (let k = -1; k <= 7; k++) {
      const angle = (2 * Math.PI * (k + 0.5)) / 8;
      const [a, c, s] = HOST[k + 1]!;
      expect(angle).toBe(a);
      expect(libmCos(angle)).toBe(c);
      expect(libmSin(angle)).toBe(s);
    }
  });

  it('sin(9π/8): host libm is correctly rounded, V8 Math.sin is 1 ulp off', () => {
    const angle = (2 * Math.PI * 4.5) / 8;
    expect(libmSin(angle)).toBe(-0.38268343236508967);
    expect(Math.sin(angle)).toBe(-0.3826834323650896);
  });

  it('fall back to Math.cos / Math.sin off the table', () => {
    expect(libmCos(0.3)).toBe(Math.cos(0.3));
    expect(libmSin(0.3)).toBe(Math.sin(0.3));
  });
});
