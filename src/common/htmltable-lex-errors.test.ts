// SPDX-License-Identifier: EPL-2.0
/**
 * The html lexer's comment, early-close and quote diagnostics. Every expected
 * stderr line and label outcome is native dot 16.1.0's (strings that DOT's own
 * scanner cannot deliver were fed through libcgraph's agstrdup_html).
 * @see lib/common/htmllex.c:eatComment
 * @see lib/common/htmllex.c:findNext
 * @see lib/common/htmllex.c:htmllex
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderSvg } from '../index.js';
import { parseHtmlLabelRv } from './htmltable-parse.js';
import { HtmlLexError } from './htmltable-lex.js';
import { StderrLines } from './htmltable-attr-warn.js';
import { eatComment, findNext } from './htmltable-lex-units.js';
import { fedBytes } from './htmltable-lex-expat.js';

afterEach(() => { vi.restoreAllMocks(); });

const UNCLOSED_COMMENT = 'Warning: Unclosed comment';
const LABEL_CLOSED = 'Warning: Label closed before end of HTML element';
const INVALID_TOKEN = 'not well-formed (invalid token)';

interface Outcome {
  printed: string[];
  error: readonly string[] | undefined;
  warn: boolean | undefined;
}

/** parseHtmlLabelRv on a label string verbatim: what it printed and how it ended. */
function lex(label: string): Outcome {
  const printed: string[] = [];
  const stderr = new StderrLines((line) => printed.push(line));
  try {
    const { warn } = parseHtmlLabelRv(label, stderr);
    return { printed, error: undefined, warn };
  } catch (e) {
    if (!(e instanceof HtmlLexError)) throw e;
    return { printed, error: e.diagnostics, warn: undefined };
  } finally {
    stderr.flush();
  }
}

/** stderr lines the port prints while rendering `dot` with the dot engine. */
function stderrOf(dot: string): { lines: string[]; svg: string } {
  const lines: string[] = [];
  const sink = (...a: unknown[]): void => { lines.push(a.map(String).join(' ')); };
  vi.spyOn(console, 'error').mockImplementation(sink);
  vi.spyOn(console, 'warn').mockImplementation(sink);
  return { svg: renderSvg(dot, 'dot'), lines };
}

const nodeLabel = (label: string): string => `digraph { a [label=<${label}>] }`;
const texts = (svg: string): string[] =>
  [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1] ?? '');

describe('eatComment: Unclosed comment', () => {
  it('warns, then the unterminated comment swallows </HTML> (syntax error)', () => {
    expect(lex('<!-- y >')).toEqual({
      printed: [UNCLOSED_COMMENT],
      error: ['Error: syntax error in line 1 ', '... <!-- y ></HTML> ...'],
      warn: undefined,
    });
  });

  it('renders probe 1 as native does: empty label, four stderr lines', () => {
    const { lines, svg } = stderrOf(nodeLabel('<!-- y >'));
    expect(lines).toEqual([
      UNCLOSED_COMMENT,
      'Error: syntax error in line 1 ',
      '... <!-- y ></HTML> ...',
      'in label of node a',
    ]);
    expect(texts(svg)).toEqual([]);
  });

  it('warns for <!-->, whose > is within the opening dashes', () => {
    expect(lex('<!-->').printed).toEqual([UNCLOSED_COMMENT]);
  });

  it('warns for <!--->, which is not a closed comment either', () => {
    expect(lex('<!--->').printed).toEqual([UNCLOSED_COMMENT]);
  });

  it('does not warn for <!---->, but an empty element list is a syntax error', () => {
    expect(lex('<!---->')).toEqual({
      printed: [],
      error: ['Error: syntax error in line 1 ', '... <!----></HTML> ...'],
      warn: undefined,
    });
  });

  it('keeps the label when expat later finds the --> (warn only, rv 1)', () => {
    const { lines, svg } = stderrOf(nodeLabel('x<!-- a > b <c -->y'));
    expect(lines).toEqual([UNCLOSED_COMMENT, 'in label of node a']);
    expect(texts(svg)).toEqual(['xy']);
  });

  it('reports warn on the parsed label', () => {
    expect(lex('x<!-- a > b <c -->y')).toEqual({ printed: [UNCLOSED_COMMENT], error: undefined, warn: true });
  });

  it('prints the warning when the following element is reached', () => {
    const { lines, svg } = stderrOf(nodeLabel('<!-- a > b <c --><b>x</b>'));
    expect(lines).toEqual([UNCLOSED_COMMENT, 'in label of node a']);
    expect(texts(svg)).toEqual(['x']);
  });

  it('accepts a comment that ends in --> without a warning', () => {
    expect(lex('<b>x</b><!-- ok -->')).toEqual({ printed: [], error: undefined, warn: false });
  });

  it('rejects -- inside a comment as an invalid token', () => {
    expect(lex('<!-- ab -- c -->')).toEqual({
      printed: [],
      error: [`Error: ${INVALID_TOKEN} in line 1 `, '... <HTML><!-- ab -- c --> ...'],
      warn: undefined,
    });
  });

  it('rejects --- before the closing >', () => {
    expect(lex('<!-- --->').error).toEqual([
      `Error: ${INVALID_TOKEN} in line 1 `,
      '... <HTML><!-- ---> ...',
    ]);
  });

  it('joins units across a warning: the expat error names the last two units', () => {
    expect(lex('a<!-- b > c<!-- d -->e')).toEqual({
      printed: [UNCLOSED_COMMENT],
      error: [`Error: ${INVALID_TOKEN} in line 1 `, '...  c<!-- d --> ...'],
      warn: undefined,
    });
  });
});

