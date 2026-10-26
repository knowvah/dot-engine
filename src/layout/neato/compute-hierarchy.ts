// SPDX-License-Identifier: EPL-2.0

/**
 * Partition graph nodes into levels by the minimizer of the hierarchy energy.
 *
 * @see lib/neatogen/compute_hierarchy.c
 */

import type { VtxData } from './dijkstra.js';
import { quicksortPlace } from './kkutils.js';
import { computeYCoords } from './opt-arrangement.js';

/** Result of `compute_hierarchy` on success (C return value 0). */
export interface Hierarchy {
  /** Node ids sorted by `y`; level `k` is `ordering[levels[k-1]..levels[k])`. */
  ordering: Int32Array;
  /** Start index (in `ordering`) of every level but the first; `[n]` when there is one level. */
  levels: Int32Array;
  /** C `*num_levelsp` (0 means a single level, `levels = [n]`). */
  numLevels: number;
}

/**
 * Count the gaps wider than `tol` between consecutive sorted `y` values.
 * @see lib/neatogen/compute_hierarchy.c:compute_hierarchy
 */
function countLevels(y: Float64Array, ordering: Int32Array, n: number, tol: number): number {
  let numLevels = 0;
  for (let i = 1; i < n; i++) {
    if (y[ordering[i]!]! - y[ordering[i - 1]!]! > tol) numLevels++;
  }
  return numLevels;
}

/**
 * Fill the level start indices (a SINGLE_LINK clustering).
 * @see lib/neatogen/compute_hierarchy.c:compute_hierarchy
 */
function fillLevels(
  y: Float64Array,
  ordering: Int32Array,
  n: number,
  tol: number,
  numLevels: number,
): Int32Array {
  if (numLevels === 0) {
    const levels = new Int32Array(1);
    levels[0] = n;
    return levels;
  }
  const levels = new Int32Array(numLevels);
  let count = 0;
  for (let i = 1; i < n; i++) {
    if (y[ordering[i]!]! - y[ordering[i - 1]!]! > tol) levels[count++] = i;
  }
  return levels;
}

/**
 * Order the nodes by `y` (computed by `computeYCoords` unless `given` is
 * supplied) and cut a new level wherever consecutive values differ by more
 * than `max(absTol, relTol * span / (n - 1))`. Returns `null` where C returns
 * nonzero (`compute_y_coords` failed).
 * @see lib/neatogen/compute_hierarchy.c:compute_hierarchy
 */
export function computeHierarchy(
  graph: VtxData[],
  n: number,
  absTol: number,
  relTol: number,
  given: Float64Array | null,
): Hierarchy | null {
  let y: Float64Array;
  if (given) {
    y = given;
  } else {
    y = new Float64Array(n);
    if (computeYCoords(graph, n, y, n)) return null;
  }
  const ordering = new Int32Array(n);
  for (let i = 0; i < n; i++) ordering[i] = i;
  quicksortPlace(y, ordering, n);

  const hierarchySpan = y[ordering[n - 1]!]! - y[ordering[0]!]!;
  // C `MAX(a, b)` is `a > b ? a : b` (differs from Math.max only for NaN operands)
  const relative = relTol * hierarchySpan / (n - 1);
  const tol = absTol > relative ? absTol : relative;
  const numLevels = countLevels(y, ordering, n, tol);
  return { ordering, levels: fillLevels(y, ordering, n, tol, numLevels), numLevels };
}
