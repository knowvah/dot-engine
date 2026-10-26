// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it } from 'vitest';
import { HIER_GRAPHS, toVtx } from '../../../test/helpers/hier-graphs.js';
import type { HierExpected } from '../../../test/helpers/hier-graphs.js';
import { csrand } from '../../common/crand.js';
import { computeHierarchy } from './compute-hierarchy.js';

const NAMES = ['probe', 'c1554', 'rdag'] as const;
const given = (n: number): Float64Array => Float64Array.from({ length: n }, (_, i) => ((i * 7) % 5) * 0.5);

afterEach(() => { csrand(1); });

function expectMatches(got: ReturnType<typeof computeHierarchy>, want: HierExpected): void {
  expect(got).not.toBeNull();
  expect([...got!.ordering]).toEqual(want.ordering);
  expect([...got!.levels]).toEqual(want.levels);
  expect(got!.numLevels).toBe(want.numLevels);
}

describe.each(NAMES)('computeHierarchy on %s matches the native harness', (name) => {
  const fx = HIER_GRAPHS[name];
  it('default tolerances', () => {
    csrand(1);
    expectMatches(computeHierarchy(toVtx(fx), fx.n, 1e-2, 1e-1, null), fx.h);
  });
  it('fine tolerances (many levels)', () => {
    csrand(1);
    expectMatches(computeHierarchy(toVtx(fx), fx.n, 1e-6, 0, null), fx.hfine);
  });
  it('coarse tolerance gives one level, levels = [n]', () => {
    csrand(1);
    const h = computeHierarchy(toVtx(fx), fx.n, 1e9, 0, null);
    expectMatches(h, fx.hcoarse);
    expect([...h!.levels]).toEqual([fx.n]);
    expect(h!.numLevels).toBe(0);
  });
  it('given coordinates with ties (qsort order)', () => {
    expectMatches(computeHierarchy(toVtx(fx), fx.n, 1e-2, 1e-1, given(fx.n)), fx.hg);
  });
});
