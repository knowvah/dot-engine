// SPDX-License-Identifier: EPL-2.0

/**
 * gvXmlEscape UTF-8 mode: entities are built from the Unicode code point,
 * not from UTF-16 code units.
 *
 * @see lib/util/xml.c:xml_core
 */

import { describe, expect, it } from 'vitest';
import { RenderError } from '../errors.js';
import { gvXmlEscape, type XmlFlags } from './xml.js';

const UTF8: XmlFlags = { raw: false, dash: false, nbsp: false, utf8: true };
const PLAIN: XmlFlags = { ...UTF8, utf8: false };

describe('gvXmlEscape utf8 mode (code point based)', () => {
  it.each([
    ['ÿ', '&#xff;'],
    ['é', '&#xe9;'],
    ['中', '&#x4e2d;'],
    ['\u{1f600}', '&#x1f600;'],
  ])('escapes %j as %s', (input, expected) => {
    expect(gvXmlEscape(input, UTF8)).toBe(expected);
  });

  it('emits one entity for an astral character, not two', () => {
    expect(gvXmlEscape('a\u{1f600}b', UTF8)).toBe('a&#x1f600;b');
  });

  it('matches the C xml tool on the oracle input', () => {
    expect(gvXmlEscape('ÿ é 中 \u{1f600} & < x', UTF8)).toBe(
      '&#xff; &#xe9; &#x4e2d; &#x1f600; &amp; &lt; x',
    );
  });

  it('throws RenderError RENDER_ERROR on a lone high surrogate', () => {
    expect(() => gvXmlEscape('\ud800', UTF8)).toThrow(RenderError);
    try {
      gvXmlEscape('\ud800', UTF8);
    } catch (e) {
      expect((e as RenderError).code).toBe('RENDER_ERROR');
    }
  });

  it('throws RenderError on a lone low surrogate', () => {
    expect(() => gvXmlEscape('x\udc00', UTF8)).toThrow(RenderError);
  });

  it('passes non-ASCII through unchanged when utf8 is off', () => {
    expect(gvXmlEscape('ÿ\u{1f600}', PLAIN)).toBe('ÿ\u{1f600}');
  });
});