describe('findNext: Label closed before end of HTML element', () => {
  it('warns for a start tag cut off by the end of the label', () => {
    expect(lex('<b')).toEqual({
      printed: [LABEL_CLOSED],
      error: [`Error: ${INVALID_TOKEN} in line 1 `, '... <b</HTML> ...'],
      warn: undefined,
    });
  });

  it('keeps the earlier text and elements out of the diagnosis', () => {
    expect(lex('<b>x</b><b').error).toEqual([`Error: ${INVALID_TOKEN} in line 1 `, '... <b</HTML> ...']);
  });

  it.each([
    ['<b x=', '<b x=</HTML>'],
    ['<b x', '<b x</HTML>'],
    ['<b x="1', '<b x="1</HTML>'],
  ])('names the cut-off attribute tag %s', (label, context) => {
    expect(lex(label)).toEqual({
      printed: [LABEL_CLOSED],
      error: [`Error: ${INVALID_TOKEN} in line 1 `, `... ${context} ...`],
      warn: undefined,
    });
  });

  it('warns once for a comment that reaches the end of the label', () => {
    expect(lex('<!-- <b>')).toEqual({
      printed: [LABEL_CLOSED],
      error: ['Error: syntax error in line 1 ', '... <!-- <b></HTML> ...'],
      warn: undefined,
    });
  });

  it('does not add Unclosed comment when the label ends inside the comment', () => {
    expect(lex('<!-- a <b -->').printed).toEqual([LABEL_CLOSED]);
  });

  it('puts the warning before the diagnosis of a trailing <!--', () => {
    expect(lex('<b>x</b><!--')).toEqual({
      printed: [LABEL_CLOSED],
      error: ['Error: syntax error in line 1 ', '... <!--</HTML> ...'],
      warn: undefined,
    });
  });

  it('calls <!- an invalid token', () => {
    expect(lex('<!-')).toEqual({
      printed: [LABEL_CLOSED],
      error: [`Error: ${INVALID_TOKEN} in line 1 `, '... <!-</HTML> ...'],
      warn: undefined,
    });
  });
});

