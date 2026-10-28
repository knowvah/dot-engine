// SPDX-License-Identifier: EPL-2.0
/**
 * expat's attribute values: what doAttrs sees once expat has decoded a value,
 * and the errors scanAtts and storeAtts raise first. Expected stderr and SVG
 * are native dot 16.1.0's.
 *
 * @see expat lib/xmltok_impl.c:PREFIX(scanAtts)
 * @see expat lib/xmlparse.c:storeAtts
 * @see expat lib/xmlparse.c:appendAttributeValue
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderSvg } from '../index.js';
import {
  attValueError, charRefNumber, decodeAttValue, scanAttValue, XML_ERROR_BAD_CHAR_REF, XML_ERROR_UNDEFINED_ENTITY,
} from './htmltable-lex-attvalue.js';

/** stderr lines and the SVG the port gives for `dot`. */
function render(dot: string): { stderr: string[]; svg: string } {
  const stderr: string[] = [];
  const sink = (...a: unknown[]): void => { stderr.push(a.map(String).join(' ')); };
  vi.spyOn(console, 'error').mockImplementation(sink);
  vi.spyOn(console, 'warn').mockImplementation(sink);
  return { svg: renderSvg(dot, 'dot'), stderr };
}

const table = (attrs: string): string => `digraph{a[label=<<table ${attrs}><tr><td>a</td></tr></table>>]}`;
const cell = (attrs: string): string => `digraph{a[label=<<table><tr><td ${attrs}>a</td></tr></table>>]}`;
const IN_LABEL = 'in label of node a';

afterEach(() => { vi.restoreAllMocks(); });

describe('decodeAttValue (appendAttributeValue, CDATA)', () => {
  it('turns a tab, LF, CR and CR LF into one space each', () => {
    expect(decodeAttValue('a\tb\nc\rd\r\ne')).toBe('a b c d e');
  });

  it('decodes character references literally, white space included', () => {
    expect(decodeAttValue('&#76;eft&#x4C;&#9;&#10;')).toBe('LeftL\t\n');
  });

  it('decodes the predefined entities', () => {
    expect(decodeAttValue('&lt;&gt;&amp;&quot;&apos;')).toBe('<>&"\'');
  });
});

describe('scanAttValue (scanAtts)', () => {
  it('ends at the closing quote, past references', () => {
    expect(scanAttValue('"a&amp;b" x', 0)).toEqual({ close: 8 });
    expect(scanAttValue(`'a"b'`, 0)).toEqual({ close: 4 });
  });

  it('stops on <, a control character, or a malformed reference', () => {
    expect(scanAttValue('"a<b"', 0)).toEqual({ invalid: 2 });
    expect(scanAttValue('"a\x01"', 0)).toEqual({ invalid: 2 });
    expect(scanAttValue('"a&b"', 0)).toEqual({ invalid: 4 });
    expect(scanAttValue('"a& b"', 0)).toEqual({ invalid: 3 });
    expect(scanAttValue('"&#x;"', 0)).toEqual({ invalid: 4 });
    expect(scanAttValue('"&#1a;"', 0)).toEqual({ invalid: 4 });
  });

  it('needs more data when the value or a reference is unfinished', () => {
    expect(scanAttValue('"abc', 0)).toEqual({ partial: true });
    expect(scanAttValue('"a&am', 0)).toEqual({ partial: true });
  });
});

describe('charRefNumber (checkCharRefNumber)', () => {
  it.each([
    ['&#9;', 9], ['&#10;', 10], ['&#13;', 13], ['&#32;', 32], ['&#xFFFD;', 0xfffd], ['&#x10FFFF;', 0x10ffff],
    ['&#0;', -1], ['&#1;', -1], ['&#11;', -1], ['&#31;', -1], ['&#55296;', -1], ['&#xDFFF;', -1],
    ['&#xFFFE;', -1], ['&#xFFFF;', -1], ['&#x110000;', -1], ['&#99999999999;', -1],
  ])('%s is %i', (ref, n) => {
    expect(charRefNumber(ref)).toBe(n);
  });
});

describe('attValueError (storeAtts)', () => {
  it('reports an undefined entity at the tag and a bad reference where it is', () => {
    expect(attValueError('a&nbsp;', 10)).toEqual({ message: XML_ERROR_UNDEFINED_ENTITY });
    expect(attValueError('ab&#1;', 10)).toEqual({ message: XML_ERROR_BAD_CHAR_REF, offset: 12 });
    expect(attValueError('&amp;&#9;', 0)).toBeUndefined();
  });
});

