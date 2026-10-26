// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import {
  BLOCK_NONE,
  copyVector,
  innerProduct,
  maxAbs,
  norm,
  rightMultWithVectorF,
  scadd,
  vectorsAddition,
  vectorsScalarMult,
  vectorsSubtraction,
} from './matrix-ops.js';

/** 1 + 2^-30: a * b below is 1 - 2^-60, which rounds to 1 unless fused. */
const ONE_PLUS = 1 + 2 ** -30;
const ONE_MINUS = 1 - 2 ** -30;
const FUSED_RESIDUE = -(2 ** -60);

describe('innerProduct per-site contraction', () => {
  it('sums products', () => {
    expect(innerProduct(3, Float64Array.of(1, 2, 3), Float64Array.of(4, 5, 6), 4)).toBe(32);
  });

  it('BLOCK_NONE fuses every term (scalar fmadd loop)', () => {
    const v1 = Float64Array.of(1, ONE_PLUS);
    const v2 = Float64Array.of(-1, ONE_MINUS);
    expect(innerProduct(2, v1, v2, BLOCK_NONE)).toBe(FUSED_RESIDUE);
  });

  it('leaves the first block * floor(n / block) products unfused, the tail fused', () => {
    const a = ONE_PLUS;
    const b = ONE_MINUS;
    // residue term in the blocked prefix: round(a*b) = 1, so -1 + 1 = 0
    expect(innerProduct(5, Float64Array.of(1, a, 0, 0, 0), Float64Array.of(-1, b, 0, 0, 0), 4)).toBe(0);
    // same term in the scalar tail (index 4 of 5): fmadd keeps -2^-60
    expect(innerProduct(5, Float64Array.of(1, 0, 0, 0, a), Float64Array.of(-1, 0, 0, 0, b), 4)).toBe(FUSED_RESIDUE);
    // block 8 leaves all of n = 5 in the scalar tail
    expect(innerProduct(5, Float64Array.of(1, a, 0, 0, 0), Float64Array.of(-1, b, 0, 0, 0), 8)).toBe(FUSED_RESIDUE);
  });
});

describe('non-finite operands', () => {
  it('fused terms with an infinite factor stay infinite, as the hardware fmadd', () => {
    expect(innerProduct(1, Float64Array.of(Infinity), Float64Array.of(2), BLOCK_NONE)).toBe(Infinity);
    expect(innerProduct(2, Float64Array.of(0, 2), Float64Array.of(Infinity, 1), BLOCK_NONE)).toBeNaN();
  });
});

describe('double-precision matrix_ops helpers', () => {
  it('norm is the 2-norm over indices 0..end', () => {
    expect(norm(Float64Array.of(3, 4, 99), 1, BLOCK_NONE)).toBe(5);
  });

  it('scadd adds fac * vec2 to vec1 over 0..end, fused', () => {
    const v1 = Float64Array.of(1, 2, 3);
    scadd(v1, 1, 2, Float64Array.of(10, 20, 30));
    expect(Array.from(v1)).toEqual([21, 42, 3]);
    const f = Float64Array.of(-1);
    scadd(f, 0, ONE_PLUS, Float64Array.of(ONE_MINUS));
    expect(f[0]).toBe(FUSED_RESIDUE);
  });

  it('vectorsScalarMult writes vector * alpha (in place allowed)', () => {
    const v = Float64Array.of(1, -2, 4);
    vectorsScalarMult(3, v, 0.5, v);
    expect(Array.from(v)).toEqual([0.5, -1, 2]);
  });

  it('copyVector copies n entries', () => {
    const d = new Float64Array(3);
    copyVector(2, Float64Array.of(7, 8, 9), d);
    expect(Array.from(d)).toEqual([7, 8, 0]);
  });

  it('vectorsAddition and vectorsSubtraction are elementwise', () => {
    const a = Float64Array.of(1, 2);
    const b = Float64Array.of(10, 30);
    const r = new Float64Array(2);
    vectorsAddition(2, a, b, r);
    expect(Array.from(r)).toEqual([11, 32]);
    vectorsSubtraction(2, a, b, r);
    expect(Array.from(r)).toEqual([-9, -28]);
  });

  it('maxAbs returns the largest magnitude, -1e50 for an empty range', () => {
    expect(maxAbs(3, Float64Array.of(-7, 2, 5))).toBe(7);
    expect(maxAbs(0, new Float64Array(0))).toBe(-1e50);
  });

  it('rightMultWithVectorF multiplies a float** matrix by a double vector', () => {
    const m = [Float32Array.of(1, 2), Float32Array.of(0.5, -1)];
    const r = new Float64Array(2);
    rightMultWithVectorF(m, 2, Float64Array.of(3, 4), r, BLOCK_NONE);
    expect(Array.from(r)).toEqual([11, -2.5]);
  });

  it('rightMultWithVectorF fuses the tail and rounds the blocked prefix', () => {
    // m1*v1 = 1 + 2^-23 + 2^-30 + 2^-53 needs 54 bits: unfused it rounds to
    // 1 + 2^-23 + 2^-30 and the row sums to 0; fused the 2^-53 survives.
    const m = [Float32Array.of(-1, 1 + 2 ** -23), Float32Array.of(0, 0)];
    const v = Float64Array.of(1 + 2 ** -23 + 2 ** -30, 1 + 2 ** -30);
    const r = new Float64Array(2);
    rightMultWithVectorF(m, 2, v, r, BLOCK_NONE);
    expect(r[0]).toBe(2 ** -53);
    const wide = [Float32Array.of(-1, 1 + 2 ** -23, 0, 0), new Float32Array(4), new Float32Array(4), new Float32Array(4)];
    const wv = Float64Array.of(1 + 2 ** -23 + 2 ** -30, 1 + 2 ** -30, 0, 0);
    const wr = new Float64Array(4);
    rightMultWithVectorF(wide, 4, wv, wr, 4);
    expect(wr[0]).toBe(0);
  });
});