describe('expat: the unterminated attribute quote', () => {
  it('reports probe 2 at </tr>, where expat re-reads the held bytes', () => {
    const { lines, svg } = stderrOf(nodeLabel('<table border="1><tr><td>x</td></tr></table>'));
    expect(lines).toEqual([
      `Error: ${INVALID_TOKEN} in line 1 `,
      '... </td></tr> ...',
      'in label of node a',
    ]);
    expect(texts(svg)).toEqual([]);
  });

  it('defers the re-read until the held bytes double (trailing text is irrelevant)', () => {
    const { lines } = stderrOf(
      nodeLabel('<table border="1><tr><td>x</td></tr></table><b>aaaaaaaaaaaaaaaaaaaaaaaaa</b>'),
    );
    expect(lines.slice(0, 2)).toEqual([`Error: ${INVALID_TOKEN} in line 1 `, '... </td></tr> ...']);
  });

  it('finds the < inside the quote on the unit that doubles the held size', () => {
    expect(lex('<b x="1>y</b>').error).toEqual([`Error: ${INVALID_TOKEN} in line 1 `, '... </b></HTML> ...']);
  });

  it('can fire on the first unit after the quote', () => {
    expect(lex('<b x="1><c>').error).toEqual([`Error: ${INVALID_TOKEN} in line 1 `, '... <c></HTML> ...']);
  });

  it('lets a > inside a quote through: the tag completes once expat re-reads it', () => {
    expect(lex('<b x="a>b">y</b>').error).toEqual(['Error: syntax error in line 1 ', '... b">y</b> ...']);
  });

  it('keeps only the last event of a re-read: a lost start tag still warns', () => {
    expect(lex('<td x="a>b"><b>x</b>')).toEqual({
      printed: ['Warning: Illegal attribute x in <TD> - ignored'],
      error: ['Error: syntax error in line 1 ', '... x</b> ...'],
      warn: undefined,
    });
  });
});

describe('expat: well-formedness of the markup', () => {
  it.each([
    ['<>', '<HTML><>'],
    ['< b>', '<HTML>< b>'],
    ['<b"x">', '<HTML><b"x">'],
    ['<b x="1"y="2">', '<HTML><b x="1"y="2">'],
    ['<b x=1>y</b>', '<HTML><b x=1>'],
    ['<b x>y</b>', '<HTML><b x>'],
    ['<b/ >', '<HTML><b/ >'],
    ['</>', '<HTML></>'],
    ['</b x>', '<HTML></b x>'],
    ['<!-x>', '<HTML><!-x>'],
    ['<!DOCTYPE x>', '<HTML><!DOCTYPE x>'],
  ])('rejects %s as an invalid token', (label, context) => {
    expect(lex(label)).toEqual({
      printed: [],
      error: [`Error: ${INVALID_TOKEN} in line 1 `, `... ${context} ...`],
      warn: undefined,
    });
  });

  it('rejects a cut-off <!- after the early-close warning', () => {
    expect(lex('<!-x')).toEqual({
      printed: [LABEL_CLOSED],
      error: [`Error: ${INVALID_TOKEN} in line 1 `, '... <HTML><!-x ...'],
      warn: undefined,
    });
  });

  it('rejects a cut-off end tag', () => {
    expect(lex('<b>x</b')).toEqual({
      printed: [LABEL_CLOSED],
      error: [`Error: ${INVALID_TOKEN} in line 1 `, '... </b</HTML> ...'],
      warn: undefined,
    });
  });

  it('reports a duplicate attribute at its tag', () => {
    expect(lex('<b x="1" x="2">y</b>').error).toEqual([
      'Error: duplicate attribute in line 1 ',
      '... <HTML><b x="1" x="2"> ...',
    ]);
  });

  it('skips a processing instruction, leaving no element (syntax error)', () => {
    expect(lex('<?x?>').error).toEqual(['Error: syntax error in line 1 ', '... <?x?></HTML> ...']);
  });

  it.each(['<!-- a -->x', 'x&amp;y', '<b x="1"  >y</b>'])('accepts %s', (label) => {
    expect(lex(label).error).toBeUndefined();
  });

  it('prints an attribute warning of a <BR/> and keeps the string after it', () => {
    const { lines, svg } = stderrOf(nodeLabel('<br x="1"/>x'));
    expect(lines).toEqual(['Warning: Illegal attribute x in <BR> - ignored', 'in label of node a']);
    expect(texts(svg)).toEqual(['x']);
  });
});

