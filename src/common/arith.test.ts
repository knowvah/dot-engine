// SPDX-License-Identifier: EPL-2.0

import { describe, expect, it } from 'vitest';
import { cround, croundNarrow32, RADIANS } from './arith.js';

/**
 * Oracle values below are C's libm `round()` (half away from zero), which is
 * also what `ROUND(f) = ((f>=0)?(int)(f+.5):(int)(f-.5))` computes.
 * @see lib/common/arith.h:48
 */
describe('cround', () => {
  it('breaks exact ties away from zero, where Math.round breaks toward +inf', () => {
    // The whole reason this helper exists: these four disagree with Math.round
    // on the negative side.
    expect(cround(-4.5)).toBe(-5);
    expect(cround(-0.5)).toBe(-1);
    expect(cround(-1.5)).toBe(-2);
    expect(cround(-2.5)).toBe(-3);

    // Math.round would give -4 / -0 / -1 / -2 here.
    expect(Math.round(-4.5)).toBe(-4);
  });

  it('agrees with Math.round on positive ties', () => {
    expect(cround(4.5)).toBe(5);
    expect(cround(0.5)).toBe(1);
    expect(cround(2.5)).toBe(3);
  });

  it('rounds non-ties to nearest in both directions', () => {
    expect(cround(-4.4)).toBe(-4);
    expect(cround(-4.6)).toBe(-5);
    expect(cround(4.4)).toBe(4);
    expect(cround(4.6)).toBe(5);
    expect(cround(-1.6)).toBe(-2);
    expect(cround(11.6)).toBe(12);
  });

  it('is the identity on integers', () => {
    expect(cround(8)).toBe(8);
    expect(cround(-8)).toBe(-8);
    expect(cround(0)).toBe(0);
  });

  it('preserves C round()\'s signed-zero behaviour on small negatives', () => {
    // C: round(-0.2) == -0.0. Math.ceil(-0.7) is likewise -0.
    expect(Object.is(cround(-0.2), -0)).toBe(true);
    // C: round(-0.0) == -0.0; we yield +0. Numerically equal (-0 === 0) and
    // both stringify to "0", so no emitted coordinate can observe this.
    expect(cround(-0)).toBe(0);
    expect(Object.is(cround(0), 0)).toBe(true);
  });
});

describe('RADIANS (C operation order)', () => {
  it('divides by 180 before multiplying by pi, as arith.h does', () => {
    // 33 * PI / 180 = 0.5759586531581288; 33 / 180 * PI = 0.5759586531581287.
    expect(RADIANS(33)).toBe(33 / 180 * Math.PI);
    expect(RADIANS(33)).not.toBe((33 * Math.PI) / 180);
    expect(RADIANS(180)).toBe(Math.PI);
    expect(RADIANS(-90)).toBe(-Math.PI / 2);
  });
});

/**
 * Oracle: the native arm64 16.1 build's vectorised ROUND in
 * init_job_pagination (fcvtzs.2d to int64, then xtn/uzp1 to the low 32 bits).
 * 2160000000000000000 is corpus 2784's page height; native prints 1255669760.
 */
describe('croundNarrow32', () => {
  it('equals cround inside the int range', () => {
    expect(croundNarrow32(421.5)).toBe(422);
    expect(croundNarrow32(-2.5)).toBe(-3);
    expect(croundNarrow32(2147483647)).toBe(2147483647);
  });

  it('keeps the low 32 bits of the int64 conversion', () => {
    expect(croundNarrow32(2160000000000000000)).toBe(1255669760);
    expect(croundNarrow32(2147483648)).toBe(-2147483648);
    expect(croundNarrow32(4294967296 + 7)).toBe(7);
  });

  it('saturates at the int64 range and maps NaN to 0, as fcvtzs does', () => {
    expect(croundNarrow32(1e19)).toBe(-1);
    expect(croundNarrow32(-1e19)).toBe(0);
    expect(croundNarrow32(Number.NaN)).toBe(0);
  });
});
