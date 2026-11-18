// SPDX-License-Identifier: EPL-2.0
/**
 * `Two clusters named <s> - the second will be ignored`: fillMap's warning,
 * reached from fdp's processClusterEdges (every fdp layout) and from
 * dot_compoundEdges (dot with `compound=true`, once per pack component).
 *
 * Provenance of the render cases: native graphviz 16.1.1
 * (`~/git/graphviz-16.1.1/build/cmd/dot/dot -K<engine> -Tdot <probe>`,
 * `GVBINDIR=/tmp/ghl1611` for dot and `/tmp/ghl1611-all` for the other
 * engines), stderr captured 2026-11-17 into
 * `plans/issue-182-dup-cluster-warn/harness/native/<probe>.<engine>.err`.
 * Native is never run at test time: its fdp segfaults on some runs of these
 * inputs, after the warnings are written.
 *
 * @see lib/common/utils.c:fillMap
 * @see lib/common/utils.c:mkClustMap
 * @see lib/cgraph/id.c:agnameof
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EngineName } from '../gvc/context.js';
import { agsubg } from '../model/cgraph-ops.js';
import { Graph } from '../model/graph.js';
import { parse } from '../parser/index.js';
import { render } from '../render/index.js';
import { agseterrf } from './agerr.js';
import { mkClustMap } from './clust-map.js';

const HARNESS_182 = new URL('../../plans/issue-182-dup-cluster-warn/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_182), 'utf8');

const PROBES = [
  'anon', 'dup', 'dup3', 'dup3c', 'dupc', 'edgec', 'nodup', 'packc', 'packc2', 'packc3',
] as const;
const ENGINES: readonly EngineName[] = [
  'dot', 'neato', 'fdp', 'circo', 'twopi', 'osage', 'sfdp', 'patchwork',
];
const TWO_CLUSTERS = (name: string): string =>
  `Warning: Two clusters named ${name} - the second will be ignored\n`;

/**
 * Native lines the port does not print yet, by `<probe>.<engine>`; each is
 * another warning's own issue, and goes from this table when that issue lands.
 */
const NOT_YET_PORTED: Readonly<Record<string, string>> = {
  // dot's makeCompoundEdge warnings: issue #217.
  'dup3c.dot': 'Warning: a -> b: head not inside head cluster cluster_x\n',
  // fdp's checkCompound warnings: issue #255.
  'edgec.fdp': 'Warning: tail node a inside head cluster cluster_x\n',
};

/** Everything written through agerr while `fn` runs, as stderr text. */
function stderrOf(fn: () => void): string {
  const pieces: string[] = [];
  agseterrf((s) => { pieces.push(s); return 0; });
  fn();
  return pieces.join('');
}

/** The console is the port's other stderr; nothing may bypass agerr here. */
function watchConsole(): { calls: () => number } {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  return { calls: () => warn.mock.calls.length + error.mock.calls.length };
}

/** Add cluster `name` under `parent`, as mkClusters records it (0-based clust). */
function addCluster(parent: Graph, name: string): Graph {
  const cl = agsubg(parent, name, true)!;
  const clust = parent.info.clust ?? [];
  clust.push(cl);
  parent.info.clust = clust;
  parent.info.n_cluster = clust.length;
  return cl;
}

afterEach(() => {
  agseterrf(null);
  vi.restoreAllMocks();
});

describe('fillMap warning: port stderr equals native 16.1.1 (-Tdot)', () => {
  const cases = PROBES.flatMap((p) => ENGINES.map((e) => [p, e] as const));

  it.each(cases)('%s -K%s', (probe, engine) => {
    const key = `${probe}.${engine}`;
    const native = read(`native/${key}.err`);
    const skipped = NOT_YET_PORTED[key];
    if (skipped !== undefined) expect(native).toContain(skipped);
    const expected = skipped === undefined ? native : native.replace(skipped, '');
    const con = watchConsole();
    const g = parse(read(`probes/${probe}.gv`));
    const err = stderrOf(() => { render(g, 'dot', { engine }); });
    expect(err).toBe(expected);
    expect(con.calls()).toBe(0);
  });

  it('dup -Kfdp warns exactly once; -Kdot (no compound) is silent', () => {
    const src = read('probes/dup.gv');
    expect(stderrOf(() => { render(parse(src), 'dot', { engine: 'fdp' }); }))
      .toBe(TWO_CLUSTERS('cluster_x'));
    expect(stderrOf(() => { render(parse(src), 'dot', { engine: 'dot' }); })).toBe('');
  });

  it('anon -Kfdp warns for %7 then %13, never for %3', () => {
    const err = stderrOf(() => { render(parse(read('probes/anon.gv')), 'dot', { engine: 'fdp' }); });
    expect(err).toBe(TWO_CLUSTERS('%7') + TWO_CLUSTERS('%13'));
  });
});

