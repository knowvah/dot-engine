// SPDX-License-Identifier: EPL-2.0

/**
 * stress.c distance models (subset, circuit) and the kkutils.c neighbour
 * helpers. Packed Dij is compared bit for bit against the oracle's own
 * functions (native harness fixtures, see the fixture header).
 *
 * @see lib/neatogen/stress.c:circuitModel
 * @see lib/neatogen/stress.c:compute_apsp_artificial_weights_packed
 */

import { afterEach, describe, it, expect, vi } from 'vitest';
import type { VtxData } from './dijkstra.js';
import { MODEL_CIRCUIT, MODEL_MDS, MODEL_SHORTPATH, MODEL_SUBSET } from './init.js';
import {
  circuitModel,
  computeApspArtificialWeightsPacked,
  commonNeighbors,
  fillNeighborsVecUnweighted,
  emptyNeighborsVec,
  modelDistances,
  stressModelDij,
} from './stress-models.js';
import { MODEL_CASES, type ModelRow } from './__fixtures__/stress-models.js';

/** Fixture rows to VtxData; C `NULL` ewgts is the port's empty array. */
function toGraph(rows: readonly ModelRow[]): VtxData[] {
  return rows.map((r) => ({
    nedges: r.edges.length,
    edges: [...r.edges],
    ewgts: r.ewgts === null ? [] : [...r.ewgts],
  }));
}

function caseNamed(name: string): (typeof MODEL_CASES)[number] {
  const c = MODEL_CASES.find((m) => m.name === name);
  if (c === undefined) throw new Error(`no model case ${name}`);
  return c;
}

describe('native model cases', () => {
  for (const c of MODEL_CASES) {
    it(`${c.name}: Dij matches native`, () => {
      const graph = toGraph(c.rows);
      const n = graph.length;
      const dij = c.fn === 'subset'
        ? computeApspArtificialWeightsPacked(graph, n)
        : circuitModel(graph, n);
      expect(dij === null ? null : Array.from(dij)).toEqual(c.dij);
      expect(graph[0]!.ewgts.length === 0 ? 1 : 0).toBe(c.ewgts0Null);
      if (c.after !== undefined) {
        expect(graph.map((v) => v.ewgts)).toEqual(c.after.map((r) => r.ewgts));
      }
    });
  }
});

describe('computeApspArtificialWeightsPacked', () => {
  it('restores the caller\'s ewgts arrays (same objects) when they were set', () => {
    const graph = toGraph(caseNamed('subset ipsep').rows);
    const before = graph.map((v) => v.ewgts);
    computeApspArtificialWeightsPacked(graph, graph.length);
    graph.forEach((v, i) => expect(v.ewgts).toBe(before[i]));
  });

  it('leaves graph[0].ewgts NULL and the rest on the freed artificial weights when unweighted', () => {
    const graph = toGraph(caseNamed('subset unweighted').rows);
    computeApspArtificialWeightsPacked(graph, graph.length);
    expect(graph[0]!.ewgts).toEqual([]);
    // C leaves graph[1..n-1].ewgts dangling into the freed buffer; vertex 1 of
    // model-subset (edges 1: 3 4 0) holds its artificial weights
    expect(graph[1]!.ewgts).toEqual([0, 4, 5, 7]);
  });

  it('weights a hop by deg_i + deg_j - 2 * common neighbours', () => {
    // triangle 0-1-2 plus pendant 3 on 0: edge (0,3) = 3 + 1 - 0 = 4
    const graph: VtxData[] = [
      { nedges: 4, edges: [0, 1, 2, 3], ewgts: [] },
      { nedges: 3, edges: [1, 0, 2], ewgts: [] },
      { nedges: 3, edges: [2, 0, 1], ewgts: [] },
      { nedges: 2, edges: [3, 0], ewgts: [] },
    ];
    const dij = computeApspArtificialWeightsPacked(graph, 4);
    // packed row 0: d(0,0..3) = 0, 3, 3, 4 (bfs with int weights)
    expect(Array.from(dij.subarray(0, 4))).toEqual([0, 3, 3, 4]);
  });
});

describe('circuitModel', () => {
  it('returns null for a disconnected graph', () => {
    const graph = toGraph(caseNamed('circuit disconnected').rows);
    expect(circuitModel(graph, graph.length)).toBeNull();
  });

  it('gives effective resistance 2/3 across a triangle edge', () => {
    const graph: VtxData[] = [
      { nedges: 3, edges: [0, 1, 2], ewgts: [] },
      { nedges: 3, edges: [1, 0, 2], ewgts: [] },
      { nedges: 3, edges: [2, 0, 1], ewgts: [] },
    ];
    const dij = circuitModel(graph, 3)!;
    expect(Array.from(dij)).toEqual([0, 2 / 3, 2 / 3, 0, 2 / 3, 0].map(Math.fround));
  });
});

