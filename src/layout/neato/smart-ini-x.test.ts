// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IMDS_CASES, buildGraph } from './__fixtures__/hier-imds.js';
import type { ImdsCaseName } from './__fixtures__/hier-imds.js';
import { csrand } from '../../common/crand.js';
import { imdsGivenDim } from './smart-ini-x.js';

const NAMES = Object.keys(IMDS_CASES) as ImdsCaseName[];

describe('imdsGivenDim', () => {
  it.each(NAMES)('matches the native IMDS_given_dim bit for bit (%s)', (name) => {
    const c = IMDS_CASES[name];
    csrand(1); // native runs start at the unseeded libc rand stream
    const graph = buildGraph(c.n, c.edges, c.haveLen, c.haveDir);
    const given = Float64Array.from(c.input);
    const out = new Float64Array(c.n);
    const rv = imdsGivenDim(graph, c.n, given, out, c.tol);
    expect(rv).toBe(c.rv);
    expect(Array.from(given)).toEqual(c.x);
    expect(Array.from(out)).toEqual(c.y);
  });

  it('returns 0 whenever conjugate_gradient_f does (its < 0 test can never fire)', () => {
    for (const name of NAMES) {
      const c = IMDS_CASES[name];
      const graph = buildGraph(c.n, c.edges, c.haveLen, c.haveDir);
      csrand(1);
      expect(imdsGivenDim(graph, c.n, Float64Array.from(c.input), new Float64Array(c.n), c.tol)).toBe(0);
    }
  });
});
