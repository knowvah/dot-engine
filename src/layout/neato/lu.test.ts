// SPDX-License-Identifier: EPL-2.0

/**
 * lu.c: decomposition, singular paths and the solve, against matinv's native
 * results (fixtures captured from the oracle's libneatogen).
 *
 * @see lib/neatogen/lu.c
 */

import { describe, it, expect } from 'vitest';
import { luDecompose, luSolve, luFree, newArray, type LuT } from './lu.js';
import { MATINV_CASES } from './__fixtures__/stress-models.js';

function caseNamed(name: string): (typeof MATINV_CASES)[number] {
  const c = MATINV_CASES.find((m) => m.name === name);
  if (c === undefined) throw new Error(`no matinv case ${name}`);
  return c;
}

function rows(a: readonly (readonly number[])[]): Float64Array[] {
  const n = a.length;
  const m = newArray(n, n, 0.0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) m[i]![j] = a[i]![j]!;
  return m;
}

describe('newArray', () => {
  it('fills an m x n array of rows with the initial value', () => {
    const m = newArray(2, 3, 1.5);
    expect(m.map((r) => Array.from(r))).toEqual([[1.5, 1.5, 1.5], [1.5, 1.5, 1.5]]);
  });

  it('backs every row with one buffer, as stuff.c:new_array does', () => {
    const m = newArray(2, 2, 0.0);
    expect(m[1]!.buffer).toBe(m[0]!.buffer);
    expect(m[1]!.byteOffset).toBe(2 * 8);
  });
});

describe('luDecompose', () => {
  it('records the partial-pivoting sequence', () => {
    const lu: LuT = { lu: null, ps: null };
    expect(luDecompose(lu, rows(caseNamed('pivoting').a), 3)).toBe(1);
    expect(Array.from(lu.ps!)).toEqual([1, 2, 0]);
    // pivot row (ps[0] = 1) keeps its first entry; row 2 stores mult = 1/3
    expect(lu.lu![1]![0]).toBe(3);
    expect(lu.lu![2]![0]).toBe(1 / 3);
  });

  it('returns 0 and frees the state on a zero row', () => {
    const lu: LuT = { lu: null, ps: null };
    expect(luDecompose(lu, rows(caseNamed('zero row').a), 3)).toBe(0);
    expect(lu).toEqual({ lu: null, ps: null });
  });

  it('returns 0 on a zero column', () => {
    const lu: LuT = { lu: null, ps: null };
    expect(luDecompose(lu, rows(caseNamed('zero column').a), 3)).toBe(0);
    expect(lu.lu).toBeNull();
  });

  it('returns 0 when the last pivot vanishes', () => {
    const lu: LuT = { lu: null, ps: null };
    expect(luDecompose(lu, rows(caseNamed('singular last pivot').a), 2)).toBe(0);
    expect(lu.ps).toBeNull();
  });

  it('ignores a NaN entry when equilibrating, as C fmax does', () => {
    const lu: LuT = { lu: null, ps: null };
    // fmax(1, NaN) = 1, so row 0 is not "zero"; Math.max would give NaN here
    expect(luDecompose(lu, rows([[1, Number.NaN], [0, 2]]), 2)).toBe(1);
    expect(Array.from(lu.ps!)).toEqual([0, 1]);
    expect(lu.lu![1]![1]).toBeNaN();
  });
});

describe('luSolve', () => {
  it('solves A x = e_bi into x (a column of the native inverse)', () => {
    const c = caseNamed('random 12x12');
    const lu: LuT = { lu: null, ps: null };
    expect(luDecompose(lu, rows(c.a), 12)).toBe(1);
    const x = new Float64Array(12);
    luSolve(lu, x, 5, 12);
    expect(Array.from(x)).toEqual(c.inv.map((r) => r[5]));
  });
});

describe('luFree', () => {
  it('releases the matrix and pivot sequence', () => {
    const lu: LuT = { lu: newArray(1, 1, 0.0), ps: new Int32Array(1) };
    luFree(lu);
    expect(lu).toEqual({ lu: null, ps: null });
  });

  it('is a no-op on NULL', () => {
    expect(luFree(null)).toBeUndefined();
  });
});
