// SPDX-License-Identifier: EPL-2.0

/**
 * matinv.c against the oracle's own matinv (native harness fixtures). The
 * 12x12 and 20x20 cases cross clang's 8-wide vectorised dot products in
 * lu_solve, which are unfused, while the scalar tails are fused.
 *
 * @see lib/neatogen/matinv.c:matinv
 */

import { describe, it, expect } from 'vitest';
import { matinv } from './matinv.js';
import { newArray } from './lu.js';
import { MATINV_CASES } from './__fixtures__/stress-models.js';

describe('matinv', () => {
  for (const c of MATINV_CASES) {
    it(`matches native: ${c.name}`, () => {
      const n = c.a.length;
      const a = newArray(n, n, 0.0);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) a[i]![j] = c.a[i]![j]!;
      const ainv = newArray(n, n, 0.0);
      expect(matinv(a, ainv, n)).toBe(c.rv);
      expect(ainv.map((r) => Array.from(r))).toEqual(c.inv);
    });
  }

  it('leaves A untouched', () => {
    const a = newArray(2, 2, 0.0);
    a[0]![0] = 2; a[0]![1] = 1; a[1]![0] = 1; a[1]![1] = 1;
    matinv(a, newArray(2, 2, 0.0), 2);
    expect(a.map((r) => Array.from(r))).toEqual([[2, 1], [1, 1]]);
  });
});
