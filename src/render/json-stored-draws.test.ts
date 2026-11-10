// SPDX-License-Identifier: EPL-2.0
/**
 * `-Tjson` prints the draw strings an object already holds when this render
 * does not draw it. C's write_attrs prints `agxget` values, and the inner xdot
 * render agxsets a node's or edge's `_draw_` .. `_tldraw_` only from a non-empty
 * buffer, so an invisible object keeps what the input or an earlier render
 * stored, and so does a drawn one for each buffer this render leaves empty. A
 * subgraph keeps the `_draw_` and `xdotversion` xdot_end_graph set when it was
 * the render root; xdot_end_cluster alone always sets `_draw_`, so a cluster's
 * stored `_draw_` goes. Every expected value is native dot 16.1.0's own
 * json output (`plans/issue-140-json-stored-draws/harness/regen.sh`).
 * @see plugin/core/gvrender_core_json.c:write_attrs
 * @see plugin/core/gvrender_core_dot.c:xdot_end_node
 */
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { describe, expect, it } from 'vitest';
import { compareJson } from '../../test/golden/compare-json.js';
import { createDefaultContext } from '../gvc/default-context.js';
import { render as deviceRender } from '../gvc/device.js';
import { parse } from '../parser/index.js';

const HARNESS_140 = new URL('../../plans/issue-140-json-stored-draws/harness/', import.meta.url);
const SUBG_GV = new URL('../../plans/post-16-1-followups-11/harness/T0/subg.gv', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_140), 'utf8');

const ENGINE = 'dot';
/** The attributes xdot's end_node / end_edge / end_cluster / end_graph store. */
const DRAW_KEYS = ['_draw_', '_ldraw_', '_hdraw_', '_tdraw_', '_hldraw_', '_tldraw_', 'xdotversion'] as const;
/** What hide-render.c sets on every node and edge between its two renders. */
const HIDE: ReadonlyArray<readonly [string, string]> = [['style', 'invis'], ['color', 'red']];
const BLACK = '#000000';
const RED = '#ff0000';
const ROOT_KEY = '<root>';

type JObj = Record<string, unknown>;
type Draws = Record<string, Record<string, unknown>>;

/** A harness transcript's renders, in order (each follows a `== render N` line). */
function rendersOf(name: string): string[] {
  return read(name).split(/^== render \d+\n/m).slice(1);
}

/** Every json object by a stable key: the root, `objects` by name and `_gvid`,
 *  `edges` by tail, head and order among parallel edges. */
function objectsOf(text: string): Map<string, JObj> {
  const root = JSON.parse(text) as JObj & { objects?: JObj[]; edges?: JObj[] };
  const out = new Map<string, JObj>([[ROOT_KEY, root]]);
  for (const o of root.objects ?? []) out.set(`o:${String(o['name'])}:${String(o['_gvid'])}`, o);
  const seen = new Map<string, number>();
  for (const e of root.edges ?? []) {
    const base = `e:${String(e['tail'])}>${String(e['head'])}`;
    const k = seen.get(base) ?? 0;
    seen.set(base, k + 1);
    out.set(`${base}#${k}`, e);
  }
  return out;
}

/** The draw keys each object carries, parsed (so `3.000` equals `3`). */
function drawsOf(text: string): Draws {
  const out: Draws = {};
  for (const [key, o] of objectsOf(text)) {
    const row: Record<string, unknown> = {};
    for (const k of DRAW_KEYS) if (k in o) row[k] = o[k];
    out[key] = row;
  }
  return out;
}

/** Element `i` of a list of renders or objects; a missing one fails the test. */
function at<T>(items: readonly T[], i: number): T {
  const v = items[i];
  if (v === undefined) throw new Error(`no element ${i} of ${items.length}`);
  return v;
}

/** The first object named `name` in a json render (`G` itself is the root). */
function named(text: string, name: string): JObj {
  for (const o of objectsOf(text).values()) if (o['name'] === name) return o;
  throw new Error(`no object named ${name}`);
}

/** The object under one of objectsOf's keys. */
function keyed(text: string, key: string): JObj {
  const o = objectsOf(text).get(key);
  if (o === undefined) throw new Error(`no object ${key}`);
  return o;
}

/** One attribute of an object, as JSON text. */
const jsonOf = (o: JObj, key: string): string => JSON.stringify(o[key]);

/** The text of a draw string's `T` ops. */
function textsOf(ops: unknown): unknown[] {
  return (ops as JObj[]).filter((op) => op['op'] === 'T').map((op) => op['text']);
}

/** A port json render carries native's draw keys on every object, and passes the json comparator. */
function expectEqualsNative(port: string, native: string): void {
  const want = drawsOf(native);
  expect(Object.keys(want).length).toBeGreaterThan(1);
  expect(drawsOf(port)).toEqual(want);
  expect(compareJson(port, native).diffs).toEqual([]);
}

