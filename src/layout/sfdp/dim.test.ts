// SPDX-License-Identifier: EPL-2.0
//
// sfdp under `dim`/`dimen` against native graphviz 16.1.0 fixtures: every
// coordinate within 0.5 pt (part-10 AD-3, sfdp's solver differs from native in
// the last bit of pow) and `pos` carries native's coordinate count.
// @see lib/sfdpgen/sfdpinit.c:sfdp_init_graph, sfdpLayout, getPos
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse, render } from '../../index.js';
import { getSizes } from './init.js';
import { MAXDIM } from '../neato/init-dim.js';

const FIXTURES = new URL('./__fixtures__/dim/', import.meta.url);
const SFDP_TOLERANCE = 0.5;
const CASES = ['dim3', 'dim3-dimen3', 'dim4-dimen4', 'overlap-prism-dim3'] as const;
const read = (name: string): string => readFileSync(new URL(name, FIXTURES), 'utf8');

/** Every `pos="..."` attribute, each as its list of numbers (node and edge). */
function posLists(text: string): number[][] {
  return [...text.matchAll(/\bpos="([^"]+)"/g)].map((m) =>
    m[1]!.split(/[ ,]/).filter((s) => s !== '').map(Number));
}

describe('sfdp dim and dimen match native', () => {
  it.each(CASES)('%s dot pos count and values', (id) => {
    const got = posLists(String(render(parse(read(`${id}.gv`)), 'dot', { engine: 'sfdp' })));
    const want = posLists(read(`${id}.dot`));
    expect(got.map((p) => p.length)).toEqual(want.map((p) => p.length));
    got.forEach((p, i) => p.forEach((v, k) => {
      expect(Math.abs(v - want[i]![k]!)).toBeLessThanOrEqual(SFDP_TOLERANCE);
    }));
  });
  it('dim4-dimen4 gives every node four coordinates', () => {
    const dot = String(render(parse(read('dim4-dimen4.gv')), 'dot', { engine: 'sfdp' }));
    const nodes = [...dot.matchAll(/\bpos="([^"]+)",\s*\n?\s*width/g)].map((m) => m[1]!.split(',').length);
    expect(nodes).toEqual([4, 4, 4, 4, 4, 4]);
  });
  it('dim above MAXDIM is clamped to MAXDIM coordinates per node', () => {
    const src = 'graph G { dim=99; dimen=99; a -- b; b -- c; c -- a }';
    const dot = String(render(parse(src), 'dot', { engine: 'sfdp' }));
    const nodes = [...dot.matchAll(/\bpos="([^"]+)",\s*\n?\s*width/g)].map((m) => m[1]!.split(',').length);
    expect(nodes).toEqual([MAXDIM, MAXDIM, MAXDIM]);
  });
  it('getSizes strides by ndim, with zeros beyond x and y', () => {
    const g = parse('graph G { a; b }');
    for (const [i, n] of [...g.nodes.values()].entries()) {
      n.info.id = i;
      n.info.width = 1;
      n.info.height = 2;
    }
    expect(getSizes(g, { x: 0.25, y: 0.5 }, 3)).toEqual([0.75, 1.5, 0, 0.75, 1.5, 0]);
  });
});
