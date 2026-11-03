// SPDX-License-Identifier: EPL-2.0

/**
 * Resistor-circuit current model for node distances, an alternative to
 * shortest paths. `circuitModel` here is circuit.c's `circuit_model` (`GD_dist`
 * from a graph, KK path); `stress-models.ts`'s `circuitModel` is stress.c's
 * (float `Dij` from `vtx_data`, stress path). Both use `solveCircuit`.
 * @see lib/neatogen/circuit.c
 */

import type { Graph } from '../../model/graph.js';
import type { Edge } from '../../model/edge.js';
import { newArray } from './lu.js';
import { matinv } from './matinv.js';

/**
 * Set each diagonal entry of the conductance matrix `Gm` to minus the sum of
 * its row, then invert the leading (nG-1) minor into `GmInv` ("ignore nth
 * node"). 1 on success, 0 when singular (e.g. the graph is disconnected).
 * C's `Verbose` line "Calculating circuit model" is not ported (the port has
 * no Verbose).
 * @see lib/neatogen/circuit.c:solveCircuit
 */
export function solveCircuit(nG: number, Gm: Float64Array[], GmInv: Float64Array[]): 0 | 1 {
  /* set diagonal entries to sum of conductances but ignore nth node */
  for (let i = 0; i < nG; i++) {
    const row = Gm[i]!;
    let sum = 0;
    for (let j = 0; j < nG; j++) {
      if (i !== j) sum += row[j]!;
    }
    row[i] = -sum;
  }
  return matinv(Gm, GmInv, nG - 1);
}

/**
 * The conductances `circuit_model` gives `solveCircuit`. C indexes `Gm` by the
 * 1-based `AGSEQ` (`node.id + 1`). `new_array` is one contiguous block behind row
 * pointers, so `Gm[i][j]` is flat cell `i*nG+j`: j == nG lands in row i+1 column
 * 0, and a seq past nG (a pack=true component) can land anywhere in the block.
 * A cell past the block is dropped, the model `kk-paths.ts:mdsModel` uses for
 * the same overflow: i >= nG reads past C's row pointers and usually crashes
 * (exit 139), and a run that survives writes outside the block. Row 0 is never
 * written, which is why `solveCircuit` fails on every graph.
 * @see lib/neatogen/circuit.c:circuit_model (circuit.c:40, 43-53)
 */
export function circuitConductances(g: Graph, nG: number, lens: ReadonlyMap<Edge, number>): Float64Array[] {
  const Gm = newArray(nG, nG, 0.0);
  const cells = new Float64Array(Gm[0]!.buffer);
  /* set non-diagonal entries */
  for (const v of g.nodes.values()) {
    for (const e of [...v.outEdges(g), ...v.inEdges(g)]) { // agfstedge order
      const i = e.tail.id + 1;
      const j = e.head.id + 1;
      if (i === j) continue;
      /* conductance is 1/resistance */
      const conductance = -1.0 / lens.get(e)!; /* negate */
      for (const k of [j * nG + i, i * nG + j]) if (k < cells.length) cells[k] = conductance;
    }
  }
  return Gm;
}

/**
 * Fill `GD_dist` (flat, nG*nG) from the inverted conductance matrix.
 * @see lib/neatogen/circuit.c:circuit_model (circuit.c:57-63)
 */
export function circuitDistances(GmInv: readonly Float64Array[], nG: number, dist: Float64Array): void {
  for (let i = 0; i < nG; i++) {
    for (let j = 0; j < nG; j++) {
      dist[i * nG + j] = GmInv[i]![i]! + GmInv[j]![j]! - 2.0 * GmInv[i]![j]!;
    }
  }
}

/**
 * Overwrite `GD_dist` with resistance distances; true on success, false with
 * `dist` untouched when `solveCircuit` fails. It always fails for nG >= 2 because
 * row 0 of `Gm` is never written (see {@link circuitConductances}), so native KK
 * `model=circuit` always falls back to shortest paths. kkNeato's guard keeps
 * nG = 1 out (`lu_decompose` with n = 0 is undefined behaviour in C).
 *
 * `dist` and `lens` are parameters, not C's `GD_dist(g)` and `ED_dist(e)`:
 * `kk.ts` holds both per run (`KkState.dist`, `setEdgeLens`), not on the graph.
 * @see lib/neatogen/circuit.c:circuit_model
 */
export function circuitModel(g: Graph, nG: number, dist: Float64Array, lens: ReadonlyMap<Edge, number>): boolean {
  const Gm = circuitConductances(g, nG, lens);
  const GmInv = newArray(nG, nG, 0.0);

  const rv = solveCircuit(nG, Gm, GmInv);

  if (rv) circuitDistances(GmInv, nG, dist);
  return rv === 1;
}
