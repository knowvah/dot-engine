// SPDX-License-Identifier: EPL-2.0

/**
 * T4f — branch-coverage tests for util/xml.ts (gvXmlEscape).
 *
 * gvXmlEscape is a pure function with no prior dedicated test file; every
 * caller elsewhere in the port only exercises the common ASCII-escape path.
 * This file drives the entity-detection, dash/nbsp/raw flags, and the
 * multi-byte UTF-8 decode/error branches directly.
 *
 * @see lib/util/xml.c
 */

import { describe, it, expect } from 'vitest';
import { gvXmlEscape, type XmlFlags } from './xml.js';

function flags(overrides: Partial<XmlFlags> = {}): XmlFlags {
  return { raw: false, dash: false, nbsp: false, utf8: false, ...overrides };
}

describe('gvXmlEscape — fixed-escape characters', () => {
  it('escapes & unconditionally when raw=true', () => {
    expect(gvXmlEscape('a&b', flags({ raw: true }))).toBe('a&amp;b');
  });

  it('escapes a bare & when not raw and not a valid entity', () => {
    expect(gvXmlEscape('a & b', flags())).toBe('a &amp; b');
  });

  it('does not double-escape a valid named entity when not raw', () => {
    expect(gvXmlEscape('&amp;', flags())).toBe('&amp;');
  });

  it('does not double-escape a valid decimal numeric entity when not raw', () => {
    expect(gvXmlEscape('&#38;', flags())).toBe('&#38;');
  });

  it('does not double-escape a valid hex numeric entity when not raw', () => {
    expect(gvXmlEscape('&#x26;', flags())).toBe('&#x26;');
  });

  it('escapes & when it looks like an entity but raw=true forces escaping', () => {
    expect(gvXmlEscape('&amp;', flags({ raw: true }))).toBe('&amp;amp;');
  });

  it('escapes a trailing & with nothing after it (isEntity: i >= s.length)', () => {
    expect(gvXmlEscape('x&', flags())).toBe('x&amp;');
  });

  it('escapes &; (empty entity body, isEntity: s[i] === ";")', () => {
    expect(gvXmlEscape('&;', flags())).toBe('&amp;;');
  });

  it('escapes & followed by an incomplete named entity (no trailing ;)', () => {
    expect(gvXmlEscape('&amp', flags())).toBe('&amp;amp');
  });

  it('escapes & followed by an incomplete numeric entity (no trailing ;)', () => {
    expect(gvXmlEscape('&#38', flags())).toBe('&amp;#38');
  });

  it('escapes <, >, ", \'', () => {
    expect(gvXmlEscape(`<a href="x">'q'</a>`, flags())).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;q&#39;&lt;/a&gt;',
    );
  });

  it('leaves - unescaped when dash=false', () => {
    expect(gvXmlEscape('a-b', flags())).toBe('a-b');
  });

  it('escapes - as &#45; when dash=true', () => {
    expect(gvXmlEscape('a-b', flags({ dash: true }))).toBe('a&#45;b');
  });

  it('leaves a single space unescaped even with nbsp=true', () => {
    expect(gvXmlEscape('a b', flags({ nbsp: true }))).toBe('a b');
  });

  it('escapes the second of two consecutive spaces as &#160; when nbsp=true', () => {
    expect(gvXmlEscape('a  b', flags({ nbsp: true }))).toBe('a &#160;b');
  });

  it('leaves consecutive spaces unescaped when nbsp=false', () => {
    expect(gvXmlEscape('a  b', flags())).toBe('a  b');
  });

  it('leaves \\n and \\r unescaped when raw=false', () => {
    expect(gvXmlEscape('a\nb\rc', flags())).toBe('a\nb\rc');
  });

  it('escapes \\n and \\r when raw=true', () => {
    expect(gvXmlEscape('a\nb\rc', flags({ raw: true }))).toBe('a&#10;b&#13;c');
  });
});

describe('gvXmlEscape — UTF-8 encoding (flags.utf8)', () => {
  it('leaves a plain ASCII string untouched with utf8=true', () => {
    expect(gvXmlEscape('hello', flags({ utf8: true }))).toBe('hello');
  });

  it('leaves a non-ASCII char unescaped when utf8=false (binary-expr right operand false)', () => {
    expect(gvXmlEscape('\u00e9', flags({ utf8: false }))).toBe('\u00e9');
  });

  it('escapes a BMP code point (U+00E9 "é") to &#xe9;', () => {
    expect(gvXmlEscape('\u00e9', flags({ utf8: true }))).toBe('&#xe9;');
  });

  it('escapes a BMP code point (U+4E2D "中") to &#x4e2d;', () => {
    expect(gvXmlEscape('\u4e2d', flags({ utf8: true }))).toBe('&#x4e2d;');
  });

  it('escapes an astral code point (U+1F600) as one entity', () => {
    expect(gvXmlEscape('\u{1f600}', flags({ utf8: true }))).toBe('&#x1f600;');
  });

  it('consumes exactly the UTF-16 length of a character, resuming after it', () => {
    expect(gvXmlEscape('a\u{1f600}b', flags({ utf8: true }))).toBe('a&#x1f600;b');
  });

  it('throws on a lone surrogate (the UTF-16 analogue of malformed UTF-8)', () => {
    expect(() => gvXmlEscape('\ud800', flags({ utf8: true }))).toThrow(/malformed UTF-8/);
  });
});
