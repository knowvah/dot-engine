// SPDX-License-Identifier: EPL-2.0
/**
 * T4a — branch-coverage tests for layout/dot/mincross-build.ts.
 *
 * mincross-build.test.ts already covers the fillRanks/realFillRanks "happy
 * path" (clusters with explicit ranks). This file closes the remaining
 * uncovered branches: `??`/ternary rank-default fallbacks, early-return
 * guards in the rank-installation and BFS helpers, and the ordering=out/in
 * dispatch functions, which have no coverage at all in the existing suite.
 * Fixtures are small hand-built Graph/Node/Edge objects (D1 mixed mode),
 * matching the pattern in rank.branch.test.ts / ns.branch.test.ts.
 *
 * @see lib/dotgen/mincross.c
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { agnode, agsubg, agsubnode } from '../../model/cgraph-ops.js';
import type { MincrossContext } from './mincross-utils.js';
import { newVirtualEdge, flatEdge, findFlatEdge, FLATORDER } from './fastgr.js';
import { CLUSTER } from './rank.js';
import {
  allocateRanksCount, allocateRanks, makeEmptyRank,
  realFillRanks, fillRanks,
  rankInRange, placeInRankSlot, installInRank, enqueueNeighbors,
  buildRanksFlip, buildRanksBfs, buildRanksSources, buildRanks,
  doOrderingAddFlatEdges, doOrderingNode, doOrderingForNodes, orderedEdges,
} from './mincross-build.js';

/** Minimal MincrossContext fixture; only `.root` is read by the functions
 * exercised here (orderWithinAlloc/exchange/ncross are not invoked). */
function makeCtx(root: Graph): MincrossContext {
  return {
    root,
    globalMinRank: 0,
    globalMaxRank: 0,
    teList: [],
    tiList: [],
    reMincross: false,
    minQuit: 0,
    maxIter: 0,
  };
}

// ---------------------------------------------------------------------------
// allocateRanksCount / allocateRanks  @see lib/dotgen/mincross.c:allocate_ranks
// ---------------------------------------------------------------------------

describe('allocateRanksCount — rank ?? 0 fallback for unranked nodes/edges', () => {
  it('defaults a node with no rank to rank 0', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g); // rank left undefined
    g.nodes.set('n', n);
    const cn = [0, 0];
    allocateRanksCount(g, cn);
    expect(cn[0]).toBe(1);
  });

  it('defaults an edge whose tail/head lack a rank to 0/0', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g); // both ranks undefined
    g.nodes.set('a', a); g.nodes.set('b', b);
    g.edges.push(new Edge(a, b, ''));
    const cn = [0, 0];
    allocateRanksCount(g, cn);
    expect(cn[0]).toBe(2); // both nodes counted at fallback rank 0
  });
});

describe('allocateRanks — minrank/maxrank ?? 0 fallback', () => {
  it('defaults g.info.maxrank and minrank to 0 when unset', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    g.nodes.set('n', n);
    allocateRanks(g);
    expect(g.info.rank).toHaveLength(2); // (mx=0)+2
    expect(g.info.rank![0].an).toBe(2); // cn[0]=1 (node n) + 1
  });
});

// ---------------------------------------------------------------------------
// markOccupiedRanks (private, exercised via realFillRanks)
// @see lib/dotgen/mincross.c:986
// ---------------------------------------------------------------------------

describe('realFillRanks — markOccupiedRanks rank ?? 0 fallback', () => {
  it('treats an unranked node and its self-loop head as rank 0', () => {
    const root = new Graph('root', 'directed');
    const cluster = agsubg(root, 'cluster_0', true)!;
    cluster.info.minrank = 0;
    cluster.info.maxrank = 1;
    const a = agnode(cluster, 'a', true)!;
    agsubnode(cluster, a, true); // a.info.rank left undefined
    cluster.edges.push(new Edge(a, a, '')); // head=a also unranked
    const ranks = new Array(3).fill(false);
    realFillRanks(cluster, ranks, null);
    expect(ranks[0]).toBe(true); // marked via the ?? 0 fallback
    expect(ranks[1]).toBe(false); // rank 1 left empty -> a placeholder is created
    const sg = agsubg(root, '_new_rank', false);
    expect(sg).not.toBeNull();
    expect([...sg!.nodes.values()]).toHaveLength(1);
  });
});

