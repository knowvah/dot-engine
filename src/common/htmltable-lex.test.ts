// SPDX-License-Identifier: EPL-2.0
/**
 * Tests for the HTML-like label tokenizer.
 * @see lib/common/htmllex.c
 */
import { describe, expect, it } from 'vitest';
import { HtmlLexError, tokenize, tokenizeDeferred } from './htmltable-lex.js';
import type { OpenToken } from './htmltable-types.js';

describe('tokenize — table attrs', () => {
  it('tokenizes GRADIENTANGLE on TABLE', () => {
    const tok = tokenize('<TABLE GRADIENTANGLE="90">')[0] as OpenToken;
    expect(tok.attrs['gradientangle']).toBe('90');
  });

  it('tokenizes SIDES on TABLE', () => {
    const tok = tokenize('<TABLE SIDES="LT">')[0] as OpenToken;
    expect(tok.attrs['sides']).toBe('LT');
  });

  it('tokenizes PORT on TABLE', () => {
    const tok = tokenize('<TABLE PORT="p1">')[0] as OpenToken;
    expect(tok.attrs['port']).toBe('p1');
  });

  it('tokenizes GRADIENTANGLE and SIDES together on TABLE', () => {
    const tok = tokenize('<TABLE GRADIENTANGLE="45" SIDES="LTRB">')[0] as OpenToken;
    expect(tok.attrs['gradientangle']).toBe('45');
    expect(tok.attrs['sides']).toBe('LTRB');
  });
});

describe('tokenize — cell attrs', () => {
  it('tokenizes GRADIENTANGLE on TD', () => {
    const tok = tokenize('<TD GRADIENTANGLE="180">')[0] as OpenToken;
    expect(tok.attrs['gradientangle']).toBe('180');
  });

  it('tokenizes SIDES on TD', () => {
    const tok = tokenize('<TD SIDES="LR">')[0] as OpenToken;
    expect(tok.attrs['sides']).toBe('LR');
  });

  it('tokenizes PORT on TD', () => {
    const tok = tokenize('<TD PORT="myport">')[0] as OpenToken;
    expect(tok.attrs['port']).toBe('myport');
  });

  it('lowercases attribute names', () => {
    const tok = tokenize('<TD gradientangle="30" sides="T">')[0] as OpenToken;
    expect(tok.attrs['gradientangle']).toBe('30');
    expect(tok.attrs['sides']).toBe('T');
  });
});

describe('tokenize — basic tokens', () => {
  it('produces open token for TABLE', () => {
    const tokens = tokenize('<TABLE>');
    expect(tokens[0]).toMatchObject({ type: 'open', tag: 'TABLE' });
  });

  it('produces text token', () => {
    expect(tokenize('hello')[0]).toMatchObject({ type: 'text', value: 'hello' });
  });

  it('produces close token', () => {
    expect(tokenize('</TABLE>')[0]).toMatchObject({ type: 'close', tag: 'TABLE' });
  });
});

// ---------------------------------------------------------------------------
// Self-closing tags: expat reports startElement then endElement for <X/>.
// @see lib/common/htmllex.c (XML_SetElementHandler callbacks)
// ---------------------------------------------------------------------------

describe('self-closing tags', () => {
  it('<VR/> lexes as open + close pair', () => {
    const toks = tokenize('<VR/>');
    expect(toks).toEqual([
      { type: 'open', tag: 'VR', attrs: {} },
      { type: 'close', tag: 'VR' },
    ]);
  });

  it('<HR/> lexes as open + close pair', () => {
    const toks = tokenize('<HR/>');
    expect(toks).toEqual([
      { type: 'open', tag: 'HR', attrs: {} },
      { type: 'close', tag: 'HR' },
    ]);
  });

  it('self-closing tag with attributes keeps them on the open token', () => {
    const toks = tokenize('<IMG SRC="x.png"/>');
    expect(toks[0]?.type).toBe('open');
    expect(toks[0]?.type === 'open' && toks[0].attrs['src']).toBe('x.png');
    expect(toks[1]).toEqual({ type: 'close', tag: 'IMG' });
  });
});

// ---------------------------------------------------------------------------
// Attribute scanning: value consumption + XML well-formedness.
// @see lib/common/htmllex.c (expat "not well-formed" error path)
// ---------------------------------------------------------------------------

