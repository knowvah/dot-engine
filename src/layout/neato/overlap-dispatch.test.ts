// SPDX-License-Identifier: EPL-2.0

/**
 * removeOverlapWith dispatch (adjustNodesFull) against the native oracle:
 * oscale, ortho*, portho* and vpsc on neato, twopi, circo and sfdp, voronoi's
 * exact overlap test, and C's "Unhandled adjust option" default branch.
 * Expected values are native `-Tplain` node centres (inches).
 *
 * @see lib/neatogen/adjust.c:removeOverlapWith
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../index.js';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { removeOverlapWith, getAdjustMode } from './fdp-adjust.js';

type Engine = 'neato' | 'twopi' | 'circo' | 'sfdp';
type Coords = Record<string, [number, number]>;

/** Native plain output rounds to 4 significant digits. */
const TOL = 0.0006;

/** Pinned (`pos!`) overlapping boxes: only the adjuster moves nodes. */
const PINNED = (m: string): string =>
  `graph G { overlap=${m}; node[shape=box,width=1,height=0.6,fixedsize=true];
 a [pos="0,0!"]; b [pos="0.5,0.2!"]; c [pos="1.1,0.1!"]; d [pos="0.3,1.0!"];
 e [pos="0.9,0.9!"]; a--b--c; d--e }`;
const STAR = (m: string): string =>
  `graph G { overlap=${m}; node[shape=box,width=1.5,height=1,fixedsize=true];
 a--b; a--c; a--d; a--e; a--f; a--g }`;
const RING = (m: string): string =>
  `graph G { overlap=${m}; mindist=0; node[shape=box,width=2,height=1,fixedsize=true];
 a--b--c--d--e--f--a; a--d }`;
const PAIR = (m: string): string =>
  `graph G { overlap=${m}; node[shape=box,width=3,height=2,fixedsize=true]; a--b }`;

function coords(src: string, engine: Engine): Coords {
  const plain = render(parse(src), 'plain', { engine }) as string;
  const out: Coords = {};
  for (const l of plain.split('\n')) {
    if (!l.startsWith('node ')) continue;
    const f = l.split(' ');
    out[f[1]!] = [Number(f[2]), Number(f[3])];
  }
  return out;
}

function expectNear(actual: Coords, expected: Coords): void {
  expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
  for (const [k, [x, y]] of Object.entries(expected)) {
    expect(Math.abs(actual[k]![0] - x), `${k}.x`).toBeLessThanOrEqual(TOL);
    expect(Math.abs(actual[k]![1] - y), `${k}.y`).toBeLessThanOrEqual(TOL);
  }
}

interface Case { label: string; engine: Engine; src: string; native: Coords }

const CASES: Case[] = [
  { label: 'neato oscale', engine: 'neato', src: PINNED('oscale'), native: {
    a: [0.5, 0.3], b: [1.646, 0.7584], c: [3.0212, 0.5292], d: [1.1876, 2.592], e: [2.5628, 2.3628] } },
  { label: 'neato ortho', engine: 'neato', src: PINNED('ortho'), native: {
    a: [0.5, 0.3], b: [0.52778, 1.0361], c: [1.6389, 0.31389], d: [0.51389, 2.4806], e: [1.625, 1.7583] } },
  { label: 'neato portho', engine: 'neato', src: PINNED('portho'), native: {
    a: [0.5, 0.3], b: [0.5, 1.7444], c: [1.6111, 1.0222], d: [0.5, 3.1889], e: [1.6111, 2.4667] } },
  { label: 'neato vpsc', engine: 'neato', src: PINNED('vpsc'), native: {
    a: [0.5, 0.3], b: [0.74439, 1.0111], c: [1.8556, 0.76389], d: [0.54439, 1.7222], e: [1.6556, 1.7222] } },
  { label: 'twopi oscale', engine: 'twopi', src: STAR('oscale'), native: {
    a: [2.383, 2.3856], b: [4.016, 3.3285], c: [2.383, 4.2713], d: [0.75, 3.3285],
    e: [0.75, 1.4428], f: [2.383, 0.5], g: [4.016, 1.4428] } },
  { label: 'twopi ortho', engine: 'twopi', src: STAR('ortho'), native: {
    a: [1.5556, 2.7222], b: [2.3611, 3.8333], c: [1.5556, 4.9444], d: [0.75, 3.8333],
    e: [0.75, 1.6111], f: [1.5556, 0.5], g: [2.3611, 1.6111] } },
  { label: 'twopi portho', engine: 'twopi', src: STAR('portho'), native: {
    a: [0.75, 3.8333], b: [2.3611, 6.0556], c: [0.75, 7.1667], d: [0.75, 4.9444],
    e: [0.75, 2.7222], f: [0.75, 0.5], g: [2.3611, 1.6111] } },
  { label: 'twopi vpsc', engine: 'twopi', src: STAR('vpsc'), native: {
    a: [1.616, 2.7222], b: [2.4821, 3.8333], c: [1.616, 4.9444], d: [0.75, 3.8333],
    e: [0.75, 1.6111], f: [1.616, 0.5], g: [2.4821, 1.6111] } },
  { label: 'circo oscale', engine: 'circo', src: RING('oscale'), native: {
    a: [2.1055, 4.3294], b: [4.3164, 0.5], c: [2.1055, 0.5], d: [1, 2.4147],
    e: [4.3164, 4.3294], f: [5.4218, 2.4147] } },
  { label: 'circo ortho', engine: 'circo', src: RING('ortho'), native: {
    a: [1.0139, 2.7222], b: [3.125, 0.5], c: [1.0139, 0.5], d: [1, 1.6111],
    e: [3.125, 2.7222], f: [3.1389, 1.6111] } },
  { label: 'circo portho', engine: 'circo', src: RING('portho'), native: {
    a: [1, 6.0556], b: [3.1111, 1.6111], c: [1, 0.5], d: [1, 3.8333],
    e: [3.1111, 4.9444], f: [3.1111, 2.7222] } },
  { label: 'circo vpsc', engine: 'circo', src: RING('vpsc'), native: {
    a: [1.8542, 3.808], b: [3.9655, 0.5], c: [1.8542, 0.5], d: [1, 2.154],
    e: [3.9655, 3.808], f: [4.8197, 2.154] } },
  { label: 'sfdp oscale', engine: 'sfdp', src: PAIR('oscale'), native: { a: [1.5, 1], b: [4.747, 1] } },
  { label: 'sfdp ortho', engine: 'sfdp', src: PAIR('ortho'), native: { a: [1.5, 1], b: [4.6111, 1] } },
  { label: 'sfdp portho', engine: 'sfdp', src: PAIR('portho'), native: { a: [1.5, 3.1111], b: [4.6111, 1] } },
  { label: 'sfdp vpsc', engine: 'sfdp', src: PAIR('vpsc'), native: { a: [1.5, 1], b: [4.6114, 1] } },
];

