// SPDX-License-Identifier: EPL-2.0

/**
 * RC1 regression: flat-reorder must use windowed rank access (rankGet/rankSet),
 * not raw `rk.v[i]`. For a cluster rank, C's `GD_rank(g)[r].v` is the parent's
 * rank array offset by the cluster's `vStart`; reading raw `rk.v[i]` grabbed the
 * wrong nodes, left rank members out of `temprank`, undercounted it, and crashed
 * with "Cannot read properties of undefined (reading 'info')".
 *
 * tests/121.dot, tests/258.dot, tests/2239.dot are cluster graphs with
 * rank=same constraining flat edges inside each cluster (vStart > 0).
 *
 * @see lib/dotgen/mincross.c:flat_reorder (GD_rank(g)[r].v[i] is windowed)
 * @see plans/errored-cluster/batch-2/T2-flatreorder.md
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../parser/index.js';
import { dotLayoutEntry } from './index.js';
import type { Graph } from '../../model/graph.js';

// 121.dot: two clusters, each with a rank=same constraining flat edge.
const DOT_121 = `digraph G {
  subgraph cluster_G1 { { rank=same; A -> B; } C -> A; }
  subgraph cluster_G2 { { rank=same; D -> E; } F -> E; }
  B -> D [ constraint=none ];
  B -> D [ constraint=none ];
}`;

// 258.dot: same shape with a single cross edge.
const DOT_258 = `digraph G {
  subgraph cluster_G1 { { rank=same; A -> B; } C -> A; }
  subgraph cluster_G2 { { rank=same; D -> E; } F -> E; }
  B -> D [ constraint=none ];
}`;

function layoutOf(src: string): Graph {
  const g = parse(src);
  dotLayoutEntry(g);
  return g;
}

function orderOf(g: Graph, name: string): number {
  const n = g.nodes.get(name);
  if (!n) throw new Error(`node ${name} missing`);
  return n.info.order ?? -1;
}

describe('flatReorderRank — windowed cluster rank access (RC1)', () => {
  it('lays out 121.dot without crashing (was undefined-info throw)', () => {
    expect(() => layoutOf(DOT_121)).not.toThrow();
  });

  it('lays out 258.dot without crashing', () => {
    expect(() => layoutOf(DOT_258)).not.toThrow();
  });

  it('keeps mincross order on the constrained rank, as native 16.1.1: B before A in cluster_G1', () => {
    // A -> B is a constraining flat edge inside cluster_G1. Graphviz 16.1.1's
    // valid_rank (upstream 9fb21f570, issue #158) makes flat_reorder leave
    // such a rank as mincross ordered it, which here is B left of A; 16.1.0
    // re-sorted it to A before B. Native 16.1.1 `-Tplain` on tests/121.dot:
    //   node A 1.5972 0.47222 0.75 0.5 A solid ellipse black lightgrey
    //   node B 0.59722 0.47222 0.75 0.5 B solid ellipse black lightgrey
    // The windowing bug placed a virtual node in A's slot, so the orders must
    // still be real ones.
    const g = layoutOf(DOT_121);
    const a = orderOf(g, 'A');
    const b = orderOf(g, 'B');
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(a);
  });
});
