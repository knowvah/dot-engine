// SPDX-License-Identifier: EPL-2.0
//
// An explicit empty graph name is a name (issue #139). cgraph maps `""` as a name: only a graph
// opened with no name is anonymous (`%N`). write_hdr prints any name that does not start with `%`,
// so `digraph "" {` and `subgraph "" {` survive a round trip, and irrelevant_subgraph never inlines
// a `subgraph ""`. A root named `""` consumes no anonymous id, so its first anonymous subgraph is
// `%1`, where a nameless root's is `%3`. The refs under plans/issue-139-empty-graph-name/harness
// are native 16.1.0's (regen.sh). root-anon is the control: a nameless root, equal to native before
// and after. root-percent is the other control: agmapnametoid treats a name starting with `%` as no
// name, so `digraph "%foo" {` is written `digraph {`.
// @see lib/cgraph/write.c:write_hdr
// @see lib/cgraph/write.c:irrelevant_subgraph
// @see lib/cgraph/id.c:idmap
// @see lib/cgraph/id.c:agmapnametoid
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../parser/index.js';
import { createDefaultContext } from '../../gvc/default-context.js';
import { render as deviceRender } from '../../gvc/device.js';

const HARNESS_139 = new URL('../../../plans/issue-139-empty-graph-name/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_139), 'latin1');
const TEXT_FORMATS = ['dot', 'xdot', 'cmapx'] as const;
type Fmt = (typeof TEXT_FORMATS)[number] | 'json';

const ROOT_ANON = 'root-anon';
const ROOT_PERCENT = 'root-percent';
const WRITER_FORMATS = ['dot', 'xdot'] as const;
const EMPTY_NAMED = ['root-empty', 'strict-empty', 'anonsub-empty', 'sub-empty', 'sub-empty-bare'] as const;
const FIXTURES = [...EMPTY_NAMED, ROOT_ANON] as const;
const CASES = FIXTURES.flatMap((f) => TEXT_FORMATS.map((fmt) => [f, fmt] as const));

const ref = (name: string, fmt: Fmt): string => read(`out/${name}.${fmt}`);

/** Lay out the harness source `name` with dot and render it in `fmt` on a fresh context. */
const renderRef = (name: string, fmt: Fmt): string => {
  const ctx = createDefaultContext();
  const g = parse(read(`${name}.gv`));
  ctx.layout(g, 'dot');
  return deviceRender(ctx, g, fmt);
};

interface JsonNames {
  readonly root: string;
  readonly subgraphs: readonly string[];
}

interface JsonGraph {
  readonly name: string;
  readonly _subgraph_cnt: number;
  readonly objects?: readonly { readonly name: string }[];
}

/** The root `name` and the subgraph names of a json output: write_graph puts the `_subgraph_cnt`
 *  subgraph objects first in `objects`, then the nodes. */
const jsonNames = (text: string): JsonNames => {
  const o = JSON.parse(text) as JsonGraph;
  return { root: o.name, subgraphs: (o.objects ?? []).slice(0, o._subgraph_cnt).map((s) => s.name) };
};

describe('an explicit empty graph name is written as native writes it', () => {
  it.each(CASES)('%s, %s', (name, fmt) => {
    expect(renderRef(name, fmt)).toBe(ref(name, fmt));
  });

  // Its cmapx and json names differ from native on the base too: the parser keeps `%foo` as the
  // name where cgraph hands out `%1` (issue #194).
  it.each(WRITER_FORMATS)('root-percent, %s: a name starting with %% is not printed', (fmt) => {
    const out = renderRef(ROOT_PERCENT, fmt);
    expect(out).toBe(ref(ROOT_PERCENT, fmt));
    expect(out.startsWith('digraph {\n')).toBe(true);
  });

  it('prints the header of a root named ""', () => {
    expect(renderRef('root-empty', 'dot').startsWith('digraph "" {\n')).toBe(true);
    expect(renderRef('strict-empty', 'dot').startsWith('strict graph "" {\n')).toBe(true);
  });

  it('prints subgraph "" with its header and an anonymous one bare', () => {
    const out = renderRef('sub-empty', 'dot');
    expect(out).toContain('\tsubgraph "" {\n\t\ta\t[');
    expect(out).toContain('\t{\n\t\tb\t[');
  });

  it('writes an empty subgraph "" where an anonymous one is inlined', () => {
    expect(renderRef('sub-empty-bare', 'dot')).toContain('\tsubgraph "" {\n\t}\n');
  });
});

describe('json names equal native', () => {
  it.each(EMPTY_NAMED)('%s: root and subgraph names', (name) => {
    expect(jsonNames(renderRef(name, 'json'))).toEqual(jsonNames(ref(name, 'json')));
  });

  // The json root name of a nameless graph (`%1` natively) is issue #185.
  it('root-anon: subgraph names', () => {
    const want = jsonNames(ref(ROOT_ANON, 'json')).subgraphs;
    expect(want).toEqual(['%3', 'cluster_q']);
    expect(jsonNames(renderRef(ROOT_ANON, 'json')).subgraphs).toEqual(want);
  });

  it('numbers the anonymous subgraph of a root named "" from %1', () => {
    expect(jsonNames(renderRef('anonsub-empty', 'json')).subgraphs).toEqual(['%1', 'cluster_q']);
  });
});

describe('the parser tells a nameless root from one named ""', () => {
  it('marks only the nameless root anonymous', () => {
    expect(parse('digraph "" {}').anonymous).toBe(false);
    expect(parse('digraph {}').anonymous).toBe(true);
    expect(parse('digraph "" {}').name).toBe('');
  });

  it('consumes anonymous id 1 only for a nameless root', () => {
    expect([...parse('digraph "" { subgraph { a } }').subgraphs.keys()]).toEqual(['%1']);
    expect([...parse('digraph { subgraph { a } }').subgraphs.keys()]).toEqual(['%3']);
    expect([...parse('digraph G { subgraph { a } }').subgraphs.keys()]).toEqual(['%1']);
  });
});
