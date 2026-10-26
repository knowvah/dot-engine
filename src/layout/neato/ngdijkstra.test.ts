// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IMDS_CASES, buildGraph } from './__fixtures__/hier-imds.js';
import type { ImdsCaseName } from './__fixtures__/hier-imds.js';
import { ngdijkstra } from './dijkstra.js';

const WEIGHTED: ImdsCaseName[] = ['probe', 'probe_frac', 'c1554', 'disc'];

describe('ngdijkstra', () => {
  it.each(WEIGHTED)('matches the native compute_apsp_dijkstra rows (%s)', (name) => {
    const c = IMDS_CASES[name];
    const graph = buildGraph(c.n, c.edges, c.haveLen, c.haveDir);
    for (let i = 0; i < c.n; i++) {
      const dist = new Int32Array(c.n);
      ngdijkstra(i, graph, c.n, dist);
      expect(Array.from(dist)).toEqual(c.D.slice(i * c.n, (i + 1) * c.n));
    }
  });

  it('truncates float edge weights to int (len 0.2 and 0.4 become 0)', () => {
    const c = IMDS_CASES.c1554;
    const graph = buildGraph(c.n, c.edges, c.haveLen, c.haveDir);
    const dist = new Int32Array(c.n);
    ngdijkstra(0, graph, c.n, dist);
    expect(dist[1]).toBe(0);
    expect(dist[2]).toBe(0);
  });

  it('gives unreachable vertices prevClosestDist + 10', () => {
    const c = IMDS_CASES.disc;
    const graph = buildGraph(c.n, c.edges, c.haveLen, c.haveDir);
    const dist = new Int32Array(c.n);
    ngdijkstra(0, graph, c.n, dist);
    expect(Array.from(dist)).toEqual([0, 1, 1, 11, 11, 11]);
  });

  it('adds 10 to prevClosestDist for the unreachable vertex, near INT_MAX too', () => {
    // Native harness: dist = 0 2147483520 2147483530. 2147483520 is the largest
    // float32 below 2^31, so the INT_MAX saturation branch is unreachable.
    const graph = [
      { nedges: 2, edges: [0, 1], ewgts: [0, 2147483520] },
      { nedges: 1, edges: [1], ewgts: [0] },
      { nedges: 1, edges: [2], ewgts: [0] },
    ];
    const dist = new Int32Array(3);
    ngdijkstra(0, graph, 3, dist);
    expect(Array.from(dist)).toEqual([0, 2147483520, 2147483530]);
  });
});
