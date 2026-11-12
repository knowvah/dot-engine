// SPDX-License-Identifier: EPL-2.0

/**
 * make_flat_adj_edges' `rank=source` subgraph (issue #130).
 *
 * C clones auxt into a subgraph `xxx` of the aux graph and sets `rank=source`
 * on it; auxh goes into the aux root. These tests watch the port's real aux
 * graph at the point where it is torn down (`cleanupCloneGraph`), which is
 * where the instrumented native build printed its trace, and pin the subgraph
 * and the aux ranks.
 *
 * @see lib/dotgen/dotsplines.c:make_flat_adj_edges (1177-1185)
 * @see lib/dotgen/rank.c:collapse_sets, minmax_edges, minmax_edges2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Graph } from '../../model/graph.js';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';

/** What one aux graph looked like just before cleanupCloneGraph cleared it. */
interface AuxSnapshot {
  subgraphs: string[];
  sourceRank: string | undefined;
  sourceMembers: string[];
  ranks: Record<string, number | undefined>;
  minset: string | undefined;
  minrank: number | undefined;
  maxrank: number | undefined;
  hasFlatEdges: boolean;
}

const SOURCE_SUBG = 'xxx';

const seen = vi.hoisted(() => ({ snapshots: [] as AuxSnapshot[] }));

vi.mock('./splines-clone.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./splines-clone.js')>();
  return {
    ...actual,
    cleanupCloneGraph: (auxg: Graph): void => {
      const subg = auxg.subgraphs.get(SOURCE_SUBG);
      const ranks: Record<string, number | undefined> = {};
      for (const n of auxg.nodes.values()) ranks[n.name] = n.info.rank;
      seen.snapshots.push({
        subgraphs: [...auxg.subgraphs.keys()],
        sourceRank: subg?.attrs.get('rank'),
        sourceMembers: subg === undefined ? [] : [...subg.nodes.keys()],
        ranks,
        minset: auxg.info.minset?.name,
        minrank: auxg.info.minrank,
        maxrank: auxg.info.maxrank,
        hasFlatEdges: auxg.info.has_flat_edges === true,
      });
      actual.cleanupCloneGraph(auxg);
    },
  };
});

/**
 * One native `I130` trace line: a make_flat_adj_edges call's aux ranks. Native
 * also printed GD_minset(auxg) = auxt and GD_minrank(auxg) = 0 on every line.
 */
interface NativeAux {
  auxt: string;
  auxtRank: number;
  auxh: string;
  auxhRank: number;
  maxrank: number;
  /** GD_has_flat_edges(auxg): set when ordered_edges adds a FLATORDER edge. */
  hasFlatEdges: boolean;
}

const SAME = '{rank=same; a; b}';
const W4_EDGES = 'a:n->b:n [constraint=false]; a:s->b:s [constraint=false]; '
  + 'a->b [constraint=false];';
const REV_EDGES = 'b:n -> a:n; b:s -> a:s;';
const LABEL_EDGES = 'a:n -> b:n [label=x]; a:s -> b:s [label=y];';

/**
 * The variants of the issue-130 brief, each with the aux ranks native 16.1.0
 * prints for it, one entry per make_flat_adj_edges call.
 *
 * Native values: an instrumented copy of the oracle's dot_layout plugin
 * (`fprintf` of agnameof/ND_rank of auxt and auxh, GD_minset, GD_minrank,
 * GD_maxrank and GD_has_flat_edges of auxg, just before cleanupCloneGraph),
 * run by the unmodified 16.1.0 `dot -Tdot`.
 * One `I130` line per call; every variant makes one call. The plugin without
 * the trace renders every variant byte-identically to the oracle.
 */
const A_THEN_B: NativeAux = {
  auxt: 'a', auxtRank: 0, auxh: 'b', auxhRank: 1, maxrank: 1, hasFlatEdges: false,
};
const B_THEN_A: NativeAux = { ...A_THEN_B, auxt: 'b', auxh: 'a' };
// edgelabel_ranks doubles the aux minlen, so the labelled edge spans two ranks.
const A_THEN_B_LABEL: NativeAux = { ...A_THEN_B, auxhRank: 2, maxrank: 2 };
// A node `ordering` makes ordered_edges add FLATORDER edges between the label
// vnodes. C's ordered_edges recurses into `xxx`, so for auxt it calls
// flat_edge(xxx, ...), which flags dot_root(xxx) = auxg as well.
const A_THEN_B_ORDERED: NativeAux = { ...A_THEN_B_LABEL, hasFlatEdges: true };