describe('removeOverlapWith dispatch vs native', () => {
  it.each(CASES)('$label matches native', ({ engine, src, native }) => {
    expectNear(coords(src, engine), native);
  });
});

describe('overlap=voronoi uses the exact polygon test', () => {
  it('does not throw for ellipses whose boxes touch but outlines do not', () => {
    const src = `graph G { overlap=voronoi; sep="+0";
      node[shape=ellipse,width=1,height=1,fixedsize=true];
      a [pos="0,0!"]; b [pos="0.95,0.95!"] }`;
    expectNear(coords(src, 'neato'), { a: [0.5, 0.5], b: [1.45, 1.45] });
  });
});

describe('getAdjustMode', () => {
  it.each([
    ['', 0], ['voronoi', 1], ['oscale', 2], ['scale', 3], ['scalexy', 4],
    ['ortho', 5], ['PORTHOYX', 12], ['compress', 13], ['vpsc', 14], ['ipsep', 15],
    ['prism', 16], ['false', 16], ['true', 0],
  ])('%j resolves to mode %i', (flag, mode) => {
    expect(getAdjustMode(flag).mode).toBe(mode);
  });
});

describe('default branch', () => {
  afterEach(() => vi.restoreAllMocks());

  function twoNodes(): Graph {
    const g = new Graph('g', 'undirected');
    for (const name of ['a', 'b']) {
      const n = new Node(g.nodes.size, name, g);
      n.info.pos = [0, 0];
      g.nodes.set(name, n);
    }
    return g;
  }

  it("warns with C's text for a mode removeOverlapWith does not handle", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const ret = removeOverlapWith(twoNodes(), { mode: 99, print: 'mystery', value: 0 });
    expect(ret).toBe(0);
    expect(warn).toHaveBeenCalledExactlyOnceWith('Unhandled adjust option mystery');
  });

  it('returns 0 without warning for fewer than two nodes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const g = new Graph('g', 'undirected');
    g.nodes.set('a', new Node(0, 'a', g));
    expect(removeOverlapWith(g, { mode: 99, print: 'mystery', value: 0 })).toBe(0);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('vpsc gap from an additive sep (vpscAdjust exp_margin.doAdd)', () => {
  const withSep = (sep: string): string => PINNED('vpsc').replace('overlap=vpsc;', `overlap=vpsc; sep="${sep}";`);

  it('uses 2*sep for both axes', () => {
    expectNear(coords(withSep('+6'), 'neato'), {
      a: [0.5, 0.3], b: [0.71662, 1.0667], c: [1.8834, 0.83333], d: [0.51662, 1.8333], e: [1.6834, 1.8333],
    });
  });

  it('falls back to 2*DFLT_MARGIN for a multiplicative sep', () => {
    expectNear(coords(withSep('0.5'), 'neato'), {
      a: [0.5, 0.3], b: [0.74439, 1.0111], c: [1.8556, 0.76389], d: [0.54439, 1.7222], e: [1.6556, 1.7222],
    });
  });

  it('uses separate x and y margins', () => {
    expectNear(coords(withSep('+4,10'), 'neato'), {
      a: [0.5, 0.3], b: [1.6112, 0.41111], c: [2.7224, 0.4], d: [1.1223, 1.3], e: [2.2335, 1.2889],
    });
  });
});

describe('AM_IPSEP under IPSEPCOLA', () => {
  it('is handled during layout: removeOverlapWith returns 0 and moves nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const g = new Graph('g', 'undirected');
    for (const name of ['a', 'b']) {
      const n = new Node(g.nodes.size, name, g);
      n.info.pos = [0, 0];
      g.nodes.set(name, n);
    }
    expect(removeOverlapWith(g, getAdjustMode('ipsep'))).toBe(0);
    expect([...g.nodes.values()].map((n) => n.info.pos)).toEqual([[0, 0], [0, 0]]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
