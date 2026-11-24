// SPDX-License-Identifier: EPL-2.0
/**
 * A graph or subgraph name whose text starts with LOCALNAMEPREFIX is
 * anonymous (issue #194). `agmapnametoid` skips the string map for it, takes
 * an anonymous id and records name → id in the internal map, where a later use
 * of the name in the same parse finds it. `endgraph` drops those names when
 * the parse ends, so `agnameof` prints `%<id>`.
 *
 * Every native ref is the carried oracle's own output (ADR-0003), written by
 * the harness's `recapture.sh`: `-Kdot -Tjson` and `-Tcmapx` stdout per probe,
 * and the stderr of `neato-warn` (`-Kneato`) and `clusters` (`-Kdot`). What
 * each probe reaches is in the harness's `survey.md`.
 * @see lib/cgraph/id.c:agmapnametoid
 * @see lib/cgraph/imap.c:aginternalmaplookup
 * @see lib/cgraph/imap.c:aginternalmapclearlocalnames
 * @see lib/cgraph/grammar.y:endgraph
 * @see lib/cgraph/subg.c:agsubg
 */
import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderFormat } from '../../test/helpers/render-format.js';
import { agseterrf } from '../common/agerr.js';
import type { EngineName } from '../gvc/context.js';
import type { Graph } from '../model/graph.js';
import { parse } from './index.js';

