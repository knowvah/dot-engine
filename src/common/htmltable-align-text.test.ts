// SPDX-License-Identifier: EPL-2.0
/**
 * ALIGN="TEXT" on a cell (HALIGN_TEXT): pos_html_cell does not shrink the text
 * block to the text, so each line aligns across the whole cell; image and
 * table children treat it as the default, centered. Coordinates are native
 * dot 16.1.0's.
 *
 * @see lib/common/htmllex.c:cell_halignfn
 * @see lib/common/htmltable.c:pos_html_cell
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderSvg } from '../index.js';
import { parseCellAlign } from './htmltable-parse-attrs.js';
import { alignContentBox } from './htmltable-pos.js';
import type { HtmlCell } from './htmltable-types.js';

afterEach(() => { vi.restoreAllMocks(); });

/** The x of each `<text>` the port draws for `dot`. */
function textXs(dot: string): number[] {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  return [...renderSvg(dot, 'dot').matchAll(/<text [^>]*x="([-\d.]+)"/g)].map((m) => Number(m[1]));
}

const lines = (align: string): string =>
  `digraph{a[label=<<table><tr><td align="${align}" width="200">a<br align="right"/>bb<br/>ccc</td></tr></table>>]}`;

describe('ALIGN="TEXT"', () => {
  it('parses TEXT (any case) for cells only', () => {
    expect(parseCellAlign('Text')).toBe('text');
    expect(parseCellAlign('left')).toBe('left');
    expect(parseCellAlign('middle')).toBeUndefined();
  });

  it('keeps the text block as wide as the cell', () => {
    const cell = { kind: 'cell', content: [], align: 'text', valign: 'top' } as HtmlCell;
    const box = { ll: { x: 0, y: 0 }, ur: { x: 100, y: 50 } };
    expect(alignContentBox(box, cell, 20, 10)).toEqual({ ll: { x: 0, y: 40 }, ur: { x: 100, y: 50 } });
  });

  it('aligns each line across the cell', () => {
    expect(textXs(lines('text'))).toEqual([247.76, 149.98, 147.66]);
  });

  it('differs from LEFT, which shrinks the block to its widest line first', () => {
    expect(textXs(lines('left'))).toEqual([72.41, 62.3, 59.98]);
  });
});
