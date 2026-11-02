// SPDX-License-Identifier: EPL-2.0

/**
 * Matrix inversion by LU decomposition (Ken Turkowski).
 * @see lib/neatogen/matinv.c
 */

import { luDecompose, luSolve, luFree, type LuT } from './lu.js';

/**
 * Invert the leading n x n block of `A` into `Ainv`: solve for one row of
 * `Ainv` per unit vector, then transpose. 1 on success, 0 when singular
 * (`Ainv` untouched).
 * @see lib/neatogen/matinv.c:matinv
 */
export function matinv(A: readonly ArrayLike<number>[], Ainv: Float64Array[], n: number): 0 | 1 {
  /* Decompose matrix into L and U triangular matrices */
  const lu: LuT = { lu: null, ps: null };
  if (luDecompose(lu, A, n) === 0) return 0; // singular

  /* Invert matrix by solving n simultaneous equations n times */
  for (let i = 0; i < n; i++) {
    luSolve(lu, Ainv[i]!, i, n); // into a row of Ainv: fix later
  }
  luFree(lu);

  /* Transpose matrix */
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) {
      const t = Ainv[i]![j]!;
      Ainv[i]![j] = Ainv[j]![i]!;
      Ainv[j]![i] = t;
    }
  }

  return 1;
}
