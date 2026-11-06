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
import { describe, expect, it, vi } from 'vitest';
import { compareXdot, XDOT_TOLERANCE } from '../../test/golden/compare-xdot.js';
import { renderFormat } from '../../test/helpers/render-format.js';
import { createGraph } from '../api/builder.js';
import { getLayout } from '../api/geometry.js';
import { renderAsync } from '../async/render-async.js';
import { parse } from '../parser/index.js';
import { render } from '../render/public.js';
import { getDrawOps } from '../render/xdot-public.js';
import { createDefaultContext } from './default-context.js';
import { render as deviceRender } from './device.js';
import { installEdgeSpline } from '../layout/dot/edge-route-helpers.js';
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

describe('ctx.layout with no freeLayout keeps stale records and appends its route', () => {
  /** Renders 1 to `count`, on one context, with no free. */
  function renders(id: string, engine: EngineName, count: number): string[] {
    const g = parse(read(`${id}.gv`));
    const ctx = createDefaultContext();
    return Array.from({ length: count }, () => layoutOnly(ctx, g, engine));
  }

  const NOFREE_CASES: ReadonlyArray<readonly [string, EngineName]> = [
    ...ENGINES.map((e) => ['filing', e] as const),
    ['multi-edge', 'dot'],
    ['multi-edge', 'fdp'],
    ['multi-edge', 'patchwork'],
    ['abom-shift', 'dot'],
    ['abom-shift-parity', 'dot'],
    ['abom-shift-pack', 'dot'],
    ['flat-rev-stale', 'dot'],
  ];

  it.each(NOFREE_CASES)('%s on %s equals native on renders 1 to 3', (id, engine) => {
    const native = [1, 2, 3].map((n) => read(`${id}.${engine}.plain.nofree.${n}`));
    expect(renders(id, engine, 3)).toEqual(native);
  });

  // spline_edges runs compute_bb on the node positions before shifting them, and
  // compute_bb counts the stale beziers: on circo, a's left edge at -90 and the
  // stale end at 114.47 give native's width of 2.8398 in, not the first 2.5.
  // @see lib/neatogen/neatosplines.c:848
  // @see lib/common/utils.c:661
  it('stale beziers widen the bb of a later circo layout', () => {
    const lines = renders('filing', 'circo', 3).map((r) => r.split('\n')[0]);
    expect(lines).toEqual(['graph 1 2.5 0.5', 'graph 1 2.8398 0.5', 'graph 1 2.8398 0.5']);
  });

  it('render 2 on the filing graph holds both beziers, stale first', () => {
    const edge = renders('filing', 'dot', 2)[1].split('\n')[3];
    expect(edge).toBe(
      'edge a b 8 0.75 0.99579 0.75 0.89454 0.75 0.77398 0.75 0.66022 '
      + '0.75391 0.25 0.78171 0.25 0.80951 0.25 0.83731 0.25 solid black',
    );
  });

  // expand_ranksets adds to a rank set member's old ND_rank, and C's abomination
  // leaves ND_rank alone, so the port's +1 comes off when the next layout starts.
  // @see lib/dotgen/rank.c:expand_ranksets
  it('abomination shifts each layout once, whatever the last layout did', () => {
    const g = parse(read('abom-shift-parity.gv'));
    const ctx = createDefaultContext();
    const shifts = [1, 2, 3, 4].map(() => {
      ctx.layout(g, 'dot');
      return g.info.abomShift;
    });
    expect(shifts).toEqual([1, 1, 1, 1]);
  });

  // No input reaches this fallback where native draws the same route: native has no
  // fitter. Inputs that reach it: 121 and 258, which abort native on layout 2, and
  // nestedclust, whose no-free layouts route other edges differently (follow-up).
  it('the fitter fallback appends its route after the stale ones, as new_spline does', () => {
    const g = parse('digraph { a -> b }');
    createDefaultContext().layout(g, 'dot');
    const e = g.edges[0];
    const stale = e.info.spl?.list[0];
    const route = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }];
    installEdgeSpline(e, route, { x: 4, y: 4 });
    expect(e.info.spl?.size).toBe(2);
    expect(e.info.spl?.list[0]).toBe(stale);
    expect(e.info.spl?.list[1]).toMatchObject({
      list: route, size: 4, sflag: 0, eflag: 1, sp: { x: 0, y: 0 }, ep: { x: 4, y: 4 },
    });
  });

  // C draws each bezier's arrows from its own flags at emit. e:e->h:w's first
  // bezier came through the flat aux route; g->a's stale bezier swaps its arrow to
  // the tail, where no other bezier has one. Native's <g> lines are the fixture.
  it.each([1, 2, 3])('multi-edge render %i svg equals native, arrows included', (n) => {
    const g = parse(read('multi-edge.gv'));
    const ctx = createDefaultContext();
    const svgs = [1, 2, 3].map(() => {
      ctx.layout(g, 'dot');
      return deviceRender(ctx, g, 'svg');
    });
    const body = (svg: string): string => svg.slice(svg.indexOf('<g '));
    expect(body(svgs[n - 1])).toBe(body(read(`multi-edge.dot.svg.nofree.${n}`)));
  });

  it('a free still drops the stale beziers', () => {
    const g = parse(read('multi-edge.gv'));
    const ctx = createDefaultContext();
    layoutOnly(ctx, g, 'dot');
    layoutOnly(ctx, g, 'dot');
    ctx.freeLayout(g, 'dot');
    expect(layoutOnly(ctx, g, 'dot')).toBe(read('multi-edge.dot.plain.nofree.1'));
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

  it('getDrawOps returns the first layout\'s ops, then does not throw on clusters', () => {
    const g = parse(read('cluster-skeleton.gv'));
    const first = getDrawOps(g);
    expect(first.length).toBeGreaterThan(10);
    expect(getDrawOps(g).length).toBeGreaterThan(first.length);
  });
});