describe('realFillRanks — fillEmptyRanks minrank/maxrank ?? 0 fallback', () => {
  it('defaults an unset cluster minrank/maxrank to 0 (no gap, no placeholder)', () => {
    const root = new Graph('root', 'directed');
    const cluster = agsubg(root, 'cluster_0', true)!;
    // cluster.info.minrank / maxrank intentionally left undefined
    const a = agnode(cluster, 'a', true)!;
    agsubnode(cluster, a, true);
    a.info.rank = 0;
    const sg = realFillRanks(cluster, new Array(2).fill(false), null);
    expect(sg).toBeNull(); // rank 0 occupied, mn=mx=0 -> no gap to fill
  });
});

describe('fillRanks — g.info.maxrank ?? 0 fallback', () => {
  it('sizes the ranks array from a fallback maxrank and still fills cluster gaps', () => {
    const root = new Graph('root', 'directed');
    // root.info.maxrank intentionally left undefined
    const cluster = agsubg(root, 'cluster_0', true)!;
    cluster.info.minrank = 0;
    cluster.info.maxrank = 1;
    const a = agnode(cluster, 'a', true)!;
    agsubnode(cluster, a, true);
    a.info.rank = 0;
    root.info.n_cluster = 1;
    root.info.clust = [cluster];
    fillRanks(root);
    const sg = agsubg(root, '_new_rank', false);
    expect(sg).not.toBeNull();
    expect([...sg!.nodes.values()]).toHaveLength(1); // rank 1 filled
  });
});

// ---------------------------------------------------------------------------
// rankInRange  @see lib/dotgen/mincross.c (install_in_rank range check)
// ---------------------------------------------------------------------------

