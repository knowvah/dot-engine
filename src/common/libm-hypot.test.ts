// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { libmHypot } from './libm-hypot.js';
import { HYPOT_VECTORS } from '../../test/helpers/hypot-vectors.js';
import { parseHexFloat } from '../../test/helpers/hexfloat.js';

describe('libmHypot (native build host libm hypot, bit-exact)', () => {
  it.each(HYPOT_VECTORS)('hypot(%s, %s) = %s', (a, b, h) => {
    expect(Object.is(libmHypot(parseHexFloat(a), parseHexFloat(b)), parseHexFloat(h))).toBe(true);
  });

  it('differs from Math.hypot and sqrt(a*a+b*b) where libm does', () => {
    // vertex 2 of shape=box orientation=20 (see known-divergences)
    const x = -0.35355339059327373, y = -0.35355339059327362;
    expect(libmHypot(x, y)).toBe(0.49999999999999983);
    expect(Math.sqrt(x * x + y * y)).not.toBe(0.49999999999999983);
  });

  it('is symmetric and sign-blind', () => {
    expect(libmHypot(-3, 4)).toBe(5);
    expect(libmHypot(4, -3)).toBe(5);
    expect(libmHypot(0, -0)).toBe(0);
  });

  it('returns inf for an infinite operand even when the other is NaN', () => {
    expect(libmHypot(Infinity, NaN)).toBe(Infinity);
    expect(libmHypot(NaN, -Infinity)).toBe(Infinity);
    expect(libmHypot(NaN, 1)).toBeNaN();
  });
});