describe('rendering writes layout attributes back', () => {
  const XDOT_CASES: ReadonlyArray<readonly [string, EngineName]> = [
    ...ENGINES.map((e) => ['filing', e] as const),
    ...ENGINES.filter((e) => !NATIVE_REPEATS_NOT.has(`mixed.${e}`)).map((e) => ['mixed', e] as const),
    ['cluster-skeleton', 'dot'],
    ['cluster-lrvn', 'dot'],
  ];

  /** Native's renders of a twice.c seq: script. */
  const nativeSeq = (id: string, engine: EngineName, name: string, n: number): string =>
    read(`${id}.${engine}.seq-${name}.${n}`);

  const xdotDiffs = (actual: string, expected: string): unknown[] =>
    compareXdot(actual, expected, POSITION_TOLERANCE).diffs;

  /** An SVG from its first group on: the header names the generator, which differs. */
  const svgBody = (svg: string): string => svg.slice(svg.indexOf('<g '));

  it.each(XDOT_CASES)('%s on %s equals native renders 1 and 2', (id, engine) => {
    const g = parse(read(`${id}.gv`));
    expect(xdotDiffs(render(g, 'xdot', { engine }), read(`${id}.${engine}.xdot.1`))).toEqual([]);
    expect(xdotDiffs(render(g, 'xdot', { engine }), read(`${id}.${engine}.xdot.2`))).toEqual([]);
  });

  it('the attributes hold what the xdot output printed', () => {
    const g = parse(read('filing.gv'));
    render(g, 'xdot');
    expect(g.attrs.get('bb')).toBe('0,0,54,108');
    expect(g.attrs.get('xdotversion')).toBe('1.7');
    expect(g.attrs.get('_draw_')).toBe('c 9 -#fffffe00 C 7 -#ffffff P 4 0 0 0 108 54 108 54 0 ');
    const a = g.nodes.get('a');
    expect(a?.attrs.get('pos')).toBe('27,90');
    expect(a?.attrs.get('width')).toBe('0.75');
    expect(a?.attrs.get('height')).toBe('0.5');
    expect(a?.attrs.get('_draw_')).toBe('c 7 -#000000 e 27 90 27 18 ');
    expect(g.edges[0].attrs.get('pos')).toBe('e,27,36.104 27,71.697 27,64.407 27,55.726 27,47.536');
    expect(g.edges[0].attrs.get('_hdraw_')).toBe(
      'S 5 -solid c 7 -#000000 C 7 -#000000 P 3 30.5 47.62 27 37.62 23.5 47.62 ',
    );
  });

  it('a dot render writes pos and bb but no draw attributes', () => {
    const g = parse(read('filing.gv'));
    render(g, 'dot');
    expect(g.attrs.get('bb')).toBe('0,0,54,108');
    expect(g.attrs.get('xdotversion')).toBeUndefined();
    expect(g.nodes.get('a')?.attrs.get('pos')).toBe('27,90');
    expect(g.nodes.get('a')?.attrs.get('_draw_')).toBeUndefined();
  });

  it('a layout writes bb as gvLayout does, even with no render', () => {
    const g = parse(read('filing.gv'));
    const ctx = createDefaultContext();
    ctx.layout(g, 'dot');
    expect(g.attrs.get('bb')).toBe('0 0 54 108');
    expect(deviceRender(ctx, g, 'plain')).toBe(read('filing.dot.plain.1'));
    expect(g.attrs.get('bb')).toBe('0 0 54 108');
    expect(g.nodes.get('a')?.attrs.has('pos')).toBe(false);
  });

  it('a landscape layout writes bb with its axes swapped', () => {
    const g = parse('digraph { rotate=90; a -> b }');
    const ctx = createDefaultContext();
    ctx.layout(g, 'dot');
    expect(g.attrs.get('bb')).toBe('0 0 108 54');
  });

  const CASES = ['filing', 'mixed', 'cluster-skeleton'] as const;

  it.each(CASES)('%s: one layout, then xdot, then svg, each equals native', (id) => {
    const g = parse(read(`${id}.gv`));
    const ctx = createDefaultContext();
    ctx.layout(g, 'dot');
    expect(xdotDiffs(deviceRender(ctx, g, 'xdot'), nativeSeq(id, 'dot', 'xdot-svg', 1))).toEqual([]);
    expect(svgBody(deviceRender(ctx, g, 'svg'))).toBe(svgBody(nativeSeq(id, 'dot', 'xdot-svg', 2)));
  });

  it.each(CASES)('%s: one layout, then xdot twice, each equals native', (id) => {
    const g = parse(read(`${id}.gv`));
    const ctx = createDefaultContext();
    ctx.layout(g, 'dot');
    expect(xdotDiffs(deviceRender(ctx, g, 'xdot'), nativeSeq(id, 'dot', 'xdot-xdot', 1))).toEqual([]);
    expect(xdotDiffs(deviceRender(ctx, g, 'xdot'), nativeSeq(id, 'dot', 'xdot-xdot', 2))).toEqual([]);
  });

  it.each(CASES)('%s: xdot, then plain with a layout between, equals native', (id) => {
    const g = parse(read(`${id}.gv`));
    render(g, 'xdot');
    expect(render(g, 'plain')).toBe(nativeSeq(id, 'dot', 'xdot-plain', 2));
  });

  it.each(CASES)('%s: plain, then xdot, equals native', (id) => {
    const g = parse(read(`${id}.gv`));
    render(g, 'plain');
    expect(xdotDiffs(render(g, 'xdot'), nativeSeq(id, 'dot', 'plain-xdot', 2))).toEqual([]);
  });

  it.each(CASES)('%s: xdot, then svg with a layout between, replays _draw_ as native', (id) => {
    const g = parse(read(`${id}.gv`));
    render(g, 'xdot');
    expect(svgBody(render(g, 'svg'))).toBe(svgBody(nativeSeq(id, 'dot', 'xdot-then-svg', 2)));
  });

  it.each(CASES)('%s: dot twice equals native', (id) => {
    const g = parse(read(`${id}.gv`));
    render(g, 'dot');
    expect(xdotDiffs(render(g, 'dot'), nativeSeq(id, 'dot', 'dot-dot', 2))).toEqual([]);
  });

  it.each(CASES)('%s: one layout, then xdot, then dot, equals native', (id) => {
    const g = parse(read(`${id}.gv`));
    const ctx = createDefaultContext();
    ctx.layout(g, 'dot');
    deviceRender(ctx, g, 'xdot');
    expect(xdotDiffs(deviceRender(ctx, g, 'dot'), nativeSeq(id, 'dot', 'xdot-dot', 2))).toEqual([]);
  });

  it('neato: pos read back moves the next layout as native does', () => {
    const g = parse(read('neato-pos.gv'));
    const first = render(g, 'xdot', { engine: 'neato' });
    const second = render(g, 'plain', { engine: 'neato' });
    expect(second).toBe(nativeSeq('neato-pos', 'neato', 'xdot-plain', 2));
    expect(second.split('\n')[1]).not.toBe(render(parse(read('neato-pos.gv')), 'plain', { engine: 'neato' }).split('\n')[1]);
    expect(first.length).toBeGreaterThan(0);
  });

  it('neato: a dot render feeds pos back too', () => {
    const g = parse(read('neato-pos.gv'));
    render(g, 'dot', { engine: 'neato' });
    expect(render(g, 'plain', { engine: 'neato' })).toBe(nativeSeq('neato-pos', 'neato', 'dot-plain', 2));
  });

  it.each(['json', 'json0'] as const)('neato: a %s render feeds pos back too', (format) => {
    const g = parse(read('neato-pos.gv'));
    renderFormat(g, format, 'neato');
    expect(render(g, 'plain', { engine: 'neato' })).toBe(nativeSeq('neato-pos', 'neato', `${format}-plain`, 2));
  });

  it('a second json render holds the replayed _draw_ as native does', () => {
    const g = parse(read('filing.gv'));
    render(g, 'json');
    const second = JSON.parse(render(g, 'json')) as Record<string, unknown>;
    const native = JSON.parse(nativeSeq('filing', 'dot', 'json-json', 2)) as Record<string, unknown>;
    // An unnamed graph prints '' here and native's internal %1: a first-render gap.
    expect({ ...second, name: '' }).toEqual({ ...native, name: '' });
  });

  it('_background replays over the canvas on a first render, as native does', () => {
    const g = parse(read('background.gv'));
    const ctx = createDefaultContext();
    ctx.layout(g, 'dot');
    expect(xdotDiffs(deviceRender(ctx, g, 'xdot'), nativeSeq('background', 'dot', 'xdot-svg', 1))).toEqual([]);
    expect(svgBody(deviceRender(ctx, g, 'svg'))).toBe(svgBody(nativeSeq('background', 'dot', 'xdot-svg', 2)));
  });

  it('a _background that does not parse warns as native does, and draws nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const g = parse('digraph G { _background="c"; a }');
    const out = render(g, 'xdot');
    expect(warn.mock.calls.map((c) => String(c[0]))).toEqual([
      'Warning: Could not parse "_background" attribute in graph G',
      '  "c"',
    ]);
    expect(out).toContain('_draw_="c 9 -#fffffe00 C 7 -#ffffff P 4 ');
    warn.mockRestore();
  });

  it('an image in _background warns once, as native does', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(parse('digraph G { _background="I 0 0 1 1 5 -a.png c 7 -#ff0000 I 0 0 1 1 5 -a.png"; a }'), 'xdot');
    expect(warn.mock.calls.map((c) => String(c[0]))).toEqual([
      'Warning: Images unsupported in "background" attribute',
    ]);
    warn.mockRestore();
  });

  // size= makes pageSize = Z * sz / Z round just past the bb, so the clip misses
  // calloc's zero op box and native replays nothing.
  it('a sized drawing whose clip misses the origin replays no _draw_, as native', () => {
    const g = parse(read('sized-clip.gv'));
    render(g, 'xdot', { engine: 'neato' });
    const second = render(g, 'xdot', { engine: 'neato' });
    expect(xdotDiffs(second, read('sized-clip.neato.xdot.2'))).toEqual([]);
    expect(second.match(/P 4 /g)?.length).toBeGreaterThan(0);
    expect(g.attrs.get('_draw_')?.match(/P 4 /g)?.length).toBe(1);
  });

  it('render, then getLayout, reads the layout\'s geometry after an xdot render too', () => {
    const g = parse(read('filing.gv'));
    render(g, 'xdot');
    const snap = getLayout(g, { yAxis: 'up' });
    expect(snap.bounds).toEqual({ x: 0, y: 0, width: 54, height: 108 });
    expect(snap.nodes.map((n) => [n.name, n.x, n.y])).toEqual([['a', 27, 90], ['b', 27, 18]]);
  });

  it('getDrawOps sees the replayed _draw_ on a second call, as native\'s xdot does', () => {
    const g = parse(read('filing.gv'));
    const first = getDrawOps(g);
    const second = getDrawOps(g);
    const polygons = (ops: typeof first): number => ops.filter((o) => o.kind === 'filled_polygon').length;
    expect(polygons(first)).toBe(2); // background and one arrowhead
    expect(polygons(second)).toBe(3); // the old background comes back
    expect(second.length).toBeGreaterThan(first.length);
  });
});

