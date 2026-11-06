// SPDX-License-Identifier: EPL-2.0
// lib/neatogen/embed_graph.c against the native values of
// __fixtures__/dim/smart-units.json (plans/post-16-1-followups-10/harness/T7/smart-units-harness.c).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { crand, csrand } from '../../common/crand.js';
import type { VtxData } from './dijkstra.js';
import { centerCoordinate, embedGraph, saveWeights } from './embed-graph.js';

const NATIVE = JSON.parse(readFileSync(new URL('./__fixtures__/dim/smart-units.json', import.meta.url), 'utf8')) as {
  embedPlain: { coords: number[][]; centered: number[][]; next: number };
  embedReweight: { coords: number[][]; restored: number[]; next: number };
};

const ADJ = [[1], [0, 2, 6], [1, 3, 6], [2, 4], [3, 5], [4], [1, 2]];
const graph7 = (weighted: boolean): VtxData[] => ADJ.map((a, i) => ({
  nedges: a.length + 1,
  edges: [i, ...a],
  ewgts: weighted ? [0, ...a.map(() => 1)] : [],
}));
const list = (m: readonly Int32Array[]): number[][] => m.map((r) => Array.from(r));

describe('embed_graph', () => {
  it('chooses far-apart pivots by BFS over an unweighted graph', () => {
    csrand(1);
    const coords = embedGraph(graph7(false), 7, 7, false);
    expect(list(coords)).toEqual(NATIVE.embedPlain.coords);
    centerCoordinate(coords, 7, 7);
    expect(list(coords)).toEqual(NATIVE.embedPlain.centered);
    expect(crand()).toBe(NATIVE.embedPlain.next);
  });

  it('reweights for the subset model, by Dijkstra, and restores the weights', () => {
    const graph = graph7(true);
    csrand(1);
    expect(list(embedGraph(graph, 7, 5, true))).toEqual(NATIVE.embedReweight.coords);
    expect(graph[1]!.ewgts).toEqual(NATIVE.embedReweight.restored);
    expect(crand()).toBe(NATIVE.embedReweight.next);
  });
});

describe('center_coordinate', () => {
  it('truncates the average toward zero, as the (DistType) cast', () => {
    const c = [Int32Array.of(0, 1, 3), Int32Array.of(0, -1, -3)];
    centerCoordinate(c, 3, 2);
    expect(list(c)).toEqual([[-1, 0, 2], [1, 0, -2]]);
  });
});

describe('saveWeights', () => {
  it('is null for C NULL ewgts, else each vertex array', () => {
    expect(saveWeights(graph7(false), 7)).toBeNull();
    const graph = graph7(true);
    expect(saveWeights(graph, 2)).toEqual([graph[0]!.ewgts, graph[1]!.ewgts]);
  });
});
