// SPDX-License-Identifier: EPL-2.0

/**
 * kkutils.c's reweighted all-pairs shortest paths (KK `model=subset`), bit for
 * bit against the oracle's own functions (see the fixture header).
 *
 * @see lib/neatogen/kkutils.c:compute_apsp_artificial_weights
 * @see lib/neatogen/kkutils.c:compute_new_weights
 * @see lib/neatogen/kkutils.c:restore_old_weights
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../index.js';
import type { VtxData } from './dijkstra.js';
import { toDistType } from './dijkstra.js';
import { computeApspArtificialWeights, computeNewWeights, restoreOldWeights } from './kkutils.js';
import { makeGraphDataC } from './make-graph-data.js';
import { RAW_CASES, SUBSET_CASES, type KkRow } from './__fixtures__/kk-models.js';

/** Fixture rows to VtxData; C `NULL` ewgts is the port's empty array. */
function toGraph(rows: readonly KkRow[]): VtxData[] {
  return rows.map((r) => ({
    nedges: r.edges.length,
    edges: [...r.edges],
    ewgts: r.ewgts === null ? [] : [...r.ewgts],
  }));
}

/** Row-major native matrix to the rows the port returns. */
function toRows(flat: readonly number[], n: number): number[][] {
  return Array.from({ length: n }, (_, i) => flat.slice(i * n, (i + 1) * n));
}

const ALL_CASES = [...SUBSET_CASES, ...RAW_CASES];
const DIJ_CASES = ALL_CASES;

describe('computeNewWeights', () => {
  it.each(ALL_CASES.map((c) => [c.name, c] as const))('%s: weights match native', (_name, c) => {
    const graph = toGraph(c.rows);
    computeNewWeights(graph, c.n);
    expect(graph.map((v) => v.ewgts)).toEqual(c.weights.map((r) => r.ewgts));
  });
});

describe('computeApspArtificialWeights', () => {
  it.each(DIJ_CASES.map((c) => [c.name, c] as const))('%s: Dij matches native', (_name, c) => {
    const graph = toGraph(c.rows);
    const dij = computeApspArtificialWeights(graph, c.n);
    expect(dij.map((row) => Array.from(row))).toEqual(toRows(c.dij, c.n));
    expect(dij.every((row) => row instanceof Int32Array)).toBe(true);
    expect(graph[0]!.ewgts.length === 0 ? 1 : 0).toBe(c.ewgts0Null);
    if (c.after !== null) {
      expect(graph.map((v) => v.ewgts)).toEqual(c.after.map((r) => r.ewgts));
    }
  });

  it('gives the caller\'s ewgts arrays back (same objects) when they were set', () => {
    const graph = toGraph(RAW_CASES.find((c) => c.name === 'caller ewgts')!.rows);
    const before = graph.map((v) => v.ewgts);
    computeApspArtificialWeights(graph, graph.length);
    graph.forEach((v, i) => expect(v.ewgts).toBe(before[i]));
  });
});

describe('restoreOldWeights', () => {
  it('only clears graph[0].ewgts when the caller had none (C leaves the rest dangling)', () => {
    const graph = toGraph(RAW_CASES.find((c) => c.name === 'size_t wrap')!.rows);
    computeNewWeights(graph, graph.length);
    const second = graph[1]!.ewgts;
    restoreOldWeights(graph, graph.length, null);
    expect(graph[0]!.ewgts).toEqual([]);
    expect(graph[1]!.ewgts).toBe(second);
  });
});

describe('the rows T7 will pass', () => {
  it.each(SUBSET_CASES.map((c) => [c.name, c] as const))(
    '%s: makeGraphDataC builds native makeGraphData(MODE_KK, MODEL_SUBSET)',
    (_name, c) => {
      const g = parse(c.source);
      const nodes = [...g.nodes.values()];
      nodes.forEach((np, i) => { np.info.id = i; });
      const rows = makeGraphDataC(g, nodes, false, false);
      expect(rows.map((v) => v.edges)).toEqual(c.rows.map((r) => r.edges));
      expect(rows.map((v) => v.ewgts)).toEqual(c.rows.map(() => []));
    },
  );
});

describe('toDistType', () => {
  it.each([
    ['>= 2^31', 2 ** 31, 2147483647],
    ['2^64 (size_t wrap)', 2 ** 64, 2147483647],
    ['2^31 - 1 after fround (rounds up to 2^31)', 2147483647, 2147483647],
    ['largest float below 2^31', 2147483520, 2147483520],
    ['< -2^31', -(2 ** 31) - 256, -2147483648],
    ['-2^31 exactly', -(2 ** 31), -2147483648],
    ['NaN', Number.NaN, 0],
    ['truncates toward zero', -2.9, -2],
  ])('%s', (_name, w, expected) => {
    expect(toDistType(w)).toBe(expected);
  });
});
