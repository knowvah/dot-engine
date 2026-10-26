// SPDX-License-Identifier: EPL-2.0

/**
 * `parse` reads one graph, like agmemread: once the graph's closing `}` is
 * reduced, endgraph's aglexeof pushes GRAPH_EOF_TOKEN back and the scanner
 * returns EOF, so nothing after that brace is ever lexed. Trailing text is
 * ignored without an error or a warning, a second graph is never read, and a
 * syntax error inside the graph is still reported. Checked against agmemread
 * from the 16.1.0 build (a C harness linking libcgraph).
 *
 * @see lib/cgraph/grammar.y:endgraph
 * @see lib/cgraph/scan.l:aglexeof
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, ParseError } from './index.js';

afterEach(() => vi.restoreAllMocks());

/** Parse `src`, returning the graph's node names and every stderr line. */
function parseQuietly(src: string): { nodes: string[]; stderr: unknown[] } {
  const lines: unknown[] = [];
  vi.spyOn(console, 'warn').mockImplementation((m) => void lines.push(m));
  vi.spyOn(console, 'error').mockImplementation((m) => void lines.push(m));
  const g = parse(src);
  return { nodes: [...g.nodes.keys()], stderr: lines };
}

describe('content after the first graph (agmemread)', () => {
  it.each([
    ['junk on the same line', 'digraph{a} junk ]]\n'],
    ['junk on the next line', 'digraph{a}\njunk ]]\n'],
    ['junk with no newline', 'digraph{a}junk'],
    ['a second graph on the next line', 'digraph{a}\ndigraph{b}\n'],
    ['a second graph on the same line', 'digraph{a} digraph{b}\n'],
    ['an unterminated string', 'digraph{a}\n"abc\n'],
    ['an unterminated comment', 'digraph{a} /* abc\n'],
    ['an unterminated HTML string', 'digraph{a}\n<abc\n'],
  ])('ignores %s', (_name, src) => {
    expect(parseQuietly(src)).toEqual({ nodes: ['a'], stderr: [] });
  });

  it('does not warn about badly delimited numbers after the graph', () => {
    expect(parseQuietly('digraph{a} 1.2.3\n')).toEqual({ nodes: ['a'], stderr: [] });
  });

  it('still warns about badly delimited numbers inside the graph', () => {
    expect(parseQuietly('digraph{a -> 1.2.3}\n2.3.4\n').stderr).toEqual([
      "Warning: syntax ambiguity - badly delimited number '1.2.' in line 1 of input splits into two tokens",
    ]);
  });

  it('does not check edge operators after the graph', () => {
    expect(parseQuietly('graph{a -- b}\nx -> y\n').nodes).toEqual(['a', 'b']);
  });

  it('keeps the first graph whole: its kind, name and attributes', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const g = parse('strict digraph G { a [label=x] }\ngraph H { b }\n');
    expect(spy).not.toHaveBeenCalled();
    expect(g.kind).toMatch(/strict/);
    expect(g.kind).not.toMatch(/^undirected/);
    expect(g.name).toBe('G');
    expect(g.nodes.get('a')?.attrs.get('label')).toBe('x');
    expect(g.nodes.has('b')).toBe(false);
  });

  it('still reports a syntax error inside the graph', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => parse('digraph{a -> }\ndigraph{b}\n')).toThrow(ParseError);
    expect(spy.mock.calls.map((c) => c[0])).toEqual(["Error: syntax error in line 1 near '}'"]);
  });
});
