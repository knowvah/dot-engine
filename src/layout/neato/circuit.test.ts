// SPDX-License-Identifier: EPL-2.0

/**
 * circuit.c: `solveCircuit` (the conductance diagonal and the inverse of the
 * leading (nG-1) minor) and `circuit_model` against native (see the fixture
 * header). Native indexes by the 1-based AGSEQ, so `circuit_model` fails on
 * every graph.
 *
 * @see lib/neatogen/circuit.c:solveCircuit
 * @see lib/neatogen/circuit.c:circuit_model
 */

import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { parse } from '../../index.js';
import type { Graph } from '../../model/graph.js';
import type { Edge } from '../../model/edge.js';
import { circuitConductances, circuitDistances, circuitModel, solveCircuit } from './circuit.js';
import { lenattr } from './edge-len.js';
import { newArray } from './lu.js';
import { CIRCUIT_CASES } from './__fixtures__/kk-models.js';

const MODELS = new URL('./__fixtures__/models/', import.meta.url);
const INITIAL_DIST = 5.5;

/** `ED_dist` of every edge, as `scan_graph_mode` sets it. */
function edgeLens(g: Graph): Map<Edge, number> {
  return new Map(g.edges.map((e) => [e, lenattr(e, g)]));
}

/** A row-major copy of `newArray` rows. */
function flatten(rows: readonly Float64Array[]): number[] {
  return rows.flatMap((r) => Array.from(r));
}

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

describe('circuitConductances', () => {
  it.each(CIRCUIT_CASES.map((c) => [c.name, c] as const))(
    '%s: Gm matches the matrix native hands to matinv',
    (_name, c) => {
      const g = parse(c.source);
      const gm = circuitConductances(g, c.n, edgeLens(g));
      expect(solveCircuit(c.n, gm, newArray(c.n, c.n, 0.0))).toBe(c.rv);
      expect(flatten(gm)).toEqual(c.gm);
    },
  );

  it('models a seq past nG on the flat block: inside it lands in the next row, past it drops', () => {
    // a=1, b=2, c=3, d=4 under nG=3, as a pack=true component would see them.
    const g = parse('graph { a; b; c; d; a -- d [len=2]; b -- d [len=4]; a -- c [len=8] }');
    const gm = circuitConductances(g, 3, edgeLens(g));
    // a -- d: Gm[1][4] is cell 7, Gm[4][1] is cell 13 and drops.
    // b -- d: Gm[2][4] is cell 10 and Gm[4][2] is cell 14, both drop.
    // a -- c: Gm[1][3] is cell 6, Gm[3][1] is cell 10 and drops.
    expect(flatten(gm)).toEqual([0, 0, 0, 0, 0, 0, -0.125, -0.5, 0]);
  });
});

describe('circuitDistances', () => {
  it('writes the resistance distance from the inverse into the flat matrix', () => {
    // inverse of the path 0 - 1 - 2's minor, from the solveCircuit test above
    const inv = [[2, 1, 0], [1, 1, 0], [0, 0, 0]].map((r) => Float64Array.from(r));
    const dist = new Float64Array(9).fill(INITIAL_DIST);
    circuitDistances(inv, 3, dist);
    expect(Array.from(dist)).toEqual([0, 1, 2, 1, 0, 1, 2, 1, 0]);
  });
});

describe('circuitModel', () => {
  it.each(CIRCUIT_CASES.map((c) => [c.name, c] as const))(
    '%s: returns false and leaves GD_dist alone, as native',
    (_name, c) => {
      expect(c.rv).toBe(0);
      const g = parse(c.source);
      const dist = Float64Array.from(c.before);
      expect(circuitModel(g, c.n, dist, edgeLens(g))).toBe(false);
      expect(Array.from(dist)).toEqual(c.after);
    },
  );

  it('fails on models/kk-disc-circuit, whose native warning is the fallback branch', () => {
    // No harness run survives this graph (Gm[nG]); the oracle's dot survives
    // about half its runs and always takes the circuit_model == 0 branch.
    const stderr = readFileSync(new URL('kk-disc-circuit.xdot.stderr', MODELS), 'utf8');
    expect(stderr.startsWith('Warning: graph G is disconnected.')).toBe(true);
    const g = parse(readFileSync(new URL('kk-disc-circuit.gv', MODELS), 'utf8'));
    const n = g.nodes.size;
    const dist = new Float64Array(n * n).fill(INITIAL_DIST);
    expect(circuitModel(g, n, dist, edgeLens(g))).toBe(false);
    expect(Array.from(dist)).toEqual(new Array<number>(n * n).fill(INITIAL_DIST));
  });
});
