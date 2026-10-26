// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import { conjugateGradientMkernelFused, rightMultWithVectorFFFused } from './conjgrad-mkernel.js';

afterEach(() => { vi.restoreAllMocks(); });

/** Packed upper triangle of a symmetric matrix, row by row. */
function pack(rows: readonly (readonly number[])[]): Float32Array {
  return Float32Array.from(rows.flatMap((row, i) => row.slice(i)));
}

describe('rightMultWithVectorFFFused', () => {
  it('multiplies a packed symmetric matrix', () => {
    const A = pack([[2, 1, 0], [1, 3, 4], [0, 4, 5]]);
    const out = new Float32Array(3);
    rightMultWithVectorFFFused(A, 3, Float32Array.of(1, 2, 3), out);
    expect([...out]).toEqual([4, 19, 23]);
  });

  /**
   * Row 0 holds diagonal `DIAG` and one off-diagonal term `OFF * V` (zeros elsewhere).
   * `res + OFF*V` rounds differently fused (1.1459170579910278) than with the
   * product rounded first (1.1459171772003174).
   */
  const DIAG = 1.0972700119018555;
  const OFF = 0.150409996509552;
  const V = 0.32343000173568726;
  const FUSED = 1.1459170579910278;
  const ROUNDED_FIRST = 1.1459171772003174;

  function rowZero(n: number): number {
    const m = new Float32Array((n * (n + 1)) / 2);
    m[0] = DIAG;
    m[1] = OFF;
    const v = new Float32Array(n);
    v[0] = 1;
    v[1] = V;
    const out = new Float32Array(n);
    rightMultWithVectorFFFused(m, n, v, out);
    return out[0]!;
  }

  it('fuses the terms after the last full 16-block (15 off-diagonals: all fused)', () => {
    expect(rowZero(16)).toBe(FUSED);
  });

  it('rounds the products inside a 16-block before adding (16 off-diagonals)', () => {
    expect(rowZero(17)).toBe(ROUNDED_FIRST);
  });
});

describe('conjugateGradientMkernelFused', () => {
  it('solves a small centred system', () => {
    // A = 3I - J/... : any SPD matrix on the centred subspace; b centred
    const A = pack([[4, -1, -1, -2], [-1, 4, -2, -1], [-1, -2, 4, -1], [-2, -1, -1, 4]]);
    const x = new Float32Array(4);
    const b = Float32Array.of(1, -1, 2, -2);
    expect(conjugateGradientMkernelFused(A, x, b, 4, { tol: 1e-6, maxIterations: 4 })).toBe(0);
    const out = new Float32Array(4);
    rightMultWithVectorFFFused(A, 4, x, out);
    out.forEach((v, i) => expect(v).toBeCloseTo(b[i]!, 4));
  });

  it('reports an unexpected zero-length residual product with return code 1', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // r.r underflows to 0 while max|r| = 1e-30 > tol; A scales p.Ap back above 0
    const A = pack([[1e30, 0], [0, 1e30]]);
    const b = Float32Array.of(1e-30, -1e-30);
    expect(conjugateGradientMkernelFused(A, new Float32Array(2), b, 2, { tol: 0, maxIterations: 3 })).toBe(1);
    expect(spy).toHaveBeenCalledWith('Error: conjugate_gradient: unexpected length 0 vector\n');
  });

  it('stops quietly when p.Ap is zero', () => {
    const x = new Float32Array(2);
    const A = pack([[1, 0], [0, 1]]);
    // a residual of 1e-30 has p.Ap = 1e-60 -> 0 in float products
    expect(conjugateGradientMkernelFused(A, x, Float32Array.of(1e-30, -1e-30), 2, { tol: 0, maxIterations: 3 })).toBe(0);
    expect([...x]).toEqual([0, 0]);
  });
});
