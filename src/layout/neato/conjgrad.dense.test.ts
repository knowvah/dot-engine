// SPDX-License-Identifier: EPL-2.0
// conjugate_gradient_d against native graphviz 16.1.1, bit for bit. The vectors
// of __fixtures__/conjgrad-d.json come from the oracle's own libneatogen.a
// (plans/issue-156-neato-double-laplacian/harness/native, `cgd` mode): random
// graph Laplacians and dense SPD matrices. The first two are the systems on
// which no tuple of reduction widths in {1, 4, 8, 16}^5 other than the oracle's
// reproduces x, so they pin every site's contraction.
// @see lib/neatogen/conjgrad.c:conjugate_gradient_d
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { conjugateGradientD } from './conjgrad.js';

interface NativeSolve {
  name: string;
  n: number;
  ortho1: boolean;
  tol: number;
  A: number[][];
  x0: number[];
  b: number[];
  rv: number;
  /** Native x after `max_iterations = n`. */
  x: number[];
  /** Iterations the native run took. */
  iterations: number;
  /** Native x after `max_iterations = 2`. */
  xAfter2: number[];
}

const NATIVE = JSON.parse(
  readFileSync(new URL('./__fixtures__/conjgrad-d.json', import.meta.url), 'utf8'),
) as NativeSolve[];

const matrix = (c: NativeSolve): Float64Array[] => c.A.map((row) => Float64Array.from(row));

afterEach(() => vi.restoreAllMocks());

describe('conjugateGradientD per-site contraction', () => {
  it('has systems with and without ortho1, and sizes off the 4- and 8-wide blocks', () => {
    expect(NATIVE.map((c) => [c.name, c.n, c.ortho1])).toEqual([
      ['lap-n12-o-0', 12, true], ['lap-n16-o-0', 16, true], ['spd-n7-x-0', 7, false],
      ['spd-n13-x-1', 13, false], ['lap-n22-x-1', 22, false],
    ]);
  });

  it.each(NATIVE.map((c) => [c.name, c] as const))('matches the native solve (%s)', (_name, c) => {
    const x = Float64Array.from(c.x0);
    const rv = conjugateGradientD(matrix(c), x, Float64Array.from(c.b), c.n, {
      tol: c.tol, maxIterations: c.n, ortho1: c.ortho1,
    });
    expect(rv).toBe(c.rv);
    expect(Array.from(x)).toEqual(c.x);
  });

  it.each(NATIVE.map((c) => [c.name, c] as const))(
    'stops at max_iterations: the last iteration skips the residual update (%s)',
    (_name, c) => {
      expect(c.iterations).toBeGreaterThan(2);
      const x = Float64Array.from(c.x0);
      expect(conjugateGradientD(matrix(c), x, Float64Array.from(c.b), c.n, {
        tol: c.tol, maxIterations: 2, ortho1: c.ortho1,
      })).toBe(0);
      expect(Array.from(x)).toEqual(c.xAfter2);
      expect(c.xAfter2).not.toEqual(c.x);
    },
  );
});

describe('conjugateGradientD', () => {
  it('centres x and leaves b alone under ortho1 (C orthogonalizes a copy of b)', () => {
    const A = [Float64Array.of(1, -1), Float64Array.of(-1, 1)];
    const x = Float64Array.of(3, 5);
    const b = Float64Array.of(4, 0);
    // no iterations: x is only centred
    expect(conjugateGradientD(A, x, b, 2, { tol: 0, maxIterations: 0, ortho1: true })).toBe(0);
    expect(Array.from(x)).toEqual([-1, 1]);
    expect(Array.from(b)).toEqual([4, 0]);
  });

  it('leaves x as given without ortho1', () => {
    const A = [Float64Array.of(1, -1), Float64Array.of(-1, 1)];
    const x = Float64Array.of(3, 5);
    expect(conjugateGradientD(A, x, Float64Array.of(4, 0), 2, { tol: 0, maxIterations: 0, ortho1: false })).toBe(0);
    expect(Array.from(x)).toEqual([3, 5]);
  });

  it('solves the centred system: ortho1 removes the null-space component of b', () => {
    // Laplacian of one edge; b = (4, 0) centres to (2, -2), whose solution is (1, -1)
    const A = [Float64Array.of(1, -1), Float64Array.of(-1, 1)];
    const x = new Float64Array(2);
    expect(conjugateGradientD(A, x, Float64Array.of(4, 0), 2, { tol: 1e-12, maxIterations: 2, ortho1: true })).toBe(0);
    expect(Array.from(x)).toEqual([1, -1]);
  });

  it('stops before the first iteration when the residual is within tol', () => {
    const A = [Float64Array.of(2, 0), Float64Array.of(0, 2)];
    const x = Float64Array.of(1, 1);
    // r = b - A x = (0.5, 0): max |r| is not > tol
    expect(conjugateGradientD(A, x, Float64Array.of(2.5, 2), 2, { tol: 0.5, maxIterations: 5, ortho1: false })).toBe(0);
    expect(Array.from(x)).toEqual([1, 1]);
  });

  it('breaks out when p.Ap is zero', () => {
    const x = new Float64Array(2);
    const zero = [new Float64Array(2), new Float64Array(2)];
    expect(conjugateGradientD(zero, x, Float64Array.of(1, 2), 2, { tol: 0, maxIterations: 5, ortho1: false })).toBe(0);
    expect(Array.from(x)).toEqual([0, 0]);
  });

  it('returns 1 and reports when r.r underflows to zero', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const x = new Float64Array(1);
    const rv = conjugateGradientD([Float64Array.of(1e30)], x, Float64Array.of(1e-170), 1, { tol: 0, maxIterations: 2, ortho1: false });
    expect(rv).toBe(1);
    expect(err).toHaveBeenCalledOnce();
    expect(String(err.mock.calls[0]![0])).toContain('conjugate_gradient: unexpected length 0 vector');
  });
});
