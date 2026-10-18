// SPDX-License-Identifier: EPL-2.0
/**
 * make_html_label's rv flow and the stderr it drives: parseHTML diagnostics,
 * the size_html_* return values, and labels.c:make_label's `in label of ...`
 * continuation. Expected stderr is native dot 16.1.0's, byte for byte.
 * @see lib/common/htmltable.c:make_html_label
 * @see lib/common/labels.c:make_label
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderSvg } from '../index.js';
import { parseHtmlLabel, sizeHtmlLabel } from './htmltable.js';
import type { TextMeasurer } from './htmltable.js';

const measurer: TextMeasurer = {
  measure: (text, _font, fontSize) => ({ w: text.length * fontSize * 0.6, h: fontSize }),
};

/** stderr lines the port prints while rendering `dot` with the dot engine. */
function stderrOf(dot: string): string[] {
  const lines: string[] = [];
  const sink = (...a: unknown[]): void => { lines.push(a.map(String).join(' ')); };
  vi.spyOn(console, 'error').mockImplementation(sink);
  vi.spyOn(console, 'warn').mockImplementation(sink);
  renderSvg(dot, 'dot');
  return lines;
}

afterEach(() => { vi.restoreAllMocks(); });

describe('make_label: in label of ...', () => {
  it('names a node', () => {
    expect(stderrOf('digraph{a[label=<<b>&bogus;</b>>]}')).toEqual([
      'Error: undefined entity in line 1 ',
      '... <b>&bogus; ...',
      'in label of node a',
    ]);
  });

  it('names the root graph', () => {
    expect(stderrOf('digraph G{label=<<b>&bogus;</b>>; a}')).toEqual([
      'Error: undefined entity in line 1 ',
      '... <b>&bogus; ...',
      'in label of graph G',
    ]);
  });

  it('names a cluster subgraph', () => {
    expect(stderrOf('digraph G{subgraph cluster_x{label=<<b>x</i>>; a}}')).toEqual([
      'Error: mismatched tag in line 1 ',
      '... x</i> ...',
      'in label of graph cluster_x',
    ]);
  });

  it('names a directed edge with ->', () => {
    expect(stderrOf('digraph{a->b[label=<<b>x</i>>]}')).toEqual([
      'Error: mismatched tag in line 1 ',
      '... x</i> ...',
      'in label of edge a -> b',
    ]);
  });

  it('names an undirected edge with --', () => {
    expect(stderrOf('graph{a--b[label=<<b>x</i>>]}')).toEqual([
      'Error: mismatched tag in line 1 ',
      '... x</i> ...',
      'in label of edge a -- b',
    ]);
  });

  it('prints nothing for a well-formed label', () => {
    expect(stderrOf('digraph{a[label=<<b>x</b>>]}')).toEqual([]);
  });

  it('prints an unknown element without context', () => {
    expect(stderrOf('digraph{a[label=<<span>x</span>>]}')).toEqual([
      'Error: Unknown HTML element <span> on line 1 ',
      'in label of node a',
    ]);
  });

  it('adds the continuation after a size warning alone', () => {
    expect(stderrOf(
      'digraph{a[label=<<table fixedsize="true" width="5" height="5"><tr><td>xxxxxxxxxx</td></tr></table>>]}',
    )).toEqual(['Warning: table size too small for content', 'in label of node a']);
  });

  it('prints the continuation once per label', () => {
    expect(stderrOf('digraph{a[label=<<b>x</i>>]; b[label=<<b>y</b>>]}')).toEqual([
      'Error: mismatched tag in line 1 ',
      '... x</i> ...',
      'in label of node a',
    ]);
  });
});

describe('yacc syntax errors (htmlerror)', () => {
  it('rejects non-space text before <TABLE>', () => {
    expect(stderrOf('digraph{a[label=<yada <table><tr><td>x</td></tr></table>>]}')).toEqual([
      'Error: Syntax error: non-space string used before <TABLE> in line 1 ',
      '... yada <table> ...',
      'in label of node a',
    ]);
  });

  it('rejects non-space text after </TABLE> with the line of the next token', () => {
    expect(stderrOf('digraph{a[label=<<table><tr><td>x</td></tr></table>\ntail\n>]}')).toEqual([
      'Error: Syntax error: non-space string used after </TABLE> in line 3 ',
      '... \ntail\n</HTML> ...',
      'in label of node a',
    ]);
  });

  it('applies the same text rules to a nested table', () => {
    expect(stderrOf(
      'digraph{a[label=<<table><tr><td>t<table><tr><td>y</td></tr></table></td></tr></table>>]}',
    )).toEqual([
      'Error: Syntax error: non-space string used before <TABLE> in line 1 ',
      '... t<table> ...',
      'in label of node a',
    ]);
    expect(stderrOf(
      'digraph{a[label=<<table><tr><td><table><tr><td>y</td></tr></table>t</td></tr></table>>]}',
    )).toEqual([
      'Error: Syntax error: non-space string used after </TABLE> in line 1 ',
      '... t</td> ...',
      'in label of node a',
    ]);
  });

  it('accepts blanks around a nested table', () => {
    expect(stderrOf(
      'digraph{a[label=<<table><tr><td> <table><tr><td>y</td></tr></table> </td></tr></table>>]}',
    )).toEqual([]);
  });

  it('reports a cell directly inside a table', () => {
    expect(stderrOf('digraph{a[label=<<table><td>x</td></table>>]}')).toEqual([
      'Error: syntax error in line 1 ',
      '... <table><td> ...',
      'in label of node a',
    ]);
  });

  it('reports an empty table and an empty row at their close tags', () => {
    expect(stderrOf('digraph{a[label=<<table></table>>]}')[1]).toBe('... <table></table> ...');
    expect(stderrOf('digraph{a[label=<<table><tr></tr></table>>]}')[1]).toBe('... <tr></tr> ...');
  });

  it('reports a second top-level table', () => {
    expect(stderrOf(
      'digraph{a[label=<<table><tr><td>x</td></tr></table><table></table>>]}',
    )[1]).toBe('... </table><table> ...');
  });

  it('prefers a syntax error before the failing chunk over the lexer error', () => {
    expect(stderrOf('digraph{a[label=<<table><tr><td>x<br>y</td></tr></table>>]}')).toEqual([
      'Error: syntax error in line 1 ',
      '... <br>y ...',
      'in label of node a',
    ]);
  });
});

