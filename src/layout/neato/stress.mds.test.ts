// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { VtxData } from './dijkstra.js';
import { mdsModel } from './stress.js';

/** The triangle 0-1-2 with edge lengths 0-1: 1, 1-2: 1, 0-2: `long`. */
function triangle(long: number): VtxData[] {
  return [
    { nedges: 3, edges: [0, 1, 2], ewgts: [0, 1, long] },
    { nedges: 3, edges: [1, 0, 2], ewgts: [0, 1, 1] },
    { nedges: 3, edges: [2, 0, 1], ewgts: [0, long, 1] },
  ];
}

/** Packed upper triangle index of (i, j), i <= j, for n = 3. */
const AT = { '00': 0, '01': 1, '02': 2, '11': 3, '12': 4, '22': 5 } as const;

describe('mdsModel (stress.c)', () => {
  it('returns null when the graph carries no lengths (graph->ewgts == NULL)', () => {
    const bare: VtxData[] = [{ nedges: 1, edges: [0], ewgts: [] }];
    expect(mdsModel(bare, 1)).toBeNull();
  });

  it('keeps the shortest path for non-edges and writes the lengths over edges', () => {
    const Dij = mdsModel(triangle(5), 3)!;
    expect(Dij).toBeInstanceOf(Float32Array);
    expect(Dij[AT['01']]).toBe(1);
    expect(Dij[AT['12']]).toBe(1);
    expect(Dij[AT['02']]).toBe(5); // the shortest path is 2; the user length wins
    expect(Dij[AT['00']]).toBe(0);
  });

  it('rounds a double length to float, as the Float32 matrix stores it', () => {
    const Dij = mdsModel(triangle(0.1), 3)!;
    expect(Dij[AT['02']]).toBe(Math.fround(0.1));
  });
});
