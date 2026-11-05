// SPDX-License-Identifier: EPL-2.0
//
// neato `dim`, `dimen`, `z` and 3-D `pos` on the default solver against native
// graphviz 16.1.0 `-Kneato -Txdot/-Tdot`. Fixtures under __fixtures__/dim/ are
// the oracle's own output (part-10 AD-3: byte-equal or within 0.01).
// @see lib/neatogen/neatoinit.c:neato_init_graph, user_pos, addZ
// @see lib/common/output.c:attach_attrs_and_arrows
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse, render } from '../../index.js';
import { compareXdot, XDOT_TOLERANCE } from '../../../test/golden/compare-xdot.js';
import { neatoInitGraphDim, MAXDIM, userPos } from './init-dim.js';
import { neatoInitNode } from './init.js';

const FIXTURES = new URL('./__fixtures__/dim/', import.meta.url);
const POSITION_TOLERANCE = XDOT_TOLERANCE + 1e-9;
const read = (name: string): string => readFileSync(new URL(name, FIXTURES), 'utf8');

/** Default-solver cases; the others belong to the KK, stress, hier, sgd, ipsep and overlap tasks. */
const DEFAULT_SOLVER = ['dim3', 'dimen3', 'dim3-dimen3', 'dim4-dimen4', 'dim11-dimen11', 'pins-dim3'] as const;

function nodePos(text: string): string[] {
  return [...text.matchAll(/\bpos="([^"]+)",\s*\n?\s*(?:width|z)/g)].map((m) => m[1]!);
}

describe('neato dim reads', () => {
  const ndim = (src: string): { ndim?: number; odim?: number } => {
    const g = parse(src);
    neatoInitGraphDim(g);
    return { ndim: g.info.ndim, odim: g.info.odim };
  };
  it('defaults to 2', () => {
    expect(ndim('graph{a}')).toEqual({ ndim: 2, odim: 2 });
  });
  it('dim alone sets ndim, not odim', () => {
    expect(ndim('graph{dim=3;a}')).toEqual({ ndim: 3, odim: 2 });
  });
  it('dimen alone sets both', () => {
    expect(ndim('graph{dimen=3;a}')).toEqual({ ndim: 3, odim: 3 });
  });
  it('dim=11 clamps at MAXDIM', () => {
    expect(MAXDIM).toBe(10);
    expect(ndim('graph{dim=11;dimen=11;a}')).toEqual({ ndim: 10, odim: 10 });
  });
  it('odim never exceeds ndim', () => {
    expect(ndim('graph{dim=3;dimen=5;a}')).toEqual({ ndim: 3, odim: 3 });
  });
});

describe('default solver matches native', () => {
  it.each(DEFAULT_SOLVER)('%s xdot', (id) => {
    const xdot = String(render(parse(read(`${id}.gv`)), 'xdot', { engine: 'neato' }));
    expect(compareXdot(xdot, read(`${id}.xdot`), POSITION_TOLERANCE).diffs).toEqual([]);
  });
  it.each(DEFAULT_SOLVER)('%s dot pos has native coordinate counts', (id) => {
    const dot = String(render(parse(read(`${id}.gv`)), 'dot', { engine: 'neato' }));
    const counts = (t: string): number[] => nodePos(t).map((p) => p.split(',').length);
    expect(counts(dot)).toEqual(counts(read(`${id}.dot`)));
    expect(counts(dot).length).toBeGreaterThan(0);
  });
});

describe('json output', () => {
  it('prints native\'s three coordinates for dim=3 dimen=3', () => {
    const json = String(render(parse(read('dim3-dimen3.gv')), 'json', { engine: 'neato' }));
    const pos = [...json.matchAll(/"pos": "([^"]+)"/g)].map((m) => m[1]!).filter((p) => !p.includes(' '));
    expect(pos.slice(0, 3)).toEqual(['52.001,159.72,-7.2571', '83.811,222.7,-23.86', '123.54,179.17,18.417']);
  });
});

describe('z attribute', () => {
  it('pos="1,2,3!" is pinned at z=3 and printed in points', () => {
    const dot = String(render(parse(read('pins-dim3.gv')), 'dot', { engine: 'neato' }));
    expect(dot).toMatch(/pos="[\d.]+,[\d.]+,[\d.]+",\n?\s*width=0.75,\n?\s*z=[\d.-]+/);
  });
  it('a 2-D layout with dim=3 prints two coordinates', () => {
    const dot = String(render(parse(read('dim3.gv')), 'dot', { engine: 'neato' }));
    expect(nodePos(dot).every((p) => p.split(',').length === 2)).toBe(true);
  });
});

describe('userPos', () => {
  const place = (src: string, ndim: number): { pos: number[]; pinned: boolean | undefined } => {
    const g = parse(src);
    const n = g.nodes.get('a')!;
    neatoInitNode(n, ndim);
    expect(userPos(n, ndim, 1)).toBe(true);
    return { pos: n.info.pos!, pinned: n.info.pinned };
  };
  it('reads three coordinates and the pin from "x,y,z!"', () => {
    expect(place('graph{a[pos="1,2,3!"]}', 3)).toEqual({ pos: [1, 2, 3], pinned: true });
  });
  it('divides every coordinate by inputscale', () => {
    expect(place('graph{inputscale=2;a[pos="2,4,6"]}', 3).pos).toEqual([1, 2, 3]);
  });
  it('takes the third coordinate from z, scaled by inputscale', () => {
    expect(place('graph{inputscale=2;a[pos="2,4",z=8]}', 3).pos).toEqual([1, 2, 4]);
  });
  it('ignores a third coordinate when ndim is 2 and does not pin on it', () => {
    expect(place('graph{a[pos="1,2,3!"]}', 2)).toEqual({ pos: [1, 2], pinned: undefined });
  });
  it('returns false for a malformed pos', () => {
    const g = parse('graph{a[pos="x"]}');
    const n = g.nodes.get('a')!;
    neatoInitNode(n, 3);
    expect(userPos(n, 3, 1)).toBe(false);
  });
});
