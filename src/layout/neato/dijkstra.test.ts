// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { DIJKSTRA_F_FIXTURES } from './__fixtures__/dijkstra-f.js';
import { dijkstra, FLT_MAX, type VtxData } from './dijkstra.js';

const hex = (f: Float32Array): string[] =>
  Array.from(new Uint32Array(f.buffer, f.byteOffset, f.length), (u) => u.toString(16).padStart(8, '0'));

describe('dijkstra (dijkstra_f)', () => {
  it.each(['g9', 'r2', 'r5'] as const)('matches native dijkstra_f bit for bit (%s)', (name) => {
    const fx = DIJKSTRA_F_FIXTURES[name];
    const graph: VtxData[] = fx.rows.map((r) => ({
      nedges: r.edges.length, edges: [...r.edges], ewgts: [...r.ewgts],
    }));
    const dist = new Float32Array(fx.n);
    for (let s = 0; s < fx.n; s++) {
      dijkstra(s, graph, fx.n, dist);
      expect(hex(dist)).toEqual(fx.expected[s]);
    }
  });

  it('g9 source 5 reaches every vertex (stale-heap regression)', () => {
    const fx = DIJKSTRA_F_FIXTURES.g9;
    const graph: VtxData[] = fx.rows.map((r) => ({
      nedges: r.edges.length, edges: [...r.edges], ewgts: [...r.ewgts],
    }));
    const dist = new Float32Array(fx.n);
    dijkstra(5, graph, fx.n, dist);
    expect(Array.from(dist)).toEqual([3, 2, 4, 1, 2, 0, 2, 2, 3]);
  });

  it('leaves unreachable vertices at FLT_MAX, not Infinity', () => {
    const graph: VtxData[] = [
      { nedges: 1, edges: [0], ewgts: [0] },
      { nedges: 1, edges: [1], ewgts: [0] },
    ];
    const dist = new Float32Array(2);
    dijkstra(0, graph, 2, dist);
    expect(dist[1]).toBe(FLT_MAX);
    expect(Number.isFinite(dist[1])).toBe(true);
  });
});
