// SPDX-License-Identifier: EPL-2.0
/**
 * htmllex.c's attribute and value warnings (doAttrs and the per-attribute
 * handlers). Expected texts are native dot 16.1.0's stderr, byte for byte.
 * @see lib/common/htmllex.c:doAttrs
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderSvg } from '../index.js';
import { parseHtmlLabelRv } from './htmltable-parse.js';
import { checkAttrs } from './htmltable-attr-warn.js';
import { tokenize } from './htmltable-lex.js';
import type { HtmlLabel, HtmlTable } from './htmltable-types.js';

/** stderr lines the port prints while rendering `dot` with the dot engine. */
function stderrOf(dot: string): string[] {
  const lines: string[] = [];
  const sink = (...a: unknown[]): void => { lines.push(a.map(String).join(' ')); };
  vi.spyOn(console, 'error').mockImplementation(sink);
  vi.spyOn(console, 'warn').mockImplementation(sink);
  renderSvg(dot, 'dot');
  return lines;
}

const label = (inner: string): string => `digraph{a[label=<${inner}>]}`;
const IN_LABEL = 'in label of node a';

/** Lines `parseHtmlLabelRv` hands its writer, and the warn flag. */
function parsed(src: string): { lines: string[]; warn: boolean; label: HtmlLabel } {
  const lines: string[] = [];
  const r = parseHtmlLabelRv(src, (l) => lines.push(l));
  return { lines, warn: r.warn, label: r.label };
}

const tableOf = (l: HtmlLabel): HtmlTable => {
  if (l.kind !== 'table') throw new Error('expected a table label');
  return l.table;
};

afterEach(() => { vi.restoreAllMocks(); });

describe('doAttrs: illegal attribute names', () => {
  it('prints the mission probe in native order, then in label of', () => {
    expect(stderrOf(label('<table bogus="1" align="weird"><tr><td>x</td></tr></table>'))).toEqual([
      'Warning: Illegal attribute bogus in <TABLE> - ignored',
      'Warning: Illegal value weird for ALIGN - ignored',
      IN_LABEL,
    ]);
  });

  it.each([
    ['<table><tr><td bogus="1">x</td></tr></table>', 'Illegal attribute bogus in <TD> - ignored'],
    ['a<br bogus="1"/>', 'Illegal attribute bogus in <BR> - ignored'],
    ['<font bogus="1">a</font>', 'Illegal attribute bogus in <FONT> - ignored'],
    ['<table><tr><td><img bogus="1" src="x"/></td></tr></table>', 'Illegal attribute bogus in <IMG> - ignored'],
  ])('%s', (inner, text) => {
    expect(parsed(inner).lines).toEqual([`Warning: ${text}`]);
    expect(parsed(inner).warn).toBe(true);
  });

  it('keeps the name as written and drops names no table lists', () => {
    expect(parsed('<table Bogus="1" balign="left"><tr><td>x</td></tr></table>').lines).toEqual([
      'Warning: Illegal attribute Bogus in <TABLE> - ignored',
      'Warning: Illegal attribute balign in <TABLE> - ignored',
    ]);
  });

  it('rejects the table-only names in TD', () => {
    expect(parsed('<table><tr><td cellborder="3" columns="*" rows="*" src="x">x</td></tr></table>').lines)
      .toEqual([
        'Warning: Illegal attribute cellborder in <TD> - ignored',
        'Warning: Illegal attribute columns in <TD> - ignored',
        'Warning: Illegal attribute rows in <TD> - ignored',
        'Warning: Illegal attribute src in <TD> - ignored',
      ]);
  });

  it('does not check TR, B, HR or HTML', () => {
    const r = parsed('<table><tr bogus="1"><td>x</td></tr></table>');
    expect(r.lines).toEqual([]);
    expect(r.warn).toBe(false);
    expect(parsed('<b bogus="1">x</b>').lines).toEqual([]);
  });

  it('matches names case-insensitively', () => {
    expect(parsed('<table BORDER="3"><tr><td>x</td></tr></table>').lines).toEqual([]);
    expect(tableOf(parsed('<table BORDER="3"><tr><td>x</td></tr></table>').label).border).toBe(3);
  });
});

