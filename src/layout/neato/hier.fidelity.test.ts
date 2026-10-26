// SPDX-License-Identifier: EPL-2.0
//
// mode=hier (neatoinit.c:majorization -> stress_majorization_with_hierarchy)
// against native graphviz 16.1.0 `-Kneato` output (-Tplain and -Txdot, 0.01
// tolerance): the item-43 probe graph, corpus 1554 (forced layout=neato,
// model=mds) and one case per branch of the wiring. Fixtures under
// __fixtures__/hier/ are the oracle's own output (GVBINDIR=ghl16-all).
// @see lib/neatogen/neatoinit.c:majorization
// @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { comparePlain } from '../../../test/golden/compare-plain.js';
import { compareXdot } from '../../../test/golden/compare-xdot.js';
import { parse, render } from '../../index.js';

const FIXTURES = new URL('./__fixtures__/hier/', import.meta.url);
const CASES = new URL('cases/', FIXTURES);
const UNSUPPORTED = { code: 'UNSUPPORTED_FEATURE' };

const read = (dir: URL, name: string): string => readFileSync(new URL(name, dir), 'utf8');
const neato = async (src: string, format: 'plain' | 'xdot'): Promise<string> =>
  String(await render(parse(src), format, { engine: 'neato' }));

/** The probe graph's native -Tplain positions (graph 1 2.524 2.5698; a 0.375 2.3198 ... f 2.149 0.25). */
const PROBE_NODES = [
  ['a', 0.375, 2.3198], ['b', 1.3524, 1.9375], ['c', 1.923, 1.2854],
  ['d', 0.60193, 1.2854], ['e', 1.1725, 0.63363], ['f', 2.149, 0.25],
] as const;

describe.each(['hier-probe', 'c1554'])('%s against native -Kneato', (id) => {
  const src = read(FIXTURES, `${id}.gv`);

  it('-Tplain matches at 0.01', async () => {
    const r = comparePlain(await neato(src, 'plain'), read(FIXTURES, `${id}.plain`), { iterative: false });
    expect(r.diffs).toEqual([]);
    expect(r.verdict).toBe('pass');
  });

  it('-Txdot matches at 0.01', async () => {
    const r = compareXdot(await neato(src, 'xdot'), read(FIXTURES, `${id}.xdot`));
    expect(r.diffs).toEqual([]);
    expect(r.pass).toBe(true);
  });
});

describe('the probe graph', () => {
  it('puts every node at the native -Tplain position', async () => {
    const lines = (await neato(read(FIXTURES, 'hier-probe.gv'), 'plain')).split('\n');
    expect(lines[0]).toMatch(/^graph 1 2\.52\d* 2\.56\d*$/);
    for (const [name, x, y] of PROBE_NODES) {
      const f = lines.find((l) => l.startsWith(`node ${name} `))!.split(' ');
      expect(Number(f[2])).toBeCloseTo(x, 2);
      expect(Number(f[3])).toBeCloseTo(y, 2);
    }
  });
});

describe('one case per branch of the wiring (native -Kneato -Tplain, 0.01)', () => {
  const ids = readdirSync(CASES).filter((f) => f.endsWith('.gv')).map((f) => f.slice(0, -3)).sort();

  it('has the fixtures', () => {
    expect(ids).toEqual([
      'cycle', 'dirnone', 'epsilon', 'levelsgap', 'mds', 'multiedge',
      'neglevelsgap', 'startrandom', 'startregular', 'tdist', 'undirected',
    ]);
  });

  it.each(ids)('%s', async (id) => {
    const r = comparePlain(await neato(read(CASES, `${id}.gv`), 'plain'), read(CASES, `${id}.plain`), {
      iterative: false,
    });
    expect(r.diffs).toEqual([]);
    expect(r.verdict).toBe('pass');
  });

  it('levelsgap separates the levels further than the default', async () => {
    const y = (out: string, n: string): number => Number(out.split('\n').find((l) => l.startsWith(`node ${n} `))!.split(' ')[3]);
    const gap = await neato(read(CASES, 'levelsgap.gv'), 'plain');
    const dflt = await neato(read(CASES, 'levelsgap.gv').replace('levelsgap=0.5;', ''), 'plain');
    expect(y(gap, 'a') - y(gap, 'b')).toBeGreaterThan(y(dflt, 'a') - y(dflt, 'b'));
  });
});

describe('what stays loud on the hier path', () => {
  it.each([
    ['subset', /subset distance model/],
    ['circuit', /circuit distance model/],
  ])('model=%s names the model', async (model, message) => {
    await expect(neato(`digraph { mode=hier; model=${model}; a->b->c }`, 'plain'))
      .rejects.toMatchObject({ ...UNSUPPORTED, message: expect.stringMatching(message) });
  });

  it('is not reached when maxiter=0 returns first', async () => {
    expect(await neato('digraph { mode=hier; model=subset; maxiter=0; a->b }', 'plain')).toMatch(/^graph /);
  });
});
