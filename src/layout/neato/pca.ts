// SPDX-License-Identifier: EPL-2.0

/**
 * Principal component analysis of a high-dimensional embedding.
 *
 * @see lib/neatogen/pca.c
 */

import { fma } from '../../common/fma.js';
import { closestPairs2Graph } from './closest.js';
import { multDenseMatD, multSparseDenseMatTranspose, powerIteration } from './matrix-ops-dense.js';

/** `num_pairs` @see lib/neatogen/pca.c */
const NUM_PAIRS = 4;

/**
 * Project the `dim`-D `coords` onto their `newDim` principal axes. `coords[i][k]`
 * products are C `int` arithmetic, which wraps on the oracle's `mul.4s`.
 * @see lib/neatogen/pca.c:PCA_alloc
 */
export function pcaAlloc(
  coords: readonly Int32Array[], dim: number, n: number, newCoords: readonly Float64Array[], newDim: number,
): void {
  const eigs = Array.from({ length: newDim }, () => new Float64Array(dim));
  const DD = Array.from({ length: dim }, () => new Float64Array(dim)); // dim×dim: coords×coordsᵀ
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) sum += Math.imul(coords[i]![k]!, coords[j]![k]!);
      DD[i]![j] = DD[j]![i] = sum;
    }
  }

  powerIteration(DD, dim, newDim, eigs);

  for (let j = 0; j < newDim; j++) {
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let k = 0; k < dim; k++) sum = fma(coords[k]![i]!, eigs[j]![k]!, sum);
      newCoords[j]![i] = sum;
    }
  }
}

/**
 * Given that the first projection of `coords` is `coords[0]`, compute another
 * projection direction that scatters points close in `coords[0]`. Returns false
 * when power iteration did not converge.
 * @see lib/neatogen/pca.c:iterativePCA_1D
 */
export function iterativePCA1D(
  coords: readonly Float64Array[], dim: number, n: number, newDirection: Float64Array,
): boolean {
  // the nodes that were close in coords[0], as a Laplacian
  const laplacian = closestPairs2Graph(coords[0]!, n, NUM_PAIRS * n);
  // coords*Lap*coords^T
  const mat1 = multSparseDenseMatTranspose(laplacian, coords, n, dim);
  const mat = multDenseMatD(coords, mat1, dim, n, dim);
  return powerIteration(mat, dim, 1, [newDirection]);
}
