// SPDX-License-Identifier: EPL-2.0
//
// The two edges of the layout reset (part 10 T15, AD-9). A subgraph laid out after
// its root was freed follows the native harness, plans/post-16-1-followups-10/
// harness/T15 (regen.sh). A throwing engine has no native equivalent, so its test
// pins what the port leaves behind.
// @see lib/gvc/gvlayout.c:61-64
// @see lib/gvc/gvlayout.c:gvFreeLayout
// @see lib/dotgen/dotinit.c:36
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compareXdot, XDOT_TOLERANCE } from '../../test/golden/compare-xdot.js';
import { parse } from '../parser/index.js';
import { getLayout } from '../api/geometry.js';
import type { Graph } from '../model/graph.js';
import type { EngineName, GvcContext } from './context.js';
import { createDefaultContext } from './default-context.js';
import { render as deviceRender } from './device.js';
import { layoutWasFreed } from './layout-reset.js';

const HARNESS = new URL('../../plans/post-16-1-followups-10/harness/T15/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS), 'latin1');

const SOURCE = read('subg.gv');
const POSITION_TOLERANCE = XDOT_TOLERANCE + 1e-9;
const SUBGRAPHS = ['s', 'cluster_k'] as const;
const ENGINES: readonly EngineName[] = ['dot', 'fdp', 'sfdp', 'circo', 'twopi', 'osage', 'patchwork'];

/** Native's renders of one case, in order. */
const nativeRenders = (engine: EngineName, sub: string, fmt: string, mode: string): string[] =>
  read(`out/${engine}.${sub}.${fmt}.${mode}`).split(/^== render \d+\n/m).slice(1);

const parseCase = (): { g: Graph; s: (name: string) => Graph } => {
  const g = parse(SOURCE);
  return {
    g,
    s: (name) => {
      const sub = g.subgraphs.get(name);
      if (sub === undefined) throw new Error(`no subgraph ${name}`);
      return sub;
    },
  };
};

/** One context, one graph: layout, render in `fmt`, free. */
const cycle = (ctx: GvcContext, g: Graph, engine: EngineName, fmt: 'plain' | 'xdot' | 'svg'): string => {
  ctx.layout(g, engine);
  const out = deviceRender(ctx, g, fmt);
  ctx.freeLayout(g, engine);
  return out;
};

const FMT_CASES = ENGINES.flatMap((e) => SUBGRAPHS.map((s) => [e, s] as const));

describe('a subgraph laid out after its root was freed', () => {
  it.each(FMT_CASES)('%s %s in plain equals native', (engine, sub) => {
    const { g, s } = parseCase();
    const ctx = createDefaultContext();
    const [, nativeSub] = nativeRenders(engine, sub, 'plain', 'free');
    cycle(ctx, g, engine, 'plain');
    expect(cycle(ctx, s(sub), engine, 'plain')).toBe(nativeSub);
  });

  it.each(FMT_CASES)('%s %s in xdot equals native', (engine, sub) => {
    const { g, s } = parseCase();
    const ctx = createDefaultContext();
    const [, nativeSub] = nativeRenders(engine, sub, 'xdot', 'free');
    cycle(ctx, g, engine, 'xdot');
    expect(compareXdot(cycle(ctx, s(sub), engine, 'xdot'), nativeSub, POSITION_TOLERANCE).diffs).toEqual([]);
  });

  it.each(FMT_CASES)('%s %s renders twice as native does', (engine, sub) => {
    const { g, s } = parseCase();
    const ctx = createDefaultContext();
    const [, first, second] = nativeRenders(engine, sub, 'plain', 'twice');
    cycle(ctx, g, engine, 'plain');
    expect(cycle(ctx, s(sub), engine, 'plain')).toBe(first);
    expect(cycle(ctx, s(sub), engine, 'plain')).toBe(second);
  });

  // The SVG writer numbers the graph group graph0 where native writes the
  // subgraph's AGSEQ, so this compares from the title on.
  it.each(SUBGRAPHS)('dot %s in svg equals native below the graph id', (sub) => {
    const { g, s } = parseCase();
    const ctx = createDefaultContext();
    const [, nativeSub] = nativeRenders('dot', sub, 'svg', 'free');
    const body = (svg: string): string => svg.slice(svg.indexOf('<title>'));
    cycle(ctx, g, 'dot', 'svg');
    expect(body(cycle(ctx, s(sub), 'dot', 'svg'))).toBe(body(nativeSub));
  });

  it('drops the records of the root\'s layout, for nodes outside the subgraph too', () => {
    const { g, s } = parseCase();
    const ctx = createDefaultContext();
    cycle(ctx, g, 'dot', 'plain');
    expect(g.nodes.get('a')?.info.rank).toBe(0);
    ctx.layout(s('s'), 'dot');
    expect(g.nodes.get('a')?.info.rank).toBeUndefined();
    expect(g.info.laidOut).toBeUndefined();
    expect(s('s').info.laidOut).toBe(true);
    expect(g.info.gvc).toBe(ctx);
  });

  it('never laid out, a root has nothing to drop, and a subgraph still binds it', () => {
    const { g, s } = parseCase();
    const ctx = createDefaultContext();
    ctx.layout(s('cluster_k'), 'dot');
    expect(g.info.gvc).toBe(ctx);
    expect(s('cluster_k').info.dotroot).toBe(s('cluster_k'));
    expect(g.info.dotroot).toBeUndefined();
  });

  it('a root layout clears the dot root a subgraph layout left', () => {
    const { g, s } = parseCase();
    const ctx = createDefaultContext();
    ctx.layout(s('cluster_k'), 'dot');
    ctx.layout(g, 'dot');
    expect(s('cluster_k').info.dotroot).toBeUndefined();
    expect(g.info.laidOut).toBe(true);
  });

  it('a subgraph freed resets its own nodes when the root is laid out next', () => {
    const { g, s } = parseCase();
    const ctx = createDefaultContext();
    cycle(ctx, s('cluster_k'), 'dot', 'plain');
    expect(g.nodes.get('f')?.info.coord.x).toBeGreaterThan(0);
    expect(layoutWasFreed(s('cluster_k'))).toBe(true);
    const seen: Array<number | undefined> = [];
    ctx.register({
      type: 'probe',
      layout: (x) => { seen.push(x.nodes.get('f')?.info.rank); },
      cleanup: () => undefined,
    });
    ctx.layout(g, 'probe');
    expect(seen).toEqual([undefined]);
  });
});

// C has no equivalent: an engine failure there ends the process (agerr, exit, or
// a crash), so nothing can observe the state. These pin what the port leaves.
describe('an engine that throws after a reset', () => {
  const THROWS = 'throwing';
  const contextWithThrowingEngine = (): GvcContext => {
    const ctx = createDefaultContext();
    ctx.register({
      type: THROWS,
      layout: () => { throw new Error('boom'); },
      cleanup: () => undefined,
    });
    return ctx;
  };

  it('after a free, leaves laidOut and cleanup unset and zeroed records', () => {
    const { g } = parseCase();
    const ctx = contextWithThrowingEngine();
    cycle(ctx, g, 'dot', 'plain');
    expect(g.info.laidOut).toBe(true);
    expect(() => ctx.layout(g, THROWS)).toThrow('boom');
    expect(g.info.laidOut).toBeUndefined();
    expect(g.info.cleanup).toBeUndefined();
    expect(layoutWasFreed(g)).toBe(false);
    expect(g.nodes.get('a')?.info.rank).toBeUndefined();
    expect(() => getLayout(g)).toThrow();
  });

  it('with no free, leaves the earlier layout\'s laidOut and cleanup', () => {
    const { g } = parseCase();
    const ctx = contextWithThrowingEngine();
    ctx.layout(g, 'dot');
    const cleanup = g.info.cleanup;
    expect(cleanup).toBeTypeOf('function');
    expect(() => ctx.layout(g, THROWS)).toThrow('boom');
    expect(g.info.laidOut).toBe(true);
    expect(g.info.cleanup).toBe(cleanup);
    expect(g.nodes.get('a')?.info.rank).toBe(0);
  });

  it('on a first layout, leaves laidOut and cleanup unset', () => {
    const { g } = parseCase();
    const ctx = contextWithThrowingEngine();
    expect(() => ctx.layout(g, THROWS)).toThrow('boom');
    expect(g.info.laidOut).toBeUndefined();
    expect(g.info.cleanup).toBeUndefined();
  });

  it('the next layout then runs as a first one, and equals one', () => {
    const { g } = parseCase();
    const ctx = contextWithThrowingEngine();
    const fresh = cycle(createDefaultContext(), parseCase().g, 'dot', 'plain');
    expect(cycle(ctx, g, 'dot', 'plain')).toBe(fresh);
    expect(() => ctx.layout(g, THROWS)).toThrow('boom');
    expect(cycle(ctx, g, 'dot', 'plain')).toBe(fresh);
  });

  it('a throw on a subgraph after its root was freed leaves both unset', () => {
    const { g, s } = parseCase();
    const ctx = contextWithThrowingEngine();
    cycle(ctx, g, 'dot', 'plain');
    expect(() => ctx.layout(s('s'), THROWS)).toThrow('boom');
    expect(g.info.laidOut).toBeUndefined();
    expect(s('s').info.laidOut).toBeUndefined();
    expect(s('s').info.cleanup).toBeUndefined();
  });
});
