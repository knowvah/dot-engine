// SPDX-License-Identifier: EPL-2.0
// @see lib/neatogen/neatoinit.c:1280-1287
import { afterEach, describe, it, expect, vi } from 'vitest';
import { comparePlain } from '../../../test/golden/compare-plain.js';
import { parse, render } from '../../index.js';
import { neatoMaxIter, MODE_KK, MODE_MAJOR, MODE_HIER, MODE_IPSEP, MODE_SGD } from './init.js';

describe('neatoMaxIter', () => {
  it('uses 100*n for ipsep, hier and kk when maxiter is unset', () => {
    expect(neatoMaxIter(undefined, MODE_IPSEP, 7)).toBe(700);
    expect(neatoMaxIter(undefined, MODE_HIER, 300)).toBe(30000);
    expect(neatoMaxIter(undefined, MODE_KK, 5)).toBe(500);
  });
  it('uses 200 for major and 30 for sgd when unset', () => {
    expect(neatoMaxIter(undefined, MODE_MAJOR, 1000)).toBe(200);
    expect(neatoMaxIter(undefined, MODE_SGD, 1000)).toBe(30);
  });
  it('applies atoi to maxiter in every mode', () => {
    expect(neatoMaxIter('7', MODE_MAJOR, 50)).toBe(7);
    expect(neatoMaxIter('7', MODE_IPSEP, 50)).toBe(7);
    expect(neatoMaxIter('', MODE_IPSEP, 50)).toBe(0);
    expect(neatoMaxIter('12x', MODE_HIER, 50)).toBe(12);
    expect(neatoMaxIter('x12', MODE_MAJOR, 50)).toBe(0);
    expect(neatoMaxIter('  -3', MODE_MAJOR, 50)).toBe(-3);
    expect(neatoMaxIter('2.9', MODE_MAJOR, 50)).toBe(2);
  });
});

/** Native 16.1.0 `-Kneato -Tplain`, each silent on stderr: no solver ran. */
const NEGATIVE_MAXITER = [
  ['major keeps user positions', 'graph G { maxiter=-1; a [pos="1,1"]; b [pos="2,2"]; a--b }', `graph 1 1.75 1.5
node a 0.375 0.25 0.75 0.5 a solid ellipse black lightgrey
node b 1.375 1.25 0.75 0.5 b solid ellipse black lightgrey
edge a b 4 0.58707 0.46207 0.75678 0.63178 0.99361 0.86861 1.1632 1.0382 solid black
stop
`],
  ['major circuit does not warn', 'graph G { model=circuit; maxiter=-1; a [pos="0,0!"]; d [pos="3,3!"]; a--b; d--e }', `graph 1 3.75 3.5
node a 0.375 0.25 0.75 0.5 a solid ellipse black lightgrey
node d 3.375 3.25 0.75 0.5 d solid ellipse black lightgrey
node b 0.375 0.25 0.75 0.5 b solid ellipse black lightgrey
node e 0.375 0.25 0.75 0.5 e solid ellipse black lightgrey
edge a b 4 0.375 0.25 0.375 0.25 0.375 0.25 0.375 0.25 solid black
edge d e 4 3.164 3.039 2.6132 2.4882 1.1363 1.0113 0.58572 0.46072 solid black
stop
`],
  ['hier circuit does not warn', 'digraph G { mode=hier; model=circuit; maxiter=-1; a [pos="0,0!"]; d [pos="3,3!"]; a->b; d->e }', `graph 1 3.75 3.5
node a 0.375 0.25 0.75 0.5 a solid ellipse black lightgrey
node d 3.375 3.25 0.75 0.5 d solid ellipse black lightgrey
node b 0.375 0.25 0.75 0.5 b solid ellipse black lightgrey
node e 0.375 0.25 0.75 0.5 e solid ellipse black lightgrey
edge a b 4 0.375 0.25 0.375 0.25 0.375 0.25 0.375 0.25 solid black
edge d e 4 3.164 3.039 2.6466 2.5216 1.3117 1.1867 0.6955 0.5705 solid black
stop
`],
  ['ipsep', 'digraph G { mode=ipsep; maxiter=-1; a->b->c }', `graph 1 0.75 0.5
node a 0.375 0.25 0.75 0.5 a solid ellipse black lightgrey
node b 0.375 0.25 0.75 0.5 b solid ellipse black lightgrey
node c 0.375 0.25 0.75 0.5 c solid ellipse black lightgrey
edge a b 4 0.375 0.25 0.375 0.25 0.375 0.25 0.375 0.25 solid black
edge b c 4 0.375 0.25 0.375 0.25 0.375 0.25 0.375 0.25 solid black
stop
`],
  ['sgd', 'graph G { mode=sgd; maxiter=-1; a--b--c }', `graph 1 0.75 0.5
node a 0.375 0.25 0.75 0.5 a solid ellipse black lightgrey
node b 0.375 0.25 0.75 0.5 b solid ellipse black lightgrey
node c 0.375 0.25 0.75 0.5 c solid ellipse black lightgrey
edge a b 4 0.375 0.25 0.375 0.25 0.375 0.25 0.375 0.25 solid black
edge b c 4 0.375 0.25 0.375 0.25 0.375 0.25 0.375 0.25 solid black
stop
`],
] as const;

describe('maxiter < 0 returns before any solver (neatoinit.c:1290)', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it.each(NEGATIVE_MAXITER)('%s', async (_name, src, native) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = String(await render(parse(src), 'plain', { engine: 'neato' }));
    expect(comparePlain(out, native, { iterative: false }).diffs).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });
});
