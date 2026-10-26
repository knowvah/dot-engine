// SPDX-License-Identifier: EPL-2.0
/**
 * `Warning: <name> is not a known color.`: where, how often and in what order
 * gvrender_resolve_color prints it, per output format. Every expectation below
 * is native dot 16.1.0's stderr for the same input and format.
 * @see lib/gvc/gvrender.c:188 gvrender_resolve_color
 * @see lib/common/emit.c:emit_once
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../index.js';
import { colorxlate, ColorxlateResult, type GVColor } from '../common/color.js';
import {
  KNOWN_COLORS,
  backgroundColors,
  edgeGraphicsColors,
  type EdgeColorSpec,
} from './color-resolve.js';

type Format = 'svg' | 'xdot' | 'json' | 'cmapx' | 'dot' | 'plain';
const FORMATS: readonly Format[] = ['svg', 'xdot', 'json', 'cmapx', 'dot', 'plain'];

/** The stderr lines the port prints while rendering `src` as `format`. */
function stderrOf(src: string, format: Format): string[] {
  const lines: string[] = [];
  const sink = (...a: unknown[]): void => { lines.push(a.map(String).join(' ')); };
  vi.spyOn(console, 'error').mockImplementation(sink);
  vi.spyOn(console, 'warn').mockImplementation(sink);
  render(parse(src), format, { engine: 'dot' });
  return lines;
}

/** The unknown-color names, in order, from a list of stderr lines. */
function warned(lines: string[]): string[] {
  return lines.map((l) => /^Warning: (.*) is not a known color\.$/.exec(l)?.[1] ?? `?${l}`);
}

afterEach(() => { vi.restoreAllMocks(); });

describe('unknown color warning — per format', () => {
  it.each(FORMATS)('warns once for a node color in %s', (format) => {
    expect(stderrOf('digraph{a[color=foo]}', format)).toEqual(['Warning: foo is not a known color.']);
  });

  it.each(FORMATS)('warns once however many objects use the name (%s)', (format) => {
    const src = 'digraph{a[color=foo]; b[color=foo]; c[color=foo]; a->b[color=foo]}';
    expect(warned(stderrOf(src, format))).toEqual(['foo']);
  });

  it('warns again in a second render of the same process', () => {
    expect(warned(stderrOf('digraph{a[color=foo]}', 'svg'))).toEqual(['foo']);
    expect(warned(stderrOf('digraph{a[color=foo]}', 'svg'))).toEqual(['foo']);
  });

  it.each(FORMATS)('is silent for known, hex, hsv and empty colors (%s)', (format) => {
    const src = 'digraph{a[color=red]; b[color="#ff0000"]; c[color="0.5 0.5 0.5"]; d[color=""]; e[color=none]}';
    expect(stderrOf(src, format)).toEqual([]);
  });

  it.each(FORMATS)('is silent for an invisible object (%s)', (format) => {
    expect(stderrOf('digraph{a[style=invis color=foo]; a->b[style=invis color=bar]}', format)).toEqual([]);
  });
});

