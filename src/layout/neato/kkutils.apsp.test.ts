// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IMDS_CASES, buildGraph } from './__fixtures__/hier-imds.js';
import type { ImdsCaseName } from './__fixtures__/hier-imds.js';
import { computeApsp } from './kkutils.js';

const SMALL: ImdsCaseName[] = ['probe', 'probe_nowgt', 'probe_frac', 'c1554', 'disc'];

describe('computeApsp', () => {
  it.each(SMALL)('matches native compute_apsp (%s)', (name) => {
    const c = IMDS_CASES[name];
    const D = computeApsp(buildGraph(c.n, c.edges, c.haveLen, c.haveDir), c.n);
    expect(D.map((row) => Array.from(row))).toEqual(
      Array.from({ length: c.n }, (_, i) => c.D.slice(i * c.n, (i + 1) * c.n)),
    );
  });

  it('dag32 row sums match native', () => {
    const c = IMDS_CASES.dag32;
    const D = computeApsp(buildGraph(c.n, c.edges, c.haveLen, c.haveDir), c.n);
    expect(D.map((row) => row.reduce((a, b) => a + b, 0))).toEqual(Array.from(c.D));
  });
});
