// SPDX-License-Identifier: EPL-2.0
/**
 * A labelled cluster's or render root's `_ldraw_` is set whenever it has a
 * label (issue #196). xdot_end_cluster and xdot_end_graph agxset it from the
 * label buffer even when that buffer is empty (an invisible cluster, a `"\n"`
 * label), so a stored string goes and agwrite prints `_ldraw_=""`. write_dict
 * drops an empty value whose symbol lacks `print` when the graph is the one
 * written, or when the symbol it would inherit is empty and carries `print`.
 * Only a symbol the input's root body declared carries it (attrstmt). json
 * skips the empty value.
 *
 * Every native ref is the carried oracle's own output (ADR-0003), written by
 * the harness's `recapture.sh`.
 * @see plugin/core/gvrender_core_dot.c:280 xdot_end_cluster
 * @see plugin/core/gvrender_core_dot.c:427 xdot_end_graph
 * @see lib/cgraph/write.c:275 write_dict
 * @see lib/cgraph/grammar.y:388 attrstmt
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderFormat } from '../../../test/helpers/render-format.js';
import { createDefaultContext } from '../../gvc/default-context.js';
import { render as deviceRender } from '../../gvc/device.js';
import type { Graph } from '../../model/graph.js';
import { parse } from '../../parser/index.js';
import { clusterLdraw, rootLdraw } from './write-back.js';

const HARNESS_196 = new URL('../../../plans/issue-196-cluster-ldraw-cleared/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_196), 'utf8');

const OUT_OF_SCOPE_PREFIX = 'oos-';
/** The two-render API cases (`hide-cluster.c`): their own test below. */
const TWO_RENDER_PREFIX = 'hide-';
const TWO_RENDER = ['hide-cluster', 'hide-root-nl'];
const LDRAW = '_ldraw_';
/** `-Tdot` prints a seeded (inherited) draw string as a cluster's own: #293. */
const DOT_OPEN = new Set(['plain-parent', 'root-drawn-nested']);
const PROBE_COUNT = 22;
const PROBES = readdirSync(new URL('probes/', HARNESS_196))
  .filter((f) => f.endsWith('.gv') && !f.startsWith(OUT_OF_SCOPE_PREFIX))
  .filter((f) => !f.startsWith(TWO_RENDER_PREFIX))
  .map((f) => f.replace(/\.gv$/, ''))
  .sort();
const STORED = 'F 14 11 -Times-Roman c 7 -#000000 T 3 3 0 5 1 -s ';

/** json parsed with every object's keys sorted: the port's key order is #184's. */
function sortedJson(text: string): string {
  return JSON.stringify(JSON.parse(text), (_k, v: unknown) => {
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return v;
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  });
}

const port = (probe: string, format: string): string =>
  renderFormat(parse(read(`probes/${probe}.gv`)), format, 'dot');

describe('a labelled cluster or root that draws no text sets an empty _ldraw_ (#196)', () => {
  it('reads every in-scope probe', () => {
    expect(PROBES).toHaveLength(PROBE_COUNT);
  });

  it.each(PROBES)('%s: -Txdot equals native byte for byte', (probe) => {
    expect(port(probe, 'xdot')).toBe(read(`native/${probe}.xdot`));
  });

  it.each(PROBES)('%s: -Tjson equals native once keys are sorted', (probe) => {
    expect(sortedJson(port(probe, 'json'))).toBe(sortedJson(read(`native/${probe}.json`)));
  });

  it.each(PROBES.filter((p) => !DOT_OPEN.has(p)))('%s: -Tdot equals native byte for byte', (probe) => {
    expect(port(probe, 'dot')).toBe(read(`native/${probe}.dot`));
  });

  // hide-cluster: the labelled cluster loses render 1's `_ldraw_`. hide-root-nl: the root's
  // empty `_ldraw_`, which no root statement declared, is written back and still not printed.
  it.each(TWO_RENDER)('%s: a second render after style=invis equals native (hide-cluster.c)', (probe) => {
    for (const fmt2 of ['xdot', 'json'] as const) {
      const g = parse(read(`probes/${probe}.gv`));
      const ctx = createDefaultContext();
      ctx.layout(g, 'dot');
      const first = deviceRender(ctx, g, 'xdot');
      // agsafeset gives each subgraph a local `style` symbol: no longer a seeded value.
      for (const sg of g.subgraphs.values()) {
        sg.attrs.set('style', 'invis');
        sg.seededAttrs?.delete('style');
      }
      const second = deviceRender(ctx, g, fmt2);
      ctx.freeLayout(g, 'dot');
      const native = read(`native/${probe}.xdot-${fmt2}`).split(/^== render \d+\n/m).slice(1);
      expect(native).toHaveLength(2);
      expect(first).toBe(native[0]);
      expect(fmt2 === 'json' ? sortedJson(second) : second)
        .toBe(fmt2 === 'json' ? sortedJson(native[1] ?? '') : native[1]);
    }
  });
});