// An edge to a cluster (part 10 T14). processClusterEdges swaps the node named
// for the cluster for a proxy; attach_attrs undoes that when it writes
// (output.c:404), so -Tdot, -Txdot and -Tjson leave the graph with the original
// membership, while -Tplain and -Tsvg leave the proxies as ordinary nodes.
// @see lib/common/utils.c:undoClusterEdges
describe('a second render on a graph with an edge to a cluster', () => {
  const xdotDiffs = (actual: string, expected: string): unknown[] =>
    compareXdot(actual, expected, POSITION_TOLERANCE).diffs;

  /** An SVG from its first group on: the header names the generator, which differs. */
  const svgBody = (svg: string): string => svg.slice(svg.indexOf('<g '));

  /** One context, one graph: layout, render in `fmt`, free. */
  const cycle = (
    ctx: ReturnType<typeof createDefaultContext>,
    g: ReturnType<typeof parse>,
    fmt: string,
  ): string => {
    ctx.layout(g, 'fdp');
    const out = deviceRender(ctx, g, fmt);
    ctx.freeLayout(g, 'fdp');
    return out;
  };

  it.each(['dot', 'xdot'] as const)('%s equals native renders 1 and 2', (fmt) => {
    const g = parse(read('cluster-edges.gv'));
    expect(xdotDiffs(render(g, fmt, { engine: 'fdp' }), read(`cluster-edges.fdp.${fmt}.1`))).toEqual([]);
    expect(xdotDiffs(render(g, fmt, { engine: 'fdp' }), read(`cluster-edges.fdp.${fmt}.2`))).toEqual([]);
  });

  it('a dot render leaves the proxies until the next layout undoes them', () => {
    const g = parse(read('cluster-edges.gv'));
    render(g, 'dot', { engine: 'fdp' });
    expect([...g.nodes.keys()]).toEqual(['e', 'a', 'b', 'C', 'D', 'd', 'f', '__0:clusterB', '__0:clusterC']);
    const ctx = createDefaultContext();
    ctx.layout(g, 'fdp');
    // Undone, then made again: new proxies, so new edge numbers below.
    expect([...g.nodes.keys()]).toEqual(['e', 'a', 'b', 'C', 'D', 'd', 'f', '__0:clusterB', '__0:clusterC']);
    expect(g.subgraphs.get('clusterB')?.nodes.has('__0:clusterB')).toBe(true);
    expect(g.edges.map((e) => [e.tail.name, e.head.name, e.graphSeq])).toEqual([
      ['a', 'b', 1], ['C', 'D', 2], ['d', 'f', 3], ['d', 'D', 4],
      ['e', '__0:clusterB', 11], ['__0:clusterC', '__0:clusterB', 12],
    ]);
  });

  it('a svg render after a dot render numbers the edges as native does', () => {
    const ctx = createDefaultContext();
    const g = parse(read('cluster-edges.gv'));
    expect(xdotDiffs(cycle(ctx, g, 'dot'), read('cluster-edges.fdp.seq-dot-svg.1'))).toEqual([]);
    expect(svgBody(cycle(ctx, g, 'svg')).match(/id="edge\d+"/g)).toEqual(
      svgBody(read('cluster-edges.fdp.seq-dot-svg.2')).match(/id="edge\d+"/g),
    );
  });

  it('a plain render after a dot render equals native', () => {
    const ctx = createDefaultContext();
    const g = parse(read('cluster-edges.gv'));
    cycle(ctx, g, 'dot');
    expect(cycle(ctx, g, 'plain')).toBe(read('cluster-edges.fdp.seq-dot-plain.2'));
  });

  // Clusters only: the port's JSON writer prints proxies on a first render too,
  // where native's does not, which a first render here may not change.
  it('a json render undoes the proxies, so render 2 lays out the clusters as native', () => {
    const ctx = createDefaultContext();
    const g = parse(read('cluster-edges.gv'));
    const clusters = (json: string): unknown =>
      (JSON.parse(json) as { objects: Array<{ name: string; bb?: string }> }).objects
        .filter((o) => o.bb !== undefined)
        .map((o) => [o.name, o.bb]);
    cycle(ctx, g, 'json');
    expect(clusters(cycle(ctx, g, 'json'))).toEqual(clusters(read('cluster-edges.fdp.seq-json-json.2')));
  });

  it('a no-free layout after a dot render equals native on svg', () => {
    const ctx = createDefaultContext();
    const g = parse(read('cluster-edges.gv'));
    ctx.layout(g, 'fdp');
    deviceRender(ctx, g, 'dot');
    ctx.layout(g, 'fdp');
    expect(svgBody(deviceRender(ctx, g, 'svg'))).toBe(svgBody(read('cluster-edges.fdp.seq-nofree-dot-svg.2')));
  });

  // The second layout's other input is heap order: deriveGraph and genPorts
  // compare node addresses (lib/fdpgen/layout.c:466,501,637), and a first cycle's
  // frees reorder them. The port orders by id, what an unfragmented heap gives,
  // as each layout is one native process (AD-4). These fixtures come from a plugin
  // patched to compare ND_id, so they hold everything but the address order.
  it('plain equals native with node addresses replaced by ND_id', () => {
    const g = parse(read('cluster-edges.gv'));
    expect(render(g, 'plain', { engine: 'fdp' })).toBe(read('cluster-edges.fdp.plain.noaddr.1'));
    expect(render(g, 'plain', { engine: 'fdp' })).toBe(read('cluster-edges.fdp.plain.noaddr.2'));
  });

  it('1581 in dot format equals the native process whose addresses ascend', () => {
    const g = parse(read('fdp-1581.gv'));
    expect(xdotDiffs(render(g, 'dot', { engine: 'fdp' }), read('fdp-1581.fdp.dot.1'))).toEqual([]);
    expect(xdotDiffs(render(g, 'dot', { engine: 'fdp' }), read('fdp-1581.fdp.dot.2'))).toEqual([]);
  });

  // HAS_CLUST_EDGE is a record of its own (CL_EDGE_TAG), which gvFreeLayout does
  // not delete: render 2 has no cluster edge left but still takes line segments.
  it('the cluster-edge record outlives the free, so render 2 keeps line segments', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const g = parse(read('cluster-edge-splines.gv'));
    expect(render(g, 'plain', { engine: 'fdp' })).toBe(read('cluster-edge-splines.fdp.plain.1'));
    expect(render(g, 'plain', { engine: 'fdp' })).toBe(read('cluster-edge-splines.fdp.plain.2'));
    expect(warn.mock.calls.map((c) => String(c[0]))).toEqual([
      'Warning: splines and cluster edges not supported - using line segments',
      'Warning: splines and cluster edges not supported - using line segments',
    ]);
    warn.mockRestore();
  });

  it('a graph with no cluster edge has nothing to undo', () => {
    const g = parse('graph { subgraph clusterA { a -- b } a -- c }');
    render(g, 'dot', { engine: 'fdp' });
    render(g, 'dot', { engine: 'fdp' });
    expect([...g.nodes.keys()]).toEqual(['a', 'b', 'c']);
    expect(g.info.n_cluster_edges).toBeUndefined();
  });
});
