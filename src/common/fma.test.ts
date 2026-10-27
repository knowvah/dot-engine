// SPDX-License-Identifier: EPL-2.0

/**
 * Tests for the software fused multiply-add.
 */

import { describe, it, expect } from 'vitest';
import { fma, fms } from './fma.js';

describe('fma', () => {
  it('matches plain arithmetic when no double rounding occurs', () => {
    expect(fma(2, 3, 4)).toBe(10);
    expect(fma(0.5, 0.5, 0.25)).toBe(0.5);
    expect(fma(-2, 3, 4)).toBe(-2);
  });

  it('keeps the product bits a separate mul+add would lose', () => {
    // a·b = 1 + 2^-26 + 2^-54; c cancels the leading 1 + 2^-26.
    // Plain (a*b + c) rounds a·b to 1 + 2^-26 first and yields 0;
    // a true fma preserves 2^-54.
    const a = 1 + 2 ** -27;
    const c = -(1 + 2 ** -26);
    expect(a * a + c).toBe(0);
    expect(fma(a, a, c)).toBe(2 ** -54);
  });

  it('handles sign and zero correctly', () => {
    expect(fma(0, 5, 3)).toBe(3);
    expect(fma(5, 0, -3)).toBe(-3);
    expect(fma(1, 1, -1)).toBe(0);
  });

  it('fms computes c − a·b with one rounding', () => {
    expect(fms(2, 3, 10)).toBe(4);
    const a = 1 + 2 ** -27;
    expect(fms(a, a, 1 + 2 ** -26)).toBe(-(2 ** -54));
  });
});

/** Previous implementation (finite-only Dekker split), kept for the bit-for-bit comparison. */
function oldFma(a: number, b: number, c: number): number {
  const SPLIT = 134217729;
  const p = a * b;
  const at = SPLIT * a;
  const ahi = at - (at - a);
  const alo = a - ahi;
  const bt = SPLIT * b;
  const bhi = bt - (bt - b);
  const blo = b - bhi;
  const e = ((ahi * bhi - p) + ahi * blo + alo * bhi) + alo * blo;
  const s = p + c;
  const bv = s - p;
  const err = (p - (s - bv)) + (c - bv);
  return s + (err + e);
}

/** mulberry32 seeded PRNG in [0, 1). */
function prng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const TRIPLES = 100_000;
const SEED = 84;
const SUBNORMAL = 5e-324;
const MAG_EXP = 500;

function drawFinite(rnd: () => number): number {
  const sign = rnd() < 0.5 ? -1 : 1;
  const kind = Math.floor(rnd() * 5);
  switch (kind) {
    case 0: return sign * rnd();
    case 1: return sign * rnd() * 1e3;
    case 2: return sign * SUBNORMAL * Math.floor(rnd() * 1e6);
    case 3: return sign * (1 + rnd()) * 2 ** MAG_EXP;
    default: return sign * (1 + rnd()) * 2 ** -MAG_EXP;
  }
}

describe('fma finite path vs previous implementation', () => {
  it('is bit-identical over 1e5 random finite triples', () => {
    const rnd = prng(SEED);
    let mismatches = 0;
    for (let i = 0; i < TRIPLES; i++) {
      const a = drawFinite(rnd);
      const b = drawFinite(rnd);
      const c = drawFinite(rnd);
      const p = a * b;
      if (!Number.isFinite(p)) continue; // non-finite product: new short-circuit path
      if (!Object.is(fma(a, b, c), oldFma(a, b, c))) mismatches++;
    }
    expect(mismatches).toBe(0);
  });
});

describe('fma non-finite operands (IEEE fmadd)', () => {
  it('propagates infinities', () => {
    expect(fma(Infinity, 2, 1)).toBe(Infinity);
    expect(fma(1, 2, Infinity)).toBe(Infinity);
    expect(fma(1e308, 10, -Infinity)).toBe(-Infinity);
  });
  it('yields NaN for invalid operations and NaN input', () => {
    expect(fma(Infinity, 0, 1)).toBeNaN();
    expect(fma(-Infinity, 2, Infinity)).toBeNaN();
    expect(fma(NaN, 1, 1)).toBeNaN();
  });
});
