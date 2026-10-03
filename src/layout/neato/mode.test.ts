// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as initModule from './init.js';
import { parse, render } from '../../index.js';
import { Graph } from '../../model/graph.js';
import { MODE_KK, MODE_MAJOR, MODE_SGD, MODE_HIER, MODE_IPSEP } from './init.js';
import { parseMode } from './index.js';

// Wrap solveModel so the mode the dispatcher hands it can be observed.
vi.mock('./init.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./init.js')>();
  return { ...actual, solveModel: vi.fn(actual.solveModel) };
});

afterEach(() => { vi.restoreAllMocks(); vi.mocked(initModule.solveModel).mockClear(); });

/** Parse the `node name x y` rows of -Tplain output. */
const nodes = (plainOut: string): Map<string, [number, number]> => new Map(
  plainOut.split('\n').filter((l) => l.startsWith('node ')).map((l) => {
    const t = l.split(' ');
    return [t[1]!, [Number(t[2]), Number(t[3])] as [number, number]];
  }),
);
const NATIVE_TOLERANCE = 0.5;

const BODY = 'a--b--c--d--a; a--c; b--e; e--f';
const plain = async (attrs: string): Promise<string> =>
  String(await render(parse(`graph g { ${attrs} ${BODY} }`), 'plain', { engine: 'neato' }));
const graphWithMode = (mode: string | undefined): Graph => {
  const g = new Graph('g', 'undirected');
  if (mode !== undefined) g.attrs.set('mode', mode);
  return g;
};

describe('parseMode (C neatoMode)', () => {
  it.each([
    [undefined, MODE_MAJOR], ['', MODE_MAJOR], ['major', MODE_MAJOR], ['KK', MODE_KK],
    ['sgd', MODE_SGD], ['hier', MODE_HIER], ['ipsep', MODE_IPSEP],
  ])('mode=%s -> %s', (value, expected) => {
    expect(parseMode(graphWithMode(value))).toBe(expected);
  });

  it('is case sensitive: "kk" is illegal and falls back to major', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseMode(graphWithMode('kk'))).toBe(MODE_MAJOR);
    expect(warn).toHaveBeenCalledWith(
      'Illegal value kk for attribute "mode" in graph g - ignored',
    );
  });

  it('does not warn for a legal or absent value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    parseMode(graphWithMode('sgd'));
    parseMode(graphWithMode(undefined));
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('neato dispatch on mode', () => {
  it('mode=bogus warns once per render and matches the default (major)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = await plain('mode=bogus;');
    expect(out).toBe(await plain(''));
    expect(warn.mock.calls.filter(([m]) => String(m).includes('Illegal value bogus')))
      .toHaveLength(1);
  });

  it('mode=sgd reaches sgd (output differs from major)', async () => {
    expect(await plain('mode=sgd;')).not.toBe(await plain(''));
  });

  it('mode=hier still fails loudly', async () => {
    await expect(plain('mode=hier;')).rejects.toMatchObject({ code: 'UNSUPPORTED_FEATURE' });
  });
});

describe('mode=KK routing', () => {
  it('parseMode yields MODE_KK and solveModel receives it unchanged', async () => {
    expect(parseMode(graphWithMode('KK'))).toBe(MODE_KK);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await plain('mode=KK;');
    expect(vi.mocked(initModule.solveModel).mock.calls.map((c) => c[1])).toEqual([MODE_KK]);
  });
});

// Expected coordinates are the native neato (graphviz 15.1.0~dev) -Tplain output.
const SGD_FIXTURES: readonly (readonly [string, string, Record<string, [number, number]>])[] = [
  ['6 nodes, start=5', 'graph a { mode=sgd; start=5; a--b--c--d--a; a--c; b--e; e--f; }',
    { a: [1.2516, 0.87289], b: [1.2024, 1.9067], c: [0.375, 1.28], d: [0.42268, 0.25],
      e: [1.5524, 2.8684], f: [2.0902, 3.7204] }],
  ['8 nodes with distance ties, start=17',
    'graph b { mode=sgd; start=17; node[shape=box]; 1--2--3--4--5--1; 1--3; 2--6; 6--7--8; 8--1; }',
    { 1: [1.9835, 1.8252], 2: [1.8651, 0.74583], 3: [1.0413, 1.2828], 4: [0.375, 2.1376],
      5: [1.3014, 2.7022], 6: [2.8263, 0.25], 7: [3.6652, 0.97055], 8: [3.0982, 1.9226] }],
  ['edge len attribute', 'graph j { mode=sgd; start=11; a--b--c--d; b--d [len=2]; }',
    { a: [2.8852, 1.8297], b: [1.9471, 1.4562], c: [1.2765, 0.69669], d: [0.375, 0.25] }],
  ['pinned node', 'graph g { mode=sgd; start=2; a[pos="1,1!"]; a--b--c--d--a; c--e; }',
    { a: [2.9741, 1.1145], b: [2.3089, 0.25], c: [1.4116, 0.86772], d: [2.0824, 1.7287],
      e: [0.375, 0.77208] }],
];

describe('mode=sgd matches native neato', () => {
  it.each(SGD_FIXTURES)('%s', async (_name, src, expected) => {
    const got = nodes(String(await render(parse(src), 'plain', { engine: 'neato' })));
    expect(got.size).toBe(Object.keys(expected).length);
    for (const [name, [x, y]] of Object.entries(expected)) {
      expect(Math.abs(got.get(name)![0] - x)).toBeLessThan(NATIVE_TOLERANCE);
      expect(Math.abs(got.get(name)![1] - y)).toBeLessThan(NATIVE_TOLERANCE);
    }
  });

  it('warns and ignores a bad edge len, like C lenattr', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await plain('mode=sgd; start=3; a--z [len=-1];');
    expect(warn).toHaveBeenCalledWith('bad edge len "-1" in g - setting to 1.00');
  });
});

describe('mode=sgd edge cases (C sgd_graph / sgd)', () => {
  const sgd = (src: string): string =>
    String(render(parse(src), 'plain', { engine: 'neato' }));

  it('ignores self-loops when building the graph (agtail == aghead skipped)', () => {
    const loop = nodes(sgd('graph g { mode=sgd; start=3; a--b--c--a; a--a; b--b }'));
    const plain3 = nodes(sgd('graph g { mode=sgd; start=3; a--b--c--a }'));
    expect([...loop.entries()]).toEqual([...plain3.entries()]);
  });

  it('honours maxiter (atoi) instead of the default 30 iterations', () => {
    const src = (it: string): string => `graph g { mode=sgd; start=3; ${it} a--b--c--d--a; c--e }`;
    expect(sgd(src('maxiter=0;'))).not.toBe(sgd(src('')));
    expect(sgd(src('maxiter=x;'))).toBe(sgd(src('maxiter=0;')));
  });

  it('lays out an edgeless graph (no terms) and an empty graph', () => {
    expect(nodes(sgd('graph g { mode=sgd; start=3; a; b }')).size).toBe(2);
    expect(nodes(sgd('graph g { mode=sgd }')).size).toBe(0);
  });
});
