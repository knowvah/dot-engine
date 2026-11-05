// SPDX-License-Identifier: EPL-2.0
// lib/neatogen/matrix_ops.c's dense routines against the native values of
// __fixtures__/dim/smart-units.json (plans/post-16-1-followups-10/harness/T7/smart-units-harness.c), bit for bit: the
// fused and blocked sums decide the last bits.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { crand, csrand } from '../../common/crand.js';
import { fma } from '../../common/fma.js';
import type { VtxData } from './dijkstra.js';
import {
  multDenseMat, multDenseMatD, multSparseDenseMatTranspose, powerIteration,
  rightMultWithVectorD, rightMultWithVectorTranspose,
} from './matrix-ops-dense.js';

const NATIVE = JSON.parse(readFileSync(new URL('./__fixtures__/dim/smart-units.json', import.meta.url), 'utf8')) as {
  powerSym: PowerCase; powerRank1: PowerCase; powerZero: PowerCase; powerRotation: PowerCase;
  multDense: { c: number[][]; d: number[][] };
  multSparse: { c: number[][] };
  rightT: { r: number[] };
};
interface PowerCase { eigs: number[][]; ok: boolean; next: number }

/** The harness's input fill. */
const val = (i: number, j: number): number => ((i * 37 + j * 91 + 11) % 101) / 7.0 - 6.3;
const R = 9;
const C = 11;
const S = 10;
const rows = (r: number, c: number): number[][] => Array.from({ length: r }, () => new Array<number>(c).fill(0));
const toF64 = (m: number[][]): Float64Array[] => m.map((r) => Float64Array.from(r));
const A = (): Float64Array[] => toF64(rows(R, C).map((r, i) => r.map((_, j) => val(i, j))));
const B = (): Float32Array[] => rows(C, S).map((r, i) => Float32Array.from(r.map((_, j) => val(i + 7, j + 2))));
const list = (m: readonly ArrayLike<number>[]): number[][] => m.map((r) => Array.from(r));

/** The harness's 7-node graph, row 1's weights 1.1f * j. */
function graph7(): VtxData[] {
  const adj = [[1], [0, 2, 6], [1, 3, 6], [2, 4], [3, 5], [4], [1, 2]];
  return adj.map((a, i) => ({
    nedges: a.length + 1,
    edges: [i, ...a],
    ewgts: [0, ...a.map((_, j) => (i === 1 ? Math.fround(Math.fround(1.1) * (j + 1)) : 1))],
  }));
}

describe('dense products', () => {
  it('mult_dense_mat rounds each fused sum to float', () => {
    expect(list(multDenseMat(A(), B(), R, C, S))).toEqual(NATIVE.multDense.c);
  });

  it('mult_dense_mat_d keeps each fused sum', () => {
    expect(list(multDenseMatD(A(), B(), R, C, S))).toEqual(NATIVE.multDense.d);
  });

  it('mult_sparse_dense_mat_transpose', () => {
    const t = toF64(rows(3, 7).map((r, i) => r.map((_, j) => val(i, j + 2))));
    expect(list(multSparseDenseMatTranspose(graph7(), t, 7, 3))).toEqual(NATIVE.multSparse.c);
  });

  it('right_mult_with_vector_d: 8 unfused terms, then fused, as its inlined copies', () => {
    // A harness call site compiles its own scalar copy, so native is not read here:
    // power_iteration's copy is checked bit for bit below, and the subspace loop's
    // has the same shape in the disassembly of _stress_majorization_kD_mkernel.
    const v = Float64Array.from({ length: C }, (_, i) => val(i + 11, 1));
    const res = new Float64Array(R);
    rightMultWithVectorD(A(), R, C, v, res);
    const expected = A().map((row) => {
      let sum = 0;
      for (let j = 0; j < 8; j++) sum += row[j]! * v[j]!;
      for (let j = 8; j < C; j++) sum = fma(row[j]!, v[j]!, sum);
      return sum;
    });
    expect(Array.from(res)).toEqual(expected);
    expect(expected[0]).toBeCloseTo(29.2961224489796, 10);
  });

  it('right_mult_with_vector_transpose: all fused', () => {
    const v = Float64Array.from({ length: R }, (_, i) => val(i + 2, 4));
    const res = new Float64Array(C);
    rightMultWithVectorTranspose(A(), C, R, v, res);
    expect(Array.from(res)).toEqual(NATIVE.rightT.r);
  });
});

describe('power_iteration', () => {
  const N = 9;
  const run = (mat: Float64Array[], n: number, neigs: number): { eigs: number[][]; ok: boolean; next: number } => {
    const eigs = Array.from({ length: Math.max(neigs, n) }, () => new Float64Array(n));
    csrand(1);
    const ok = powerIteration(mat, n, neigs, eigs);
    return { eigs: list(eigs.slice(0, Math.min(neigs, n))), ok, next: crand() };
  };
  const matrix = (f: (i: number, j: number) => number): Float64Array[] =>
    toF64(rows(N, N).map((r, i) => r.map((_, j) => f(i, j))));

  it('a symmetric matrix, its top eigenvectors, out of iterations on the last', () => {
    const sym = matrix((i, j) => (j <= i ? val(i, j) : val(j, i)));
    expect(run(sym, N, 3)).toEqual(NATIVE.powerSym);
  });

  it('clamps neigs to n, and a rank-1 matrix reaches the null space', () => {
    expect(run(matrix((i, j) => (i + 1) * (j + 1)), N, 20)).toEqual(NATIVE.powerRank1);
  });

  it('the zero matrix leaves at the first eigenvector', () => {
    expect(run(matrix(() => 0), N, 2)).toEqual(NATIVE.powerZero);
  });

  it('a rotation never settles and reports it', () => {
    const rotation = [Float64Array.of(0, 1), Float64Array.of(-1, 0)];
    expect(run(rotation, 2, 1)).toEqual(NATIVE.powerRotation);
    expect(NATIVE.powerRotation.ok).toBe(false);
  });

  it('exchanges eigenvectors when a later eval is larger', () => {
    // no eigenvalue settles for the rotation block, so eval 0 of the first is
    // overtaken by the diagonal block's; the order follows the evals
    const m = [
      Float64Array.of(0, 1, 0), Float64Array.of(-1, 0, 0), Float64Array.of(0, 0, 5),
    ];
    const eigs = [new Float64Array(3), new Float64Array(3)];
    csrand(1);
    powerIteration(m, 3, 2, eigs);
    expect(Math.abs(eigs[0]![2]!)).toBeCloseTo(1, 2);
  });

  it('draws another guess when the first is colinear with a previous eigenvector', () => {
    // the only direction left after e0 and e1 is orthogonal to a 2-D guess space:
    // n = neigs = 1 can always guess a nonzero value except rand() % 100 == 0
    const eig = [new Float64Array(1)];
    let seed = 1;
    for (; seed < 100000; seed++) {
      csrand(seed);
      if (crand() % 100 === 0) break;
    }
    csrand(seed);
    expect(powerIteration([Float64Array.of(2)], 1, 1, eig)).toBe(true);
    expect(Math.abs(eig[0]![0]!)).toBe(1);
  });
});