describe('value handlers: text and accept/ignore', () => {
  it.each([
    ['<table align="weird"><tr><td>x</td></tr></table>', ['Warning: Illegal value weird for ALIGN - ignored']],
    ['<table valign="up"><tr><td>x</td></tr></table>', ['Warning: Illegal value up for VALIGN - ignored']],
    ['<table fixedsize="maybe"><tr><td>x</td></tr></table>', ['Warning: Illegal value maybe for FIXEDSIZE - ignored']],
    ['<table columns="x"><tr><td>x</td></tr></table>', ['Warning: Unknown value x for COLUMNS - ignored']],
    ['<table rows=""><tr><td>x</td></tr></table>', ['Warning: Unknown value  for ROWS - ignored']],
    ['<table><tr><td align="foo">x</td></tr></table>', ['Warning: Illegal value foo for ALIGN in TD - ignored']],
    ['<table><tr><td balign="foo">x</td></tr></table>', ['Warning: Illegal value foo for BALIGN in TD - ignored']],
    ['<table><tr><td rowspan="0">x</td></tr></table>', ['Warning: ROWSPAN value cannot be 0 - ignored']],
    ['<table><tr><td colspan="0">x</td></tr></table>', ['Warning: COLSPAN value cannot be 0 - ignored']],
    ['a<br align="foo"/>', ['Warning: Illegal value foo for ALIGN - ignored']],
  ])('%s', (inner, lines) => {
    const r = parsed(inner);
    expect(r.lines).toEqual(lines);
    expect(r.warn).toBe(true);
  });

  it('accepts what C accepts without a warning', () => {
    const inner = '<table align="CENTER" valign="Middle" fixedsize="false" columns="*abc" rows="*x">'
      + '<tr><td align="TEXT" balign="center" gradientangle="45abc" border="2.5" colspan="3x">x</td></tr></table>';
    const r = parsed(inner);
    expect(r.lines).toEqual([]);
    expect(r.warn).toBe(false);
    const tbl = tableOf(r.label);
    expect(tbl.hrule).toBe(true);
    expect(tbl.vrule).toBe(true);
    const cell = tbl.rows[0]!.cells[0]!;
    expect(cell.gradientangle).toBe(45);
    expect(cell.border).toBe(2);
    expect(cell.colspan).toBe(3);
  });

  it('ignores an illegal value as C does', () => {
    const r = parsed('<table align="weird" border="300" width="-1" columns="x"><tr>'
      + '<td colspan="0" gradientangle="400" cellspacing="-200">x</td></tr></table>');
    const tbl = tableOf(r.label);
    expect(tbl.align).toBeUndefined();
    expect(tbl.border).toBeUndefined();
    expect(tbl.width).toBeUndefined();
    expect(tbl.vrule).toBeUndefined();
    const cell = tbl.rows[0]!.cells[0]!;
    expect(cell.colspan).toBeUndefined();
    expect(cell.gradientangle).toBeUndefined();
    expect(cell.cellspacing).toBeUndefined();
  });

  it('ignores an out-of-range POINT-SIZE', () => {
    const r = parsed('<font point-size="300" color="red">a</font>');
    expect(r.lines).toEqual(['Warning: POINT-SIZE value 300 > 255 - too large - ignored']);
    if (r.label.kind !== 'text') throw new Error('expected text');
    expect(r.label.texts[0]!.items[0]!.fontSize).toBeUndefined();
    expect(r.label.texts[0]!.items[0]!.fontColor).toBe('red');
  });
});

describe('doInt', () => {
  it('prints the messages without a newline, so they join', () => {
    const inner = '<table border="abc" cellpadding="300" cellspacing="-200" cellborder="200" width="70000" '
      + 'height="-1"><tr><td gradientangle="400" colspan="0" rowspan="0">x</td></tr></table>';
    // htmllex.c:185-191 doInt's agwarningf formats end without "\n", so native
    // runs these messages together with no separator: join on '', not ' '.
    const joined = [
      'Warning: Improper BORDER value abc - ignored',
      'Warning: CELLPADDING value 300 > 255 - too large - ignored',
      'Warning: CELLSPACING value -200 < -128 - too small - ignored',
      'Warning: CELLBORDER value 200 > 127 - too large - ignored',
      'Warning: WIDTH value 70000 > 65535 - too large - ignored',
      'Warning: HEIGHT value -1 < 0 - too small - ignored',
      'Warning: GRADIENTANGLE value 400 > 360 - too large - ignored',
      'Warning: COLSPAN value cannot be 0 - ignored',
    ].join('');
    expect(parsed(inner).lines).toEqual([joined, 'Warning: ROWSPAN value cannot be 0 - ignored']);
  });

  it('flushes a trailing unterminated message as its own line', () => {
    expect(parsed('<table border="abc"><tr><td>x</td></tr></table>').lines)
      .toEqual(['Warning: Improper BORDER value abc - ignored']);
  });

  it('prints in label of after it', () => {
    expect(stderrOf(label('<table border="abc"><tr><td>x</td></tr></table>')))
      .toEqual(['Warning: Improper BORDER value abc - ignored', IN_LABEL]);
  });
});

