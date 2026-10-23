// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it } from 'vitest';
import { HIER_GRAPHS, toVtx } from '../../../test/helpers/hier-graphs.js';
import { csrand } from '../../common/crand.js';
import { srand48 } from '../../common/random.js';
import type { Node } from '../../model/node.js';
import { G40_ROWS, MAJORIZATION_CASES, type MajorizationCase } from './__fixtures__/hier-majorization.js';
import { stressMajorizationWithHierarchy, type HierarchyOpts } from './constrained-majorization.js';
import { MODEL_CIRCUIT, MODEL_MDS, MODEL_SHORTPATH, MODEL_SUBSET } from './init.js';
import type { DirectedVtxData } from './opt-arrangement.js';
import { computeApspPacked, computeWeightedApspPacked, stressMajorizationKDMkernel } from './stress-kernel.js';
import { OPT_SMART_INIT } from './stress.js';

/** `opts` of a layout with the default squared weights and no smart init. */
const OPTS_PLAIN = 2;
const OPTS_SMART = OPTS_PLAIN | OPT_SMART_INIT;
const EPSILON = 1e-4;

afterEach(() => { csrand(1); });

function graphOf(c: MajorizationCase): DirectedVtxData[] {
  if (c.graph === 'g40') {
    return G40_ROWS.map((r) => ({
      nedges: r.edges.length, edges: [...r.edges], ewgts: [...r.ewgts], edists: Int8Array.from(r.edists),
    }));
  }
  return toVtx(HIER_GRAPHS[c.graph]);
}

/** Nodes without a position: `initLayout` draws from drand48 for every one. */
function freshNodes(n: number): Node[] {
  return Array.from({ length: n }, () => ({ info: {} }) as unknown as Node);
}

function layoutOpts(over: Partial<HierarchyOpts> = {}): HierarchyOpts {
  return { dim: 2, opts: OPTS_SMART, model: MODEL_SHORTPATH, maxi: 200, levelsGap: 0, epsilon: EPSILON, ...over };
}

function zeros(dim: number, n: number): Float64Array[] {
  return Array.from({ length: dim }, () => new Float64Array(n));
}

describe('stressMajorizationWithHierarchy matches the native function bit for bit', () => {
  it.each(MAJORIZATION_CASES.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const graph = graphOf(c);
    const n = graph.length;
    csrand(1); // native runs start at the unseeded libc rand stream
    srand48(c.seed);
    const coords = zeros(c.dim, n);
    const rv = stressMajorizationWithHierarchy(graph, n, coords, freshNodes(n), {
      dim: c.dim, opts: c.opts, model: MODEL_SHORTPATH, maxi: c.maxi, levelsGap: c.levelsGap, epsilon: c.epsilon,
    });
    expect(rv).toBe(c.rv);
    expect(coords.map((a) => [...a])).toEqual(c.coords);
  });
});