describe('attribute scanning', () => {
  it('words inside quoted values do not become phantom attributes', () => {
    const toks = tokenize('<IMG SRC="x.png"/>');
    expect(toks[0]?.type === 'open' && toks[0].attrs).toEqual({ src: 'x.png' });
  });

  it('multiple quoted attributes parse cleanly', () => {
    const toks = tokenize('<TABLE BORDER="1" CELLPADDING="2">');
    expect(toks[0]?.type === 'open' && toks[0].attrs).toEqual({ border: '1', cellpadding: '2' });
  });

  it('bare attribute is not well-formed (C: expat error -> fallback)', () => {
    expect(() => tokenize('<TD NOWRAP>')).toThrow();
  });

  it('unquoted value is not well-formed', () => {
    expect(() => tokenize('<TABLE BORDER=1>')).toThrow();
  });

  it('single-quoted values are accepted', () => {
    const toks = tokenize("<TD PORT='p1'>");
    expect(toks[0]?.type === 'open' && toks[0].attrs).toEqual({ port: 'p1' });
  });
});

// ---------------------------------------------------------------------------
// TH is a row-boundary synonym for TR, not a cell tag.
// @see lib/common/htmllex.c:614,669 (startElement/endElement T_row dispatch)
// ---------------------------------------------------------------------------

describe('TH normalizes to TR', () => {
  it('open <TH> emits an open token tagged TR', () => {
    expect(tokenize('<TH>')).toEqual([{ type: 'open', tag: 'TR', attrs: {} }]);
  });

  it('open <TH> with attrs keeps the attrs on the normalized TR token', () => {
    const tok = tokenize('<TH ALIGN="CENTER">')[0] as OpenToken;
    expect(tok).toMatchObject({ type: 'open', tag: 'TR' });
    expect(tok.attrs['align']).toBe('CENTER');
  });

  it('close </TH> emits a close token tagged TR', () => {
    expect(tokenize('</TH>')).toEqual([{ type: 'close', tag: 'TR' }]);
  });

  it('self-closing <TH/> lexes as the TR close alone (endElement overwrites ctx->tok)', () => {
    expect(tokenize('<TH/>')).toEqual([{ type: 'close', tag: 'TR' }]);
  });
});

describe('tokenize — entity decoding in text runs', () => {
  // C's HTML lexer resolves entities via expat during tokenization, so both
  // sizing and emit see decoded UTF-8. Skipping this measured the raw entity
  // string (e.g. "&#91;el...") instead of "[el...", inflating edge-label
  // vnodes and shifting layout (corpus 1949 was +18.7px wide).
  // @see lib/common/htmllex.c
  it('decodes a numeric entity (&#91; -> [) in a text run', () => {
    const toks = tokenize('&#91;el...');
    expect(toks).toEqual([{ type: 'text', value: '[el...' }]);
  });

  it('decodes named XML entities and round-trips through emit escaping', () => {
    const toks = tokenize('a &amp;&lt;&gt; b');
    expect(toks).toEqual([{ type: 'text', value: 'a &<> b' }]);
  });

  // Native: "not well-formed (invalid token) in line 1" (expat's scanRef stops at the space).
  it('rejects an entity-like run that is not an XML name literal', () => {
    expect(() => tokenize('&not a name; x')).toThrow('not well-formed (invalid token)');
  });

  it('accepts the XML predefined apos entity', () => {
    expect(tokenize('<HTML>a&apos;b</HTML>')[1]).toEqual({ type: 'text', value: "a'b" });
  });

  // scanEntity rewrites any entities.h name of 2-8 characters, digits
  // included; expat decodes character references of any length. Native:
  // `<p&sup2;&frac12;q>` -> `p²½q`, `<p&thetasym;q>` -> `pϑq`.
  // @see lib/common/utils.c:scanEntity
  it('decodes HTML names with digits and up to eight characters', () => {
    expect(tokenize('p&sup2;&frac12;q')).toEqual([{ type: 'text', value: 'p²½q' }]);
    expect(tokenize('p&thetasym;q')).toEqual([{ type: 'text', value: 'pϑq' }]);
  });

  it('decodes long and astral character references as expat does', () => {
    expect(tokenize('p&#0000065;&#x1F600;q')).toEqual([{ type: 'text', value: 'pA😀q' }]);
  });

  it('decodes text between tags without affecting tags', () => {
    const toks = tokenize('<B>&#65;&#66;</B>');
    expect(toks[0]).toEqual({ type: 'open', tag: 'B', attrs: {} });
    expect(toks[1]).toEqual({ type: 'text', value: 'AB' });
  });
});

/** Run tokenize and return the HtmlLexError it must throw. */
function lexFailure(src: string): HtmlLexError {
  try {
    tokenize(src);
  } catch (e) {
    if (e instanceof HtmlLexError) return e;
    throw e;
  }
  throw new Error('tokenize did not throw');
}