describe('STYLE', () => {
  it('warns per illegal token and keeps the legal ones', () => {
    const r = parsed('<table style="rounded,foo, bar"><tr><td style="zz">x</td></tr></table>');
    expect(r.lines).toEqual([
      'Warning: Illegal value foo for STYLE - ignored',
      'Warning: Illegal value bar for STYLE - ignored',
      'Warning: Illegal value zz for STYLE - ignored',
    ]);
    expect(r.warn).toBe(true);
    const tbl = tableOf(r.label);
    expect(tbl.style).toBe('rounded');
    expect(tbl.rows[0]!.cells[0]!.style).toBeUndefined();
  });

  it('yields an empty token for an empty value or a trailing separator', () => {
    expect(parsed('<table style=""><tr><td style="rounded,">x</td></tr></table>').lines).toEqual([
      'Warning: Illegal value  for STYLE - ignored',
      'Warning: Illegal value  for STYLE - ignored',
    ]);
  });

  it('accepts every legal word in any case', () => {
    expect(parsed('<table style="ROUNDED RADIAL,solid,Invis,invisible dotted dashed">'
      + '<tr><td>x</td></tr></table>').lines).toEqual([]);
  });
});

describe('SIDES', () => {
  it('warns per unrecognised byte but does not set the warn flag', () => {
    const r = parsed('<table sides="lXr"><tr><td sides="t,b">x</td></tr></table>');
    expect(r.lines).toEqual([
      "Warning: Unrecognized character 'X' (88) in sides attribute",
      "Warning: Unrecognized character ',' (44) in sides attribute",
    ]);
    expect(r.warn).toBe(false);
  });

  it('reports each UTF-8 byte as a signed char', () => {
    expect(parsed('<table sides="é"><tr><td>x</td></tr></table>').lines).toEqual([
      "Warning: Unrecognized character 'Ã' (-61) in sides attribute",
      "Warning: Unrecognized character '©' (-87) in sides attribute",
    ]);
  });

  it('prints no in label of when only SIDES warns', () => {
    expect(stderrOf(label('<table sides="lXr"><tr><td>x</td></tr></table>')))
      .toEqual(["Warning: Unrecognized character 'X' (88) in sides attribute"]);
  });
});

describe('warnings on tokens', () => {
  it('rides on the open token, absent when there is none', () => {
    const [html, table] = tokenize('<html><table bogus="1">');
    expect(html).toEqual({ type: 'open', tag: 'HTML', attrs: {} });
    expect(table).toEqual({
      type: 'open', tag: 'TABLE', attrs: {}, warn: true,
      warnings: ['Warning: Illegal attribute bogus in <TABLE> - ignored\n'],
    });
  });

  it('keeps the earlier of two attributes differing only in case', () => {
    const r = checkAttrs('TABLE', [['border', '1'], ['BORDER', 'x']]);
    expect(r.attrs).toEqual({ border: '1' });
    expect(r.warnings).toEqual(['Warning: Improper BORDER value x - ignored']);
  });
});

describe('print timing', () => {
  it('prints nothing for a token after a syntax error', () => {
    const lines: string[] = [];
    expect(() => parseHtmlLabelRv('<table><tr></tr><tr><td bogus="1">x</td></tr></table>', (l) => lines.push(l)))
      .toThrow('syntax error');
    expect(lines).toEqual([]);
    expect(stderrOf(label('<table><tr></tr><tr><td bogus="1">x</td></tr></table>'))).toEqual([
      'Error: syntax error in line 1 ',
      '... <tr></tr> ...',
      IN_LABEL,
    ]);
  });

  it('prints the warnings of the token a syntax error is reported at, before the error', () => {
    expect(stderrOf(label('<table><tr><table bogus="1">x</table></tr></table>'))).toEqual([
      'Warning: Illegal attribute bogus in <TABLE> - ignored',
      'Error: syntax error in line 1 ',
      '... <tr><table bogus="1"> ...',
      IN_LABEL,
    ]);
  });

  it('prints the warnings before a lexical error', () => {
    expect(stderrOf(label('<table border="abc"><tr><td>x</td></tr><bogus></table>'))).toEqual([
      'Warning: Improper BORDER value abc - ignored',
      'Error: Unknown HTML element <bogus> on line 1 ',
      IN_LABEL,
    ]);
  });

  it('prints once per label and never from the silent parse entry point', () => {
    const lines = stderrOf(label('<font bogus="1"><table><tr><td>x</td></tr></table></font>'));
    expect(lines).toEqual(['Warning: Illegal attribute bogus in <FONT> - ignored', IN_LABEL]);
  });
});
