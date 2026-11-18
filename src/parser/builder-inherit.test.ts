// SPDX-License-Identifier: EPL-2.0
/**
 * A subgraph inherits every graph attribute value in effect in its parent
 * when it opens: `agmakeattrs` copies each visible symbol's `defval` into the
 * new subgraph's record, and every `agget(subg, …)` in layout and render
 * reads that copy. A value the parent sets later never reaches it. The
 * inherited value has no local dict symbol, so `write_dict` does not print
 * it.
 *
 * Every native ref is graphviz 16.1.1's own stdout, captured 2026-11-18:
 * `~/git/graphviz-16.1.1/build/cmd/dot/dot -Kdot -T<fmt> probes/<probe>.gv`
 * with `GVBINDIR=/tmp/ghl1611`. What each probe reaches is in the harness's
 * `survey.md`.
 * @see lib/cgraph/attr.c:agmakeattrs
 * @see lib/cgraph/write.c:write_dict
 */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderFormat } from '../../test/helpers/render-format.js';
import { agseterrf } from '../common/agerr.js';
import { agGraphAttr } from '../model/cgraph-ops.js';
import type { Graph } from '../model/graph.js';
import { parse } from './index.js';

const HARNESS_242 = new URL(
  '../../plans/issue-242-graph-attr-inheritance/harness/', import.meta.url,
);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_242), 'utf8');
const probe = (name: string): Graph => parse(read(`probes/${name}.gv`));
const extra = (name: string): Graph => parse(read(`extra/probes/${name}.gv`));
const port = (name: string, fmt: string): string => renderFormat(probe(name), fmt, 'dot');
const native = (name: string, fmt: string): string => read(`native/${name}.dot.${fmt}`);

const ORDERING = 'ordering';
const COLOR = 'color';
const OUT = 'out';
const CLUSTER_A = 'cluster_a';

const subg = (g: Graph, ...path: string[]): Graph => {
  let cur = g;
  for (const name of path) {
    const next = cur.subgraphs.get(name);
    if (next === undefined) throw new Error(`no subgraph ${name} in ${cur.name}`);
    cur = next;
  }
  return cur;
};

beforeEach(() => { agseterrf(() => 0); });
afterEach(() => { agseterrf(null); });

describe('a subgraph holds every graph attribute its parent had when it opened', () => {
  it('seeds a root `ordering` into a cluster that opens after it', () => {
    // digraph G { ordering=out; subgraph cluster_a { r -> c0; … } … }
    const a = subg(probe('repro'), CLUSTER_A);
    expect(a.attrs.get(ORDERING)).toBe(OUT);
    expect(a.seededAttrs?.has(ORDERING)).toBe(true);
    expect(agGraphAttr(a, ORDERING)).toBe(OUT);
  });

  it('does not seed a value the root sets after the cluster opened', () => {
    // digraph G { subgraph cluster_a { … } ordering=out; … }
    const a = subg(probe('late'), CLUSTER_A);
    expect(a.attrs.get(ORDERING)).toBeUndefined();
    expect(agGraphAttr(a, ORDERING)).toBe('');
  });

  it('keeps a value the body declares, unseeded', () => {
    // digraph G { ordering=out; subgraph cluster_a { ordering=""; … } … }
    const a = subg(probe('local-off'), CLUSTER_A);
    expect(a.attrs.get(ORDERING)).toBe('');
    expect(a.seededAttrs?.has(ORDERING) ?? false).toBe(false);
  });

  it('seeds a nested cluster through its parent', () => {
    // digraph G { ordering=out; subgraph cluster_o { subgraph cluster_i { … } } … }
    const o = subg(probe('nested'), 'cluster_o');
    const i = subg(o, 'cluster_i');
    expect(o.attrs.get(ORDERING)).toBe(OUT);
    expect(i.attrs.get(ORDERING)).toBe(OUT);
    expect(o.seededAttrs?.has(ORDERING)).toBe(true);
    expect(i.seededAttrs?.has(ORDERING)).toBe(true);
  });

  it('keeps the first-open values of a re-opened cluster', () => {
    // digraph G { subgraph cluster_p { a } ordering=out; subgraph cluster_p { … } … }
    const p = subg(probe('reopen'), 'cluster_p');
    expect(p.attrs.has(ORDERING)).toBe(false);
  });

  it('seeds a non-label key a rank set reads (`rank`)', () => {
    // digraph G { rank=same; subgraph s { a; b } c -> a; a -> d; b -> e }
    const s = subg(probe('rankset'), 's');
    expect(s.attrs.get('rank')).toBe('same');
    expect(s.seededAttrs?.has('rank')).toBe(true);
  });
});

/**
 * `agmakeattrs` copies the `defval` of the nearest LOCAL symbol up the
 * parent's dict view: a declaration, or the pin `unviewsubgraphsattr` gives a
 * direct subgraph when its parent updates a symbol it already holds. The two
 * differ from the parent's current values only once a subgraph is re-opened.
 * Native's cluster colours for each input are in `extra/native/`.
 * @see lib/cgraph/attr.c:setattr
 * @see lib/cgraph/attr.c:unviewsubgraphsattr
 */
