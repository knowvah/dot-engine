// SPDX-License-Identifier: EPL-2.0
import { describe, it, expect } from 'vitest';
import { escapeXml, escapeXmlText } from './xml-escape.js';

describe('escapeXml (gv_xml_escape flags {0})', () => {
  it('escapes <, >, ", and apostrophe', () => {
    expect(escapeXml('<a>')).toBe('&lt;a&gt;');
    expect(escapeXml('"q"')).toBe('&quot;q&quot;');
    expect(escapeXml("O'Brien")).toBe('O&#39;Brien');
  });

  it('escapes a bare & but passes a valid entity through', () => {
    expect(escapeXml('a & b')).toBe('a &amp; b');
    expect(escapeXml('&amp;')).toBe('&amp;');
    expect(escapeXml('&#65;')).toBe('&#65;');
    expect(escapeXml('&#x41;')).toBe('&#x41;');
  });

  it('accepts the entity shapes xml_isentity accepts: &#; &#x; &#X41;', () => {
    expect(escapeXml('a&#;b')).toBe('a&#;b');
    expect(escapeXml('a&#x;b')).toBe('a&#x;b');
    expect(escapeXml('a&#X41;b')).toBe('a&#X41;b');
  });

  it('escapes the & of shapes xml_isentity rejects: &; &#xg; &#12x;', () => {
    expect(escapeXml('a&;b')).toBe('a&amp;;b');
    expect(escapeXml('a&#xg;b')).toBe('a&amp;#xg;b');
    expect(escapeXml('a&#12x;b')).toBe('a&amp;#12x;b');
  });

  it('does NOT escape dash or collapse spaces (flags {0})', () => {
    expect(escapeXml('a-b  c')).toBe('a-b  c');
  });
});

describe('escapeXmlText (gv_xml_escape flags {raw,dash,nbsp})', () => {
  it('escapes dash, CR/LF, and 2nd+ consecutive spaces', () => {
    expect(escapeXmlText('a-b')).toBe('a&#45;b');
    expect(escapeXmlText('x\ny')).toBe('x&#10;y');
    expect(escapeXmlText('a   b')).toBe('a &#160;&#160;b');
  });

  it('also escapes the base set (<, >, ", apostrophe, bare &)', () => {
    expect(escapeXmlText("<'&>")).toBe('&lt;&#39;&amp;&gt;');
  });

  it('escapes every & under raw, entity-looking or not', () => {
    expect(escapeXmlText('x&amp;y')).toBe('x&amp;amp;y');
    expect(escapeXmlText('x&foo;y')).toBe('x&amp;foo;y');
    expect(escapeXmlText('c&#38;d')).toBe('c&amp;#38;d');
    expect(escapeXmlText('a-&b')).toBe('a&#45;&amp;b');
  });
});
