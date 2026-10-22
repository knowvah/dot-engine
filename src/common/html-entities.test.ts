// SPDX-License-Identifier: EPL-2.0

/**
 * htmlEntityUTF8 against native dot 16.1.0: every expectation below is the
 * text of `dot -Tsvg` for `a[shape=box,label="<input>"]`.
 *
 * @see lib/common/utils.c:htmlEntity
 * @see lib/common/utils.c:htmlEntityUTF8
 */

import { describe, it, expect } from 'vitest';
import { htmlEntityUTF8 } from './html-entities.js';

describe('htmlEntityUTF8 numeric references (utils.c:htmlEntity)', () => {
  it('takes an upper-case X as hex', () => {
    expect(htmlEntityUTF8('p&#X41;q')).toBe('pAq');
    expect(htmlEntityUTF8('p&#x41;q')).toBe('pAq');
  });

  it('consumes an empty or zero reference and keeps the &', () => {
    expect(htmlEntityUTF8('p&#;q')).toBe('p&q');
    expect(htmlEntityUTF8('p&#x;q')).toBe('p&q');
    expect(htmlEntityUTF8('p&#X;q')).toBe('p&q');
    expect(htmlEntityUTF8('p&#0;q')).toBe('p&q');
  });

  it('leaves a reference without its ; as written', () => {
    expect(htmlEntityUTF8('p&#65q')).toBe('p&#65q');
    expect(htmlEntityUTF8('p&#')).toBe('p&#');
    expect(htmlEntityUTF8('p&#x')).toBe('p&#x');
  });

  it('reads at most six decimal digits', () => {
    expect(htmlEntityUTF8('p&#000065;q')).toBe('pAq');
    expect(htmlEntityUTF8('p&#0000065;q')).toBe('p&#0000065;q');
  });

  it('reads at most five hex digits', () => {
    expect(htmlEntityUTF8('p&#x00041;q')).toBe('pAq');
    expect(htmlEntityUTF8('p&#x000041;q')).toBe('p&#x000041;q');
  });

  it('decodes values that C encodes as valid UTF-8', () => {
    expect(htmlEntityUTF8('p&#2048;q')).toBe('pࠀq');
    expect(htmlEntityUTF8('p&#65535;q')).toBe('p￿q');
  });
});

describe('htmlEntityUTF8 named references (utils.c:htmlEntity)', () => {
  it('looks names up in entities.h only, so &apos; stays literal', () => {
    expect(htmlEntityUTF8('&lt;&gt;&amp;&quot;')).toBe('<>&"');
    expect(htmlEntityUTF8('p&apos;q')).toBe('p&apos;q');
  });

  it('decodes names containing digits', () => {
    expect(htmlEntityUTF8('p&sup2;q')).toBe('p²q');
    expect(htmlEntityUTF8('p&frac12;q')).toBe('p½q');
    expect(htmlEntityUTF8('p&there4;q')).toBe('p∴q');
  });

  it('finds the ; only within the first eight characters', () => {
    expect(htmlEntityUTF8('p&thetasym;q')).toBe('p&thetasym;q');
  });

  it('matches names case-sensitively', () => {
    expect(htmlEntityUTF8('p&AMP;q')).toBe('p&AMP;q');
  });

  it('leaves an empty name and a missing ; as written', () => {
    expect(htmlEntityUTF8('p&;q')).toBe('p&;q');
    expect(htmlEntityUTF8('p&amp')).toBe('p&amp');
  });

  it('does not decode Object.prototype keys', () => {
    expect(htmlEntityUTF8('p&valueOf;q')).toBe('p&valueOf;q');
  });

  it('decodes once, never the text a reference produced', () => {
    expect(htmlEntityUTF8('&#38;amp;')).toBe('&amp;');
  });
});
