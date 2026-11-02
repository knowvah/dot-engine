// SPDX-License-Identifier: EPL-2.0

/**
 * circuit.c:solveCircuit — the conductance diagonal and the inverse of the
 * leading (nG-1) minor.
 *
 * @see lib/neatogen/circuit.c:solveCircuit
 */

import { describe, it, expect } from 'vitest';
import { solveCircuit } from './circuit.js';
import { newArray } from './lu.js';

/** Conductance matrix with -1 off the diagonal for each undirected edge. */
function conductance(nG: number, edges: readonly (readonly [number, number])[]): Float64Array[] {
  const gm = newArray(nG, nG, 0.0);
  for (const [i, j] of edges) {
    gm[i]![j] = -1.0;
    gm[j]![i] = -1.0;
  }
  return gm;
}

describe('solveCircuit', () => {
  it('sets the diagonal to the summed conductance and inverts the minor', () => {
    const gm = conductance(3, [[0, 1], [1, 2]]);
    const inv = newArray(3, 3, 0.0);
    expect(solveCircuit(3, gm, inv)).toBe(1);
    expect([gm[0]![0], gm[1]![1], gm[2]![2]]).toEqual([1, 2, 1]);
    // the (nG-1) x (nG-1) minor [[1,-1],[-1,2]] inverts to [[2,1],[1,1]];
    // the last row and column are never written
    expect(inv.map((r) => Array.from(r))).toEqual([[2, 1, 0], [1, 1, 0], [0, 0, 0]]);
  });

  it('returns 0 for a disconnected circuit (singular minor)', () => {
    const gm = conductance(4, [[0, 1], [2, 3]]);
    const inv = newArray(4, 4, 0.0);
    expect(solveCircuit(4, gm, inv)).toBe(0);
    expect([gm[0]![0], gm[3]![3]]).toEqual([1, 1]);
  });
});