describe('graphs without a hierarchy constraint', () => {
  function undirected(): DirectedVtxData[] {
    return toVtx(HIER_GRAPHS.rdag).map((r) => ({ ...r, edists: new Int8Array(r.nedges) }));
  }

  function kernelResult(graph: DirectedVtxData[], n: number): { rv: number; coords: Float64Array[] } {
    srand48(5);
    const coords = zeros(2, n);
    const Dij = computeWeightedApspPacked(graph, n);
    const rv = stressMajorizationKDMkernel(Dij, n, coords, freshNodes(n), {
      dim: 2, opts: OPTS_PLAIN, maxi: 200, epsilon: EPSILON,
    });
    return { rv, coords };
  }

  it.each([
    ['all-zero edists', undirected()],
    ['no edists', undirected().map((r) => ({ nedges: r.nedges, edges: r.edges, ewgts: r.ewgts }))],
  ])('%s: equals the unconstrained stress majorization', (_name, graph) => {
    const n = graph.length;
    const expected = kernelResult(graph, n);
    srand48(5);
    const coords = zeros(2, n);
    const rv = stressMajorizationWithHierarchy(
      graph, n, coords, freshNodes(n), layoutOpts({ opts: OPTS_PLAIN }),
    );
    expect(expected.rv).toBeGreaterThan(1);
    expect(rv).toBe(expected.rv);
    expect(coords.map((a) => [...a])).toEqual(expected.coords.map((a) => [...a]));
  });

  it('uses the hop-count distances when the graph has no edge weights', () => {
    const graph = undirected().map((r) => ({ nedges: r.nedges, edges: r.edges, ewgts: [] as number[] }));
    const n = graph.length;
    srand48(5);
    const expected = zeros(2, n);
    stressMajorizationKDMkernel(computeApspPacked(graph, n), n, expected, freshNodes(n), {
      dim: 2, opts: OPTS_PLAIN, maxi: 200, epsilon: EPSILON,
    });
    srand48(5);
    const coords = zeros(2, n);
    stressMajorizationWithHierarchy(graph, n, coords, freshNodes(n), layoutOpts({ opts: OPTS_PLAIN }));
    expect(coords.map((a) => [...a])).toEqual(expected.map((a) => [...a]));
  });

  it('returns 0 without touching the layout when maxi is negative', () => {
    const graph = undirected();
    const coords = zeros(2, graph.length);
    expect(stressMajorizationWithHierarchy(graph, graph.length, coords, freshNodes(graph.length),
      layoutOpts({ opts: OPTS_PLAIN, maxi: -1 }))).toBe(0);
    expect(coords.every((a) => a.every((v) => v === 0))).toBe(true);
  });

  it('stops where C runs sparse_stress_subspace_majorization_kD (smart init is not ported)', () => {
    const graph = undirected();
    expect(() => stressMajorizationWithHierarchy(graph, graph.length, zeros(2, graph.length),
      freshNodes(graph.length), layoutOpts())).toThrowError(/smart initial layout/);
  });
});

describe('a layout that finds no hierarchy', () => {
  /** A directed 3-cycle: balanced, so `compute_y_coords` solves to ~0 and one level remains. */
  function cycle(): DirectedVtxData[] {
    const row = (self: number, a: number, b: number, da: number, db: number): DirectedVtxData =>
      ({ nedges: 3, edges: [self, a, b], ewgts: [0, 1, 1], edists: Int8Array.of(0, da, db) });
    return [row(0, 1, 2, -1, 1), row(1, 0, 2, 1, -1), row(2, 1, 0, 1, -1)];
  }

  it('falls back to the unconstrained stress majorization (loud: its smart init is not ported)', () => {
    csrand(1);
    expect(() => stressMajorizationWithHierarchy(cycle(), 3, zeros(2, 3), freshNodes(3), layoutOpts()))
      .toThrowError(/smart initial layout/);
  });
});

describe('distance models', () => {
  const probe = (): DirectedVtxData[] => toVtx(HIER_GRAPHS.probe);

  it.each([
    ['subset', MODEL_SUBSET, /subset distance model/],
    ['circuit', MODEL_CIRCUIT, /circuit distance model/],
    ['mds', MODEL_MDS, /MDS distance model/],
  ])('%s stays loud at the C branch point', (_name, model, message) => {
    csrand(1);
    expect(() => stressMajorizationWithHierarchy(probe(), 6, zeros(2, 6), freshNodes(6), layoutOpts({ model })))
      .toThrowError(message);
  });

  it('is not reached when there is nothing to iterate (maxi = 0 returns first)', () => {
    csrand(1);
    expect(stressMajorizationWithHierarchy(probe(), 6, zeros(2, 6), freshNodes(6),
      layoutOpts({ model: MODEL_SUBSET, maxi: 0 }))).toBe(0);
  });

  it('raises an UNSUPPORTED_FEATURE error', () => {
    csrand(1);
    expect(() => stressMajorizationWithHierarchy(probe(), 6, zeros(2, 6), freshNodes(6),
      layoutOpts({ model: MODEL_CIRCUIT }))).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_FEATURE' }));
  });
});
