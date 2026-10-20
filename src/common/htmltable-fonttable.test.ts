// SPDX-License-Identifier: EPL-2.0
/**
 * The html grammar's `fonttable` rule: a <TABLE> wrapped in one of
 * <FONT>, <B>, <I>, <U>, <O>, at the label's top level or as a cell's child.
 * Expected output and stderr are native dot 16.1.0's.
 * @see lib/common/htmlparse.y:fonttable
 * @see lib/common/htmltable.c:pushFontInfo
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderSvg } from '../index.js';
import { parseHtmlLabel } from './htmltable.js';
import type { HtmlLabel, HtmlTable } from './htmltable.js';

const TABLE = '<table><tr><td>x</td></tr></table>';
const WRAPPERS = ['b', 'i', 'u', 'o'] as const;

/** stderr lines and SVG the port produces for a one-node dot graph. */
function render(label: string): { svg: string; stderr: string[] } {
  const stderr: string[] = [];
  const sink = (...a: unknown[]): void => { stderr.push(a.map(String).join(' ')); };
  vi.spyOn(console, 'error').mockImplementation(sink);
  vi.spyOn(console, 'warn').mockImplementation(sink);
  const svg = renderSvg(`digraph{a [shape=plaintext label=<${label}>]}`, 'dot');
  return { svg, stderr };
}

const tableOf = (l: HtmlLabel): HtmlTable => {
  if (l.kind !== 'table') throw new Error('expected a table label');
  return l.table;
};

afterEach(() => { vi.restoreAllMocks(); });

describe('fonttable: top level', () => {
  it('records the font tag on the table', () => {
    const t = tableOf(parseHtmlLabel(`<font color="red" point-size="20" face="Arial">${TABLE}</font>`));
    expect(t.font).toEqual({ fontColor: 'red', fontSize: 20, fontFace: 'Arial' });
  });

  it('leaves a plain table without a font', () => {
    expect(tableOf(parseHtmlLabel(TABLE)).font).toBeUndefined();
  });

  it.each(WRAPPERS)('accepts <%s> around a table', (tag) => {
    const t = tableOf(parseHtmlLabel(`<${tag}>${TABLE}</${tag}>`));
    expect(t.rows).toHaveLength(1);
    expect(t.font).toEqual({});
  });

  it('renders the red table with no diagnostics', () => {
    const { svg, stderr } = render(`<font color="red" point-size="20">${TABLE}</font>`);
    expect(stderr).toEqual([]);
    expect(svg).toContain('font-size="20.00" fill="red">x</text>');
  });

  it('sizes an empty cell by the table font (pushFontInfo)', () => {
    const { svg, stderr } = render(
      '<font color="red" point-size="20"><table><tr><td></td><td>x</td></tr></table></font>',
    );
    expect(stderr).toEqual([]);
    expect(svg).toContain('<polygon fill="none" stroke="black" points="15,-7 15,-37 21,-37 21,-7 15,-7"/>');
    expect(svg).toContain('<polygon fill="none" stroke="black" points="23,-7 23,-37 39,-37 39,-7 23,-7"/>');
  });

  it.each(WRAPPERS)('renders <%s> around a table without diagnostics', (tag) => {
    expect(render(`<${tag}>${TABLE}</${tag}>`).stderr).toEqual([]);
  });

  it('allows blanks inside the wrapper around the table', () => {
    expect(render(`<font color="red"> ${TABLE} </font>`).stderr).toEqual([]);
  });

  it.each(['s', 'sub', 'sup'])('fails <%s> around a table as native does', (tag) => {
    expect(render(`<${tag}>${TABLE}</${tag}>`).stderr).toEqual([
      'Error: syntax error in line 1 ',
      `... <${tag}><table> ...`,
      'in label of node a',
    ]);
  });
});

