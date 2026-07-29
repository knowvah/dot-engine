// SPDX-License-Identifier: EPL-2.0
/**
 * T4a — branch-coverage tests for layout/dot/cluster-path.ts.
 *
 * Mixed mode (D1): pure leaf helpers (portsEqSimple) are unit-tested against
 * `{ info: {...} } as unknown as Edge` fakes; the slot/chain-building
 * functions (cloneVn, mapPath* family, safeOtherEdge, mapInterclustNode) are
 * driven directly with small hand-built Graph/Node/Edge fixtures wired via
 * fastgr.ts helpers — the same wiring the dotgen pipeline uses before
 * calling into cluster-path.ts. Each test targets one specific uncovered
 * branch outcome listed in plans/coverage-90/batch-4/T4a.md.
 *
 * @see lib/dotgen/cluster.c
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import type { RankEntry } from '../../model/rankEntry.js';
import { fastEdge, findFastEdge, NORMAL, VIRTUAL } from './fastgr.js';
import {
  mapInterclustNode, cloneVn, safeOtherEdge, portsEqSimple,
  mapPathAdjacentMulti, mapPathAdjacentSingle, mapPathLongSingle,
  mapPathMultiEdge, mapPath,
} from './cluster-path.js';

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function makeRankEntry(v: Node[] = []): RankEntry {
  return {
    n: v.length, v: [...v], an: v.length, av: [...v],
    ht1: 0, ht2: 0, pht1: 0, pht2: 0,
    candidate: false, valid: false, cache_nc: 0,
  };
}

// ---------------------------------------------------------------------------
// mapInterclustNode  @see cluster.c:map_interclust_node — L32 (n.rank ?? 0)
// ---------------------------------------------------------------------------

describe('mapInterclustNode — rank ?? 0 default (calloc-zero hazard)', () => {
  it('reads rankleader[0] when n.info.rank is unset', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    const leader = new Node(1, 'leader', g);
    const clust = new Graph('c', 'directed');
    clust.info.expanded = false;
    clust.info.rankleader = [leader];
    n.info.clust = clust;
    // n.info.rank intentionally left undefined.
    expect(mapInterclustNode(n)).toBe(leader);
  });
});

// ---------------------------------------------------------------------------
// cloneVn  @see cluster.c:clone_vn — entire function was uncovered (L74-82)
// ---------------------------------------------------------------------------

describe('cloneVn — rank/order ?? 0 defaults, both sides', () => {
  it('clones at rank+order using explicitly defined rank/order/lw/rw', () => {
    const g = new Graph('g', 'directed');
    const vn = new Node(0, 'vn', g);
    vn.info.rank = 2;
    vn.info.order = 1;
    vn.info.lw = 5;
    vn.info.rw = 7;
    g.info.rank = [];
    g.info.rank[2] = makeRankEntry([vn]);
    const rv = cloneVn(g, vn);
    expect(rv.info.rank).toBe(2);
    expect(rv.info.order).toBe(2);
    expect(rv.info.lw).toBe(5);
    expect(rv.info.rw).toBe(7);
    expect(g.info.rank[2].v[2]).toBe(rv);
    expect(g.info.rank[2].n).toBe(2);
  });

  it('defaults rank to 0 and order to 1 when both unset', () => {
    const g = new Graph('g', 'directed');
    const vn = new Node(0, 'vn', g);
    // vn.info.rank and vn.info.order intentionally left undefined.
    g.info.rank = [makeRankEntry([vn])];
    const rv = cloneVn(g, vn);
    expect(rv.info.rank).toBe(0);
    expect(rv.info.order).toBe(1);
    expect(g.info.rank[0].v[1]).toBe(rv);
  });
});

// ---------------------------------------------------------------------------
// safeOtherEdge  @see cluster.c:safe_other_edge — L91 if [0] (fresh list)
// ---------------------------------------------------------------------------

describe('safeOtherEdge — lazily creates tail.info.other', () => {
  it('creates a fresh other-list when e.tail.info.other is unset', () => {
    const g = new Graph('g', 'directed');
    const tail = new Node(0, 't', g);
    const head = new Node(1, 'h', g);
    const e = new Edge(tail, head, '');
    expect(tail.info.other).toBeUndefined();
    safeOtherEdge(e);
    expect(tail.info.other).toEqual({ list: [e], size: 1 });
  });
});

// ---------------------------------------------------------------------------
// portsEqSimple  @see cluster.c:ports_eq — L107 chained && (8-way)
// ---------------------------------------------------------------------------

function edgeWithPorts(
  headDefined: boolean, headX: number, headY: number,
  tailDefined: boolean, tailX: number, tailY: number,
): Edge {
  return {
    info: {
      head_port: { defined: headDefined, p: { x: headX, y: headY } },
      tail_port: { defined: tailDefined, p: { x: tailX, y: tailY } },
    },
  } as unknown as Edge;
}

describe('portsEqSimple — every operand of the chained && comparison', () => {
  it('both undefined ports on both edges: short-circuits true', () => {
    const orig = edgeWithPorts(false, 0, 0, false, 0, 0);
    const e = edgeWithPorts(false, 9, 9, false, 9, 9);
    expect(portsEqSimple(orig, e)).toBe(true);
  });
  it('head defined-flags differ: false at the first operand', () => {
    const orig = edgeWithPorts(true, 1, 1, false, 0, 0);
    const e = edgeWithPorts(false, 1, 1, false, 0, 0);
    expect(portsEqSimple(orig, e)).toBe(false);
  });
  it('tail defined-flags differ: false at the second operand', () => {
    const orig = edgeWithPorts(false, 0, 0, true, 1, 1);
    const e = edgeWithPorts(false, 0, 0, false, 1, 1);
    expect(portsEqSimple(orig, e)).toBe(false);
  });
  it('head ports both defined and equal coords: continues to true', () => {
    const orig = edgeWithPorts(true, 3, 4, false, 0, 0);
    const e = edgeWithPorts(true, 3, 4, false, 0, 0);
    expect(portsEqSimple(orig, e)).toBe(true);
  });
  it('head ports both defined but coords differ: false', () => {
    const orig = edgeWithPorts(true, 3, 4, false, 0, 0);
    const e = edgeWithPorts(true, 3, 5, false, 0, 0);
    expect(portsEqSimple(orig, e)).toBe(false);
  });
  it('tail ports both defined and equal coords: true (all operands pass)', () => {
    const orig = edgeWithPorts(false, 0, 0, true, 6, 7);
    const e = edgeWithPorts(false, 0, 0, true, 6, 7);
    expect(portsEqSimple(orig, e)).toBe(true);
  });
  it('tail ports both defined but coords differ: false at the last operand', () => {
    const orig = edgeWithPorts(false, 0, 0, true, 6, 7);
    const e = edgeWithPorts(false, 0, 0, true, 6, 8);
    expect(portsEqSimple(orig, e)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mapPathAdjacentSingle  @see cluster.c:map_path — L133/L134/L140
// ---------------------------------------------------------------------------

describe('mapPathAdjacentSingle — existing-edge merge branch', () => {
  it('merges into an existing fast edge, defaults count via ??, NORMAL both', () => {
    const g = new Graph('g', 'directed');
    const from = new Node(0, 'from', g);
    const to = new Node(1, 'to', g);
    from.info.node_type = NORMAL;
    to.info.node_type = NORMAL;
    const existing = new Edge(from, to, '');
    fastEdge(existing);
    // existing.info.count left undefined -> exercises the ?? 1 default.
    const orig = new Edge(from, to, '');
    const ve = new Edge(from, to, '');
    mapPathAdjacentSingle(from, to, orig, ve, 42);
    expect(orig.info.to_virt).toBe(existing);
    expect(existing.info.edge_type).toBe(42);
    expect(existing.info.count).toBe(2);
    expect(from.info.other?.list[0]).toBe(orig);
  });
});

describe('mapPathAdjacentSingle — no existing fast edge (else branch)', () => {
  it('creates a new virtual edge, defaults ve.info.count via ??', () => {
    const g = new Graph('g', 'directed');
    const from = new Node(0, 'from', g);
    const to = new Node(1, 'to', g);
    const orig = new Edge(from, to, '');
    const ve = new Edge(from, to, '');
    // ve.info.count left undefined -> exercises the ?? 1 default.
    mapPathAdjacentSingle(from, to, orig, ve, 7);
    expect(ve.info.count).toBe(0);
    const created = findFastEdge(from, to);
    expect(created?.info.edge_type).toBe(7);
    // virtualEdge's copyVirtualEdgeInfo re-links orig.info.to_virt to the
    // freshly created edge (orig.info.to_virt was undefined at that point).
    expect(orig.info.to_virt).toBe(created);
  });
});

// ---------------------------------------------------------------------------
// mapPathLongSingle  @see cluster.c:map_path — L154 while (rank ?? 0) x2
// ---------------------------------------------------------------------------

describe('mapPathLongSingle — while-condition rank ?? 0 defaults, both sides', () => {
  it('skips the walk loop when e.head.rank and to.rank are both unset', () => {
    const g = new Graph('g', 'directed');
    const from = new Node(0, 'from', g);
    const mid = new Node(1, 'mid', g);
    const to = new Node(2, 'to', g);
    // mid.info.rank and to.info.rank intentionally left undefined.
    const ve = new Edge(from, mid, ''); // ve.tail === from -> the `e = ve` branch
    const orig = new Edge(from, to, '');
    mapPathLongSingle(from, to, orig, ve, 3);
    const created = findFastEdge(from, to);
    expect(created?.info.edge_type).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// mapPathMultiEdge  @see cluster.c:map_path — L167/L168/L172
// ---------------------------------------------------------------------------

describe('mapPathMultiEdge — span===1 existing-edge merge branch', () => {
  it('merges via mergeOneway when span is 1 and NORMAL nodes match', () => {
    const g = new Graph('g', 'directed');
    const from = new Node(0, 'from', g);
    const to = new Node(1, 'to', g);
    from.info.rank = 0;
    to.info.rank = 1; // span === 1
    from.info.node_type = NORMAL;
    to.info.node_type = NORMAL;
    const ex = new Edge(from, to, '');
    fastEdge(ex);
    const orig = new Edge(from, to, '');
    const ve = new Edge(from, to, '');
    mapPathMultiEdge(from, to, orig, ve, 9);
    expect(orig.info.to_virt).toBe(ex);
    expect(from.info.other?.list[0]).toBe(orig);
  });
});

describe('mapPathMultiEdge — span !== 1 falls through to the adjacent-multi walk', () => {
  it('defaults both ranks via ?? and takes the false branch of span===1', () => {
    const g = new Graph('g', 'directed');
    const from = new Node(0, 'from', g);
    const to = new Node(1, 'to', g);
    // from.info.rank and to.info.rank intentionally left undefined -> span=0.
    const orig = new Edge(from, to, '');
    const ve = new Edge(from, to, '');
    expect(() => mapPathMultiEdge(from, to, orig, ve, 5)).not.toThrow();
    expect(orig.info.to_virt).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// mapPathAdjacentMulti  @see cluster.c:map_path — L117/L118/L122
// ---------------------------------------------------------------------------

describe('mapPathAdjacentMulti — span 2 walk exercises the cloneVn ternary', () => {
  it('runs the ternary true branch (cloneVn) then the false branch (to)', () => {
    const g = new Graph('g', 'directed');
    const x = new Node(0, 'x', g);
    x.info.rank = 0;
    x.info.order = 0;
    g.info.rank = [makeRankEntry([x])];

    const from = new Node(1, 'from', g);
    const to = new Node(2, 'to', g);
    from.info.rank = 0;
    to.info.rank = 2; // span 2 -> two loop iterations

    const y = new Node(3, 'y', g);
    y.info.out = { list: [], size: 0 };
    const ve1 = new Edge(x, y, '');
    x.info.out = { list: [ve1], size: 1 };
    const ve0 = new Edge(from, x, '');
    // ve0.info.count left undefined -> exercises the ?? 1 default (L122).
    const orig = new Edge(from, to, '');

    mapPathAdjacentMulti(from, to, orig, ve0, 11);
    // First hop lands on a cloned virtual node registered into rank 0.
    expect(g.info.rank[0].v.length).toBeGreaterThanOrEqual(2);
    expect(findFastEdge(from, g.info.rank[0].v[1])).toBeDefined();
  });

  it('skips the loop entirely when both ranks default to 0 via ??', () => {
    const g = new Graph('g', 'directed');
    const from = new Node(0, 'from', g);
    const to = new Node(1, 'to', g);
    // from.info.rank and to.info.rank intentionally left undefined.
    const ve = new Edge(from, to, '');
    const orig = new Edge(from, to, '');
    expect(() => mapPathAdjacentMulti(from, to, orig, ve, 1)).not.toThrow();
    expect(findFastEdge(from, to)).toBeUndefined();
  });

  it('defaults to.info.rank via ?? inside the ternary while the loop runs', () => {
    const g = new Graph('g', 'directed');
    const x = new Node(0, 'x', g);
    x.info.rank = 0;
    x.info.order = 0;
    g.info.rank = [makeRankEntry([x])];

    const from = new Node(1, 'from', g);
    const to = new Node(2, 'to', g);
    from.info.rank = -2;
    // to.info.rank intentionally left undefined -> defaults to 0 (L118).

    const y = new Node(3, 'y', g);
    y.info.out = { list: [], size: 0 };
    const ve1 = new Edge(x, y, '');
    x.info.out = { list: [ve1], size: 1 };
    const ve0 = new Edge(from, x, '');
    const orig = new Edge(from, to, '');

    expect(() => mapPathAdjacentMulti(from, to, orig, ve0, 2)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// mapPath  @see cluster.c:map_path — L182 early return, L183/L184 ?? defaults
// ---------------------------------------------------------------------------

describe('mapPath — early return when ve already spans from..to', () => {
  it('is a no-op when ve.tail === from and ve.head === to', () => {
    const g = new Graph('g', 'directed');
    const from = new Node(0, 'from', g);
    const to = new Node(1, 'to', g);
    const ve = new Edge(from, to, '');
    const orig = new Edge(from, to, '');
    mapPath(from, to, orig, ve, VIRTUAL);
    expect(orig.info.to_virt).toBeUndefined();
    expect(from.info.other).toBeUndefined();
  });
});

describe('mapPath — span/count ?? defaults when unset, routed to the long-span branch', () => {
  it('defaults span and cnt to 0/1 via ?? and falls through to mapPathLongSingle', () => {
    const g = new Graph('g', 'directed');
    const from = new Node(0, 'from', g);
    const to = new Node(1, 'to', g);
    const other = new Node(2, 'other', g);
    // from.info.rank / to.info.rank / ve.info.count all intentionally unset.
    const ve = new Edge(other, from, ''); // ve.tail !== from -> no early return
    const orig = new Edge(from, to, '');
    expect(() => mapPath(from, to, orig, ve, VIRTUAL)).not.toThrow();
    expect(orig.info.to_virt).toBeDefined();
  });
});
