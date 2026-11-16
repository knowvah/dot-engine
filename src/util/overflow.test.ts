// SPDX-License-Identifier: EPL-2.0

/**
 * Tests for the overflow-checked arithmetic helpers.
 *
 * Graphviz 16.1.1 has no C unit test for `sadd_saturate`
 * (`lib/util/test_overflow.c` covers the other helpers), so these cases are
 * written from the function's three branches. The same holds for
 * `fdiv_overflow` and `fdivf_overflow`: their cases are the finite and the
 * non-finite quotient.
 *
 * @see lib/util/overflow.h
 */

import { describe, it, expect } from 'vitest';
import { fdivOverflow, fdivfOverflow, saddSaturate } from './overflow.js';

const INT_MAX = 2_147_483_647;
const INT_MIN = -2_147_483_648;

describe('saddSaturate — in-range sums pass through (overflow.h:sadd_saturate)', () => {
  it.each([
    [1, 2, 3],
    [5, 0, 5],
    [-5, -7, -12],
    [0, 0, 0],
  ])('saddSaturate(%d, %d) is %d', (a, b, want) => {
    expect(saddSaturate(a, b)).toBe(want);
  });
});

describe('saddSaturate — clamps at INT_MAX on overflow', () => {
  it('passes through at the exact edge (INT_MAX - b == a)', () => {
    expect(saddSaturate(INT_MAX - 10, 10)).toBe(INT_MAX);
  });

  it('clamps one past the edge (INT_MAX - b < a)', () => {
    expect(saddSaturate(INT_MAX - 9, 10)).toBe(INT_MAX);
  });

  it('clamps a sum far past INT_MAX', () => {
    expect(saddSaturate(2_147_483_000, 1000)).toBe(INT_MAX);
    expect(saddSaturate(INT_MAX, INT_MAX)).toBe(INT_MAX);
  });

  it('returns one below INT_MAX just inside the edge', () => {
    expect(saddSaturate(INT_MAX - 11, 10)).toBe(INT_MAX - 1);
  });
});

describe('saddSaturate — clamps at INT_MIN on underflow', () => {
  it('passes through at the exact edge (INT_MIN - b == a)', () => {
    expect(saddSaturate(INT_MIN + 10, -10)).toBe(INT_MIN);
  });

  it('clamps one past the edge (INT_MIN - b > a)', () => {
    expect(saddSaturate(INT_MIN + 9, -10)).toBe(INT_MIN);
  });

  it('clamps a sum far past INT_MIN', () => {
    expect(saddSaturate(-2_147_483_000, -1000)).toBe(INT_MIN);
    expect(saddSaturate(INT_MIN, INT_MIN)).toBe(INT_MIN);
  });

  it('returns one above INT_MIN just inside the edge', () => {
    expect(saddSaturate(INT_MIN + 11, -10)).toBe(INT_MIN + 1);
  });
});

describe('saddSaturate — mixed signs never clamp', () => {
  it.each([
    [INT_MAX, -1, 2_147_483_646],
    [INT_MIN, 1, -2_147_483_647],
    [INT_MAX, INT_MIN, -1],
    [INT_MIN, INT_MAX, -1],
  ])('saddSaturate(%d, %d) is %d', (a, b, want) => {
    expect(saddSaturate(a, b)).toBe(want);
  });
});

describe('fdivOverflow / fdivfOverflow (overflow.h:fdiv_overflow)', () => {
  it('fdivOverflow returns a finite quotient', () => {
    expect(fdivOverflow(1, 4)).toBe(0.25);
    expect(fdivOverflow(-9, 3)).toBe(-3);
    // finite in double, where the float quotient would be inf
    expect(fdivOverflow(1, 1e-39)).toBe(1 / 1e-39);
  });

  it('fdivOverflow keeps a zero quotient (0 is a result, not an overflow)', () => {
    expect(Object.is(fdivOverflow(0, 5), 0)).toBe(true);
  });

  it.each([
    ['x / 0 is inf', 1, 0],
    ['0 / 0 is NaN', 0, 0],
    ['the quotient exceeds DBL_MAX', 1e308, 1e-10],
    ['a subnormal divisor overflows', 20, 5e-324],
    ['a NaN numerator', NaN, 1],
    ['an infinite numerator', Infinity, 2],
    ['inf / inf is NaN', Infinity, Infinity],
  ])('fdivOverflow is null when %s', (_why, n, d) => {
    expect(fdivOverflow(n, d)).toBeNull();
  });

  it('fdivfOverflow returns the float32 quotient', () => {
    expect(fdivfOverflow(3, 2)).toBe(1.5);
    expect(fdivfOverflow(1, 3)).toBe(Math.fround(1 / 3));
    expect(Object.is(fdivfOverflow(0, 5), 0)).toBe(true);
  });

  it('fdivfOverflow is null when the float quotient overflows FLT_MAX', () => {
    // 1e39 fits a double and not a float (FLT_MAX is about 3.4e38).
    expect(fdivfOverflow(1, 1e-39)).toBeNull();
    expect(fdivfOverflow(3e38, 0.5)).toBeNull();
  });

  it('fdivfOverflow rounds its operands to float, as C\'s parameters do', () => {
    // 1e-46 is below the smallest float subnormal (about 1.4e-45): the float
    // divisor is 0, so the quotient is inf. In double it is a finite 1e46.
    expect(fdivfOverflow(1, 1e-46)).toBeNull();
  });

  it.each([
    ['x / 0', 1, 0],
    ['0 / 0', 0, 0],
    ['0 / -0', 0, -0],
    ['a NaN denominator', 1, NaN],
  ])('fdivfOverflow is null for %s', (_why, n, d) => {
    expect(fdivfOverflow(n, d)).toBeNull();
  });
});
