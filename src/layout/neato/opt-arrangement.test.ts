// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it } from 'vitest';
import { HIER_GRAPHS, toVtx } from '../../../test/helpers/hier-graphs.js';
import { csrand } from '../../common/crand.js';
import { computeYCoords, conjugateGradient, constructB } from './opt-arrangement.js';

const NAMES = ['probe', 'c1554', 'rdag'] as const;

afterEach(() => { csrand(1); });

describe('computeYCoords matches the native harness bit for bit', () => {
  it.each(NAMES)('%s (maxIter = n)', (name) => {
    const fx = HIER_GRAPHS[name];
    csrand(1);
    const y = new Float64Array(fx.n);
    expect(computeYCoords(toVtx(fx), fx.n, y, fx.n)).toBe(0);
    expect([...y]).toEqual(fx.y.y);
  });

  it.each(NAMES)('%s (maxIter = 100)', (name) => {
    const fx = HIER_GRAPHS[name];
    csrand(1);
    const y = new Float64Array(fx.n);
    computeYCoords(toVtx(fx), fx.n, y, 100);
    expect([...y]).toEqual(fx.y100.y);
  });

  it('restores the original edge weights', () => {
    const fx = HIER_GRAPHS.c1554;
    const g = toVtx(fx);
    computeYCoords(g, fx.n, new Float64Array(fx.n), fx.n);
    expect(g.map((r) => r.ewgts)).toEqual(fx.rows.map((r) => r.ewgts));
  });
});

describe('constructB', () => {
  it('sums ewgts * edists per node, skipping the self slot', () => {
    const g = toVtx(HIER_GRAPHS.c1554);
    const b = new Float64Array(g.length);
    constructB(g, g.length, b);
    const f = Math.fround;
    expect(b[0]).toBe(f(0.2) * -1);
    expect(b[1]).toBe(f(0.4) * -1 + f(0.2) * -1 + f(0.2) * 1);
  });

  it('leaves b zero when edists is absent', () => {
    const g = toVtx(HIER_GRAPHS.probe).map((r) => ({ ...r, edists: null }));
    const b = new Float64Array(g.length);
    constructB(g, g.length, b);
    expect([...b]).toEqual(new Array(g.length).fill(0));
  });
});

describe('conjugateGradient', () => {
  const identityRows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ nedges: 1, edges: [i], ewgts: [1] }));

  it('solves A x = b for A = I, orthogonalizing x and b against 1', () => {
    const x = new Float64Array(3);
    expect(conjugateGradient(identityRows(3), x, Float64Array.of(1, -1, 0), 3, 1e-12, 5)).toBe(0);
    expect([...x]).toEqual([1, -1, 0]);
  });

  it('breaks out when p.Ap is zero, leaving x orthogonalized only', () => {
    const rows = [0, 1].map((i) => ({ nedges: 1, edges: [i], ewgts: [0] }));
    const x = Float64Array.of(3, 1);
    expect(conjugateGradient(rows, x, Float64Array.of(1, -1), 2, 1e-9, 5)).toBe(0);
    expect([...x]).toEqual([1, -1]);
  });

  it('skips the residual update on the last allowed iteration', () => {
    const x = new Float64Array(3);
    expect(conjugateGradient(identityRows(3), x, Float64Array.of(2, -2, 0), 3, 1e-12, 1)).toBe(0);
    expect([...x]).toEqual([2, -2, 0]);
  });

  it('does nothing when the residual is already within tolerance', () => {
    const x = new Float64Array(2);
    expect(conjugateGradient(identityRows(2), x, Float64Array.of(1, -1), 2, 10, 5)).toBe(0);
    expect([...x]).toEqual([0, 0]);
  });
});
