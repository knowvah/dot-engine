// SPDX-License-Identifier: EPL-2.0

/**
 * Optimal y arrangement of a directed graph: solves `L*y = b` by conjugate
 * gradient over the unit-weight Laplacian, where `b` is the balance vector of
 * the edge directions (`edists`).
 *
 * @see lib/neatogen/opt_arrangement.c
 */

import { conjugateGradient } from './conjgrad.js';
import type { VtxData } from './dijkstra.js';
import { initVecOrth1 } from './matrix-ops.js';

/** `vtx_data` with the `DIGCOLA` `edists` field (`int8_t *`, `NULL` when absent). */
export interface DirectedVtxData extends VtxData {
  edists?: ArrayLike<number> | null;
}

/** `#define hierarchy_cg_tol` @see lib/neatogen/opt_arrangement.c */
const HIERARCHY_CG_TOL = 1e-3;

/**
 * Build `b` with `-b[i] = sum_j -w_ij * delta_ij` (the balance vector; the
 * matrix is -L, so `-Lx = -b` is solved). `b` is left untouched when node 0 has
 * no `edists` (C: `continue`, `b` stays calloc-zero).
 * @see lib/neatogen/opt_arrangement.c:construct_b
 */
export function constructB(graph: DirectedVtxData[], n: number, b: Float64Array): void {
  for (let i = 0; i < n; i++) {
    if (graph[0]!.edists == null) continue;
    let bI = 0;
    const node = graph[i]!;
    for (let j = 1; j < node.nedges; j++) { // skip the self loop
      // C ewgts is float; edists is int8_t
      bI += Math.fround(Math.fround(node.ewgts[j]!) * node.edists![j]!);
    }
    b[i] = bI;
  }
}

/**
 * Replace every row's edge weights (lengths) by uniform Laplacian weights:
 * `-(nedges-1)` on the diagonal, 1 off it. Returns the replaced rows' weights.
 * @see lib/neatogen/opt_arrangement.c:compute_y_coords
 */
function setUniformWeights(graph: VtxData[], n: number): number[][] {
  const old: number[][] = [];
  for (let i = 0; i < n; i++) {
    const node = graph[i]!;
    old.push(node.ewgts);
    const weights = new Array<number>(node.nedges).fill(1);
    weights[0] = -(node.nedges - 1);
    node.ewgts = weights;
  }
  return old;
}

/**
 * Find the y coordinates of a directed graph by solving `L*y = b`. Starts from
 * a `rand()`-seeded vector, so the result depends on the libc rand stream
 * position (`common/crand`). Returns 1 when conjugate gradient fails.
 * @see lib/neatogen/opt_arrangement.c:compute_y_coords
 */
export function computeYCoords(
  graph: VtxData[],
  n: number,
  yCoords: Float64Array,
  maxIterations: number,
): 0 | 1 {
  let rv: 0 | 1 = 0;
  const b = new Float64Array(n);

  constructB(graph, n, b);
  initVecOrth1(n, yCoords);

  // replace original edge weights (which are lengths) with uniform weights
  const oldEwgts = setUniformWeights(graph, n);
  // C tests `< 0` although conjugate_gradient returns 0 or 1, so rv never becomes 1
  if (conjugateGradient(graph, yCoords, b, n, HIERARCHY_CG_TOL, maxIterations) < 0) {
    rv = 1;
  }
  // restore original edge weights
  for (let i = 0; i < n; i++) graph[i]!.ewgts = oldEwgts[i]!;
  return rv;
}
