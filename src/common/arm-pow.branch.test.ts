// SPDX-License-Identifier: EPL-2.0

/**
 * Branch-coverage tests for src/common/arm-pow.ts (T4c).
 *
 * The existing arm-pow.test.ts validates the fast-path numerics and a
 * handful of headline special cases (NaN propagation, y=0, zero/inf
 * bases, negative-base parity, pow(1,y)). This file targets the
 * remaining special-case branches in armPow's bit-twiddled dispatch and
 * expInline's tiny/overflow split, using ordinary pow() semantics
 * (verified by hand-tracing the ARM C algorithm against each input, and
 * cross-checked against the actual return value) rather than reaching
 * into the unexported bit-level helpers.
 *
 * @see ARM optimized-routines math/pow.c:pow, exp_inline, checkint
 */

import { describe, it, expect } from 'vitest';
import { armPow } from './arm-pow.js';

describe('armPow — zeroinfnan(ix) block (x is 0/inf/nan)', () => {
  it('pow(+0, negative-odd) = +Infinity (signBias stays 0: +0 has no sign)', () => {
    expect(armPow(0, -3)).toBe(Infinity);
  });
  it('pow(-0, negative-odd) = -Infinity (signBias set: x2=-x2, then the ' +
     'zero-and-negative-y early return takes its signBias-true arm)', () => {
    expect(armPow(-0, -3)).toBe(-Infinity);
  });
  it('pow(-0, positive-odd) = -0 (x2=-x2, falls to the final ternary\'s x2 arm)', () => {
    expect(armPow(-0, 3)).toBe(-0);
  });
  it('pow(-0, positive-even) = +0 (checkint even: x2 stays positive)', () => {
    expect(armPow(-0, 2)).toBe(0);
  });
  it('pow(+Infinity, negative) = +0 (final ternary\'s 1/x2 arm, x2=+Inf)', () => {
    expect(armPow(Infinity, -2)).toBe(0);
  });
  it('pow(-Infinity, positive-odd) = -Infinity (x2=-x2 negated)', () => {
    expect(armPow(-Infinity, 3)).toBe(-Infinity);
  });
  it('pow(-Infinity, positive-even) = +Infinity (x2 stays positive)', () => {
    expect(armPow(-Infinity, 2)).toBe(Infinity);
  });
  it('pow(-Infinity, negative-odd) = -0 (1/x2 with x2=-Infinity)', () => {
    expect(armPow(-Infinity, -3)).toBe(-0);
  });
});

describe('armPow — zeroinfnan(iy) block (y is 0/inf/nan)', () => {
  it('pow(x, +0) = 1 even for a negative finite base', () => {
    expect(armPow(-7, 0)).toBe(1);
  });
  it('nan-operand branch: pow(NaN, +Infinity) = NaN (x+y arm)', () => {
    expect(armPow(NaN, Infinity)).toBeNaN();
  });
  it('nan-operand branch: pow(+Infinity, NaN) = NaN', () => {
    expect(armPow(Infinity, NaN)).toBeNaN();
  });
  it('pow(±1, +Infinity) = 1 (the |x|===1 shortcut, positive base)', () => {
    expect(armPow(1, Infinity)).toBe(1);
  });
  it('pow(±1, +Infinity) = 1 (the |x|===1 shortcut, negative base)', () => {
    expect(armPow(-1, Infinity)).toBe(1);
  });
  it('pow(|x|>1, +Infinity) = +Infinity (yNonNeg branch, magnitude>1)', () => {
    expect(armPow(5, Infinity)).toBe(Infinity);
  });
  it('pow(|x|<1, +Infinity) = +0 (yNonNeg branch, magnitude<1)', () => {
    expect(armPow(0.5, Infinity)).toBe(0);
  });
  it('pow(|x|>1, -Infinity) = +0 (yNonNeg false, magnitude>1)', () => {
    expect(armPow(5, -Infinity)).toBe(0);
  });
  it('pow(|x|<1, -Infinity) = +Infinity (yNonNeg false, magnitude<1)', () => {
    expect(armPow(0.5, -Infinity)).toBe(Infinity);
  });
});