const VARIANTS: ReadonlyArray<{ name: string; src: string; native: NativeAux[] }> = [
  { name: 'V1 w4', src: `digraph { ${SAME} ${W4_EDGES} }`, native: [A_THEN_B] },
  // Under rankdir=LR the rank order is reversed, so e0 is the forward copy
  // b->a and the GD_flip SWAP hands `a` back to auxt.
  { name: 'V2 w4-lr', src: `digraph { rankdir=LR; ${SAME} ${W4_EDGES} }`, native: [A_THEN_B] },
  {
    name: 'V3 pt30',
    src: 'digraph { {rank=same; a; b;} a -> b; a:e -> b:w; }',
    native: [A_THEN_B],
  },
  { name: 'V4 allports', src: `digraph { ${SAME} a:n -> b:n; a:s -> b:s; }`, native: [A_THEN_B] },
  { name: 'V5 label', src: `digraph { ${SAME} a:e -> b:w [label=x]; }`, native: [A_THEN_B_LABEL] },
  { name: 'V6 back', src: `digraph { ${SAME} a:n -> b:n; b:s -> a:s; }`, native: [A_THEN_B] },
  {
    name: 'V7 newrank',
    src: `digraph { newrank=true; ${SAME} a:n -> b:n; a:s -> b:s; }`,
    native: [A_THEN_B],
  },
  { name: 'V8 rev', src: `digraph { ${SAME} ${REV_EDGES} }`, native: [B_THEN_A] },
  { name: 'V9 rev-lr', src: `digraph { rankdir=LR; ${SAME} ${REV_EDGES} }`, native: [B_THEN_A] },
  {
    name: 'V10 auxt-ordering',
    src: `digraph { a [ordering=out]; ${SAME} ${LABEL_EDGES} }`,
    native: [A_THEN_B_ORDERED],
  },
  {
    name: 'V11 auxh-ordering',
    src: `digraph { b [ordering=in]; ${SAME} ${LABEL_EDGES} a -> b; }`,
    native: [A_THEN_B_ORDERED],
  },
];

describe('make_flat_adj_edges aux graph: the rank=source subgraph', () => {
  beforeEach(() => { seen.snapshots.length = 0; });

  it.each(VARIANTS)('$name: auxt alone is in xxx, and xxx has rank=source', ({ src, native }) => {
    render(parse(src), 'dot');
    expect(seen.snapshots.map((s) => s.subgraphs)).toEqual(native.map(() => [SOURCE_SUBG]));
    expect(seen.snapshots.map((s) => s.sourceRank)).toEqual(native.map(() => 'source'));
    expect(seen.snapshots.map((s) => s.sourceMembers)).toEqual(native.map((c) => [c.auxt]));
  });

  it.each(VARIANTS)('$name: auxt leads the aux minset (collapse_sets)', ({ src, native }) => {
    render(parse(src), 'dot');
    expect(seen.snapshots.map((s) => ({ minset: s.minset, minrank: s.minrank })))
      .toEqual(native.map((c) => ({ minset: c.auxt, minrank: 0 })));
  });

  it.each(VARIANTS)('$name: aux ranks equal native, call for call', ({ src, native }) => {
    render(parse(src), 'dot');
    const port = seen.snapshots.map((s, i) => ({
      auxtRank: s.ranks[native[i]?.auxt ?? ''],
      auxhRank: s.ranks[native[i]?.auxh ?? ''],
      nodes: Object.keys(s.ranks).sort(),
      maxrank: s.maxrank,
    }));
    expect(port).toEqual(native.map((c) => ({
      auxtRank: c.auxtRank,
      auxhRank: c.auxhRank,
      nodes: [c.auxt, c.auxh].sort(),
      maxrank: c.maxrank,
    })));
  });

  it.each(VARIANTS)('$name: the aux root has native\'s flat-edge flag', ({ src, native }) => {
    render(parse(src), 'dot');
    expect(seen.snapshots.map((s) => s.hasFlatEdges)).toEqual(native.map((c) => c.hasFlatEdges));
  });
});
