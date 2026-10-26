// SPDX-License-Identifier: EPL-2.0
/**
 * `gvrender_set_style: unsupported style X - ignoring`: which style tokens
 * reach the render engine from each caller, and how often. Every expectation
 * in the per-format table is native dot 16.1.0's stderr for the same input.
 * @see lib/gvc/gvrender.c:480 gvrender_set_style
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../index.js';
import {
  checkClusterStyleTokens,
  checkStyleTokens,
  gvrenderSetStyle,
} from './gvrender-set-style.js';
import type { PolygonT } from '../common/types.js';

type Format = 'svg' | 'xdot' | 'json' | 'cmapx' | 'dot' | 'plain';
const FORMATS: readonly Format[] = ['svg', 'xdot', 'plain', 'cmapx', 'dot', 'json'];
/** json renders a nested xdot pass, so every message prints twice. */
const PASSES: Readonly<Record<Format, number>> = {
  svg: 1, xdot: 1, plain: 1, cmapx: 1, dot: 1, json: 2,
};

const warning = (token: string): string =>
  `Warning: gvrender_set_style: unsupported style ${token} - ignoring`;

function stderrOf(src: string, format: Format): string[] {
  const lines: string[] = [];
  const sink = (...a: unknown[]): void => { lines.push(a.map(String).join(' ')); };
  vi.spyOn(console, 'error').mockImplementation(sink);
  vi.spyOn(console, 'warn').mockImplementation(sink);
  render(parse(src), format, { engine: 'dot' });
  return lines;
}

afterEach(() => { vi.restoreAllMocks(); });

function polygon(over: Partial<PolygonT>): PolygonT {
  return {
    regular: false, peripheries: 1, sides: 4, orientation: 0, distortion: 0, skew: 0,
    ...over,
  } as PolygonT;
}