describe('rankInRange — minrank/maxrank ?? 0 fallback', () => {
  it('defaults an unset range to [0,0]', () => {
    const g = new Graph('g', 'directed');
    expect(rankInRange(g, 0)).toBe(true);
    expect(rankInRange(g, 1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// placeInRankSlot  @see lib/dotgen/mincross.c:install_in_rank (slot placement)
// ---------------------------------------------------------------------------

describe('placeInRankSlot', () => {
  it('returns -1 when g.info.rank is undefined', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    expect(placeInRankSlot(g, n, 0)).toBe(-1);
  });

  it('returns -1 when the rank slot has no allocation (an<=0)', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    g.info.rank = [makeEmptyRank()]; // an defaults to 0
    expect(placeInRankSlot(g, n, 0)).toBe(-1);
  });

  it('places the node honoring the vStart pointer-arithmetic offset', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    const rk = makeEmptyRank();
    rk.an = 2; rk.v = new Array(2).fill(null) as unknown as Node[]; rk.vStart = 1;
    g.info.rank = [rk];
    const idx = placeInRankSlot(g, n, 0);
    expect(idx).toBe(1);
    expect(rk.v[1]).toBe(n);
    expect(n.info.order).toBe(1);
    expect(rk.n).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// installInRank  @see lib/dotgen/mincross.c:install_in_rank
// ---------------------------------------------------------------------------

describe('installInRank', () => {
  it('defaults n.info.rank to 0 when undefined, and succeeds', () => {
    const root = new Graph('root', 'directed');
    const rk = makeEmptyRank();
    rk.an = 2; rk.v = new Array(2).fill(null) as unknown as Node[];
    root.info.rank = [rk];
    root.info.minrank = 0; root.info.maxrank = 0;
    const n = new Node(0, 'n', root); // rank left undefined
    const ctx = makeCtx(root);
    expect(installInRank(ctx, root, n)).toBe(0);
    expect(n.info.order).toBe(0);
    expect(rk.v[0]).toBe(n);
  });

  it('returns -1 when placeInRankSlot fails (g.info.rank undefined)', () => {
    const root = new Graph('root', 'directed');
    const n = new Node(0, 'n', root);
    n.info.rank = 0;
    const ctx = makeCtx(root);
    expect(installInRank(ctx, root, n)).toBe(-1);
  });

  it('returns -1 when the assigned rank is outside [minrank,maxrank]', () => {
    const root = new Graph('root', 'directed');
    const ranks = Array.from({ length: 6 }, () => makeEmptyRank());
    ranks[5].an = 1; ranks[5].v = [null as unknown as Node];
    root.info.rank = ranks;
    root.info.minrank = 0; root.info.maxrank = 0; // rank 5 is out of range
    const n = new Node(0, 'n', root);
    n.info.rank = 5;
    const ctx = makeCtx(root);
    expect(installInRank(ctx, root, n)).toBe(-1);
  });

  // L221 `n.info.order ?? 0` fallback (unreachable-by-design): placeInRankSlot
  // always assigns a defined n.info.order on any success path (i = vStart+rk.n
  // is never negative when rk.an>0), and installInRank returns -1 immediately
  // when placeInRankSlot fails — so by the time orderWithinAlloc reads
  // `n.info.order`, it is always a number. Verified: the "succeeds" test above
  // proves order is set before this line is reached on the only live path.
  it('returns -1 when the resulting order exceeds the root rank allocation', () => {
    const root = new Graph('root', 'directed');
    const g = new Graph('g', 'directed'); g.root = root;
    const rk = makeEmptyRank();
    rk.an = 2; rk.v = new Array(2).fill(null) as unknown as Node[];
    g.info.rank = [rk];
    g.info.minrank = 0; g.info.maxrank = 0;
    const rootRk = makeEmptyRank(); rootRk.an = -1; // force order(0) > an
    root.info.rank = [rootRk];
    const n = new Node(0, 'n', root);
    n.info.rank = 0;
    const ctx = makeCtx(root);
    expect(installInRank(ctx, g, n)).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// enqueueNeighbors  @see lib/dotgen/mincross.c:enqueue_neighbors
// ---------------------------------------------------------------------------

describe('enqueueNeighbors', () => {
  it('returns without enqueueing when the requested edge list is undefined', () => {
    const g = new Graph('g', 'directed');
    const n0 = new Node(0, 'n0', g); // out undefined
    const q: Node[] = [];
    enqueueNeighbors(q, n0, 0);
    expect(q).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildRanksFlip  @see lib/dotgen/mincross.c:build_ranks (flip loop)
// ---------------------------------------------------------------------------

describe('buildRanksFlip — early return when a rank table is missing', () => {
  it('leaves rootRank untouched when g.info.rank is undefined', () => {
    const root = new Graph('root', 'directed');
    const rootRk = makeEmptyRank(); rootRk.valid = true;
    root.info.rank = [rootRk];
    const g = new Graph('g', 'directed'); g.root = root; // g.info.rank undefined
    buildRanksFlip(makeCtx(root), g, 0, 0);
    expect(rootRk.valid).toBe(true);
  });

  it('leaves g.info.rank untouched when ctx.root.info.rank is undefined', () => {
    const root = new Graph('root', 'directed'); // root.info.rank undefined
    const g = new Graph('g', 'directed'); g.root = root;
    const gRk = makeEmptyRank(); gRk.n = 3;
    g.info.rank = [gRk];
    buildRanksFlip(makeCtx(root), g, 0, 0);
    expect(gRk.n).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// buildRanksBfs  @see lib/dotgen/mincross.c:build_ranks (BFS loop)
// ---------------------------------------------------------------------------

describe('buildRanksBfs', () => {
  it('returns -1 when installInRank fails for a non-cluster node', () => {
    const root = new Graph('root', 'directed'); // root.info.rank undefined
    const n = new Node(0, 'n', root);
    expect(buildRanksBfs(makeCtx(root), root, 0, n)).toBe(-1);
  });

  it('propagates a nonzero installCluster failure', () => {
    const root = new Graph('root', 'directed'); // root.info.rank undefined
    const clust = new Graph('clust0', 'directed'); clust.root = root;
    clust.info.minrank = 0; clust.info.maxrank = 0;
    clust.info.rankleader = [new Node(1, 'leader', root)];
    clust.info.installed = 0;
    const clusterNode = new Node(2, 'cn', root);
    clusterNode.info.ranktype = CLUSTER;
    clusterNode.info.clust = clust;
    expect(buildRanksBfs(makeCtx(root), root, 0, clusterNode)).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// buildRanksSources  @see lib/dotgen/mincross.c:build_ranks (source scan)
// ---------------------------------------------------------------------------

describe('buildRanksSources', () => {
  it('skips a node whose mark is already set, without re-running BFS', () => {
    const root = new Graph('root', 'directed');
    const rk = makeEmptyRank();
    rk.an = 5; rk.v = new Array(5).fill(null) as unknown as Node[];
    root.info.rank = [rk];
    root.info.minrank = 0; root.info.maxrank = 0;
    const a = new Node(0, 'a', root); a.info.mark = 1; // already visited
    const rc = buildRanksSources(makeCtx(root), root, 0, a);
    expect(rc).toBe(0);
    expect(a.info.order).toBeUndefined(); // BFS never ran
  });

  it('propagates a buildRanksBfs failure', () => {
    const root = new Graph('root', 'directed'); // root.info.rank undefined
    const a = new Node(0, 'a', root);
    expect(buildRanksSources(makeCtx(root), root, 0, a)).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// buildRanks  @see lib/dotgen/mincross.c:build_ranks
// ---------------------------------------------------------------------------

describe('buildRanks', () => {
  it('returns -1 when g.info.rank is undefined', () => {
    const root = new Graph('root', 'directed');
    expect(buildRanks(makeCtx(root), root, 0)).toBe(-1);
  });

  it('defaults minrank/maxrank to 0 and propagates a source-scan failure', () => {
    const root = new Graph('root', 'directed');
    root.info.rank = [makeEmptyRank()]; // an=0 -> installInRank fails downstream
    const a = new Node(0, 'a', root);
    root.info.nlist = a;
    root.nodes.set('a', a);
    expect(buildRanks(makeCtx(root), root, 0)).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// doOrderingAddFlatEdges  @see lib/dotgen/mincross.c:do_ordering_node
// ---------------------------------------------------------------------------

describe('doOrderingAddFlatEdges', () => {
  it('creates a FLATORDER flat edge between consecutive sortlist endpoints', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g); const b = new Node(1, 'b', g);
    const h1 = new Node(2, 'h1', g); const h2 = new Node(3, 'h2', g);
    const e1 = new Edge(a, h1, ''); const e2 = new Edge(b, h2, '');
    doOrderingAddFlatEdges(g, [e1, e2], true);
    const fe = findFlatEdge(h1, h2);
    expect(fe).toBeDefined();
    expect(fe!.info.edge_type).toBe(FLATORDER);
  });

  it('stops without adding once an existing flat edge is found', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g); const b = new Node(1, 'b', g);
    const h1 = new Node(2, 'h1', g); const h2 = new Node(3, 'h2', g);
    const e1 = new Edge(a, h1, ''); const e2 = new Edge(b, h2, '');
    const existing = newVirtualEdge(h1, h2, null);
    flatEdge(g, existing);
    doOrderingAddFlatEdges(g, [e1, e2], true);
    expect(h1.info.flat_out?.size).toBe(1); // unchanged, no duplicate added
    expect(findFlatEdge(h1, h2)).toBe(existing);
  });
});

// ---------------------------------------------------------------------------
// doOrderingNode  @see lib/dotgen/mincross.c:do_ordering_node
// ---------------------------------------------------------------------------

describe('doOrderingNode', () => {
  it('is a no-op (ctx.teList untouched) when the requested edge list is undefined', () => {
    const g = new Graph('g', 'directed');
    const ctx = makeCtx(g);
    const n = new Node(0, 'n', g); // out/in both undefined
    doOrderingNode(ctx, g, n, true);
    expect(ctx.teList).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// doOrderingForNodes  @see lib/dotgen/mincross.c:do_ordering (per-node loop)
// ---------------------------------------------------------------------------

describe('doOrderingForNodes — ordering=out/in attribute dispatch', () => {
  it('routes ordering=out through out-edges and ordering=in through in-edges', () => {
    const g = new Graph('g', 'directed');
    const ctx = makeCtx(g);

    const src = new Node(0, 'src', g); src.attrs.set('ordering', 'out');
    const h1 = new Node(1, 'h1', g); const h2 = new Node(2, 'h2', g);
    const e1 = new Edge(src, h1, ''); const e2 = new Edge(src, h2, '');
    src.info.out = { list: [e2, e1], size: 2 };
    g.nodes.set('src', src); g.nodes.set('h1', h1); g.nodes.set('h2', h2);

    const tgt = new Node(3, 'tgt', g); tgt.attrs.set('ordering', 'in');
    const t1 = new Node(4, 't1', g); const t2 = new Node(5, 't2', g);
    const e3 = new Edge(t1, tgt, ''); const e4 = new Edge(t2, tgt, '');
    tgt.info.in = { list: [e4, e3], size: 2 };
    g.nodes.set('tgt', tgt); g.nodes.set('t1', t1); g.nodes.set('t2', t2);

    doOrderingForNodes(ctx, g);

    expect(findFlatEdge(h1, h2)).toBeDefined(); // ordering=out, by head seq
    expect(findFlatEdge(t1, t2)).toBeDefined(); // ordering=in, by tail seq
  });
});

// ---------------------------------------------------------------------------
// orderedEdges  @see lib/dotgen/mincross.c:ordered_edges
// ---------------------------------------------------------------------------

describe('orderedEdges — root-level ordering=out short-circuits recursion', () => {
  it('applies out ordering directly via doOrdering when graph-level ordering=out', () => {
    const g = new Graph('g', 'directed');
    const ctx = makeCtx(g);
    g.attrs.set('ordering', 'out');
    const src = new Node(0, 'src', g);
    const h1 = new Node(1, 'h1', g); const h2 = new Node(2, 'h2', g);
    const e1 = new Edge(src, h1, ''); const e2 = new Edge(src, h2, '');
    src.info.out = { list: [e2, e1], size: 2 };
    g.nodes.set('src', src); g.nodes.set('h1', h1); g.nodes.set('h2', h2);

    orderedEdges(ctx, g);

    expect(findFlatEdge(h1, h2)).toBeDefined();
  });

  it('applies in ordering via doOrdering when graph-level ordering=in', () => {
    // ordering='out' short-circuits the `else if (ordering === 'in')` check
    // entirely (no braces on the first arm), so it never evaluates unless the
    // 'out' arm is false — a dedicated ordering=in graph is required to reach it.
    const g = new Graph('g', 'directed');
    const ctx = makeCtx(g);
    g.attrs.set('ordering', 'in');
    const tgt = new Node(0, 'tgt', g);
    const t1 = new Node(1, 't1', g); const t2 = new Node(2, 't2', g);
    const e1 = new Edge(t1, tgt, ''); const e2 = new Edge(t2, tgt, '');
    tgt.info.in = { list: [e2, e1], size: 2 };
    g.nodes.set('tgt', tgt); g.nodes.set('t1', t1); g.nodes.set('t2', t2);

    orderedEdges(ctx, g);

    expect(findFlatEdge(t1, t2)).toBeDefined();
  });
});