describe('expat attribute errors', () => {
  it('reports a value without quotes at the offending line', () => {
    expect(stderrOf('digraph{a[label=<<table><tr><td\n x=1>x</td></tr></table>>]}')).toEqual([
      'Error: not well-formed (invalid token) in line 2 ',
      '... <tr><td\n x=1> ...',
      'in label of node a',
    ]);
  });

  it('reports an attribute without a value', () => {
    expect(stderrOf('digraph{a[label=<<table><tr><td\n x="1"\n y>x</td></tr></table>>]}')[0])
      .toBe('Error: not well-formed (invalid token) in line 3 ');
  });

  it('reports a duplicate attribute', () => {
    expect(stderrOf('digraph{a[label=<<table><tr><td x="1" x="2">x</td></tr></table>>]}')).toEqual([
      'Error: duplicate attribute in line 1 ',
      '... <tr><td x="1" x="2"> ...',
      'in label of node a',
    ]);
  });
});

describe('size_html_* return values', () => {
  const sizeRv = (src: string): number => sizeHtmlLabel(parseHtmlLabel(src), measurer);

  it('is 0 for a clean table and for text', () => {
    expect(sizeRv('<TABLE><TR><TD>a</TD></TR></TABLE>')).toBe(0);
    expect(sizeRv('<B>x</B>')).toBe(0);
  });

  it('is 1 for a FIXEDSIZE cell smaller than its content', () => {
    expect(sizeRv('<TABLE><TR><TD FIXEDSIZE="TRUE" WIDTH="5" HEIGHT="5">hello</TD></TR></TABLE>')).toBe(1);
  });

  it('is 0 for a FIXEDSIZE cell that fits', () => {
    expect(sizeRv('<TABLE><TR><TD FIXEDSIZE="TRUE" WIDTH="200" HEIGHT="100">a</TD></TR></TABLE>')).toBe(0);
  });

  it('is 1 for a FIXEDSIZE cell or table missing a dimension', () => {
    expect(sizeRv('<TABLE><TR><TD FIXEDSIZE="TRUE" WIDTH="50">a</TD></TR></TABLE>')).toBe(1);
    expect(sizeRv('<TABLE FIXEDSIZE="TRUE" HEIGHT="50"><TR><TD>a</TD></TR></TABLE>')).toBe(1);
  });

  it('is 1 for a FIXEDSIZE table smaller than its content', () => {
    expect(sizeRv('<TABLE FIXEDSIZE="TRUE" WIDTH="5" HEIGHT="5"><TR><TD>hello</TD></TR></TABLE>')).toBe(1);
  });

  it('is 1 for a missing image, and again when the label is sized twice', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const lbl = parseHtmlLabel('<TABLE><TR><TD><IMG SRC="missing-t6.png"/></TD></TR></TABLE>');
    expect(sizeHtmlLabel(lbl, measurer)).toBe(1);
    expect(sizeHtmlLabel(lbl, measurer)).toBe(1);
  });

  it('propagates a nested table problem up through the cell', () => {
    expect(sizeRv(
      '<TABLE><TR><TD><TABLE FIXEDSIZE="TRUE" WIDTH="5" HEIGHT="5"><TR><TD>hello</TD></TR></TABLE></TD></TR></TABLE>',
    )).toBe(1);
  });

  it('keeps rv 1 on a second sizing although the warning is deduplicated', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const lbl = parseHtmlLabel('<TABLE><TR><TD FIXEDSIZE="TRUE" WIDTH="5" HEIGHT="5">hello</TD></TR></TABLE>');
    expect(sizeHtmlLabel(lbl, measurer)).toBe(1);
    expect(sizeHtmlLabel(lbl, measurer)).toBe(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});
