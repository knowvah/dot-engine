// SPDX-License-Identifier: EPL-2.0
// The failure returns of stress_majorization_with_hierarchy: sub-solvers that C
// reports as nonzero. Their real implementations cannot fail on a valid graph
// (T15/T17: `compute_y_coords` and `IMDS_given_dim` test `< 0` on a 0/1 value),
// so each is forced through a wrapper.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HIER_GRAPHS, toVtx } from '../../../test/helpers/hier-graphs.js';
import { csrand } from '../../common/crand.js';
import type { Node } from '../../model/node.js';
import * as conjgradMkernel from './conjgrad-mkernel.js';
import * as hierarchy from './compute-hierarchy.js';
import { stressMajorizationWithHierarchy, type HierarchyOpts } from './constrained-majorization.js';
import { MODEL_SHORTPATH } from './init.js';
import * as optArrangement from './opt-arrangement.js';
import * as smartIniX from './smart-ini-x.js';
import { OPT_SMART_INIT } from './stress.js';

vi.mock('./opt-arrangement.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./opt-arrangement.js')>();
  return { ...actual, computeYCoords: vi.fn(actual.computeYCoords) };
});
vi.mock('./compute-hierarchy.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./compute-hierarchy.js')>();
  return { ...actual, computeHierarchy: vi.fn(actual.computeHierarchy) };
});
vi.mock('./smart-ini-x.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./smart-ini-x.js')>();
  return { ...actual, imdsGivenDim: vi.fn(actual.imdsGivenDim) };
});
vi.mock('./conjgrad-mkernel.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./conjgrad-mkernel.js')>();
  return { ...actual, conjugateGradientMkernelFused: vi.fn(actual.conjugateGradientMkernelFused) };
});

const N = HIER_GRAPHS.probe.n;
const FAILED = -1;
const OPTS: HierarchyOpts = {
  dim: 2, opts: 2 | OPT_SMART_INIT, model: MODEL_SHORTPATH, maxi: 200, levelsGap: 0, epsilon: 1e-4,
};

const nodes = (): Node[] => Array.from({ length: N }, () => ({ info: {} }) as unknown as Node);
const run = (o: HierarchyOpts, dCoords: Float64Array[]): number =>
  stressMajorizationWithHierarchy(toVtx(HIER_GRAPHS.probe), N, dCoords, nodes(), o);
const zeros = (dim: number): Float64Array[] => Array.from({ length: dim }, () => new Float64Array(N));

afterEach(() => {
  vi.mocked(optArrangement.computeYCoords).mockClear();
  vi.mocked(hierarchy.computeHierarchy).mockClear();
  vi.mocked(smartIniX.imdsGivenDim).mockClear();
  vi.mocked(conjgradMkernel.conjugateGradientMkernelFused).mockClear();
  csrand(1);
});

describe('stressMajorizationWithHierarchy failure returns', () => {
  it('returns -1 when compute_y_coords fails (smart init)', () => {
    vi.mocked(optArrangement.computeYCoords).mockReturnValueOnce(1);
    expect(run(OPTS, zeros(2))).toBe(FAILED);
    expect(vi.mocked(hierarchy.computeHierarchy)).not.toHaveBeenCalled();
  });

  it('returns -1 when compute_hierarchy fails (smart init)', () => {
    vi.mocked(hierarchy.computeHierarchy).mockReturnValueOnce(null);
    expect(run(OPTS, zeros(2))).toBe(FAILED);
    expect(vi.mocked(smartIniX.imdsGivenDim)).not.toHaveBeenCalled();
  });

  it('returns -1 when compute_hierarchy fails (plain init)', () => {
    vi.mocked(hierarchy.computeHierarchy).mockReturnValueOnce(null);
    expect(run({ ...OPTS, opts: 2 }, zeros(2))).toBe(FAILED);
  });

  it('returns -1 when IMDS_given_dim fails', () => {
    vi.mocked(smartIniX.imdsGivenDim).mockReturnValueOnce(1);
    const dCoords = zeros(2);
    expect(run(OPTS, dCoords)).toBe(FAILED);
  });

  it('returns -1 and leaves the layout unwritten when conjugate gradient fails', () => {
    csrand(1);
    const dCoords = zeros(2);
    vi.mocked(conjgradMkernel.conjugateGradientMkernelFused).mockReturnValueOnce(1);
    expect(run(OPTS, dCoords)).toBe(FAILED);
    // the layout is only copied back after the last iteration; the smart init
    // left x = IMDS output and y = centred levels, not the float working copy
    const reference = zeros(2);
    csrand(1);
    run({ ...OPTS, maxi: 1 }, reference);
    expect([...dCoords[0]!]).not.toEqual([...reference[0]!]);
  });

  it('stops at the (dim-1)-D seed layout of a 3-D layout: it is the unconstrained solver with smart init', () => {
    expect(() => run({ ...OPTS, dim: 3 }, zeros(3))).toThrowError(/smart initial layout/);
    expect(vi.mocked(optArrangement.computeYCoords)).not.toHaveBeenCalled();
  });
});
