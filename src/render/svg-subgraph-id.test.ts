// SPDX-License-Identifier: EPL-2.0
//
// The svg graph group id of a subgraph render follows getObjId: "graph" + AGSEQ of the graph
// being emitted (root 0, subgraphs numbered in creation order). Native refs: part 11 T0
// harness subg-<engine>.<subgraph>.<mode>.svg (part 10 T15 harness subg-after-free.c).
// None of the refs holds a gradient, so no gradient id is pinned here.
//
// The same id is obj->id (issue #132): the svg graph anchor a_<id>, the cmapx graph area id
// and the base of the graph label's HTML anchor ids <id>_<n>. Native refs: the issue-132
// harness (regen.sh), out/dot.<subgraph>.<fmt>.<fixture>. Only the cmapx ids are compared:
// native prints -0 in the area coords where the port prints 0 (issue #175).
// @see lib/common/emit.c:getObjId
// @see lib/common/emit.c:initObjMapData
// @see lib/common/htmltable.c:initAnchor
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../parser/index.js';
import type { Graph } from '../model/graph.js';
import type { EngineName } from '../gvc/context.js';
import { createDefaultContext } from '../gvc/default-context.js';
import { render as deviceRender } from '../gvc/device.js';

const HARNESS = new URL('../../plans/post-16-1-followups-11/harness/T0/', import.meta.url);
const HARNESS_132 = new URL('../../plans/issue-132-svg-graph-anchor-id/harness/', import.meta.url);
const read = (name: string, base: URL = HARNESS): string =>
  readFileSync(new URL(name, base), 'latin1');
const SOURCE = read('subg.gv');
const SOURCE_URL = read('subg-url.gv', HARNESS_132);
const SOURCE_HTML = read('subg-html.gv', HARNESS_132);
/** A root with an anchor of its own: native 16.1.0 prints a_graph0 (svg) and graph0 (cmapx). */
const ROOT_URL_SOURCE = 'digraph G { URL="x"; a }';
const GROUP_ID = /<g id="([^"]*)" class="graph"/;
const GROUP_OPEN = '<g id="graph';
const ID_ATTR = /\bid="([^"]*)"/g;
const HTML_ANCHOR_ID = /^a_graph\d+_\d+$/;
const RENDER_MARK = /^== render \d+\n/m;

const EXPECTED_SUBGRAPH_IDS = { s: 'graph1', cluster_k: 'graph2' } as const;
const ENGINES: readonly EngineName[] = ['fdp', 'osage'];
const CASES = ENGINES.flatMap((e) =>
  (['s', 'cluster_k'] as const).map((s) => [e, s] as const));

/** Native's renders of one case, in order. */
const nativeRenders = (engine: string, sub: string, mode: string): string[] =>
  read(`subg-${engine}.${sub}.${mode}.svg`).split(RENDER_MARK).slice(1);

/** Native's subgraph render (the second) of one issue-132 case. */
const nativeSubRender = (sub: string, fmt: string, fixture: string): string => {
  const second = read(`out/dot.${sub}.${fmt}.${fixture}`, HARNESS_132).split(RENDER_MARK)[2];
  if (second === undefined) throw new Error(`no render 2 for ${sub} ${fmt} ${fixture}`);
  return second;
};

const groupId = (svg: string): string | undefined => GROUP_ID.exec(svg)?.[1];

/** Every `id="..."` value, in document order. */
const ids = (text: string): string[] => [...text.matchAll(ID_ATTR)].map((m) => m[1] ?? '');

/** The svg from the graph group on: the header lines above it are the port's by design. */
const fromGroup = (svg: string): string => svg.slice(svg.indexOf(GROUP_OPEN));

const subgraph = (g: Graph, name: string): Graph => {
  const sub = g.subgraphs.get(name);
  if (sub === undefined) throw new Error(`no subgraph ${name}`);
  return sub;
};

/** Root layout and render, free, then the subgraph's layout and render. */
const rootThenSubgraph = (
  engine: EngineName, name: string, source: string = SOURCE, fmt = 'svg',
): string[] => {
  const g = parse(source);
  const ctx = createDefaultContext();
  const out: string[] = [];
  for (const target of [g, subgraph(g, name)]) {
    ctx.layout(target, engine);
    out.push(deviceRender(ctx, target, fmt));
    ctx.freeLayout(target, engine);
  }
  return out;
};

/** The port's subgraph render of one issue-132 case, after the root's layout, render and free. */
const subRender = (sub: string, fmt: string, source: string): string =>
  rootThenSubgraph('dot', sub, source, fmt)[1] ?? '';

describe('svg graph id of a subgraph render', () => {
  it.each(CASES)('%s %s: top group id equals native', (engine, sub) => {
    const [nativeRoot, nativeSub] = nativeRenders(engine, sub, 'root');
    const [root, rendered] = rootThenSubgraph(engine, sub);
    expect(groupId(nativeSub ?? '')).toBe(EXPECTED_SUBGRAPH_IDS[sub]);
    expect(groupId(rendered ?? '')).toBe(groupId(nativeSub ?? ''));
    expect(groupId(root ?? '')).toBe(groupId(nativeRoot ?? ''));
  });

  it.each(CASES)('%s %s: root render keeps graph0', (engine) => {
    const g = parse(SOURCE);
    const ctx = createDefaultContext();
    ctx.layout(g, engine);
    expect(groupId(deviceRender(ctx, g, 'svg'))).toBe('graph0');
  });
});

describe('graph anchor and area ids of a subgraph render', () => {
  const SUBS = ['s', 'cluster_k'] as const;

  it.each(SUBS)('dot %s: svg from the graph group on equals native', (sub) => {
    const native = fromGroup(nativeSubRender(sub, 'svg', 'url'));
    expect(native).toContain(`<g id="a_${EXPECTED_SUBGRAPH_IDS[sub]}">`);
    expect(fromGroup(subRender(sub, 'svg', SOURCE_URL))).toBe(native);
  });

  it.each(SUBS)('dot %s: cmapx area ids equal native', (sub) => {
    const native = ids(nativeSubRender(sub, 'cmapx', 'url'));
    expect(native).toEqual([sub, EXPECTED_SUBGRAPH_IDS[sub]]);
    expect(ids(subRender(sub, 'cmapx', SOURCE_URL))).toEqual(native);
  });

  it('dot s: the graph label\'s html cell anchor id equals native', () => {
    const anchors = (svg: string): string[] => ids(svg).filter((id) => HTML_ANCHOR_ID.test(id));
    const native = fromGroup(nativeSubRender('s', 'svg', 'html'));
    const rendered = fromGroup(subRender('s', 'svg', SOURCE_HTML));
    expect(anchors(native)).toEqual(['a_graph1_0']);
    expect(anchors(rendered)).toEqual(anchors(native));
    expect(rendered).toBe(native);
  });

  it('dot s: the graph label\'s html cell area id equals native', () => {
    const native = ids(nativeSubRender('s', 'cmapx', 'html'));
    expect(native).toEqual(['s', 'graph1_0', 'graph1']);
    expect(ids(subRender('s', 'cmapx', SOURCE_HTML))).toEqual(native);
  });

  it('a root render keeps a_graph0 and area graph0', () => {
    const root = (fmt: string): string => {
      const g = parse(ROOT_URL_SOURCE);
      const ctx = createDefaultContext();
      ctx.layout(g, 'dot');
      return deviceRender(ctx, g, fmt);
    };
    expect(ids(root('svg'))).toEqual(['graph0', 'a_graph0', 'node1']);
    expect(ids(root('cmapx'))).toEqual(['G', 'graph0']);
  });
});
