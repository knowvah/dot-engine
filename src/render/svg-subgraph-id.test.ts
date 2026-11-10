// SPDX-License-Identifier: EPL-2.0
//
// The svg graph group id of a subgraph render follows getObjId: "graph" + AGSEQ of the graph
// being emitted (root 0, subgraphs numbered in creation order). Native refs: part 11 T0
// harness subg-<engine>.<subgraph>.<mode>.svg (part 10 T15 harness subg-after-free.c).
// None of the refs holds a gradient, so no gradient id is pinned here.
// @see lib/common/emit.c:getObjId
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../parser/index.js';
import type { Graph } from '../model/graph.js';
import type { EngineName } from '../gvc/context.js';
import { createDefaultContext } from '../gvc/default-context.js';
import { render as deviceRender } from '../gvc/device.js';

const HARNESS = new URL('../../plans/post-16-1-followups-11/harness/T0/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS), 'latin1');
const SOURCE = read('subg.gv');
const GROUP_ID = /<g id="([^"]*)" class="graph"/;

const EXPECTED_SUBGRAPH_IDS = { s: 'graph1', cluster_k: 'graph2' } as const;
const ENGINES: readonly EngineName[] = ['fdp', 'osage'];
const CASES = ENGINES.flatMap((e) =>
  (['s', 'cluster_k'] as const).map((s) => [e, s] as const));

/** Native's renders of one case, in order. */
const nativeRenders = (engine: string, sub: string, mode: string): string[] =>
  read(`subg-${engine}.${sub}.${mode}.svg`).split(/^== render \d+\n/m).slice(1);

const groupId = (svg: string): string | undefined => GROUP_ID.exec(svg)?.[1];

const subgraph = (g: Graph, name: string): Graph => {
  const sub = g.subgraphs.get(name);
  if (sub === undefined) throw new Error(`no subgraph ${name}`);
  return sub;
};

/** Root layout and render, free, then the subgraph's layout and render. */
const rootThenSubgraph = (engine: EngineName, name: string): string[] => {
  const g = parse(SOURCE);
  const ctx = createDefaultContext();
  const out: string[] = [];
  for (const target of [g, subgraph(g, name)]) {
    ctx.layout(target, engine);
    out.push(deviceRender(ctx, target, 'svg'));
    ctx.freeLayout(target, engine);
  }
  return out;
};

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