/** Every render of a sequence equals native's, from render `from` on. */
function expectRendersEqualNative(port: string[], native: string[], count: number, from = 0): void {
  expect(native).toHaveLength(count);
  expect(port).toHaveLength(count);
  for (let i = from; i < count; i++) expectEqualsNative(at(port, i), at(native, i));
}

/** One layout and one json render of a harness fixture, as `dot -Tjson`. */
function renderOnce(fixture: string): string {
  const g = parse(read(fixture));
  const ctx = createDefaultContext();
  ctx.layout(g, ENGINE);
  const out = deviceRender(ctx, g, 'json');
  ctx.freeLayout(g, ENGINE);
  return out;
}

/** `object.key` for every draw key that differs from native, and every object native lacks. */
function diffRows(port: string, native: string): string[] {
  const got = drawsOf(port);
  const want = drawsOf(native);
  const rows: string[] = [];
  for (const [key, row] of Object.entries(want)) {
    for (const k of DRAW_KEYS) if (!isDeepStrictEqual(got[key]?.[k], row[k])) rows.push(`${key}.${k}`);
  }
  return [...rows, ...Object.keys(got).filter((key) => !(key in want))];
}

/** hide-cluster.c: layout, render xdot, hide every top-level cluster, render json, no free between. */
function hideClusterRenders(): string[] {
  const g = parse(read('hide-cluster.gv'));
  const ctx = createDefaultContext();
  ctx.layout(g, ENGINE);
  const out = [deviceRender(ctx, g, 'xdot')];
  for (const sg of g.subgraphs.values()) sg.attrs.set('style', 'invis');
  out.push(deviceRender(ctx, g, 'json'));
  ctx.freeLayout(g, ENGINE);
  return out;
}

/** hide-render.c: layout, render `fmt1`, hide every node and edge, render json, no free between. */
function hiddenRenders(fmt1: 'xdot' | 'json'): string[] {
  const g = parse(read('hidden.gv'));
  const ctx = createDefaultContext();
  ctx.layout(g, ENGINE);
  const out = [deviceRender(ctx, g, fmt1)];
  for (const n of g.nodes.values()) {
    for (const [k, v] of HIDE) n.attrs.set(k, v);
    for (const e of n.outEdges(g)) for (const [k, v] of HIDE) e.attrs.set(k, v);
  }
  out.push(deviceRender(ctx, g, 'json'));
  ctx.freeLayout(g, ENGINE);
  return out;
}

/** subg-after-free.c `subnofree`: root, free; subgraph `sub`, no free; root again. All json. */
function subnofreeRenders(sub: string): string[] {
  const g = parse(readFileSync(SUBG_GV, 'utf8'));
  const s = g.subgraphs.get(sub);
  if (s === undefined) throw new Error(`no subgraph ${sub}`);
  const ctx = createDefaultContext();
  const out: string[] = [];
  ctx.layout(g, ENGINE);
  out.push(deviceRender(ctx, g, 'json'));
  ctx.freeLayout(g, ENGINE);
  ctx.layout(s, ENGINE);
  out.push(deviceRender(ctx, s, 'json'));
  ctx.layout(g, ENGINE);
  out.push(deviceRender(ctx, g, 'json'));
  ctx.freeLayout(g, ENGINE);
  return out;
}