describe('armPow — checkint branches (finite negative base)', () => {
  it('e < 0x3ff (fractional |y|<1): non-integer exponent is NaN', () => {
    expect(armPow(-3, 0.5)).toBeNaN();
  });
  it('mid-range e with a nonzero low mantissa bit: fractional y is NaN', () => {
    expect(armPow(-2, 2.5)).toBeNaN();
  });
  it('e > 0x3ff+52 (huge magnitude, always "even"): finite result, not NaN', () => {
    // 1e17 exceeds 2^52, so checkint takes the always-even shortcut without
    // consulting the mantissa; the call still completes the normal
    // logInline/expInline path (with the sign stripped) rather than
    // returning NaN, and overflows to +Infinity.
    expect(armPow(-2, 1e17)).toBe(Infinity);
  });
  it('mid-range e, mantissa zero, odd bit set: odd integer (matches Math.pow parity)', () => {
    expect(armPow(-2, 3)).toBe(-8);
  });
  it('mid-range e, mantissa zero, odd bit clear: even integer', () => {
    expect(armPow(-3, 2)).toBe(9);
  });
});

describe('armPow — huge/tiny |y| special block (topy out of [2^-65, 2^63))', () => {
  it('ix===ONE_BITS shortcut inside the huge-y block: pow(1, 2^63) = 1', () => {
    expect(armPow(1, 2 ** 63)).toBe(1);
  });
  it('ix===ONE_BITS shortcut after negative-x sign-strip: pow(-1, 2^63) = 1 ' +
     '(2^63 is even per checkint\'s huge-magnitude shortcut)', () => {
    expect(armPow(-1, 2 ** 63)).toBe(1);
  });
  it('tiny |y| (<2^-65) collapses to 1 for any finite nonzero base', () => {
    expect(armPow(2, 1e-30)).toBe(1);
  });
  it('|x|>1, y>=2^63 (huge positive) → +Infinity', () => {
    expect(armPow(2, 2 ** 63)).toBe(Infinity);
  });
  it('|x|<1, y>=2^63 (huge positive) → +0', () => {
    expect(armPow(0.5, 2 ** 63)).toBe(0);
  });
  it('|x|>1, y<=-2^63 (huge negative) → +0', () => {
    expect(armPow(2, -(2 ** 63))).toBe(0);
  });
  it('|x|<1, y<=-2^63 (huge negative) → +Infinity', () => {
    expect(armPow(0.5, -(2 ** 63))).toBe(Infinity);
  });
});

describe('armPow — subnormal-x normalization', () => {
  it('a subnormal base (|x| < 2.2e-308) still computes via the topx===0 ' +
     're-normalization branch instead of falling into logInline with a ' +
     'zero exponent field', () => {
    expect(armPow(1e-310, 2)).toBe(0); // underflows, but does not NaN/throw
  });
});

describe('armPow — expInline tiny-argument branch (|exp arg| < 2^-54)', () => {
  it('pow(-1, 1) hits the tiny branch with signBias SET: log(1)=0 exactly, ' +
     'so exp_inline sees x=0 (below the 2^-54 tiny threshold) and returns ' +
     '-(1+0) via the signBias-true arm', () => {
    expect(armPow(-1, 1)).toBe(-1);
  });
  it('pow(-1, 3) hits the same tiny branch (odd exponent, signBias set)', () => {
    expect(armPow(-1, 3)).toBe(-1);
  });
  it('pow(-1, 2) takes the signBias-false arm of the same tiny branch ' +
     '(even exponent: no sign flip)', () => {
    expect(armPow(-1, 2)).toBe(1);
  });
  it('x just above 1 with a small y also drives the exp argument below ' +
     'the tiny threshold, taking the signBias-false arm directly (not via ' +
     'x=-1 exactly)', () => {
    expect(armPow(1 + Number.EPSILON, 1e-3)).toBe(1);
  });
});

describe('armPow — expInline overflow/underflow branch (|exp arg| >= 512)', () => {
  it('a large positive exponent argument overflows to +Infinity', () => {
    expect(armPow(1e300, 1e15)).toBe(Infinity);
  });
  it('a large negative exponent argument underflows to +0', () => {
    expect(armPow(1e-300, 1e15)).toBe(0);
  });
  it('a negative base combined with overflow still resolves to +Infinity ' +
     '(1e15 is even per the huge-magnitude checkint shortcut)', () => {
    expect(armPow(-1e300, 1e15)).toBe(Infinity);
  });
});

describe('armPow — ordinary fast path sanity (regression guard)', () => {
  it('small fractional exponent on a normal base', () => {
    expect(armPow(2, 1e-3)).toBeCloseTo(1.0006933874625807, 12);
  });
});
