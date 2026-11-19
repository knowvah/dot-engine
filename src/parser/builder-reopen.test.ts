// SPDX-License-Identifier: EPL-2.0
/**
 * A re-opened named subgraph is the subgraph the parent already holds:
 * `agsubg` finds it by name among the parent's own subgraphs and returns it,
 * so the second body adds to it, and the attribute values it copied when it
 * first opened stay as they were. An edge statement expands a subgraph
 * endpoint to the nodes the subgraph holds once the whole statement is
 * parsed.
 *
 * Every native ref is graphviz 16.1.1's own stdout, captured 2026-11-18:
 * `~/git/graphviz-16.1.1/build/cmd/dot/dot -Kdot -Tdot probes/<probe>.gv`
 * with `GVBINDIR=/tmp/ghl1611`. What each probe reaches is in the harness's
 * `survey.md`.
 * @see lib/cgraph/subg.c:agsubg
 * @see lib/cgraph/grammar.y:opensubg
 * @see lib/cgraph/grammar.y:endedge
 */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderFormat } from '../../test/helpers/render-format.js';
import { agseterrf } from '../common/agerr.js';
import type { Graph } from '../model/graph.js';
import { parse } from './index.js';

const HARNESS_258 = new URL('../../plans/issue-258-reopened-subgraph/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_258), 'utf8');
const probe = (name: string): Graph => parse(read(`probes/${name}.gv`));
const portDot = (dir: string, name: string): string =>
  renderFormat(parse(read(`${dir}probes/${name}.gv`)), 'dot', 'dot');
const nativeDot = (dir: string, name: string): string => read(`${dir}native/${name}.dot.dot`);
const EXTRA_DIR = 'extra/';

/** Probes whose `-Kdot -Tdot` output equals native's byte for byte. */
const BYTE_EQUAL_PROBES = [
  'reopen1', 'reopen2', 'reopen4', 'reopen6', 'reopen7', 'reopen8', 'reopen9', 'reopen11',
  'reopen13', 'reopen14', 'reopen15',
] as const;
/**
 * Probes one line short of native: `-Tdot` does not print a non-empty pin
 * from `unviewsubgraphsattr` (`graph [cluster=false]`, `color=red`,
 * `label=L`), which reproduces with no re-open. Issue #262 owns that line;
 * its fix makes these four byte-equal and moves them to the list above.
 */
const PIN_LINE_PROBES = ['reopen3', 'reopen5', 'reopen10', 'reopen12'] as const;
/**
 * `extra/probes/`: paths the fifteen do not reach (a re-open as an edge's
 * head, node and edge defaults carried across bodies, a strict graph, a
 * three-endpoint chain, `rank=same`, a cluster with edges between its
 * bodies, a root default set between them, an edge attribute list, a nested
 * re-open against a same-named sibling, a re-open between anonymous
 * subgraphs). All byte-equal to native under dot.
 */
const EXTRA_PROBES = [
  'extra1', 'extra2', 'extra3', 'extra4', 'extra5', 'extra6', 'extra7', 'extra8', 'extra9',
  'extra10', 'extra11',
] as const;

const subg = (g: Graph, ...path: string[]): Graph => {
  let cur = g;
  for (const name of path) {
    const next = cur.subgraphs.get(name);
    if (next === undefined) throw new Error(`no subgraph ${name} in ${cur.name}`);
    cur = next;
  }
  return cur;
};
const nodeNames = (g: Graph): string[] => [...g.nodes.keys()];
const edgeNames = (g: Graph): string[] => g.edges.map((e) => `${e.tail.name}--${e.head.name}`);
const matches = (text: string, re: RegExp): string[] => [...text.matchAll(re)].map((m) => m[0]);

// Probes whose clusters are empty of rank constraints can warn; keep stderr quiet.
beforeEach(() => { agseterrf(() => 0); });
afterEach(() => { agseterrf(null); });

describe('a re-opened named subgraph is the existing one (agsubg)', () => {
  it('holds the nodes of both bodies and keeps its first-open attribute values', () => {
    // graph G { subgraph p { a } cluster=true; subgraph p { b } }
    const g = probe('reopen1');
    const p = subg(g, 'p');
    expect([...g.subgraphs.keys()]).toEqual(['p']);
    expect(nodeNames(p)).toEqual(['a', 'b']);
    expect(nodeNames(g)).toEqual(['a', 'b']);
    // `cluster=true` was set on the root after `p` opened: it never reaches `p`.
    expect(p.attrs.has('cluster')).toBe(false);
    expect(p.graphDefaultsSnapshot?.has('cluster')).toBe(false);
  });

  it('re-opens a nested subgraph inside the re-opened parent', () => {
    // graph G { subgraph p { subgraph q {a} } subgraph p { subgraph q {b} } }
    const g = probe('reopen8');
    const p = subg(g, 'p');
    expect([...p.subgraphs.keys()]).toEqual(['q']);
    expect(nodeNames(subg(p, 'q'))).toEqual(['a', 'b']);
    expect(nodeNames(p)).toEqual(['a', 'b']);
  });

  it('keeps a same name under another parent as a separate subgraph', () => {
    // graph G { subgraph p { a } subgraph x { subgraph p { b } } }
    const g = probe('reopen13');
    expect(nodeNames(subg(g, 'p'))).toEqual(['a']);
    expect(nodeNames(subg(g, 'x', 'p'))).toEqual(['b']);
    expect(subg(g, 'p')).not.toBe(subg(g, 'x', 'p'));
  });

  it('makes a key the second body declares a local one, no longer seeded', () => {
    // graph G { label=L; subgraph cluster_p { a } subgraph cluster_p { label=M; b } }
    const p = subg(probe('reopen14'), 'cluster_p');
    expect(p.attrs.get('label')).toBe('M');
    expect(p.seededAttrs?.has('label')).toBe(false);
  });

  it('applies the first body\'s node and edge defaults in a later body', () => {
    const nodes = parse('graph G { subgraph p { node [color=red]; a } subgraph p { b } }');
    expect(nodes.nodes.get('b')?.nodeDefaultsSnapshot?.get('color')).toBe('red');
    const edges = parse(
      'graph G { subgraph p { a } subgraph p { edge [color=red]; a -- b } subgraph p { b -- c } }',
    );
    expect(edges.edges.map((e) => e.attrs.get('color'))).toEqual(['red', 'red']);
    expect(edgeNames(subg(edges, 'p'))).toEqual(['a--b', 'b--c']);
  });

  it('takes no anonymous id, so later anonymous siblings keep cgraph\'s names', () => {
    const g = parse('graph G { subgraph p { a } subgraph { b } subgraph p { c } subgraph { d } }');
    expect([...g.subgraphs.keys()]).toEqual(['p', '%1', '%3']);
    expect([...g.subgraphs.values()].map((sg) => sg.seq)).toEqual([1, 2, 3]);
  });

  it('keeps a seeded key the second body does not declare', () => {
    // graph G { label=L; subgraph cluster_p { a } label=M; subgraph cluster_p { b } }
    const p = subg(probe('reopen12'), 'cluster_p');
    expect(p.attrs.get('label')).toBe('L');
    expect(p.seededAttrs?.has('label')).toBe(true);
  });
});

describe('a subgraph endpoint expands to its nodes after the statement (endedge)', () => {
  it('reaches the nodes of an earlier body', () => {
    // graph G { subgraph p {a} subgraph p {b} -- c }
    expect(edgeNames(probe('reopen6'))).toEqual(['a--c', 'b--c']);
  });

  it('reaches the nodes a later endpoint of the same statement adds', () => {
    // graph G { subgraph p {a} subgraph p {b} -- subgraph p {c} }
    expect(edgeNames(probe('reopen15'))).toEqual([
      'a--a', 'a--b', 'a--c', 'b--a', 'b--b', 'b--c', 'c--a', 'c--b', 'c--c',
    ]);
  });

  it('reaches them from a head endpoint and across a three-endpoint chain', () => {
    expect(edgeNames(parse('graph G { a -- subgraph p {b}; c -- subgraph p {d} }')))
      .toEqual(['a--b', 'c--b', 'c--d']);
    const chain = parse('graph G { subgraph p { a } -- subgraph p { b } -- subgraph p { c } }');
    expect(chain.edges).toHaveLength(18);
  });

  it('makes one edge per pair on a strict graph', () => {
    const g = parse('strict graph G { subgraph p {a} subgraph p {b} -- subgraph p {a} }');
    expect(edgeNames(g)).toEqual(['a--a', 'a--b', 'b--b']);
  });

  it('walks the members in sequence order, not written order', () => {
    const g = parse('digraph G { b; a; t -> subgraph s { a; b } }');
    expect(edgeNames(g)).toEqual(['t--b', 't--a']);
  });
});

describe('-Kdot -Tdot of the re-open probes equals native 16.1.1', () => {
  it.each(BYTE_EQUAL_PROBES)('%s', (name) => {
    expect(portDot('', name)).toBe(nativeDot('', name));
  });

  it.each(EXTRA_PROBES)('%s', (name) => {
    expect(portDot(EXTRA_DIR, name)).toBe(nativeDot(EXTRA_DIR, name));
  });

  // Issue #262: one pinned `key=value` line short of native; the layout agrees.
  it.each(PIN_LINE_PROBES)('%s has native\'s positions, subgraphs and root bb', (name) => {
    const port = portDot('', name);
    const native = nativeDot('', name);
    const positions = matches(native, /pos="[^"]*"/g);
    const subgraphs = matches(native, /subgraph \S+ \{/g);
    const rootBb = matches(native, /bb="[^"]*"/g)[0];
    expect(positions.length).toBeGreaterThan(0);
    expect(matches(port, /pos="[^"]*"/g)).toEqual(positions);
    expect(matches(port, /subgraph \S+ \{/g)).toEqual(subgraphs);
    expect(matches(port, /bb="[^"]*"/g)[0]).toBe(rootBb);
  });
});