describe('a subgraph opened in a re-opened one copies the nearest local symbol', () => {
  const colors = (g: Graph, ...path: string[]): Array<string | undefined> => {
    const out: Array<string | undefined> = [];
    let cur = g;
    for (const name of path) {
      cur = subg(cur, name);
      out.push(cur.attrs.get(COLOR));
    }
    return out;
  };

  it('stops at a parent the root pinned with the empty value', () => {
    // digraph G { subgraph cluster_a { x } ordering=out;
    //   subgraph cluster_a { subgraph cluster_b { … } } … }
    const b = subg(extra('x01-reopen-nested'), CLUSTER_A, 'cluster_b');
    expect(b.attrs.has(ORDERING)).toBe(false);
    expect(b.graphDefaultsSnapshot?.has(ORDERING)).toBe(false);
  });

  it('reads a new local definition past a parent that only inherited', () => {
    // q declares blue after p opened (no pin): p keeps red, c copies q's blue.
    const g = extra('x21-reopen-newlocal');
    expect(colors(g, 'cluster_q', 'cluster_p', 'cluster_c')).toEqual(['blue', 'red', 'blue']);
  });

  it('reads the value a pinned grandparent held', () => {
    // The root's update pins m at red; p views m's symbol.
    const g = extra('x24-reopen-pinned-mid');
    expect(colors(g, 'cluster_m', 'cluster_p', 'cluster_c')).toEqual(['red', 'red', 'red']);
  });

  it('pins the direct subgraphs of the scope that declares a key first', () => {
    // q is the first to declare `color`: p is pinned at "", c copies that.
    const g = extra('x25-reopen-firstdecl');
    expect(colors(g, 'cluster_q', 'cluster_p', 'cluster_c')).toEqual(['blue', undefined, undefined]);
  });

  it('does not pin under a new local definition of a key declared elsewhere', () => {
    // z declared `color` first; q then defines it locally: c copies q's blue.
    const g = extra('x26-reopen-lateglobal');
    expect(colors(g, 'cluster_q', 'cluster_p', 'cluster_c')).toEqual(['blue', undefined, 'blue']);
  });

  it('copies a value a later body of the parent declares', () => {
    const p = subg(extra('x27-reopen-local-after-pin'), 'cluster_p');
    expect(p.attrs.get(COLOR)).toBe('green');
    expect(subg(p, 'cluster_c').attrs.get(COLOR)).toBe('green');
    expect(subg(p, 'cluster_d').attrs.get(COLOR)).toBe('green');
  });

  it('pins a subgraph with the value it held when its parent updates', () => {
    // q: green, then blue after p opened: p is pinned at green, c copies it.
    const g = extra('x28-reopen-update-pins');
    expect(colors(g, 'cluster_q', 'cluster_p', 'cluster_c')).toEqual(['blue', 'green', 'green']);
  });

  it.each([
    'x01-reopen-nested', 'x21-reopen-newlocal', 'x25-reopen-firstdecl', 'x26-reopen-lateglobal',
    'x27-reopen-local-after-pin',
  ])('%s -Kdot -Txdot equals native', (name) => {
    expect(renderFormat(extra(name), 'xdot', 'dot')).toBe(read(`extra/native/${name}.dot.xdot`));
  });

  // Issue #262: native also prints the pinned `color=<value>` on the pinned
  // subgraph; every draw string (the colour each cluster is stroked in) agrees.
  it.each(['x24-reopen-pinned-mid', 'x28-reopen-update-pins'])('%s draws as native', (name) => {
    const draws = (text: string): string[] => [...text.matchAll(/_draw_="[^"]*"/g)].map((m) => m[0]);
    const native = draws(read(`extra/native/${name}.dot.xdot`));
    expect(native.length).toBeGreaterThan(3);
    expect(draws(renderFormat(extra(name), 'xdot', 'dot'))).toEqual(native);
  });
});

describe('an inherited graph attribute reaches layout as native reads it', () => {
  it.each(['plain', 'xdot', 'dot'])('repro -Kdot -T%s equals native', (fmt) => {
    expect(port('repro', fmt)).toBe(native('repro', fmt));
  });

  it('rankset -Kdot -Tdot equals native (`s` is a rank set through `rank`)', () => {
    expect(port('rankset', 'dot')).toBe(native('rankset', 'dot'));
  });

  it('refed-bb -Kdot -Tdot equals native (no inherited bb/lp echo)', () => {
    const out = port('refed-bb', 'dot');
    expect(out).toBe(native('refed-bb', 'dot'));
    // The unboxed `{rank=same}` prints its own attribute and nothing seeded.
    expect(out).toContain('\t{\n\t\tgraph [rank=same];\n');
  });
});
