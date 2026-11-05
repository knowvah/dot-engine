// SPDX-License-Identifier: EPL-2.0
// sparse_stress_subspace_majorization_kD and compute_stress1. They are static in
// C, so whole-layout values are checked by stress.dim.test.ts against native; this
// file pins their parts and the branches no native fixture can reach.
// @see lib/neatogen/stress.c
import { afterEach, describe, expect, it, vi } from 'vitest';
import { csrand } from '../../common/crand.js';
import * as conjgrad from './conjgrad.js';
import type { VtxData } from './dijkstra.js';
import * as pca from './pca.js';
import {
  computeStress1, distanceKD, sparseStressSubspaceMajorizationKD, type DistData, type SubspaceOpts,
} from './stress-subspace.js';

vi.mock('./conjgrad.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./conjgrad.js')>();
  return { ...actual, conjugateGradientF: vi.fn(actual.conjugateGradientF) };
});
vi.mock('./pca.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./pca.js')>();
  return { ...actual, iterativePCA1D: vi.fn(actual.iterativePCA1D) };
});

const OPTS: SubspaceOpts = { dim: 2, exp: 2, reweightGraph: false, nIterations: 50, numCenters: 40, epsilon: 1e-4 };

/** A path of `n` nodes, unit weights. */
function path(n: number): VtxData[] {
  return Array.from({ length: n }, (_, i) => {
    const nbrs = [i - 1, i + 1].filter((j) => j >= 0 && j < n);
    return { nedges: nbrs.length + 1, edges: [i, ...nbrs], ewgts: [0, ...nbrs.map(() => 1)] };
  });
}
const zeros = (dim: number, n: number): Float64Array[] => Array.from({ length: dim }, () => new Float64Array(n));

afterEach(() => {
  vi.mocked(conjgrad.conjugateGradientF).mockClear();
  vi.mocked(pca.iterativePCA1D).mockClear();
});

describe('distance_kD', () => {
  it('is the Euclidean distance over dim axes', () => {
    expect(distanceKD([Float64Array.of(0, 3), Float64Array.of(0, 4)], 2, 0, 1)).toBe(5);
    expect(distanceKD([Float64Array.of(0, 3), Float64Array.of(0, 4)], 1, 0, 1)).toBe(3);
  });
});

describe('compute_stress1', () => {
  const coords = [Float64Array.of(0, 3), Float64Array.of(0, 4)];
  const row = (edges: number[], edist: number[]): DistData =>
    ({ nedges: edges.length, edges: Int32Array.from(edges), edist: Int32Array.from(edist) });
  const distances = [row([1], [2]), row([0], [2])];

  it('counts each pair once from its lower node: (d-dist)^2/d^2 under exp 2', () => {
    expect(computeStress1(coords, distances, 2, 2, 2)).toBe((3 * 3) / 4);
  });

  it('(d-dist)^2/d under exp 1', () => {
    expect(computeStress1(coords, distances, 2, 2, 1)).toBe((3 * 3) / 2);
  });
});

describe('sparse_stress_subspace_majorization_kD', () => {
  it('stretches a path to its graph distance', () => {
    csrand(1);
    const coords = zeros(2, 6);
    expect(sparseStressSubspaceMajorizationKD(path(6), 6, coords, OPTS)).toBeGreaterThan(0);
    expect(distanceKD(coords, 2, 0, 5)).toBeCloseTo(5, 0);
  });

  it('returns -1 and restores the weights when conjugate gradient fails', () => {
    const graph = path(6);
    const before = graph[2]!.ewgts;
    vi.mocked(conjgrad.conjugateGradientF).mockReturnValueOnce(1);
    csrand(1);
    expect(sparseStressSubspaceMajorizationKD(graph, 6, zeros(2, 6), { ...OPTS, reweightGraph: true })).toBe(-1);
    expect(graph[2]!.ewgts).toBe(before);
  });

  it('falls back to the second principal axis when iterative PCA does not converge', () => {
    const direction = (fallback: boolean): number[] => {
      if (fallback) vi.mocked(pca.iterativePCA1D).mockReturnValueOnce(false);
      csrand(1);
      const coords = zeros(2, 5);
      sparseStressSubspaceMajorizationKD(path(5), 5, coords, { ...OPTS, nIterations: 0 });
      return Array.from(coords[1]!);
    };
    const pcaAxis = direction(false);
    const fallbackAxis = direction(true);
    expect(fallbackAxis).not.toEqual(pcaAxis);
    expect(fallbackAxis.some((v) => v !== 0)).toBe(true);
  });

  it('uses the principal axes above 2-D, without iterative PCA', () => {
    csrand(1);
    const coords = zeros(3, 5);
    sparseStressSubspaceMajorizationKD(path(5), 5, coords, { ...OPTS, dim: 3, nIterations: 0 });
    expect(pca.iterativePCA1D).not.toHaveBeenCalled();
    expect(coords.every((c) => c.some((v) => v !== 0))).toBe(true);
  });

  it('with fewer nodes than dimensions lets an out-of-range direction drop', () => {
    // C writes one double past its block here and native aborts in 5 of 8 runs
    // (`mode=hier dim=4` on two nodes): there is no native output to match.
    csrand(1);
    const coords = zeros(3, 2);
    expect(sparseStressSubspaceMajorizationKD(path(2), 2, coords, { ...OPTS, dim: 3, nIterations: 0 })).toBe(0);
    expect(Array.from(coords[2]!)).toEqual([0, 0]);
  });

  it('keeps every pivot row when pivots repeat on a small graph and a non-pivot row on a large one', () => {
    csrand(1);
    const small = zeros(2, 4);
    expect(sparseStressSubspaceMajorizationKD(path(4), 4, small, OPTS)).toBeGreaterThan(0);
    csrand(1);
    const large = zeros(2, 45);
    expect(sparseStressSubspaceMajorizationKD(path(45), 45, large, OPTS)).toBeGreaterThan(0);
    const x = Array.from(large[0]!);
    expect(Math.max(...x) - Math.min(...x)).toBeGreaterThan(30);
  });
});
