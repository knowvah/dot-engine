// SPDX-License-Identifier: EPL-2.0
//
// The node attributes a `phase` stop attaches: `rank` from phase 1, and
// `order` too from phase 2 (phase 3 attaches the same two).
//
// Expected text is the carried 16.1.1 oracle's `-Tdot` / `-Tjson` output,
// captured 2026-11-21 into plans/issue-192-phase-attrs/harness/native/.
//
// @see lib/dotgen/dotinit.c:attach_phase_attrs
// @see lib/cgraph/attr.c:setattr (a root default is reset to "")

import { describe, it, expect } from 'vitest';
import { parse, render } from '../../index.js';

/** One node statement as native prints it at the root level. */
function nodeStmt(name: string, attrs: string[]): string {
  return `\t${name}\t[${attrs.join(',\n\t\t')}];\n`;
}

/** Native's `-Tdot` text for `digraph { phase=<p>; a -> b; a -> c }`. */
function basicDot(phase: number, bb: string, nodes: [string, string[]][]): string {
  return (
    `digraph {\n\tgraph [bb="${bb}",\n\t\tphase=${phase}\n\t];\n\tnode [label="\\N"];\n` +
    nodes.map(([name, attrs]) => nodeStmt(name, attrs)).join('') +
    '\ta -> b;\n\ta -> c;\n}\n'
  );
}

const dot = (src: string): string => render(parse(src), 'dot');

describe('phase stop: rank and order node attributes', () => {
  it('phase=1 attaches rank only', () => {
    expect(dot('digraph { phase=1; a -> b; a -> c }')).toBe(
      basicDot(1, '0,0,0,0', [
        ['a', ['height=0.5', 'pos="0,0"', 'rank=0', 'width=0.75']],
        ['b', ['height=0.5', 'pos="0,0"', 'rank=1', 'width=0.75']],
        ['c', ['height=0.5', 'pos="0,0"', 'rank=1', 'width=0.75']],
      ]),
    );
  });

  it('phase=2 attaches rank and order', () => {
    expect(dot('digraph { phase=2; a -> b; a -> c }')).toBe(
      basicDot(2, '0,0,0,0', [
        ['a', ['height=0.5', 'order=0', 'pos="0,0"', 'rank=0', 'width=0.75']],
        ['b', ['height=0.5', 'order=0', 'pos="0,0"', 'rank=1', 'width=0.75']],
        ['c', ['height=0.5', 'order=1', 'pos="1,0"', 'rank=1', 'width=0.75']],
      ]),
    );
  });

  it('phase=3 attaches the same two, with laid-out positions', () => {
    expect(dot('digraph { phase=3; a -> b; a -> c }')).toBe(
      basicDot(3, '0,0,126,108', [
        ['a', ['height=0.5', 'order=0', 'pos="63,90"', 'rank=0', 'width=0.75']],
        ['b', ['height=0.5', 'order=0', 'pos="27,18"', 'rank=1', 'width=0.75']],
        ['c', ['height=0.5', 'order=1', 'pos="99,18"', 'rank=1', 'width=0.75']],
      ]),
    );
  });

  it('resets a root node default to "" and keeps it printed', () => {
    const out = dot('digraph { phase=2; node [order=7]; a -> b }');
    expect(out).toContain('\tnode [label="\\N",\n\t\torder=""\n\t];\n');
    expect(out).toContain(nodeStmt('a', ['height=0.5', 'order=0', 'pos="0,0"', 'rank=0', 'width=0.75']));
    expect(out).toContain(nodeStmt('b', ['height=0.5', 'order=0', 'pos="0,0"', 'rank=1', 'width=0.75']));
  });

  it("keeps a subgraph's own node default", () => {
    const out = dot('digraph { phase=1; subgraph s { node [rank=9]; x } a -> x }');
    expect(out).toContain(
      '\tsubgraph s {\n\t\tnode [rank=9];\n' +
        '\t\tx\t[height=0.5,\n\t\t\tpos="0,0",\n\t\t\trank=1,\n\t\t\twidth=0.75];\n\t}\n',
    );
    expect(out).toContain('\tnode [label="\\N"];\n');
    expect(out).toContain(nodeStmt('a', ['height=0.5', 'pos="0,0"', 'rank=0', 'width=0.75']));
  });

  it("overwrites a node's own rank", () => {
    const out = dot('digraph { phase=1; a [rank=5]; a -> b }');
    expect(out).toContain(nodeStmt('a', ['height=0.5', 'pos="0,0"', 'rank=0', 'width=0.75']));
    expect(out).toContain(nodeStmt('b', ['height=0.5', 'pos="0,0"', 'rank=1', 'width=0.75']));
    expect(out).not.toContain('rank=5');
  });

  it('carries both into json as strings', () => {
    const json = JSON.parse(render(parse('digraph { phase=2; a -> b; a -> c }'), 'json')) as {
      objects: { name: string; rank?: string; order?: string }[];
    };
    expect(json.objects.map((o) => [o.name, o.rank, o.order])).toEqual([
      ['a', '0', '0'],
      ['b', '1', '0'],
      ['c', '1', '1'],
    ]);
  });

  it('attaches nothing when the whole pipeline runs', () => {
    expect(dot('digraph { phase=4; a -> b }')).toBe(
      'digraph {\n\tgraph [bb="0,0,54,108",\n\t\tphase=4\n\t];\n\tnode [label="\\N"];\n' +
        nodeStmt('a', ['height=0.5', 'pos="27,90"', 'width=0.75']) +
        nodeStmt('b', ['height=0.5', 'pos="27,18"', 'width=0.75']) +
        '\ta -> b\t[pos="e,27,36.104 27,71.697 27,64.407 27,55.726 27,47.536"];\n}\n',
    );
  });
});
