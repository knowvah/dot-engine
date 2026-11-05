// SPDX-License-Identifier: EPL-2.0
// lib/neatogen/pca.c against the native values of
// __fixtures__/dim/smart-units.json (plans/post-16-1-followups-10/harness/T7/smart-units-harness.c), bit for bit.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { crand, csrand } from '../../common/crand.js';
import type { VtxData } from './dijkstra.js';
import { centerCoordinate, embedGraph } from './embed-graph.js';
import { iterativePCA1D, pcaAlloc } from './pca.js';

const NATIVE = JSON.parse(readFileSync(new URL('./__fixtures__/dim/smart-units.json', import.meta.url), 'utf8')) as {
  pca: { coords: number[][]; next: number };
  ipca: { direction: number[]; ok: boolean; next: number };
};

const ADJ = [[1], [0, 2, 6], [1, 3, 6], [2, 4], [3, 5], [4], [1, 2]];
const graph7 = (): VtxData[] => ADJ.map((a, i) => ({ nedges: a.length + 1, edges: [i, ...a], ewgts: [] }));

describe('PCA_alloc and iterativePCA_1D', () => {
  it('project a centered embedding, then find a scattering direction', () => {
    csrand(1);
    const coords = embedGraph(graph7(), 7, 7, false);
    centerCoordinate(coords, 7, 7);
    const projected = Array.from({ length: 7 }, () => new Float64Array(7));
    pcaAlloc(coords, 7, 7, projected, 7);
    expect(projected.map((r) => Array.from(r))).toEqual(NATIVE.pca.coords);
    expect(crand()).toBe(NATIVE.pca.next);

    const direction = new Float64Array(7);
    expect(iterativePCA1D(projected, 7, 7, direction)).toBe(NATIVE.ipca.ok);
    expect(Array.from(direction)).toEqual(NATIVE.ipca.direction);
    expect(crand()).toBe(NATIVE.ipca.next);
  });

  it('wraps a coordinate product as C int arithmetic', () => {
    const big = 70000; // big * big overflows int32
    const projected = [new Float64Array(2)];
    csrand(1);
    pcaAlloc([Int32Array.of(big, -big)], 1, 2, projected, 1);
    // DD = 2 * wrap(4.9e9) = 2 * 605032704; its one eigenvector is +-1
    expect(Math.abs(projected[0]![0]!)).toBe(big);
    expect(Math.imul(big, big)).toBe(605032704);
  });
});
