// SPDX-License-Identifier: EPL-2.0
/**
 * HTML-label inputs where native's lexer and grammar decide what the label
 * is: empty font-style elements, self-closing elements, characters below 0x20,
 * and CDATA sections. Expected stderr is native dot 16.1.0's, byte for byte.
 *
 * @see lib/common/htmlparse.y:textitem
 * @see lib/common/htmllex.c:startElement
 * @see lib/common/htmllex.c:endElement
 * @see lib/common/htmllex.c:characterData
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderSvg } from '../index.js';
import { parseHtmlLabel } from './htmltable.js';
import type { HtmlLabel, HtmlText } from './htmltable-types.js';

/** stderr lines the port prints while rendering `dot` with the dot engine. */
function stderrOf(dot: string): string[] {
  const lines: string[] = [];
  const sink = (...a: unknown[]): void => { lines.push(a.map(String).join(' ')); };
  vi.spyOn(console, 'error').mockImplementation(sink);
  vi.spyOn(console, 'warn').mockImplementation(sink);
  renderSvg(dot, 'dot');
  return lines.filter((l) => !l.includes('no hard-coded metrics'));
}

/** The syntax error native prints for `context`, then make_label's continuation. */
const syntaxError = (context: string): string[] => [
  'Error: syntax error in line 1 ',
  `... ${context} ...`,
  'in label of node a',
];

/** The texts of a text label (or of the one cell of a 1x1 table), item by item. */
function texts(label: HtmlLabel): string[] {
  const blocks: HtmlText[] = label.kind === 'text'
    ? label.texts
    : label.table.rows[0]!.cells[0]!.content.filter((c): c is HtmlText => c.kind === 'text');
  return blocks.flatMap((b) => b.items.map((i) => i.text ?? ''));
}

const quiet = (src: string): HtmlLabel => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  return parseHtmlLabel(src);
};

afterEach(() => { vi.restoreAllMocks(); });

describe('font-style elements need text (textitem: bold text n_bold)', () => {
  it.each([
    ['<b></b>x', '<b></b>'],
    ['x<b></b>y', '<b></b>'],
    ['<font></font>x', '<font></font>'],
    ['<b><i></i></b>', '<i></i>'],
    ['<b></b><table><tr><td>a</td></tr></table>', '<b></b>'],
    ['<table><tr><td><b></b></td></tr></table>', '<b></b>'],
  ])('rejects %s at the close tag', (label, context) => {
    expect(stderrOf(`digraph{a[label=<${label}>]}`)).toEqual(syntaxError(context));
  });

  it('rejects a tag whose only text is a dropped control character', () => {
    expect(stderrOf('digraph{a[label=<<b>&#9;</b>>]}')).toEqual(syntaxError('&#9;</b>'));
  });

  it('accepts a <BR/> or a space as the text', () => {
    expect(stderrOf('digraph{a[label=<<b><br/></b>>]}')).toEqual([]);
    expect(stderrOf('digraph{a[label=<<b> </b>>]}')).toEqual([]);
  });
});

describe('self-closing elements: the end event overwrites the start', () => {
  it.each([
    ['<b/>x', '<HTML><b/>'],
    ['<s/>x', '<HTML><s/>'],
    ['<table/>', '<HTML><table/>'],
    ['<table><tr><td/></tr></table>', '<tr><td/>'],
  ])('rejects %s', (label, context) => {
    expect(stderrOf(`digraph{a[label=<${label}>]}`)).toEqual(syntaxError(context));
  });

  it('still prints the start tag attribute warnings', () => {
    expect(stderrOf('digraph{a[label=<<font color="red" bogus="1"/>x>]}')).toEqual([
      'Warning: Illegal attribute bogus in <FONT> - ignored',
      ...syntaxError('<HTML><font color="red" bogus="1"/>'),
    ]);
  });

  it('keeps <BR/> and <HR/> as one element', () => {
    expect(stderrOf('digraph{a[label=<x<br/>y>]}')).toEqual([]);
    expect(stderrOf('digraph{a[label=<x<br/><hr/>y>]}')).toEqual(syntaxError('<br/><hr/>'));
  });
});

describe('characterData drops characters below 0x20', () => {
  it('drops a tab, LF and CR from text', () => {
    expect(texts(quiet('a\tb\nc\rd'))).toEqual(['abcd']);
  });

  it('drops a decoded character reference below 0x20 and keeps DEL', () => {
    expect(texts(quiet('a&#9;b\x7fc'))).toEqual(['ab\x7fc']);
  });

  it('gives a cell holding only control characters no text', () => {
    expect(texts(quiet('<table><tr><td>\n\t</td></tr></table>'))).toEqual([]);
  });

  it('keeps spaces', () => {
    expect(texts(quiet(' a  b '))).toEqual([' a  b ']);
  });
});

describe('CDATA sections are character data', () => {
  it('passes markup and entity characters through literally', () => {
    expect(texts(quiet('x<![CDATA[a&b]]>y'))).toEqual(['xa&by']);
  });

  it('joins a section that spans lexer units', () => {
    expect(texts(quiet('<table><tr><td><![CDATA[a<>b]]></td></tr></table>'))).toEqual(['a<>b']);
  });

  it('prints nothing on stderr', () => {
    expect(stderrOf('digraph{a[label=<x<![CDATA[a&b]]>y>]}')).toEqual([]);
  });
});

describe('ctx->inCell and ctx->xb', () => {
  const beforeTable = (context: string): string[] => [
    'Error: Syntax error: non-space string used before <TABLE> in line 1 ',
    `... ${context} ...`,
    'in label of node a',
  ];

  it('counts a no-break space as non-space before <TABLE> (nonSpace tests for " " only)', () => {
    expect(stderrOf('digraph{a[label=<&nbsp;<table><tr><td>a</td></tr></table>>]}'))
      .toEqual(beforeTable('&nbsp;<table>'));
  });

  it('counts CDATA text before <TABLE>', () => {
    expect(stderrOf('digraph{a[label=<<![CDATA[x<>y]]><table><tr><td>a</td></tr></table>>]}'))
      .toEqual(beforeTable('y]]><table>'));
  });

  it('keeps the text of an event a later event in the same call overwrote', () => {
    // The unit `m]]>x` fires characterData twice in one XML_Parse call: "m"
    // from the CDATA section, then "x". Both land in xb.
    expect(texts(quiet('<![CDATA[k<>m]]>x'))).toEqual(['k<>mx']);
  });

  it('drops character data between table elements', () => {
    expect(stderrOf('digraph{a[label=<<table><![CDATA[q]]><tr><td>a</td></tr></table>>]}')).toEqual([]);
  });

  it('reads CDATA from a text unit as findNext rewrote it (scanEntity)', () => {
    expect(texts(quiet('<![CDATA[a<>b&amp;c]]>'))).toEqual(['a<>b&#38;c']);
  });
});