describe('expat: reparse deferral follows the input buffer', () => {
  const held = (units: number): string => `${'a'.repeat(1200)}<!-- a > ${'<i>yy'.repeat(units)}-- x</i>`;

  it('re-reads early when the buffer is nearly full (200 units)', () => {
    expect(lex(held(200))).toEqual({
      printed: [UNCLOSED_COMMENT],
      error: [`Error: ${INVALID_TOKEN} in line 1 `, '... </i></HTML> ...'],
      warn: undefined,
    });
  });

  it('keeps deferring when it is not (220 units)', () => {
    expect(lex(held(220))).toEqual({
      printed: [UNCLOSED_COMMENT],
      error: ['Error: syntax error in line 1 ', '... </i></HTML> ...'],
      warn: undefined,
    });
  });
});

describe('findNext and eatComment', () => {
  it('cuts a tag at its first >', () => {
    expect(findNext('<b x="a>b">', 0)).toEqual({ end: 8, warnings: [], warn: false });
  });

  it('cuts text at the next <', () => {
    expect(findNext('abc<b>', 0)).toEqual({ end: 3, warnings: [], warn: false });
  });

  it('takes a comment through its nesting-balanced >', () => {
    expect(findNext('<!-- <b> -->z', 0)).toEqual({ end: 12, warnings: [], warn: false });
  });

  it('finds the end of a comment, warning when -- does not precede it', () => {
    expect(eatComment('<!-- a >', 4)).toEqual({ at: 7, warnings: ['Warning: Unclosed comment\n'] });
  });

  it('returns the label end for a comment that never balances, without a warning', () => {
    expect(eatComment('<!-- <b>', 4)).toEqual({ at: 8, warnings: [] });
  });
});

describe('fedBytes: the length C passes to XML_Parse', () => {
  it('counts a tag as written', () => {
    expect(fedBytes('<b>', false)).toBe(3);
  });

  it('counts a known entity as its &#N; form', () => {
    expect(fedBytes('&amp;', true)).toBe('&#38;'.length);
  });

  it('counts a trailing ] as &#93;', () => {
    expect(fedBytes('a]', true)).toBe('a&#93;'.length);
  });

  it('counts UTF-8 bytes', () => {
    expect(fedBytes('\u00e9', true)).toBe(2);
  });
});

describe('text references expat rejects as an invalid token', () => {
  // [label, line, context]: native dot 16.1.0's stderr for each
  const BAD: ReadonlyArray<readonly [string, number, string]> = [
    ['p&q', 1, 'p&q</HTML>'],
    ['p & q', 1, '<HTML>p & q'],
    ['&#;', 1, '<HTML>&#;'],
    ['&#x;', 1, '<HTML>&#x;'],
    ['&#X41;', 1, '<HTML>&#X41;'],
    ['&#65q', 1, '<HTML>&#65q'],
    ['ab&#65q', 1, '<HTML>ab&#65q'],
    ['&#xG;', 1, '<HTML>&#xG;'],
    ['a&#x41g;', 1, '<HTML>a&#x41g;'],
    ['a&b&amp;c', 1, '<HTML>a&b&amp;c'],
    ['&amp', 1, '&amp</HTML>'],
    ['x&#65', 1, 'x&#65</HTML>'],
    ['l1\nl2 &#; l3\nl4', 2, '<HTML>l1\nl2 &#; l3\nl4'],
    ['l1\nl2 &#65q\n\nl4', 2, '<HTML>l1\nl2 &#65q\n\nl4'],
    ['<table>\n<tr><td>ok\nfoo & bar\nbaz</td></tr></table>', 3, '<td>ok\nfoo & bar\nbaz'],
  ];

  it.each(BAD)('%j fails at line %i', (label, line, context) => {
    expect(lex(label).error).toEqual([`Error: ${INVALID_TOKEN} in line ${line} `, `... ${context} ...`]);
  });

  it('keeps an undefined entity ahead of a later bare &', () => {
    expect(lex('&a;&').error?.[0]).toBe('Error: undefined entity in line 1 ');
  });

  it.each(['&amp;', '&#65;', '&#x41;', '&sup2;', '&apos;', 'a &lt; b &#38; c'])('accepts %j', (label) => {
    expect(lex(label).error).toBeUndefined();
  });
});