describe('fonttable: errors unchanged or as native', () => {
  it('non-space text before the table', () => {
    expect(render(`<font color="red">z${TABLE}</font>`).stderr).toEqual([
      'Error: Syntax error: non-space string used before <TABLE> in line 1 ',
      '... z<table> ...',
      'in label of node a',
    ]);
  });

  it('non-space text after the table', () => {
    expect(render(`<font color="red">${TABLE} z</font>`).stderr).toEqual([
      'Error: Syntax error: non-space string used after </TABLE> in line 1 ',
      '...  z</font> ...',
      'in label of node a',
    ]);
  });

  it('plain text before a bare table', () => {
    expect(render(`x${TABLE}`).stderr).toEqual([
      'Error: Syntax error: non-space string used before <TABLE> in line 1 ',
      '... x<table> ...',
      'in label of node a',
    ]);
  });

  it('blanks before the wrapper', () => {
    expect(render(` <font color="red">${TABLE}</font>`).stderr).toEqual([
      'Error: syntax error in line 1 ',
      '... <font color="red"><table> ...',
      'in label of node a',
    ]);
  });

  it('text before the wrapper', () => {
    expect(render(`x<font color="red">${TABLE}</font>`).stderr).toEqual([
      'Error: syntax error in line 1 ',
      '... <font color="red"><table> ...',
      'in label of node a',
    ]);
  });

  it('text after the wrapper', () => {
    expect(render(`<font color="red">${TABLE}</font>x`).stderr).toEqual([
      'Error: syntax error in line 1 ',
      '... </font>x ...',
      'in label of node a',
    ]);
  });

  it('two wrappers', () => {
    expect(render(`<font color="red"><b>${TABLE}</b></font>`).stderr).toEqual([
      'Error: syntax error in line 1 ',
      '... <b><table> ...',
      'in label of node a',
    ]);
  });

  it('a missing wrapper close', () => {
    expect(render(`<font color="red">${TABLE}`).stderr).toEqual([
      'Error: mismatched tag in line 1 ',
      '... </table></HTML> ...',
      'in label of node a',
    ]);
  });
});

describe('fonttable: inside a cell', () => {
  const inCell = (inner: string): string => `<table><tr><td>${inner}</td></tr></table>`;

  it('records the font on the nested table', () => {
    const outer = tableOf(parseHtmlLabel(inCell(`<font color="red">${TABLE}</font>`)));
    const inner = outer.rows[0]!.cells[0]!.content[0] as HtmlTable;
    expect(inner.kind).toBe('table');
    expect(inner.font).toEqual({ fontColor: 'red' });
    expect(outer.font).toBeUndefined();
  });

  it('renders red nested text with no diagnostics', () => {
    const { svg, stderr } = render(inCell(`<font color="red" point-size="20">${TABLE}</font>`));
    expect(stderr).toEqual([]);
    expect(svg).toContain('font-size="20.00" fill="red">x</text>');
  });

  it.each(WRAPPERS)('renders <%s> around a nested table', (tag) => {
    expect(render(inCell(`<${tag}>${TABLE}</${tag}>`)).stderr).toEqual([]);
  });

  it('fails <s> around a nested table', () => {
    expect(render(inCell(`<s>${TABLE}</s>`)).stderr).toEqual([
      'Error: syntax error in line 1 ',
      '... <s><table> ...',
      'in label of node a',
    ]);
  });

  it('blanks before the wrapper', () => {
    expect(render(inCell(` <font color="red">${TABLE}</font>`)).stderr).toEqual([
      'Error: syntax error in line 1 ',
      '... <font color="red"><table> ...',
      'in label of node a',
    ]);
  });

  it('text after the wrapper', () => {
    expect(render(inCell(`<font color="red">${TABLE}</font>z`)).stderr).toEqual([
      'Error: syntax error in line 1 ',
      '... </font>z ...',
      'in label of node a',
    ]);
  });

  it('blanks after the wrapper', () => {
    expect(render(inCell(`<font color="red">${TABLE}</font> `)).stderr).toEqual([
      'Error: syntax error in line 1 ',
      '... </font>  ...',
      'in label of node a',
    ]);
  });

  it('non-space text before the table', () => {
    expect(render(inCell(`<font color="red">z${TABLE}</font>`)).stderr).toEqual([
      'Error: Syntax error: non-space string used before <TABLE> in line 1 ',
      '... z<table> ...',
      'in label of node a',
    ]);
  });
});

describe('fonttable: pushFontInfo shares one saved-font slot (C static savef)', () => {
  // The inner wrapped tables overwrite the slot, so the middle table's pop
  // restores its own font and leaks 20pt into the outer table's second row.
  // Native 16.1.0 sizes and draws `y` at 20pt, not the label's 14pt.
  const LEAK = '<b><table><tr><td><font point-size="20"><table><tr><td>' +
    '<font point-size="10"><table><tr><td>x</td></tr></table></font>' +
    '</td></tr></table></font></td></tr><tr><td>y</td></tr></table></b>';

  it('leaks the inner-saved font into a later sibling as C does', () => {
    const { svg, stderr } = render(LEAK);
    expect(stderr).toEqual([]);
    expect(svg).toContain('font-size="20.00">y</text>');
    expect(svg).toContain('<polygon fill="none" stroke="black" points="11,-7 11,-37 46,-37 46,-7 11,-7"/>');
    expect(svg).toContain('<polygon fill="none" stroke="black" points="8,-4 8,-84 49,-84 49,-4 8,-4"/>');
  });
});