describe('mkClustMap', () => {
  it('no clusters: an empty map and no warning', () => {
    const g = new Graph('G', 'directed');
    let map = new Map<string, Graph>([['stale', g]]);
    const err = stderrOf(() => { map = mkClustMap(g); });
    expect(map.size).toBe(0);
    expect(err).toBe('');
  });

  it('a named duplicate warns once and the map keeps the first', () => {
    const g = new Graph('G', 'directed');
    const first = addCluster(addCluster(g, 'cluster_a'), 'cluster_x');
    const second = addCluster(addCluster(g, 'cluster_b'), 'cluster_x');
    let map = new Map<string, Graph>();
    const err = stderrOf(() => { map = mkClustMap(g); });
    expect(err).toBe(TWO_CLUSTERS('cluster_x'));
    expect(map.get('cluster_x')).toBe(first);
    expect(map.get('cluster_x')).not.toBe(second);
    expect([...map.keys()]).toEqual(['cluster_a', 'cluster_x', 'cluster_b']);
  });

  it('warns in preorder over a three-level tree, a cluster before its children', () => {
    // G { a { x { a } }  b { x  y { b } }  y }: preorder is
    // a, a/x, a/x/a, b, b/x, b/y, b/y/b, y.
    const g = new Graph('G', 'directed');
    const a = addCluster(g, 'a');
    const ax = addCluster(a, 'x');
    const axa = addCluster(ax, 'a');
    const b = addCluster(g, 'b');
    const bx = addCluster(b, 'x');
    const by = addCluster(b, 'y');
    const byb = addCluster(by, 'b');
    const y = addCluster(g, 'y');
    let map = new Map<string, Graph>();
    const err = stderrOf(() => { map = mkClustMap(g); });
    expect(err).toBe(TWO_CLUSTERS('a') + TWO_CLUSTERS('x') + TWO_CLUSTERS('b') + TWO_CLUSTERS('y'));
    expect([...map.entries()]).toEqual([['a', a], ['x', ax], ['b', b], ['y', by]]);
    for (const ignored of [axa, bx, byb, y]) expect([...map.values()]).not.toContain(ignored);
  });

  it('every anonymous cluster after the first warns (agnameof\'s one buffer)', () => {
    const g = new Graph('G', 'directed');
    const first = addCluster(g, '%3');
    addCluster(g, '%7');
    addCluster(g, '%13');
    let map = new Map<string, Graph>();
    const err = stderrOf(() => { map = mkClustMap(g); });
    expect(err).toBe(TWO_CLUSTERS('%7') + TWO_CLUSTERS('%13'));
    expect([...map.entries()]).toEqual([['%3', first]]);
  });

  it('an anonymous cluster nested under a named one still aliases the first', () => {
    const g = new Graph('G', 'directed');
    const first = addCluster(g, '%3');
    const named = addCluster(g, 'cluster_a');
    addCluster(named, '%9');
    let map = new Map<string, Graph>();
    const err = stderrOf(() => { map = mkClustMap(g); });
    expect(err).toBe(TWO_CLUSTERS('%9'));
    expect([...map.entries()]).toEqual([['%3', first], ['cluster_a', named]]);
  });

  it('a named cluster after an anonymous one does not warn', () => {
    const g = new Graph('G', 'directed');
    const anon = addCluster(g, '%3');
    const named = addCluster(g, 'cluster_a');
    let map = new Map<string, Graph>();
    const err = stderrOf(() => { map = mkClustMap(g); });
    expect(err).toBe('');
    expect([...map.entries()]).toEqual([['%3', anon], ['cluster_a', named]]);
  });
});