describe('kkutils neighbour helpers', () => {
  const graph: VtxData[] = [
    { nedges: 3, edges: [0, 1, 2], ewgts: [] },
    { nedges: 3, edges: [1, 0, 2], ewgts: [] },
    { nedges: 3, edges: [2, 0, 1], ewgts: [] },
  ];

  it('marks a vertex\'s neighbours but not the vertex itself', () => {
    const vec = new Int32Array(3);
    fillNeighborsVecUnweighted(graph, 0, vec);
    expect(Array.from(vec)).toEqual([0, 1, 1]);
    emptyNeighborsVec(graph, 0, vec);
    expect(Array.from(vec)).toEqual([0, 0, 0]);
  });

  it('counts the neighbours of u that are marked', () => {
    const vec = new Int32Array(3);
    fillNeighborsVecUnweighted(graph, 0, vec);
    expect(commonNeighbors(graph, 1, vec)).toBe(1);
    expect(commonNeighbors(graph, 0, vec)).toBe(2);
  });
});

describe('stressModelDij', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  /** The path 0-1-2, with lengths when `lens` is given. */
  const path3 = (lens?: readonly [number, number]): VtxData[] => [
    { nedges: 2, edges: [0, 1], ewgts: lens ? [0, lens[0]] : [] },
    { nedges: 3, edges: [1, 0, 2], ewgts: lens ? [0, lens[0], lens[1]] : [] },
    { nedges: 2, edges: [2, 1], ewgts: lens ? [0, lens[1]] : [] },
  ];
  /** The triangle 0-1-2 whose edge 0-2 (length 5) is longer than the path around it. */
  const longEdge = (): VtxData[] => [
    { nedges: 3, edges: [0, 1, 2], ewgts: [0, 1, 5] },
    { nedges: 3, edges: [1, 0, 2], ewgts: [0, 1, 1] },
    { nedges: 3, edges: [2, 0, 1], ewgts: [0, 5, 1] },
  ];
  /** The unit triangle: each pair has resistance 2/3. */
  const triangle = (): VtxData[] => [
    { nedges: 3, edges: [0, 1, 2], ewgts: [] },
    { nedges: 3, edges: [1, 0, 2], ewgts: [] },
    { nedges: 3, edges: [2, 0, 1], ewgts: [] },
  ];
  /** The edges 0-1 and 2-3, which pinned nodes can hold in one component. */
  const twoPairs = (): VtxData[] => [
    { nedges: 2, edges: [0, 1], ewgts: [] },
    { nedges: 2, edges: [1, 0], ewgts: [] },
    { nedges: 2, edges: [2, 3], ewgts: [] },
    { nedges: 2, edges: [3, 2], ewgts: [] },
  ];
  const dij = (graph: VtxData[], model: number): number[] =>
    Array.from(stressModelDij(graph, graph.length, model));

  it('shortpath hops when the graph has no ewgts (stress.c:858)', () => {
    expect(dij(path3(), MODEL_SHORTPATH)).toEqual([0, 1, 2, 0, 1, 0]);
  });

  it('shortpath is weighted iff graph->ewgts (stress.c:855); bfs would truncate 2.5', () => {
    expect(dij(path3([2.5, 4]), MODEL_SHORTPATH)).toEqual([0, 2.5, 6.5, 0, 4, 0]);
  });

  it('mds writes each edge length over its shortest path', () => {
    expect(dij(longEdge(), MODEL_SHORTPATH)).toEqual([0, 1, 2, 0, 1, 0]);
    expect(dij(longEdge(), MODEL_MDS)).toEqual([0, 1, 5, 0, 1, 0]);
  });

  it('mds on a graph with no ewgts falls through to shortest paths', () => {
    expect(dij(path3(), MODEL_MDS)).toEqual([0, 1, 2, 0, 1, 0]);
  });

  it('subset takes the artificial weights: each hop of the path is 1 + 2 - 0', () => {
    expect(dij(path3(), MODEL_SUBSET)).toEqual([0, 3, 6, 0, 3, 0]);
  });

  it('circuit takes the resistance distances, silently', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const third = Math.fround(2 / 3);
    const got = dij(triangle(), MODEL_CIRCUIT);
    expect([got[0], got[3], got[5]]).toEqual([0, 0, 0]);
    expect(got[1]).toBeCloseTo(third, 5);
    expect(got[2]).toBeCloseTo(third, 5);
    expect(got[4]).toBeCloseTo(third, 5);
    expect(warn).not.toHaveBeenCalled();
  });

  it('circuit on a disconnected graph warns as native and reverts to shortest paths', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // bfs puts an unreached node 10 past the last distance (bfs.c)
    expect(dij(twoPairs(), MODEL_CIRCUIT)).toEqual([0, 1, 11, 11, 0, 11, 11, 0, 1, 0]);
    expect(warn.mock.calls.map((c) => c[0])).toEqual([
      'Warning: graph is disconnected. Hence, the circuit model',
      'is undefined. Reverting to the shortest path model.',
    ]);
  });
});

describe('modelDistances', () => {
  it('leaves shortest paths to its caller: null for shortpath, and for mds with no ewgts', () => {
    const graph: VtxData[] = [
      { nedges: 2, edges: [0, 1], ewgts: [] },
      { nedges: 2, edges: [1, 0], ewgts: [] },
    ];
    expect(modelDistances(graph, 2, MODEL_SHORTPATH)).toBeNull();
    expect(modelDistances(graph, 2, MODEL_MDS)).toBeNull();
  });
});