describe('unknown color warning — C call order', () => {
  const ORDER: ReadonlyArray<readonly [string, string, string[]]> = [
    ['node fill, pen, fontcolor', 'digraph{a[style=filled fillcolor=f1 color=c1 fontcolor=t1 label=x]}', ['f1', 'c1', 't1']],
    ['record pen before fill', 'digraph{a[shape=record label="{x|y}" color=r1 fillcolor=r2 style=filled fontcolor=r3]}', ['r1', 'r2', 'r3']],
    ['edge fillcolor before color', 'digraph{a->b[color=e1 fillcolor=ef1]}', ['ef1', 'e1']],
    ['edge color list', 'digraph{a->b[color="e1:e2" fontcolor=ef label=lab]}', ['e1', 'e2', 'ef']],
    ['edge semicolon list', 'digraph{a->b[color="e1;0.3:e2"]}', ['e1', 'e2']],
    ['tapered edge', 'digraph{a->b[style=tapered color=t1 fillcolor=t2 penwidth=4]}', ['t2', 't1']],
    ['cluster fill before pen', 'digraph{subgraph cluster_a{bgcolor=b1 pencolor=p1 fillcolor=f1 style=filled fontcolor=fc label=L; x}}', ['f1', 'p1', 'fc']],
    ['striped cluster stripes after pen', 'digraph{subgraph cluster_a{style=striped fillcolor="s1:s2" color=s3; x}}', ['s3', 's1', 's2']],
    ['graph background before label', 'digraph{bgcolor=g1 fontcolor=g2 label=L a}', ['g1', 'g2']],
    ['html table pen, fill, cell fill, cell pen, font', 'digraph{a[label=<<TABLE BGCOLOR="h1" COLOR="h2"><TR><TD BGCOLOR="h3" COLOR="h4"><FONT COLOR="h5">x</FONT></TD></TR></TABLE>>]}', ['h2', 'h1', 'h3', 'h4', 'h5']],
    ['html text font only', 'digraph{a[label=<<FONT COLOR="h5">x</FONT>>]}', ['h5']],
    ['html edge label', 'digraph{a->b[label=<<FONT COLOR="e1">x</FONT>> headlabel=<<B><FONT COLOR="e2">h</FONT></B>>]}', ['e1', 'e2']],
    ['xlabel and edge xlabel', 'digraph{a[xlabel=xl fontcolor=xc]; a->b[xlabel=xl fontcolor=ec]}', ['xc', 'ec']],
  ];

  it.each(ORDER)('%s', (_name, src, expected) => {
    for (const format of FORMATS) {
      expect(warned(stderrOf(src, format)), format).toEqual(expected);
    }
  });
});

describe('unknown color warning — renderer known-colors list', () => {
  const SCHEMED = 'digraph{colorscheme=blues5; bgcolor=2; fontcolor=3; label=x; a[color=red]}';

  it('svg skips colorxlate for a listed name, so the root scheme leaves it silent', () => {
    expect(stderrOf(SCHEMED, 'svg')).toEqual([]);
  });

  it.each(['xdot', 'cmapx', 'plain'] as const)(
    '%s has no list: the transparent pen is resolved under the scheme',
    (format) => {
      expect(warned(stderrOf(SCHEMED, format))).toEqual(['transparent']);
    },
  );

  it('colors the root background and label under the root colorscheme', () => {
    const svg = render(parse('digraph{colorscheme=blues5; bgcolor=2; fontcolor=3; label=x; a}'), 'svg');
    expect(svg).toContain('<polygon fill="#bdd7e7" stroke="none"');
    expect(svg).toContain('fill="#6baed6">x</text>');
  });

  it('every SVG known name colorxlates OK under the default scheme', () => {
    const color: GVColor = { type: 'rgba', r: 0, g: 0, b: 0, a: 0 };
    const bad = [...KNOWN_COLORS].filter((n) => colorxlate(n, color, 'rgba') !== ColorxlateResult.ColorOk);
    expect(bad).toEqual([]);
  });
});

describe('edgeGraphicsColors / backgroundColors', () => {
  const base: EdgeColorSpec = { color: '', fillcolor: '', tapered: false, arrows: [] };

  it('defaults an empty color to black', () => {
    expect(edgeGraphicsColors(base)).toEqual(['black', 'black']);
  });

  it('puts an explicit fillcolor first, then pen and fill', () => {
    expect(edgeGraphicsColors({ ...base, color: 'a', fillcolor: 'b' })).toEqual(['b', 'a', 'b']);
  });

  it('lists a colon list token by token, skipping empty tokens', () => {
    expect(edgeGraphicsColors({ ...base, color: 'a::b' })).toEqual(['a', 'b']);
  });

  it('lists segment colors then the arrow colors for a semicolon list', () => {
    const arrows = [{ sflag: true, eflag: true }];
    expect(edgeGraphicsColors({ ...base, color: 'a;0.5:b;0.5', arrows })).toEqual(['a', 'b', 'a', 'b']);
  });

  it('falls back to black when the segment spec is rejected', () => {
    expect(edgeGraphicsColors({ ...base, color: 'a;x:b;0.5' })).toEqual(['black']);
  });

  it('background: default white, transparent pen; transparent is unpainted only on svg', () => {
    expect(backgroundColors(undefined, false)).toEqual(['white', 'transparent']);
    expect(backgroundColors('transparent', true)).toEqual([]);
    expect(backgroundColors('transparent', false)).toEqual(['white', 'transparent']);
    expect(backgroundColors('c1:c2', false)).toEqual(['c1', 'transparent', 'c2']);
  });
});