describe('doAttrs sees the decoded value', () => {
  it.each([
    ['align="&#76;EFT"'], ['align="&#x4C;eft"'], ['border="&#9;5"'], ['border="\n5"'],
  ])('accepts %s', (attrs) => {
    expect(render(table(attrs)).stderr).toEqual([]);
  });

  it.each([
    ['align="le\tft"', 'le ft'],
    ['align="le\r\nft"', 'le ft'],
    ['align="le&#9;ft"', 'le\tft'],
    ['align="&lt;x&gt;"', '<x>'],
    [`align='&quot;x&apos;'`, `"x'`],
  ])('prints %s as %s', (attrs, value) => {
    expect(render(table(attrs)).stderr).toEqual([`Warning: Illegal value ${value} for ALIGN - ignored`, IN_LABEL]);
  });

  it('keeps an LF from a character reference in the message', () => {
    expect(render(table('align="le&#10;ft"')).stderr)
      .toEqual(['Warning: Illegal value le\nft for ALIGN - ignored', IN_LABEL]);
  });

  it('splits STYLE at a decoded comma', () => {
    expect(render(table('style="rounded&#44;foo"')).stderr)
      .toEqual(['Warning: Illegal value foo for STYLE - ignored', IN_LABEL]);
  });

  it('checks SIDES after decoding', () => {
    expect(render(cell('sides="l&#9;t"')).stderr).toEqual(["Warning: Unrecognized character '\t' (9) in sides attribute"]);
  });

  it('applies decoded colors, faces and titles', () => {
    expect(render(cell('bgcolor="&#114;ed"')).svg).toContain('<polygon fill="red" stroke="none"');
    expect(render('digraph{a[label=<<font face="Hel&#118;etica">a</font>>]}').svg)
      .toContain('font-family="Helvetica,sans-Serif"');
    expect(render(cell('title="a\nb" href="x"')).svg).toContain('xlink:title="a b"');
  });
});

describe('expat errors in attribute values', () => {
  const error = (message: string, line: number, context: string): string[] =>
    [`Error: ${message} in line ${line} `, `... ${context} ...`, IN_LABEL];

  it.each([
    // A raw control character is invalid too, but agerr prints it as `\001`
    // (follow-up 36), so it is checked through scanAttValue above.
    ['align="a&b"'], ['align="a& b"'], ['align="a&"'], ['align="&#x;"'],
  ])('rejects %s as an invalid token', (attrs) => {
    expect(render(table(attrs)).stderr).toEqual(error('not well-formed (invalid token)', 1, `<HTML><table ${attrs}>`));
  });

  it('reports an undefined entity on the line the tag starts', () => {
    expect(render('digraph{a[label=<<table\n\nalign="\n&nbsp;"><tr><td>a</td></tr></table>>]}').stderr)
      .toEqual(error('undefined entity', 1, '<HTML><table\n\nalign="\n&nbsp;">'));
  });

  it('reports a bad character reference on its own line', () => {
    expect(render('digraph{a[label=<<table\nalign="&#1;"><tr><td>a</td></tr></table>>]}').stderr)
      .toEqual(error('reference to invalid character number', 2, '<HTML><table\nalign="&#1;">'));
    expect(render(table('title="a&#0;"')).stderr)
      .toEqual(error('reference to invalid character number', 1, '<HTML><table title="a&#0;">'));
  });

  it('checks each attribute for a repeat, then its value, in order', () => {
    expect(render(table('align="x" align="&nbsp;"')).stderr)
      .toEqual(error('duplicate attribute', 1, '<HTML><table align="x" align="&nbsp;">'));
    expect(render(table('align="&nbsp;" align="x"')).stderr)
      .toEqual(error('undefined entity', 1, '<HTML><table align="&nbsp;" align="x">'));
  });

  it('rejects a bad character reference in text', () => {
    expect(render('digraph{a[label=<x&#1;y>]}').stderr).toEqual(error('reference to invalid character number', 1, '<HTML>x&#1;y'));
  });
});

describe('scanAttValue (BT_NONXML beyond controls)', () => {
  it('rejects U+FFFE and U+FFFF where the content scanner does', () => {
    expect(scanAttValue('"a\ufffe"', 0)).toEqual({ invalid: 2 });
    expect(scanAttValue('"a\uffff"', 0)).toEqual({ invalid: 2 });
  });
  it('rejects a lone surrogate but not a pair', () => {
    expect(scanAttValue('"a\ud800"', 0)).toEqual({ invalid: 2 });
    expect(scanAttValue('"a\udc00b"', 0)).toEqual({ invalid: 2 });
    expect(scanAttValue('"a\ud83d\ude00"', 0)).toEqual({ close: 4 });
  });
  it.each(['\ufffe', '\uffff'])('reports native\'s invalid token for a literal %j', (ch) => {
    const { stderr } = render(`digraph{a[label=<<TABLE><TR><TD BGCOLOR="${ch}">x</TD></TR></TABLE>>]}`);
    expect(stderr.slice(0, 3)).toEqual([
      'Error: not well-formed (invalid token) in line 1 ',
      `... <TR><TD BGCOLOR="${ch}"> ...`,
      IN_LABEL,
    ]);
  });
});
