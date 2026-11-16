// SPDX-License-Identifier: EPL-2.0

/**
 * Tests for the overflow-checked arithmetic helpers.
 *
 * Graphviz 16.1.1 has no C unit test for `sadd_saturate`
 * (`lib/util/test_overflow.c` covers the other helpers), so these cases are
 * written from the function's three branches.
 *
 * @see lib/util/overflow.h
 */

import { describe, it, expect } from 'vitest';
import { saddSaturate } from './overflow.js';

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