describe('gvrenderSetStyle', () => {
  it('warns once per unsupported token, in order, and not for known ones', () => {
    const lines: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => { lines.push(String(a[0])); });
    gvrenderSetStyle(['solid', 'foo', 'dashed', 'dotted', 'invis', 'invisible', 'bold',
      'setlinewidth(2)', 'filled', 'unfilled', 'tapered', 'bar(1)']);
    expect(lines).toEqual([warning('foo').trimEnd(), warning('bar').trimEnd()]);
  });

  it('warns on every call (no once-flag)', () => {
    const lines: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => { lines.push(String(a[0])); });
    gvrenderSetStyle(['foo']);
    gvrenderSetStyle(['foo']);
    expect(lines).toHaveLength(2);
  });

  it('is silent for a null or empty list', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    gvrenderSetStyle(null);
    gvrenderSetStyle([]);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('checkStyleTokens (shapes.c:checkStyle)', () => {
  it('removes rounded, diagonals and radial; keeps filled and invis', () => {
    expect(checkStyleTokens(['rounded', 'filled', 'diagonals', 'invis', 'radial', 'x'], null))
      .toEqual(['filled', 'invis', 'x']);
  });

  it('removes striped only for a box and wedged only for an ellipse', () => {
    const box = polygon({ sides: 4 });
    const ell = polygon({ sides: 1 });
    expect(checkStyleTokens(['striped', 'wedged'], box)).toEqual(['wedged']);
    expect(checkStyleTokens(['striped', 'wedged'], ell)).toEqual(['striped']);
    expect(checkStyleTokens(['striped', 'wedged'], null)).toEqual(['striped', 'wedged']);
  });

  it('treats a rotated, distorted or skewed quadrilateral as no box', () => {
    expect(checkStyleTokens(['striped'], polygon({ orientation: 45 }))).toEqual(['striped']);
    expect(checkStyleTokens(['striped'], polygon({ distortion: 1 }))).toEqual(['striped']);
    expect(checkStyleTokens(['striped'], polygon({ skew: 1 }))).toEqual(['striped']);
    expect(checkStyleTokens(['striped'], polygon({ orientation: 90 }))).toEqual([]);
  });
});

describe('checkClusterStyleTokens (emit.c:checkClusterStyle)', () => {
  it('removes radial, striped and rounded; keeps the rest', () => {
    expect(checkClusterStyleTokens(['filled', 'radial', 'striped', 'rounded', 'bogus']))
      .toEqual(['filled', 'bogus']);
  });
});

interface Case { name: string; src: string; tokens: string[] }
const CASES: readonly Case[] = [
  { name: 'edge style=rounded (spline)', src: 'digraph{a->b[style=rounded]}', tokens: ['rounded'] },
  { name: 'edge style=rounded (ortho)', src: 'digraph{splines=ortho;a->b[style=rounded]}', tokens: ['rounded'] },
  { name: 'edge style=bogus', src: 'digraph{a->b[style=bogus]}', tokens: ['bogus'] },
  { name: 'edge dashed,bogus', src: 'digraph{a->b[style="dashed,bogus"]}', tokens: ['bogus'] },
  { name: 'edge two bad tokens', src: 'digraph{a->b[style="foo,dashed,bar(2)"]}', tokens: ['foo', 'bar'] },
  {
    name: 'edge known tokens are silent',
    src: 'digraph{a->b[style="bogus,setlinewidth(2),bold,invisible2"]}',
    tokens: ['bogus', 'invisible2'],
  },
  { name: 'node rounded,bogus', src: 'digraph{a[style="rounded,bogus"]}', tokens: ['bogus'] },
  { name: 'node style=bogus', src: 'digraph{a[style=bogus]}', tokens: ['bogus'] },
  { name: 'node striped on an ellipse', src: 'digraph{a[style=striped,fillcolor="red:blue"]}', tokens: ['striped'] },
  {
    name: 'node wedged on a box',
    src: 'digraph{a[shape=box,style=wedged,fillcolor="red:blue"]}',
    tokens: ['wedged'],
  },
  { name: 'record', src: 'digraph{a[shape=record,label="x|y",style="rounded,bogus"]}', tokens: ['bogus'] },
  { name: 'point node is silent', src: 'digraph{a[shape=point,style=bogus]}', tokens: [] },
  { name: 'cluster style=bogus', src: 'digraph{subgraph cluster_x{style=bogus; a}}', tokens: ['bogus'] },
  {
    name: 'cluster rounded,bogus,filled',
    src: 'digraph{subgraph cluster_x{style="rounded,bogus,filled"; a}}',
    tokens: ['bogus'],
  },
  { name: 'valid styles are silent', src: 'digraph{a[style=filled]; a->b[style=dashed]; subgraph cluster_x{style=filled;c}}', tokens: [] },
];

describe('unsupported style warning — per format (native 16.1.0 stderr)', () => {
  for (const c of CASES) {
    it.each(FORMATS)(`${c.name}: %s`, (format) => {
      const expected: string[] = [];
      for (let pass = 0; pass < PASSES[format]; pass++) {
        for (const t of c.tokens) expected.push(warning(t.trim()).trimEnd());
      }
      expect(stderrOf(c.src, format)).toEqual(expected);
    });
  }

  it('prints an inner cluster after the outer one, except on cmapx (clusters last)', () => {
    const src = 'digraph{subgraph cluster_x{style=bogus; a; subgraph cluster_y{style=zork; b}}}';
    const outerFirst = [warning('bogus'), warning('zork')].map((s) => s.trimEnd());
    const innerFirst = [...outerFirst].reverse();
    expect(stderrOf(src, 'svg')).toEqual(outerFirst);
    expect(stderrOf(src, 'cmapx')).toEqual(innerFirst);
    expect(stderrOf(src, 'json')).toEqual([...outerFirst, ...outerFirst]);
  });

  it('repeats an edge warning after each flagged bezier of a multi-bezier spline', () => {
    // Native 16.1.0: 9 messages (concentrate merges edges into multi-bezier splines).
    const src = 'digraph{concentrate=true;edge[style=bogus]; a->b;a->c;a->d; b->e;c->e;d->e; a->e; b->d}';
    for (const format of ['svg', 'xdot'] as const) {
      expect(stderrOf(src, format)).toEqual(Array<string>(9).fill(warning('bogus')));
    }
  });
});