const HARNESS_194 = new URL('../../plans/issue-194-percent-anon-names/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_194), 'utf8');
const source = (name: string): string => read(`probes/${name}.gv`);
const native = (name: string, suffix: string): string => read(`native/${name}.${suffix}`);

/** Out of scope: a `%` node name is issue #284. */
const OUT_OF_SCOPE_PREFIX = 'oos-';
const PROBE_COUNT = 22;
const PROBES = readdirSync(new URL('probes/', HARNESS_194))
  .filter((f) => f.endsWith('.gv') && !f.startsWith(OUT_OF_SCOPE_PREFIX))
  .map((f) => f.replace(/\.gv$/, ''))
  .sort();

interface JsonNames {
  readonly root: string;
  readonly subgraphs: readonly string[];
}

interface JsonGraph {
  readonly name: string;
  readonly _subgraph_cnt: number;
  readonly objects?: readonly { readonly name: string }[];
}

/** The root `name` and the subgraph names of a json output, in write_graph's order. */
const jsonNames = (text: string): JsonNames => {
  const o = JSON.parse(text) as JsonGraph;
  return { root: o.name, subgraphs: (o.objects ?? []).slice(0, o._subgraph_cnt).map((s) => s.name) };
};

/** Render `name` and return the output with every message the engine raised. */
const renderWithMessages = (
  name: string, format: string, engine: EngineName,
): { out: string; err: string } => {
  const messages: string[] = [];
  agseterrf((s) => { messages.push(s); return 0; });
  const out = renderFormat(parse(source(name)), format, engine);
  return { out, err: messages.join('') };
};

const subg = (g: Graph, ...path: string[]): Graph => {
  let cur = g;
  for (const name of path) {
    const next = cur.subgraphs.get(name);
    if (next === undefined) throw new Error(`no subgraph ${name}`);
    cur = next;
  }
  return cur;
};

afterEach(() => { agseterrf(null); });

describe('a graph name starting with LOCALNAMEPREFIX prints as native prints it', () => {
  it('reads every in-scope probe of the harness', () => {
    expect(PROBES).toHaveLength(PROBE_COUNT);
  });

  it.each(PROBES)('%s: json root and subgraph names', (name) => {
    agseterrf(() => 0);
    const got = jsonNames(renderFormat(parse(source(name)), 'json', 'dot'));
    expect(got).toEqual(jsonNames(native(name, 'dot.json')));
  });

  it.each(PROBES)('%s: cmapx', (name) => {
    agseterrf(() => 0);
    expect(renderFormat(parse(source(name)), 'cmapx', 'dot')).toBe(native(name, 'dot.cmapx'));
  });

  it('repro: the map and the json names are the anonymous ids', () => {
    expect(native('repro', 'dot.cmapx')).toBe('<map id="%1" name="%1">\n</map>\n');
    expect(jsonNames(native('repro', 'dot.json'))).toEqual({ root: '%1', subgraphs: ['%3', '%5'] });
  });
});

describe('messages name a local graph by its anonymous id', () => {
  it('neato-warn: both warnings name the root as native does', () => {
    const want = native('neato-warn', 'neato.err');
    expect(want).toContain('in graph %1 - ignored');
    expect(renderWithMessages('neato-warn', 'dot', 'neato').err).toBe(want);
  });

  // getCluster's `cluster named %c2 not found` is never printed by the port,
  // for any name: issue #285 owns that line.
  it('clusters: the alias warning names the second cluster by its id', () => {
    const NOT_FOUND = 'Warning: cluster named %c2 not found\n';
    const all = native('clusters', 'dot.err');
    expect(all).toContain(NOT_FOUND);
    const want = all.replace(NOT_FOUND, '');
    expect(want).toBe('Warning: Two clusters named %5 - the second will be ignored\n');
    expect(renderWithMessages('clusters', 'dot', 'dot').err).toBe(want);
  });
});

describe('the parser gives a local graph name an anonymous id', () => {
  it('stores a local root as a nameless root is stored', () => {
    const g = parse('digraph "%foo" {}');
    expect(g.anonymous).toBe(true);
    expect(g.name).toBe('');
  });

  it('stores an html-like local root the same way', () => {
    const g = parse('digraph <%foo> {}');
    expect(g.anonymous).toBe(true);
    expect(g.name).toBe('');
  });

  it('numbers a local subgraph from the shared anonymous counter', () => {
    expect([...parse(source('repro')).subgraphs.keys()]).toEqual(['%3', '%5']);
    expect([...parse(source('edges-between')).subgraphs.keys()]).toEqual(['%5', '%9']);
  });

  it('finds the recorded id when the name is used again in one parent', () => {
    const g = parse(source('reopen'));
    expect([...g.subgraphs.keys()]).toEqual(['%3', '%7']);
    expect([...subg(g, '%3').nodes.keys()]).toEqual(['a', 'b']);
  });

  it('makes one subgraph per parent under the one id', () => {
    const g = parse(source('two-parents'));
    expect([...subg(g, 'P').subgraphs.keys()]).toEqual(['%3']);
    expect([...subg(g, 'R').subgraphs.keys()]).toEqual(['%3']);
    expect(subg(g, 'P', '%3')).not.toBe(subg(g, 'R', '%3'));
    expect([...g.subgraphs.keys()]).toEqual(['P', 'R', '%5']);
  });

  it('nests a second subgraph of the same id under the first', () => {
    const g = parse(source('nested-same'));
    expect([...g.subgraphs.keys()]).toEqual(['%3', '%5']);
    expect([...subg(g, '%3').subgraphs.keys()]).toEqual(['%3']);
  });

  it('gives a subgraph that reuses the root name the root id', () => {
    expect([...parse(source('sub-as-root')).subgraphs.keys()]).toEqual(['%1', '%3']);
  });

  it('does not reopen an anonymous subgraph through a source name of its form', () => {
    const g = parse(source('collide'));
    expect([...g.subgraphs.keys()]).toEqual(['%3', '%5', '%7']);
    expect([...subg(g, '%3').nodes.keys()]).toEqual(['a']);
    expect([...subg(g, '%5').nodes.keys()]).toEqual(['b']);
  });

  it('keeps a text name and an html-like name apart', () => {
    expect([...parse(source('html-vs-text')).subgraphs.keys()]).toEqual(['%3', '%5', '%7']);
    expect([...parse(source('html-reopen')).subgraphs.keys()]).toEqual(['%3', '%5', '%7']);
  });

  // agopen maps the root name before the graph's string dictionary holds an
  // html ref, so an html-like root name is recorded as text.
  it('records an html-like root name as text', () => {
    expect([...parse(source('html-root-text-sub')).subgraphs.keys()]).toEqual(['%1', '%3']);
    expect([...parse(source('html-root-html-sub')).subgraphs.keys()]).toEqual(['%3', '%5']);
    expect([...parse(source('text-root-html-sub')).subgraphs.keys()]).toEqual(['%3', '%5']);
  });

  it('leaves a name with the prefix elsewhere, and an empty name, as names', () => {
    const infix = parse(source('ctl-infix'));
    expect(infix.name).toBe('foo%');
    expect(infix.anonymous).toBe(false);
    expect([...infix.subgraphs.keys()]).toEqual(['x%', '%1']);
    expect([...parse(source('ctl-empty')).subgraphs.keys()]).toEqual(['', '%1']);
  });
});
