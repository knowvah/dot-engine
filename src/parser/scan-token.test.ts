// SPDX-License-Identifier: EPL-2.0

/**
 * scan.l scanner state at a syntax error. Expected values are what native
 * graphviz 16.1.0 prints in `aagerror` for the same input.
 * @see lib/cgraph/scan.l:aagerror
 */

import { describe, expect, it } from 'vitest';
import { scanAtError, syntaxErrorMessage } from './scan-token.js';

describe('scanAtError', () => {
  it('returns the whole token that ends after the offset', () => {
    const src = 'digraph { abc123 -> }';
    expect(scanAtError(src, src.indexOf('abc123') + 2)).toEqual({
      state: 'INITIAL', text: 'abc123', line: 1, buffer: '',
    });
  });

  it('returns a closing quote as the text after a quoted string', () => {
    const src = 'digraph { a = "x y" = }';
    expect(scanAtError(src, src.indexOf('"x'))).toEqual({
      state: 'INITIAL', text: '"', line: 1, buffer: '',
    });
  });

  it('returns a closing angle bracket as the text after an HTML string', () => {
    const src = 'digraph { a = <b<i>> = }';
    expect(scanAtError(src, src.indexOf('<b'))).toEqual({
      state: 'INITIAL', text: '>', line: 1, buffer: '',
    });
  });

  it('splits a badly delimited number the way yyless does', () => {
    expect(scanAtError('digraph { 12ab }', 10).text).toBe('12');
    expect(scanAtError('digraph { 1.2.3 }', 10).text).toBe('1.2');
  });

  it('lexes -> and -- as single tokens and a lone - as itself', () => {
    expect(scanAtError('digraph { a -> b }', 12).text).toBe('->');
    expect(scanAtError('digraph { a -- b }', 12).text).toBe('--');
    expect(scanAtError('digraph { a - b }', 13).text).toBe('-');
  });

  it('ignores a lone BOM but lexes BOM+letters as one NAME', () => {
    expect(scanAtError('\uFEFF digraph { }', 0).text).toBe('digraph');
    expect(scanAtError('\uFEFFdigraph { }', 0).text).toBe('\uFEFFdigraph');
  });

  it('is at EOF with empty text past the last token', () => {
    expect(scanAtError('digraph {\n\n', 11)).toEqual({
      state: 'INITIAL', text: '', line: 3, buffer: '',
    });
  });

  it('holds the processed quoted-string buffer when the string is open', () => {
    expect(scanAtError('a = "p\\"q\\\nr\\\\s\nt', 4)).toEqual({
      state: 'qstring', text: '', line: 3, buffer: 'p"qr\\\\s\nt',
    });
  });

  it('holds the raw HTML buffer including nested brackets', () => {
    expect(scanAtError('a = <b<i>x', 4)).toEqual({
      state: 'hstring', text: '', line: 1, buffer: 'b<i>x',
    });
  });

  it('is in the comment state for an unterminated comment', () => {
    expect(scanAtError('a /* x\n', 2)).toEqual({
      state: 'comment', text: '', line: 2, buffer: '',
    });
    expect(scanAtError('a /*/ x', 2).state).toBe('comment');
  });

  it('counts newlines in comments but not past a #line directive reset', () => {
    expect(scanAtError('/* a\nb */ x', 0).line).toBe(2);
    expect(scanAtError('#line 40 "f"\nx', 0).line).toBe(40);
    expect(scanAtError('#line 0\nx', 0).line).toBe(2);
    expect(scanAtError('a #line 40\nx', 0).line).toBe(1);
  });
});

describe('syntaxErrorMessage', () => {
  it('truncates the open-string excerpt to 80 UTF-8 bytes', () => {
    const src = `a = "${'é'.repeat(50)}`;
    expect(syntaxErrorMessage(src, 4)).toBe(
      'Error: syntax error in line 1 scanning a quoted string (missing endquote? '
      + `longer than 16384?)\nString starting:"${'é'.repeat(40)}`,
    );
  });

  it('omits the excerpt line for an empty open string', () => {
    expect(syntaxErrorMessage('a = "', 4)).toBe(
      'Error: syntax error in line 1 scanning a quoted string (missing endquote? longer than 16384?)',
    );
  });
});
