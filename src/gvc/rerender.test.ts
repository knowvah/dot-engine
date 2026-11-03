// SPDX-License-Identifier: EPL-2.0
//
// A second layout on one Graph (plantuml-ts issue 37, part-9 AD-11). Native's
// gvFreeLayout deletes every layout record, so the next layout binds zeroed
// ones. The port keeps them until the next layout, because getLayout is
// documented to work after render, which frees. Fixtures are native 16.1.0's own
// renders on one graph in one process (__fixtures__/rerender/regen.sh).
// @see lib/gvc/gvlayout.c:gvFreeLayout
// @see lib/common/input.c:graph_cleanup
// @see lib/common/utils.c:gv_cleanup_edge
// @see lib/common/utils.c:gv_cleanup_node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compareXdot, XDOT_TOLERANCE } from '../../test/golden/compare-xdot.js';
import { createGraph } from '../api/builder.js';
import { getLayout } from '../api/geometry.js';
import { renderAsync } from '../async/render-async.js';
import { parse } from '../parser/index.js';
import { render } from '../render/public.js';
import { getDrawOps } from '../render/xdot-public.js';
import { createDefaultContext } from './default-context.js';
import { render as deviceRender } from './device.js';
import type { EngineName } from './context.js';

const FIXTURES = new URL('./__fixtures__/rerender/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, FIXTURES), 'utf8');

/** compareXdot's test is strict; a one-printed-unit difference is 0.01 + ~1e-11. */
const POSITION_TOLERANCE = XDOT_TOLERANCE + 1e-9;

const ENGINES: readonly EngineName[] = [
  'dot', 'neato', 'fdp', 'sfdp', 'circo', 'twopi', 'osage', 'patchwork',
];

/**
 * Native does not repeat these, for a reason that is not a stale record, so
 * regen.sh keeps no render 2 for them. mixed.sfdp: a new graph in the same
 * process gives the same render 2, so the state is process-global, and AD-4 makes
 * each port layout one native process. mixed.fdp: render 2 varies between native
 * runs, equal to render 1 in 6 of 16.
 */
const NATIVE_REPEATS_NOT: ReadonlySet<string> = new Set(['mixed.fdp', 'mixed.sfdp']);

const PLAIN_CASES: ReadonlyArray<readonly [string, EngineName]> = [
  ...ENGINES.flatMap((e) => [['filing', e] as const, ['mixed', e] as const]),
  ['cluster-skeleton', 'dot'],
  ['cluster-lrvn', 'dot'],
];

/** Layout and render with no gvFreeLayout, on one context. */
function layoutOnly(
  ctx: ReturnType<typeof createDefaultContext>,
  g: ReturnType<typeof parse>,
  engine: EngineName,
): string {
  ctx.layout(g, engine);
  return deviceRender(ctx, g, 'plain');
}

describe('a second render after a free repeats the first, on plain', () => {
  it.each(PLAIN_CASES)('%s on %s equals native render 2', (id, engine) => {
    const g = parse(read(`${id}.gv`));
    const first = render(g, 'plain', { engine });
    const second = render(g, 'plain', { engine });
    expect(second).toBe(first);
    expect(first).toBe(read(`${id}.${engine}.plain.1`));
    if (!NATIVE_REPEATS_NOT.has(`${id}.${engine}`)) {
      expect(second).toBe(read(`${id}.${engine}.plain.2`));
    }
  });
});

describe('dot with clusters does not throw on a second render', () => {
  // Stale GD_parent: collapse_cluster returns early and build_skeleton indexes
  // rankleader with a rank outside the stale GD_minrank..GD_maxrank.
  it('cluster-skeleton (reading info of null in buildSkeletonCountsNode)', () => {
    const g = parse(read('cluster-skeleton.gv'));
    render(g, 'plain', { engine: 'dot' });
    expect(render(g, 'plain', { engine: 'dot' })).toBe(read('cluster-skeleton.dot.plain.2'));
  });

  // Stale GD_ln/GD_rn: make_lrvn returns early, so an aux edge points at a
  // virtual node that is not in the new GD_nlist.
  it('cluster-lrvn (reading par of undefined in stSetFind)', () => {
    const g = parse(read('cluster-lrvn.gv'));
    render(g, 'plain', { engine: 'dot' });
    expect(render(g, 'plain', { engine: 'dot' })).toBe(read('cluster-lrvn.dot.plain.2'));
  });
});

describe('render, render, render', () => {
  const expected = read('filing.dot.plain.1');

  it('on parse', () => {
    const g = parse('digraph{a->b}');
    expect([1, 2, 3].map(() => render(g, 'plain'))).toEqual([expected, expected, expected]);
  });

  it('on the createGraph builder', () => {
    const b = createGraph({ directed: true });
    b.addEdge(b.addNode('a'), b.addNode('b'));
    expect([1, 2, 3].map(() => render(b.graph, 'plain'))).toEqual([expected, expected, expected]);
  });
});

describe('render, then getLayout', () => {
  it('reads the geometry of the layout that render ran', () => {
    const g = parse('digraph{a->b}');
    render(g, 'plain');
    const snap = getLayout(g, { yAxis: 'up' });
    expect(snap.bounds).toEqual({ x: 0, y: 0, width: 54, height: 108 });
    expect(snap.nodes.map((n) => [n.name, n.x, n.y])).toEqual([['a', 27, 90], ['b', 27, 18]]);
    expect(snap.edges[0].points[0].x).toBe(27);
    expect(snap.edges[0].points[0].y).toBeCloseTo(71.697, 3);
  });

  it('reads the second layout after a second render', () => {
    const g = parse('digraph{a->b}');
    render(g, 'plain');
    const first = getLayout(g, { yAxis: 'up' });
    render(g, 'plain');
    expect(getLayout(g, { yAxis: 'up' })).toEqual(first);
  });

  it('a layout that fails before the engine leaves the freed records readable', () => {
    const g = parse('digraph{a->b}');
    const ctx = createDefaultContext();
    ctx.layout(g, 'dot');
    ctx.freeLayout(g, 'dot');
    g.attrs.set('layout', 'nosuchengine');
    expect(() => ctx.layout(g, 'dot')).toThrow('Layout type: "nosuchengine" not recognized');
    expect(getLayout(g, { yAxis: 'up' }).nodes.map((n) => n.y)).toEqual([90, 18]);
  });
});

describe('render with one engine, then with another', () => {
  it.each(['neato', 'fdp', 'circo'] as const)('dot then %s equals native', (engine) => {
    const g = parse(read('filing.gv'));
    expect(render(g, 'plain', { engine: 'dot' })).toBe(read('filing.dot.plain.1'));
    expect(render(g, 'plain', { engine })).toBe(read(`filing.dot.plain.then-${engine}.2`));
  });

  it('neato then dot equals a dot first render', () => {
    const g = parse(read('filing.gv'));
    render(g, 'plain', { engine: 'neato' });
    expect(render(g, 'plain', { engine: 'dot' })).toBe(read('filing.dot.plain.1'));
  });
});

describe('the records survive until the next layout, and only a free resets them', () => {
  it('freeLayout leaves the records in place', () => {
    const g = parse('digraph{a->b}');
    const ctx = createDefaultContext();
    ctx.layout(g, 'dot');
    const { info: edgeInfo } = g.edges[0];
    const nodeInfo = g.nodes.get('a')?.info;
    const graphInfo = g.info;
    ctx.freeLayout(g, 'dot');
    expect(g.edges[0].info).toBe(edgeInfo);
    expect(g.nodes.get('a')?.info).toBe(nodeInfo);
    expect(g.info).toBe(graphInfo);
  });

  it('a layout after a free binds new records, on subgraphs too', () => {
    const g = parse(read('cluster-skeleton.gv'));
    const ctx = createDefaultContext();
    ctx.layout(g, 'dot');
    const cluster = g.subgraphs.get('cluster0');
    const stale = [g.edges[0].info, g.nodes.get('a')?.info, g.info, cluster?.info];
    ctx.freeLayout(g, 'dot');
    ctx.layout(g, 'dot');
    const fresh = [g.edges[0].info, g.nodes.get('a')?.info, g.info, cluster?.info];
    expect(fresh.map((r, i) => r === stale[i])).toEqual([false, false, false, false]);
  });

  it('a layout with no free keeps them', () => {
    const g = parse('digraph{a->b}');
    const ctx = createDefaultContext();
    ctx.layout(g, 'dot');
    const { info: edgeInfo } = g.edges[0];
    const firstVirt = edgeInfo.to_virt;
    ctx.layout(g, 'dot');
    expect(g.edges[0].info).toBe(edgeInfo);
    expect(firstVirt).not.toBeUndefined();
  });

  it('a second free changes nothing, and the next layout resets once', () => {
    const g = parse('digraph{a->b}');
    const ctx = createDefaultContext();
    ctx.layout(g, 'dot');
    ctx.freeLayout(g, 'dot');
    ctx.freeLayout(g, 'dot');
    ctx.layout(g, 'dot');
    expect(deviceRender(ctx, g, 'plain')).toBe(read('filing.dot.plain.1'));
    ctx.freeLayout(g, 'dot');
  });

  it('a free before any layout does not make the next layout reset', () => {
    const g = parse('digraph{a->b}');
    const ctx = createDefaultContext();
    const graphInfo = g.info;
    ctx.freeLayout(g, 'dot');
    ctx.layout(g, 'dot');
    expect(g.info).toBe(graphInfo);
  });
});

describe('ctx.layout twice with no freeLayout keeps native\'s stale records', () => {
  const nativeLines = (n: number): string[] =>
    read(`filing.dot.plain.nofree.${n}`).split('\n');

  /** The edge line's fields before its point list, and the points themselves. */
  const edgePoints = (line: string): string[] => line.split(' ').slice(4, -2);

  it.each([1, 2, 3])('render %i has native\'s graph and node lines', (n) => {
    const g = parse(read('filing.gv'));
    const ctx = createDefaultContext();
    let out = '';
    for (let i = 1; i <= n; i++) out = layoutOnly(ctx, g, 'dot');
    const lines = out.split('\n');
    const native = nativeLines(n);
    expect(lines.slice(0, 3)).toEqual(native.slice(0, 3));
  });

  it.each([1, 2, 3])('render %i keeps the stale bezier, translated, first', (n) => {
    const g = parse(read('filing.gv'));
    const ctx = createDefaultContext();
    let out = '';
    for (let i = 1; i <= n; i++) out = layoutOnly(ctx, g, 'dot');
    const points = edgePoints(out.split('\n')[3]);
    expect(points).toEqual(edgePoints(nativeLines(n)[3]).slice(0, points.length));
    expect(points.length).toBe(8);
  });

  // Parked with a follow-up: native's new_spline appends the bezier this layout
  // routes. The dot router gates on e.info.spl === undefined, so it never routes
  // an edge with a stale spline (src/layout/dot/edge-route.ts, not in T11's
  // write-set). it.fails goes red the day that lands.
  it.fails('render 2 appends the newly routed bezier as native does', () => {
    const g = parse(read('filing.gv'));
    const ctx = createDefaultContext();
    layoutOnly(ctx, g, 'dot');
    expect(layoutOnly(ctx, g, 'dot')).toBe(read('filing.dot.plain.nofree.2'));
  });
});

describe('renderAsync and getDrawOps twice', () => {
  it('renderAsync repeats, and equals native', async () => {
    const g = parse(read('cluster-skeleton.gv'));
    const a = await renderAsync(g, 'plain', { engine: 'dot' });
    const b = await renderAsync(g, 'plain', { engine: 'dot' });
    expect(a.output).toBe(read('cluster-skeleton.dot.plain.1'));
    expect(b.output).toBe(a.output);
  });

  it('getDrawOps repeats', () => {
    const g = parse(read('cluster-skeleton.gv'));
    const first = getDrawOps(g);
    expect(first.length).toBeGreaterThan(10);
    expect(getDrawOps(g)).toEqual(first);
  });
});

describe('xdot: the write-back half is parked', () => {
  const XDOT_CASES: ReadonlyArray<readonly [string, EngineName]> = [
    ...ENGINES.map((e) => ['filing', e] as const),
    ['cluster-skeleton', 'dot'],
    ['cluster-lrvn', 'dot'],
  ];

  // The port's writer overlays attach_attrs at output time and never writes them
  // to the graph, so no attribute carries over and the second render repeats.
  it.each(XDOT_CASES)('%s on %s repeats the port\'s first render', (id, engine) => {
    const g = parse(read(`${id}.gv`));
    const first = render(g, 'xdot', { engine });
    expect(render(g, 'xdot', { engine })).toBe(first);
    expect(compareXdot(first, read(`${id}.${engine}.xdot.1`), POSITION_TOLERANCE).diffs).toEqual([]);
  });

  // Native's attach_attrs_and_arrows writes pos, width, height, bb and the draw
  // attributes into the graph; init_xdot replays `_draw_`, and the next layout
  // reads the rest. it.fails goes red the day the write-back lands.
  it.fails.each(XDOT_CASES)('%s on %s equals native render 2', (id, engine) => {
    const g = parse(read(`${id}.gv`));
    render(g, 'xdot', { engine });
    const second = render(g, 'xdot', { engine });
    expect(compareXdot(second, read(`${id}.${engine}.xdot.2`), POSITION_TOLERANCE).diffs).toEqual([]);
  });
});