describe('json prints stored draw strings on objects a render does not draw (native 16.1.0)', () => {
  it.each([
    { fmt1: 'xdot', from: 1 },
    { fmt1: 'json', from: 0 },
  ] as const)('hidden.gv: $fmt1, hide every node and edge, json', ({ fmt1, from }) => {
    const port = hiddenRenders(fmt1);
    expectRendersEqualNative(port, rendersOf(`out/hidden.${fmt1}-json`), 2, from);

    // Render 2 saw the hidden, red objects and still printed render 1's black strings.
    const a = named(at(port, 1), 'a');
    expect([a['style'], a['color']]).toEqual(['invis', 'red']);
    expect(jsonOf(a, '_draw_')).toContain(BLACK);
    expect(jsonOf(a, '_draw_')).not.toContain(RED);
    // Label text with `\"` and `\` is render 1's, unchanged (`x\\\"y\\z`, `e\"f\\g` in DOT).
    expect(textsOf(a['_ldraw_'])).toEqual(['x\\\\"y\\\\z']);
    const edge = keyed(at(port, 1), 'e:0>1#0');
    expect(edge['style']).toBe('invis');
    expect(jsonOf(edge, '_hdraw_')).toContain(BLACK);
    expect(textsOf(edge['_ldraw_'])).toEqual(['e"f\\\\g']);
  });

  it('stored-input.gv: input draw strings on an invisible node, edge and cluster', () => {
    const port = renderOnce('stored-input.gv');
    expectEqualsNative(port, read('out/stored-input.json'));

    // The invisible node `h` prints the blue ellipse the input gave it.
    expect(jsonOf(named(port, 'h'), '_draw_')).toContain('#0000ff');
    // The non-cluster subgraph `s` is never drawn: its input `_draw_` and `xdotversion` print.
    const s = named(port, 's');
    expect(jsonOf(s, '_draw_')).toContain(RED);
    expect(s['xdotversion']).toBe('1.2');
    // The invisible cluster keeps its input label string; xdot_end_cluster emptied its `_draw_`.
    const x = named(port, 'cluster_x');
    expect(textsOf(x['_ldraw_'])).toEqual(['h']);
    expect(x['_draw_']).toBeUndefined();
  });

  it('empty-buffer.gv: a drawn object keeps the input string of a buffer this render leaves empty', () => {
    const port = renderOnce('empty-buffer.gv');
    expectEqualsNative(port, read('out/empty-buffer.json'));

    // `a -> b` is drawn with dir=none: no arrowhead buffers, so the input strings stay.
    const ab = keyed(port, 'e:1>2#0');
    expect(jsonOf(ab, '_hdraw_')).toContain('#00ff00');
    expect(jsonOf(ab, '_tdraw_')).toContain('#0000ff');
    // Its `_draw_` buffer is not empty: this render's spline, not an input string.
    expect(jsonOf(ab, '_draw_')).toContain(BLACK);
    // An empty label draws no text: node `c`, and the root, keep the input `_ldraw_`.
    expect(textsOf(named(port, 'c')['_ldraw_'])).toEqual(['q']);
    expect(textsOf(keyed(port, ROOT_KEY)['_ldraw_'])).toEqual(['r']);
    // shape=none draws nothing: node `d` keeps the input `_draw_`.
    expect(jsonOf(named(port, 'd'), '_draw_')).toContain('#ff00ff');
    // A cluster with no periphery: its label string stays, its `_draw_` does not.
    const q = named(port, 'cluster_q');
    expect(textsOf(q['_ldraw_'])).toEqual(['w']);
    expect(q['_draw_']).toBeUndefined();
  });

  it('subg.gv subnofree: render 3 prints what subgraph s kept from being the render root', () => {
    const native = rendersOf('out/subg.s.subnofree.json');
    const port = subnofreeRenders('s');
    expectRendersEqualNative(port, native, 3);

    // Render 1 never drew `s`; render 2 made it the root; render 3 still carries those strings.
    expect(named(at(port, 0), 's')['xdotversion']).toBeUndefined();
    const s = named(at(port, 2), 's');
    expect(s['xdotversion']).toBe('1.7');
    expect(Array.isArray(s['_draw_'])).toBe(true);
    expect(s['_draw_']).toEqual(named(at(native, 2), 's')['_draw_']);
  });
});

/**
 * The rows issue #196 leaves open. C's xdot_end_cluster and xdot_end_graph set
 * `_ldraw_` whenever the cluster or root has a label, from an empty buffer too
 * (an invisible cluster, a `"\n"` label), so the stored string goes; the port
 * keeps it. Each list is every row that differs from native: when #196 lands,
 * the lists become empty.
 * @see plugin/core/gvrender_core_dot.c:xdot_end_cluster
 * @see plugin/core/gvrender_core_dot.c:xdot_end_graph
 */
describe('open rows: the stored _ldraw_ of a labelled cluster or root that draws no text (#196)', () => {
  it.each([
    { fixture: 'ldraw-cleared', open: ['o:cluster_x:0._ldraw_', 'o:cluster_zz:3._ldraw_'] },
    { fixture: 'ldraw-newline', open: ['<root>._ldraw_', 'o:cluster_n:0._ldraw_'] },
  ])('$fixture: differs from native in the #196 rows only', ({ fixture, open }) => {
    expect(diffRows(renderOnce(`${fixture}.gv`), read(`out/${fixture}.json`))).toEqual(open);
  });

  it('hide-cluster.gv: render 2 differs from native in cluster_l._ldraw_ only', () => {
    const port = hideClusterRenders();
    const native = rendersOf('out/hide-cluster.xdot-json');
    expect(diffRows(at(port, 1), at(native, 1))).toEqual(['o:cluster_l:0._ldraw_']);
    // The unlabelled cluster and both clusters' `_draw_` already follow xdot_end_cluster.
    expect(named(at(port, 1), 'cluster_l')['_draw_']).toBeUndefined();
    expect(named(at(port, 1), 'cluster_u')['_ldraw_']).toBeUndefined();
  });
});
