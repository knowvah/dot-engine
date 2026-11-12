// SPDX-License-Identifier: EPL-2.0
/**
 * json0's node `pos`, `width` and `height`: C's json_begin_graph runs
 * attach_attrs for FORMAT_JSON0, so json0 prints what the write-back stored,
 * `%.5g` of ND_coord, PS2INCH(ND_ht) and PS2INCH(ND_lw + ND_rw). Every expected
 * string is native dot 16.1.0's own json0 output
 * (`plans/issue-136-json0-node-numbers/harness/regen.sh`).
 * @see plugin/core/gvrender_core_json.c:json_begin_graph
 * @see lib/common/output.c:attach_attrs_and_arrows
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderFormat } from '../../test/helpers/render-format.js';
import type { EngineName } from '../gvc/context.js';
import { createDefaultContext } from '../gvc/default-context.js';
import { parse } from '../parser/index.js';
import { nodeLayoutAttrs } from './dot/write-back.js';

const HARNESS_136 = new URL('../../plans/issue-136-json0-node-numbers/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_136), 'utf8');

/** The three node attributes attach_attrs writes for every node. */
const LAYOUT_KEYS = ['pos', 'width', 'height'] as const;
type LayoutKey = (typeof LAYOUT_KEYS)[number];
type JObj = Record<string, unknown>;

/** A fixture, the engine its native ref was made with, and what it covers. */
const FIXTURES: ReadonlyArray<{ fixture: string; engine: EngineName; covers: string }> = [
  { fixture: 'sizes', engine: 'dot', covers: 'sizes below an inch and of 5 significant digits' },
  { fixture: 'frac', engine: 'dot', covers: 'fractional coordinates' },
  { fixture: 'dim3', engine: 'neato', covers: 'a dimen=3 pos of three coordinates' },
];

/** Node objects by name: json's `objects` minus the (sub)graph entries. */
function nodesOf(text: string): Map<string, JObj> {
  const root = JSON.parse(text) as { objects?: JObj[] };
  const isGraph = (o: JObj): boolean => 'bb' in o || 'nodes' in o || 'subgraphs' in o || 'edges' in o;
  return new Map((root.objects ?? []).filter((o) => !isGraph(o)).map((o) => [String(o['name']), o]));
}

/** `name.key=value` for every node and layout key, in the map's node order. */
function layoutRows(nodes: Map<string, JObj>, names: Iterable<string>): string[] {
  const rows: string[] = [];
  for (const name of names) {
    for (const k of LAYOUT_KEYS) rows.push(`${name}.${k}=${String(nodes.get(name)?.[k])}`);
  }
  return rows;
}

function portNodes(fixture: string, format: string, engine: EngineName): Map<string, JObj> {
  return nodesOf(renderFormat(parse(read(`${fixture}.gv`)), format, engine));
}

describe('json0 node pos, width and height equal native 16.1.0', () => {
  it.each(FIXTURES)('$fixture under $engine: $covers', ({ fixture, engine }) => {
    const native = nodesOf(read(`out/${fixture}.${engine}.json0`));
    const port = portNodes(fixture, 'json0', engine);
    expect(native.size).toBeGreaterThan(0);
    expect([...port.keys()]).toEqual([...native.keys()]);
    expect(layoutRows(port, native.keys())).toEqual(layoutRows(native, native.keys()));
  });

  it('prints a leading zero and five significant digits (sizes.gv)', () => {
    const port = portNodes('sizes', 'json0', 'dot');
    const value = (name: string, k: LayoutKey): unknown => port.get(name)?.[k];
    expect(value('a', 'width')).toBe('0.75');
    expect(value('c', 'width')).toBe('0.5');
    expect(value('c', 'height')).toBe('0.34444');
    expect(value('d', 'width')).toBe('2.0866');
  });

  it('rounds a coordinate to five significant digits (frac.gv)', () => {
    expect(portNodes('frac', 'json0', 'dot').get('c')?.['pos']).toBe('133.15,90');
  });

  it('prints every coordinate of a dimen=3 layout (dim3.gv)', () => {
    expect(portNodes('dim3', 'json0', 'neato').get('a')?.['pos']).toBe('27,29.207,12.591');
  });
});

describe('json0 and json agree on node layout attributes', () => {
  it('frac.gv under dot: the same three strings on every node', () => {
    const json0 = portNodes('frac', 'json0', 'dot');
    const json = portNodes('frac', 'json', 'dot');
    expect(json0.size).toBe(5);
    expect(layoutRows(json0, json0.keys())).toEqual(layoutRows(json, json0.keys()));
  });
});

describe('nodeLayoutAttrs', () => {
  it('returns the strings attach_attrs writes for a laid-out node', () => {
    const g = parse(read('sizes.gv'));
    const ctx = createDefaultContext();
    ctx.layout(g, 'dot');
    const attrs = nodeLayoutAttrs(g.nodes.get('c')!);
    ctx.freeLayout(g, 'dot');
    expect(attrs).toEqual({ pos: '90,90', height: '0.34444', width: '0.5' });
  });

  it('writes nothing to the node', () => {
    const g = parse(read('sizes.gv'));
    const ctx = createDefaultContext();
    ctx.layout(g, 'dot');
    const c = g.nodes.get('c')!;
    const before = [...c.attrs];
    nodeLayoutAttrs(c);
    const after = [...c.attrs];
    ctx.freeLayout(g, 'dot');
    expect(after).toEqual(before);
  });
});