describe('print: the symbols a root-body attribute statement declared', () => {
  it.each([
    { src: 'digraph G { _ldraw_=""; a }', want: true },
    { src: 'digraph G { graph [_ldraw_="x"]; a }', want: true },
    { src: 'digraph G { subgraph cluster_c { _ldraw_=""; a } }', want: false },
    { src: 'digraph G { label="L"; a }', want: false },
  ])('$src: _ldraw_ carries print = $want', ({ src, want }) => {
    expect(parse(src).printGraphAttrs?.has(LDRAW) === true).toBe(want);
  });

  it('marks no subgraph, whatever it declares', () => {
    const root = parse('digraph G { subgraph cluster_c { _ldraw_=""; label="C"; a } }');
    expect(root.subgraphs.get('cluster_c')?.printGraphAttrs).toBeUndefined();
    expect(root.printGraphAttrs).toBeUndefined();
  });
});

describe('rootLdraw: which _ldraw_ value agwrite prints for the graph it writes', () => {
  const declared = parse('digraph G { _ldraw_=""; a }');
  const undeclared = parse('digraph G { label="\\n"; a }');

  it('prints a non-empty value either way', () => {
    expect(rootLdraw(declared, STORED)).toBe(STORED);
    expect(rootLdraw(undeclared, STORED)).toBe(STORED);
  });

  it('prints an empty or missing value only under print', () => {
    expect(rootLdraw(declared, '')).toBe('');
    expect(rootLdraw(declared, undefined)).toBe('');
    expect(rootLdraw(undeclared, '')).toBeUndefined();
    expect(rootLdraw(undeclared, undefined)).toBeUndefined();
  });
});

/** A root `G` with `cluster_a` holding `cluster_b`; `label` on the named ones.
 *  `rootDecl` is a root-body statement, so its key carries `print`. */
function tree(labelled: readonly string[], rootDecl = ''): { root: Graph; a: Graph; b: Graph } {
  const root = parse(`digraph G { ${rootDecl} subgraph cluster_a { subgraph cluster_b { x } } }`);
  const a = root.subgraphs.get('cluster_a');
  const b = a?.subgraphs.get('cluster_b');
  if (a === undefined || b === undefined) throw new Error('fixture lost a cluster');
  for (const g of [a, b]) if (labelled.includes(g.name)) g.info.label = { text: 'L' };
  return { root, a, b };
}

describe('clusterLdraw: which _ldraw_ value agwrite prints for a cluster', () => {
  it('prints a non-empty value and nothing for a missing one', () => {
    const { a } = tree([]);
    expect(clusterLdraw(a, STORED, [], () => undefined)).toBe(STORED);
    expect(clusterLdraw(a, undefined, [a], () => '')).toBeUndefined();
  });

  it('drops an empty value the cluster does not hold itself', () => {
    const { a } = tree([]);
    expect(clusterLdraw(a, '', [a], () => undefined)).toBeUndefined();
  });

  it("skips an empty value that would inherit the root's empty print symbol", () => {
    const { root, a, b } = tree(['cluster_a', 'cluster_b'], '_ldraw_="";');
    const ldrawOf = (g: Graph): string | undefined => (g === root ? '' : undefined);
    expect(clusterLdraw(a, '', [a, b], ldrawOf)).toBeUndefined();
    expect(clusterLdraw(b, '', [b], ldrawOf)).toBeUndefined();
    // The root's value is the empty default when nothing stores one.
    expect(clusterLdraw(a, '', [a], () => undefined)).toBeUndefined();
  });

  it("prints an empty value under a non-root ancestor's empty one, or a non-empty root", () => {
    const { root, a, b } = tree(['cluster_a', 'cluster_b'], '_ldraw_="";');
    expect(clusterLdraw(b, '', [a, b], (g) => (g === root ? '' : undefined))).toBe('');
    expect(clusterLdraw(a, '', [a], (g) => (g === root ? STORED : undefined))).toBe('');
  });

  it('prints an empty value under an empty root symbol without print', () => {
    const { root, a } = tree(['cluster_a']);
    expect(clusterLdraw(a, '', [a], (g) => (g === root ? '' : undefined))).toBe('');
    expect(clusterLdraw(a, '', [a], () => undefined)).toBe('');
  });

  it('counts a local symbol as held, whether or not the cluster was drawn', () => {
    const root = parse('digraph G { subgraph cluster_c { _ldraw_=""; a } }');
    const c = root.subgraphs.get('cluster_c');
    if (c === undefined) throw new Error('fixture lost cluster_c');
    expect(clusterLdraw(c, '', [], () => undefined)).toBe('');
  });
});
