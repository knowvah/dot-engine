// SPDX-License-Identifier: EPL-2.0
//
// Tests for the write_nondefault_attrs port — one object's `[...]` block.
// @see lib/cgraph/write.c:471 write_nondefault_attrs
//
// The mechanism under test: a node carries a value RECORD seeded from the
// node-dict defaults in effect where it was CREATED, overridden by its own
// explicit attributes, and that record is compared against the dict of the
// scope the node is WRITTEN in (write.c:537-545). The two differ whenever a
// `node [...]` statement lands between the node's creation and its write, so a
// creation-time comparison silently omits attributes native prints. Every
// expectation here was taken from the native oracle.

import { describe, it, expect } from 'vitest';
import { parse } from '../index.js';
import { render } from './public.js';

function dot(src: string): string {
  return render(parse(src), 'dot', { engine: 'dot' });
}

/** The `[...]` attribute block of node `name`, whitespace-collapsed. */
function nodeBlock(out: string, name: string): string {
  const re = new RegExp(`^\\t+${name}\\t\\[([^\\]]*)\\]`, 'm');
  const m = re.exec(out);
  return m === null ? '' : m[1]!.replace(/\s+/g, ' ');
}

describe('write_nondefault_attrs — record vs writing-scope dict', () => {
  it('emits the record value when the default is reassigned later', () => {
    // The dict keeps only the LAST value, so A's record (house) no longer
    // matches it and prints, while B's (invhouse) does and does not.
    const out = dot('digraph G { { node [shape=house]; A; node [shape=invhouse]; B } }');
    expect(out).toContain('node [shape=invhouse];');
    expect(nodeBlock(out, 'A')).toContain('shape=house');
    expect(nodeBlock(out, 'B')).not.toContain('shape');
  });

  it('emits an empty value for a default declared after the node', () => {
    // `a` predates the color symbol, so its record slot is empty against a
    // non-empty dict default — native prints `color=""`.
    const out = dot('digraph G { a; node [color=red]; b; }');
    expect(nodeBlock(out, 'a')).toContain('color=""');
    expect(nodeBlock(out, 'b')).not.toContain('color');
  });

  it('emits the inherited value a node was created under', () => {
    const out = dot('digraph G { node [color=blue]; a; { node [color=red]; a; b } }');
    expect(nodeBlock(out, 'a')).toContain('color=blue');
    expect(nodeBlock(out, 'b')).not.toContain('color');
  });

  it('compares against the scope the node is WRITTEN in, not created in', () => {
    // `a` is created at the root but written inside the subgraph, so it is
    // compared against the subgraph's dict.
    const out = dot('digraph G { a; { node [color=red]; a; b } }');
    expect(nodeBlock(out, 'a')).toContain('color=""');
  });

  it('cancels the synthesized \\N label default on both sides', () => {
    // graph_init installs `label="\N"` on the root; it must appear in BOTH the
    // record and the comparison dict or every node would print a label.
    const out = dot('digraph G { a; b; }');
    expect(out).toContain('node [label="\\N"];');
    expect(nodeBlock(out, 'a')).not.toContain('label');
  });

  it('emits \\N when a label default is declared after the node', () => {
    const out = dot('digraph G { a; node [label="x"]; b; }');
    expect(nodeBlock(out, 'a')).toContain('label="\\N"');
    expect(nodeBlock(out, 'b')).not.toContain('label');
  });

  it('still suppresses a computed value equal to the dict default', () => {
    // The class-B gate reads the same writing-scope dict.
    const out = dot('digraph G { node [width=0.5]; a; }');
    expect(nodeBlock(out, 'a')).toContain('height=0.5');
    expect(nodeBlock(out, 'a')).not.toContain('width');
  });
});
