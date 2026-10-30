// SPDX-License-Identifier: EPL-2.0

/**
 * Resistor-circuit current model for node distances, an alternative to
 * shortest paths. Only `solveCircuit` is ported (`circuit_model`, which works
 * on graph_t, is not used by the stress models).
 * @see lib/neatogen/circuit.c
 */

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
