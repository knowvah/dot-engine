// SPDX-License-Identifier: EPL-2.0
import { describe, it, expect } from 'vitest';
import { htmlStyle } from './htmltable-style.js';
import { renderSvg } from '../index.js';

describe('htmlStyle (htmllex.c:stylefn into htmlstyle_t)', () => {
  it('reads space- and comma-separated tokens, case-insensitively', () => {
    expect(htmlStyle('ROUNDED DASHED')).toEqual({
      radial: false, rounded: true, invisible: false, dotted: false, dashed: true,
    });
    expect(htmlStyle('Rounded Dotted')).toMatchObject({ rounded: true, dotted: true });
    expect(htmlStyle('rounded,radial')).toMatchObject({ rounded: true, radial: true });
  });

  it('SOLID clears dotted and dashed set before it, not after', () => {
    expect(htmlStyle('dashed solid')).toMatchObject({ dashed: false, dotted: false });
    expect(htmlStyle('solid dotted')).toMatchObject({ dotted: true });
  });

  it('INVIS and INVISIBLE both set invisible; undefined sets nothing', () => {
    expect(htmlStyle('invis').invisible).toBe(true);
    expect(htmlStyle('INVISIBLE').invisible).toBe(true);
    expect(htmlStyle(undefined)).toEqual({
      radial: false, rounded: false, invisible: false, dotted: false, dashed: false,
    });
  });
});

/** Per-node shape signature: element[:fill][:dasharray], in document order. */
function signatures(svg: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of svg.matchAll(/<title>(\w)<\/title>([\s\S]*?)<\/g>/g)) {
    out[m[1]!] = [...m[2]!.matchAll(/<(path|polygon|radialGradient|linearGradient)([^>]*)>/g)]
      .map((t) => {
        const fill = /fill="([^"]*)"/.exec(t[2]!)?.[1]?.replace(/url\(#(\w)_\d+\)/, 'url($1)');
        const dash = /stroke-dasharray="([^"]*)"/.exec(t[2]!)?.[1];
        return t[1]! + (fill !== undefined ? ':' + fill : '') + (dash !== undefined ? ':' + dash : '');
      }).join(' ');
  }
  return out;
}

const table = (style: string, extra = ''): string =>
  `<<table style="${style}"${extra}><tr><td>x</td></tr></table>>`;

describe('HTML STYLE combinations (native 16.1.0 dot -Tsvg)', () => {
  it('draws every flag of a multi-token style', () => {
    const svg = renderSvg(`digraph { node [shape=plain]
      a [label=${table('ROUNDED,DASHED')}]
      b [label=${table('dashed solid')}]
      c [label=${table('solid dotted')}]
      d [label=${table('DOTTED')}]
      e [label=${table('RADIAL', ' bgcolor="red:blue"')}]
      f [label=${table('rounded radial', ' bgcolor="red:blue"')}]
      g [label=${table('dotted dashed')}]
      h [label=<<table><tr><td style="Rounded, Dotted" bgcolor="green">h</td></tr></table>>]
    }`, 'dot');
    expect(signatures(svg)).toEqual({
      a: 'path:none:5,2 polygon:none',
      b: 'polygon:none polygon:none',
      c: 'polygon:none:1,5 polygon:none',
      d: 'polygon:none:1,5 polygon:none',
      e: 'radialGradient polygon:url(r) polygon:none polygon:none',
      f: 'radialGradient path:url(r) path:none polygon:none',
      g: 'polygon:none:5,2 polygon:none',
      h: 'polygon:none path:green path:none:1,5',
    });
  });
});