// Expected values captured from graphviz 16.1.0 native dot stderr.
describe('tokenize — expat error paths (htmllex.c:1095)', () => {
  it('reports an undefined entity with line and context', () => {
    const e = lexFailure('<HTML><b>&bogus;</b></HTML>');
    expect(e.message).toBe('undefined entity in line 1 ');
    expect(e.diagnostics).toEqual(['Error: undefined entity in line 1 ', '... <b>&bogus; ...']);
  });

  it('reports a mismatched tag with line and context', () => {
    const e = lexFailure('<HTML><b>x</i></HTML>');
    expect(e.message).toBe('mismatched tag in line 1 ');
    expect(e.diagnostics).toEqual(['Error: mismatched tag in line 1 ', '... x</i> ...']);
  });

  it('counts the line of the entity, not of the chunk start', () => {
    const e = lexFailure('<HTML><b>x\n\ny &bogus; z</b></HTML>');
    expect(e.diagnostics).toEqual(['Error: undefined entity in line 3 ', '... <b>x\n\ny &bogus; z ...']);
  });

  it('counts CRLF as one line', () => {
    const e = lexFailure('<HTML><b>x\r\ny</i></HTML>');
    expect(e.diagnostics).toEqual(['Error: mismatched tag in line 2 ', '... x\r\ny</i> ...']);
  });

  it('compares tag names case-sensitively like expat', () => {
    const e = lexFailure('<HTML><b>x</B></HTML>');
    expect(e.diagnostics).toEqual(['Error: mismatched tag in line 1 ', '... x</B> ...']);
  });

  it('flags the closing wrapper when an element is left open', () => {
    const e = lexFailure('<HTML><b>x</HTML>');
    expect(e.diagnostics).toEqual(['Error: mismatched tag in line 1 ', '... x</HTML> ...']);
  });

  it('shows the two previous chunks when both are tags', () => {
    const e = lexFailure('<HTML><b>x</b></i></HTML>');
    expect(e.diagnostics).toEqual(['Error: mismatched tag in line 1 ', '... </b></i> ...']);
  });

  it('counts comment chunks as context tokens', () => {
    const e = lexFailure('<HTML><!-- c --><i>x</b></HTML>');
    expect(e.diagnostics).toEqual(['Error: mismatched tag in line 1 ', '... x</b> ...']);
  });

  it('shows the whole raw text chunk including the wrapper tag', () => {
    const e = lexFailure('<HTML>a &amp; &foo; b</HTML>');
    expect(e.diagnostics).toEqual(['Error: undefined entity in line 1 ', '... <HTML>a &amp; &foo; b ...']);
  });

  it('reports an unknown element as written, without error_context', () => {
    const e = lexFailure('<HTML>\n<span>x</span></HTML>');
    expect(e.message).toBe('Unknown HTML element <span> on line 2 ');
    expect(e.diagnostics).toEqual(['Error: Unknown HTML element <span> on line 2 ']);
    expect((e as unknown as { tag: string }).tag).toBe('SPAN');
  });

  it('reports a bad attribute at its own line', () => {
    const e = lexFailure('<HTML><TD\n x=1></HTML>');
    expect(e.diagnostics).toEqual(['Error: not well-formed (invalid token) in line 2 ', '... <HTML><TD\n x=1> ...']);
  });

  it('reports a duplicate attribute only when no invalid token follows', () => {
    expect(lexFailure('<HTML><TD x="1" x="2"></HTML>').message).toBe('duplicate attribute in line 1 ');
    expect(lexFailure('<HTML><TD x="1" x="2" y></HTML>').message).toBe('not well-formed (invalid token) in line 1 ');
  });

  it('keeps the tokens before the error when tokenizing deferred', () => {
    const r = tokenizeDeferred('<HTML><b>x</i></HTML>');
    expect(r.tokens.map((t) => t.type)).toEqual(['open', 'open', 'text']);
    expect(r.error?.message).toBe('mismatched tag in line 1 ');
  });

  it('is an HtmlParseError so existing catch sites fall back', () => {
    expect(lexFailure('<HTML>&bogus;</HTML>').name).toBe('HtmlParseError');
  });

  it('does not flag matched tags, self-closing tags or known entities', () => {
    const toks = tokenize('<HTML><b>x<br/>&amp;&alpha;</b></HTML>');
    expect(toks.map((t) => t.type)).toEqual(['open', 'open', 'text', 'open', 'close', 'text', 'close', 'close']);
  });
});
