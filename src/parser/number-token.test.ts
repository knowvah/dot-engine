// SPDX-License-Identifier: EPL-2.0

/**
 * scan.l NUMBER: `[-]?(({DIGIT}+(\.{DIGIT}*)?)|(\.{DIGIT}+))(\.|{LETTER})?` —
 * no exponent. The optional trailing '.' or letter lets chkNum catch a number
 * run into a name (`00splines`, `1e5`) or a second dot (`1.2.3`): it warns
 * "syntax ambiguity - badly delimited number" and yyless() returns the last
 * character to the input, splitting the text into two tokens.
 *
 * Expected values are native graphviz 16.1.0 (`dot -Tplain`) on the same
 * inputs; native names the file, the port parses a string, which C's agmemread
 * path reports as "input" (ctx->InputFile == NULL).
 *
 * @see lib/cgraph/scan.l:109 (NUMBER), :135 ({NUMBER} rule), chkNum
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, ParseError } from './index.js';

function ambiguity(text: string, line: number): string {
  return `Warning: syntax ambiguity - badly delimited number '${text}' in line ${line} of input splits into two tokens`;
}

function parseWithWarnings(src: string): { names: string[]; warnings: unknown[] } {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const g = parse(src);
  return { names: [...g.nodes.keys()], warnings: spy.mock.calls.map((c) => c[0]) };
}

describe('scan.l NUMBER / chkNum', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('warns for each number run into a name (corpus 2784)', () => {
    const src = 'graph{00splines="ortho"0e[0=""]2[0=""height="30000000000000000"]1[0=0]6[0=0]}';
    const { names, warnings } = parseWithWarnings(src);
    expect(names).toEqual(['00', '0', 'e', '2', '1', '6']);
    expect(warnings).toEqual([ambiguity('00s', 1), ambiguity('0e', 1)]);
  });

  it('has no exponent: 1e5 is the two atoms 1 and e5', () => {
    const { names, warnings } = parseWithWarnings('graph { 1e5 -- x1.2.3 ; 5. -- -7q }');
    expect(names).toEqual(['1', 'e5', 'x1', '.2', '.3', '5.', '-7', 'q']);
    expect(warnings).toEqual([ambiguity('1e', 1), ambiguity('.2.', 1), ambiguity('-7q', 1)]);
  });

  it('reports the line of the number and ignores strings and comments', () => {
    const src = 'graph {\n  a [label="1e5"] // 2x\n  /* 3y */ # 4z\n  b -- 5w\n}';
    const { names, warnings } = parseWithWarnings(src);
    expect(names).toEqual(['a', 'b', '5', 'w']);
    expect(warnings).toEqual([ambiguity('5w', 4)]);
  });

  it('counts newlines inside comments and strings, as scan.l does', () => {
    const src = 'graph {\n/* a\nb */ "x\ny" <p\nq>\n 7z }';
    const { names, warnings } = parseWithWarnings(src);
    expect(names.length).toBe(4);
    expect(names.slice(2)).toEqual(['7', 'z']);
    expect(warnings).toEqual([ambiguity('7z', 6)]);
  });

  it('an exponent value is a syntax error, after the warning', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => parse('graph { a [width=1e1] }')).toThrow(ParseError);
    expect(spy.mock.calls.map((c) => c[0])).toEqual([
      ambiguity('1e', 1),
      "Error: syntax error in line 1 near ']'",
    ]);
  });

  it('does not warn for well-delimited numbers', () => {
    const { names, warnings } = parseWithWarnings('digraph { 1 -> -2 -> .5 -> 3. ; a->b }');
    expect(names).toEqual(['1', '-2', '.5', '3.', 'a', 'b']);
    expect(warnings).toEqual([]);
  });

  it('lexes -- as an edge operator before a negative number', () => {
    const { names, warnings } = parseWithWarnings('graph { x--5 -- -.5w }');
    expect(names).toEqual(['x', '5', '-.5', 'w']);
    expect(warnings).toEqual([ambiguity('-.5w', 1)]);
  });
});
