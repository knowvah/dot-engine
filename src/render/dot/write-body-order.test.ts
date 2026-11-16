// SPDX-License-Identifier: EPL-2.0
//
// agwrite writes a body's edges after its nodes, in creation order, and writes each edge once
// (issue #149). Graphviz 16.1.1's write_body pends each out-edge of the node walk in a set keyed
// on AGSEQ(e); write_edges flushes the set after the walk and marks each edge done, so a later
// sibling or parent body never re-declares it. The refs under
// plans/issue-149-agwrite-edge-order/harness/native are native 16.1.1's -Tdot and -Txdot
// (dot -V: 16.1.1, 20261109.2225; stderr empty on every probe).
//
//   after-nodes        every node of the body precedes its first edge
//   seq-order          edges print in creation order, not grouped by tail node
//   no-redeclare       an edge written in a subgraph stays out of the root body, whose own edges
//                      follow all of its nodes (the base differed in order only)
//   sibling-once       a strict edge named in two sibling subgraphs is written in the first only:
//                      16.1.0 re-declared it bare in the second
//   strict-undirected  the order rule for an undirected strict graph that repeats an edge
//
// @see lib/cgraph/write.c:write_body
// @see lib/cgraph/write.c:write_edges
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../parser/index.js';
import { createDefaultContext } from '../../gvc/default-context.js';
import { render as deviceRender } from '../../gvc/device.js';

const HARNESS_149 = new URL('../../../plans/issue-149-agwrite-edge-order/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_149), 'utf8');
const PROBES = ['after-nodes', 'seq-order', 'no-redeclare', 'sibling-once', 'strict-undirected'] as const;
const FORMATS = ['dot', 'xdot'] as const;
type Fmt = (typeof FORMATS)[number];

/** Lay out probe `name` with dot and render it in `fmt` on a fresh context. */
const renderProbe = (name: string, fmt: Fmt): string => {
  const ctx = createDefaultContext();
  const g = parse(read(`probes/${name}.gv`));
  ctx.layout(g, 'dot');
  return deviceRender(ctx, g, fmt);
};

/** The lines of `out` that declare an edge `tail -> head`, trimmed of indentation. */
const edgeLines = (out: string, tail: string, head: string): string[] =>
  out.split('\n').map((l) => l.trim()).filter((l) => l.startsWith(`${tail} -> ${head}`));

describe.each(PROBES)('write_body edge order, %s', (probe) => {
  it.each(FORMATS)('equals native 16.1.1, %s', (fmt) => {
    expect(renderProbe(probe, fmt)).toBe(read(`native/${probe}.${fmt}`));
  });
});

describe('an edge is written once per agwrite', () => {
  it('sibling-once: a -> b is in the first subgraph only', () => {
    const out = renderProbe('sibling-once', 'dot');
    expect(edgeLines(out, 'a', 'b')).toHaveLength(1);
    expect(out.indexOf('a -> b')).toBeGreaterThan(out.indexOf('subgraph s1'));
    expect(out.indexOf('a -> b')).toBeLessThan(out.indexOf('subgraph s2'));
  });
});
