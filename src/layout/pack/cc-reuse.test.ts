// SPDX-License-Identifier: EPL-2.0
//
// ccomps and pccomps reuse a user's `_cc_N` subgraph, as agsubg(g, name, 1)
// does: the same object gains the component's nodes and induced edges
// (part-10 AD-7). Fixtures under __fixtures__/cc-reuse/ are graphviz 16.1.0's own
// output and stderr (part-10 T0; regen.sh), one case per engine.
// @see lib/pack/ccomps.c:ccomps
// @see lib/pack/ccomps.c:pccomps
// @see lib/cgraph/subg.c:agsubg
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../../index.js';
import { compareXdot, XDOT_TOLERANCE } from '../../../test/golden/compare-xdot.js';
import { ccomps, isConnected, pccomps } from './index.js';

const FIXTURES = new URL('./__fixtures__/cc-reuse/', import.meta.url);
const POSITION_TOLERANCE = XDOT_TOLERANCE + 1e-9;
const ENGINES = ['circo', 'twopi', 'sfdp', 'neato', 'osage'] as const;
const FILED = 'graph G { a -- b; subgraph _cc_0 { c } d -- e; }';

const read = (name: string): string => readFileSync(new URL(name, FIXTURES), 'utf8');

function run(id: string): { xdot: string; stderr: string } {
  const lines: string[] = [];
  vi.spyOn(console, 'warn').mockImplementation((m: unknown) => { lines.push(String(m)); });
  vi.spyOn(console, 'error').mockImplementation((m: unknown) => { lines.push(String(m)); });
  const xdot = String(render(parse(read(`${id}.gv`)), 'xdot', { engine: id }));
  return { xdot, stderr: lines.map((l) => `${l}\n`).join('') };
}

afterEach(() => { vi.restoreAllMocks(); });

describe('the filed graph matches native on each engine', () => {
  it.each(ENGINES)('%s', (id) => {
    const r = run(id);
    expect(compareXdot(r.xdot, read(`${id}.xdot`), POSITION_TOLERANCE).diffs).toEqual([]);
    expect(r.stderr).toBe(read(`${id}.stderr`));
  }, 60_000);

  it.each(ENGINES)('%s -Tdot output keeps or drops the user subgraph as native does', (id) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const dot = String(render(parse(read(`${id}.gv`)), 'dot', { engine: id }));
    const native = read(`${id}.dot`);
    expect(dot.includes('subgraph _cc_0')).toBe(native.includes('subgraph _cc_0'));
    expect(compareXdot(dot, native, POSITION_TOLERANCE).diffs).toEqual([]);
  }, 60_000);

  it('twopi reports the weight=0 disconnected component', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(parse(read('twopi.gv')), 'xdot', { engine: 'twopi' });
    expect(spy.mock.calls).toEqual([
      ['Error: twopi: use of weight=0 creates disconnected component.'],
    ]);
  });
});

describe('isConnected', () => {
  it('leaves a user _cc_N subgraph untouched', () => {
    const g = parse(FILED);
    expect(isConnected(g)).toBe(false);
    expect([...g.subgraphs.get('_cc_0')!.nodes.keys()]).toEqual(['c']);
    expect(isConnected(parse('graph G { a -- b }'))).toBe(true);
  });
});

describe('ccomps reuses an existing subgraph of the component name', () => {
  it('ccomps returns the user subgraph, now holding the component nodes', () => {
    const g = parse(FILED);
    const user = g.subgraphs.get('_cc_0')!;
    const cs = ccomps(g);
    expect(cs[0]).toBe(user);
    expect([...user.nodes.keys()]).toEqual(['a', 'b', 'c']);
    expect(user.edges.map((e) => `${e.tail.name}${e.head.name}`)).toEqual(['ab']);
    expect(cs.length).toBe(3);
  });

  it('pccomps returns the user subgraph for the first component', () => {
    const g = parse(FILED);
    const user = g.subgraphs.get('_cc_0')!;
    g.nodes.get('d')!.info.pinned = true;
    const { graphs, pinned } = pccomps(g);
    expect(pinned).toBe(true);
    expect(graphs[0]).toBe(user);
    expect([...user.nodes.keys()]).toEqual(['c', 'd', 'e']);
  });

  it('a graph without a _cc_N subgraph gets fresh components', () => {
    const g = parse('graph G { a -- b; c }');
    const cs = ccomps(g);
    expect(cs.map((c) => [...c.nodes.keys()])).toEqual([['a', 'b'], ['c']]);
    expect(g.subgraphs.size).toBe(0);
  });
});
