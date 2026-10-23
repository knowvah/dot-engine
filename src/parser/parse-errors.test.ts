// SPDX-License-Identifier: EPL-2.0

/**
 * `parse` prints a syntax error in aagerror's format on stderr (console.error)
 * before throwing. Expected lines are native graphviz 16.1.0 stderr on the
 * same input fed through stdin, minus the `<stdin>: ` file prefix (AD-4).
 * `ParseError` itself is unchanged.
 *
 * @see lib/cgraph/scan.l:aagerror
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, ParseError } from './index.js';

const QSTR_NOTE = ' scanning a quoted string (missing endquote? longer than 16384?)';
const HSTR_NOTE = " scanning a HTML string (missing '>'? bad nesting? longer than 16384?)";
const COMMENT_NOTE = " scanning a /*...*/ comment (missing '*/? longer than 16384?)";

function errorLines(src: string): unknown[] {
  const lines: unknown[] = [];
  vi.spyOn(console, 'warn').mockImplementation((m) => void lines.push(m));
  const spy = vi.spyOn(console, 'error').mockImplementation((m) => void lines.push(m));
  try {
    expect(() => parse(src)).toThrow(ParseError);
    return lines;
  } finally {
    spy.mockRestore();
  }
}

function syntaxError(line: number, tail = ''): string {
  return `Error: syntax error in line ${line}${tail}`;
}

describe('aagerror line for DOT syntax errors', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['unterminated quoted string', 'digraph { a [label="x] }\n', syntaxError(2, `${QSTR_NOTE}\nString starting:"x] }\n`)],
    ['unterminated comment', 'digraph { a /* x }\n', syntaxError(2, COMMENT_NOTE)],
    ['unterminated HTML string', 'digraph { a [label=<x <!-- y >] }\n', syntaxError(2, `${HSTR_NOTE}\nString starting:<x <!-- y >] }\n`)],
    ['token after a dangling edge op', 'digraph { a -> }', syntaxError(1, " near '}'")],
  ])('%s', (_name, src, expected) => {
    expect(errorLines(src)).toEqual([expected]);
  });

  it.each([
    ['whole multi-character ID is not repeated; the operator is', 'digraph { a b c -> -> }', syntaxError(1, " near '->'")],
    ['error on line 3', 'digraph {\n\n a -> b -> ;\n}', syntaxError(3, " near ';'")],
    ['error at EOF has no token text', 'digraph { a -> b ->', syntaxError(1)],
    ['EOF line counts trailing newlines', 'digraph {\n  a ->\n  b ->\n', syntaxError(4)],
    ['after a quoted string', 'digraph { a = "x" = }', syntaxError(1, " near '='")],
    ['after an HTML string', 'digraph { a [label=<b>] = }', syntaxError(1, " near '='")],
    ['after an integer', 'digraph { a = 12 = }', syntaxError(1, " near '='")],
    ['after a decimal', 'digraph { a = 1.5 = }', syntaxError(1, " near '='")],
    ['multi-character ID header', 'digraph abc12 { a abc = }', syntaxError(1, " near '}'")],
    ['stray minus sign', 'digraph { a - b }', syntaxError(1, " near '-'")],
    ['stray slash', 'digraph { a / b }', syntaxError(1, " near '/'")],
    ['stray at-sign (flex EOF token)', 'digraph { a @ b }', syntaxError(1, " near '@'")],
    ['multi-line quoted string and escaped newline', 'digraph {\n"a\nb\\\nc\\"d" -> -> }', syntaxError(4, " near '->'")],
    ['line comment keeps its newline', 'digraph { a // x\n -> }', syntaxError(2, " near '}'")],
    ['shell comment keeps its newline', 'digraph {\n# x\n a -> }', syntaxError(3, " near '}'")],
    ['#line directive resets the line', '#line 7 "f"\ndigraph { a -> }', syntaxError(7, " near '}'")],
    ['nested HTML closes before the error', 'digraph { a [label=<<b>x</b>>] -> }', syntaxError(1, " near '->'")],
    ['truncated header keyword is the token', 'digrap', syntaxError(1, " near 'digrap'")],
    ['truncated header keyword after strict', 'strict d', syntaxError(1, " near 'd'")],
    ['closing bracket', 'digraph { a [ ] ] }', syntaxError(1, " near ']'")],
  ])('%s', (_name, src, expected) => {
    expect(errorLines(src)).toEqual([expected]);
  });

  it('prints only the first 80 bytes of an open quoted string', () => {
    const body = 'x'.repeat(100);
    expect(errorLines(`digraph { a [label="${body}\n`)).toEqual([
      syntaxError(2, `${QSTR_NOTE}\nString starting:"${'x'.repeat(80)}`),
    ]);
  });

  it('prints only the first 80 bytes of an open HTML string', () => {
    const body = 'y'.repeat(100);
    expect(errorLines(`digraph { a [label=<${body}\n`)).toEqual([
      syntaxError(2, `${HSTR_NOTE}\nString starting:<${'y'.repeat(80)}`),
    ]);
  });

  it('reports an unterminated comment on the line where input ends', () => {
    expect(errorLines('digraph { a /* x\n y\n')).toEqual([syntaxError(3, COMMENT_NOTE)]);
  });

  it('reports an edge operator the graph kind forbids as a syntax error', () => {
    expect(errorLines('graph { a -> b }')).toEqual([syntaxError(1, " near '->'")]);
    expect(errorLines('digraph { a -- b }')).toEqual([syntaxError(1, " near '--'")]);
    expect(errorLines('graph {\n a -- b\n c -> d }')).toEqual([syntaxError(3, " near '->'")]);
  });

  it('prints number ambiguities before the syntax error that follows them', () => {
    expect(errorLines('digraph { a = 12ab = }')).toEqual([
      "Warning: syntax ambiguity - badly delimited number '12a' in line 1 of input splits into two tokens",
      syntaxError(1, " near '}'"),
    ]);
  });

  it('prints nothing for valid input', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    parse('digraph { a -> b }');
    expect(spy.mock.calls).toEqual([]);
  });

  it('leaves ParseError message, code, location and expected unchanged', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let err: ParseError | undefined;
    try {
      parse('digraph { a -> }');
    } catch (e) {
      err = e as ParseError;
    }
    expect(err?.message).toMatch(/^Expected .* but "\}" found\.$/);
    expect(err?.code).toBe('SYNTAX_ERROR');
    expect(err?.location).toEqual({ line: 1, column: 16, offset: 15 });
    expect(err?.expected?.length).toBeGreaterThan(0);
  });
});
