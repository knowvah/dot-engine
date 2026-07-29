// SPDX-License-Identifier: EPL-2.0
/**
 * T2d — branch-coverage tests for layout/dot/rank.ts.
 *
 * Mixed mode (D1): most branches here are in small pure helpers, so they are
 * unit-tested directly against hand-built Graph/Node/Edge fixtures (mirroring
 * the pattern in rank.test.ts). A few branches only materialize through the
 * full dot1Rank pipeline (rank=min/max sets feeding minmaxEdges2, real
 * clusters), so those are driven end-to-end and asserted on concrete rank
 * values. Each describe block is kept under 30 physical lines (lizard -L 30).
 *
 * @see lib/dotgen/rank.c
 */

import { describe, it, expect, afterEach } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import {
  mapbool, scaleClamp, cleanup1, cleanup1CompSlot, edgelabelRanks, rankSetClass,
  collapseRanksetMinMax, collapseRankset, nodeInduce, clusterLeaderScan,
  clusterLeader, collapseCluster, findClusters, minmaxEdgesReverse,
  minmaxEdges, mmEdges2CheckMax, mmEdges2CheckMin, minmaxEdges2, rank1,
  dot1Rank, dotRank, setClType,
  MINRANK, SOURCERANK, MAXRANK, SINKRANK, SAMERANK, SLACKNODE, CLUSTER,
  NEW_RANK, LOCAL, GLOBAL,
} from './rank.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeRankGraph(n: number): [Graph, Node[]] {
  const g = new Graph('test', 'directed');
  const nodes: Node[] = [];
  for (let i = 0; i < n; i++) {
    const node = new Node(i, `n${i}`, g);
    g.nodes.set(node.name, node);
    nodes.push(node);
  }
  return [g, nodes];
}

function addRankEdge(g: Graph, tail: Node, head: Node, minlen = 1): Edge {
  const e = new Edge(tail, head, '');
  e.info.minlen = minlen;
  g.edges.push(e);
  return e;
}

/** A non-cluster subgraph rooted at a distinct graph (so isACluster is false
 *  purely from the name/attrs check, not the g===g.root fast path). */
function makeSubg(root: Graph, name: string): Graph {
  const sub = new Graph(name, 'directed');
  sub.root = root;
  return sub;
}

// ---------------------------------------------------------------------------
// scaleClamp  @see rank.c:scale_clamp
// ---------------------------------------------------------------------------

describe('scaleClamp', () => {
  it('clamps a negative scale to 0', () => {
    expect(scaleClamp(10, -1)).toBe(0);
  });
  it('clamps to MAX_SAFE_INTEGER on overflow (scale>1, huge nnodes)', () => {
    expect(scaleClamp(1e300, 2)).toBe(Number.MAX_SAFE_INTEGER);
  });
  it('returns floor(nnodes*scale) for scale>1 without overflow', () => {
    expect(scaleClamp(10, 2)).toBe(20);
  });
  it('returns floor(nnodes*scale) for scale in [0,1]', () => {
    expect(scaleClamp(10, 0.5)).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// cleanup1CompSlot / cleanup1  @see rank.c:cleanup1
// ---------------------------------------------------------------------------

describe('cleanup1CompSlot — SLACKNODE removal from a comp chain', () => {
  it('removes a SLACKNODE from the middle, restitching neighbors', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g);
    b.info.node_type = SLACKNODE;
    const c = new Node(2, 'c', g);
    a.info.next = b; b.info.prev = a; b.info.next = c; c.info.prev = b;
    const comp = [a];
    cleanup1CompSlot(g, comp, 0);
    expect(a.info.next).toBe(c);
    expect(c.info.prev).toBe(a);
    expect(comp[0]).toBe(a);
  });
  it('removes a SLACKNODE at the slot head, retargeting nlist', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g);
    a.info.node_type = SLACKNODE;
    const b = new Node(1, 'b', g);
    a.info.next = b; b.info.prev = a;
    const comp = [a];
    cleanup1CompSlot(g, comp, 0);
    expect(comp[0]).toBe(b);
    expect(g.info.nlist).toBe(b);
    expect(b.info.prev).toBeUndefined();
  });
});

describe('cleanup1 — comp-less passthrough (rank.c:cleanup1, no GD_comp)', () => {
  it('does not throw when g.info.comp is undefined', () => {
    const g = new Graph('g', 'directed');
    expect(() => cleanup1(g)).not.toThrow();
    expect(g.info.comp).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// edgelabelRanks — ?? defaults  @see rank.c:edgelabel_ranks
// ---------------------------------------------------------------------------

describe('edgelabelRanks', () => {
  it('is a no-op when GD_has_labels lacks EDGE_LABEL', () => {
    const [g, [a, b]] = makeRankGraph(2);
    const e = addRankEdge(g, a, b, 1);
    edgelabelRanks(g);
    expect(e.info.minlen).toBe(1);
  });
  it('doubles minlen (defaulting unset edges to 1) and halves ranksep', () => {
    const [g, [a, b, c]] = makeRankGraph(3);
    g.info.has_labels = 1; // EDGE_LABEL bit
    const e1 = addRankEdge(g, a, b, 3);
    const e2 = new Edge(b, c, ''); // minlen left unset -> defaults to 1
    g.edges.push(e2);
    g.info.ranksep = 36;
    edgelabelRanks(g);
    expect(e1.info.minlen).toBe(6);
    expect(e2.info.minlen).toBe(2);
    expect(g.info.ranksep).toBe(18); // floor((36+1)/2)
  });
  it('defaults GD_ranksep to 0 when unset', () => {
    const [g, [a, b]] = makeRankGraph(2);
    g.info.has_labels = 1;
    addRankEdge(g, a, b);
    edgelabelRanks(g);
    expect(g.info.ranksep).toBe(0); // floor((0+1)/2)
  });
});

// ---------------------------------------------------------------------------
// rankSetClass  @see rank.c:rank_set_class
// ---------------------------------------------------------------------------

describe('rankSetClass — rank attribute classification', () => {
  it.each([
    ['min', MINRANK], ['source', SOURCERANK], ['max', MAXRANK], ['sink', SINKRANK],
  ])('rank=%s classifies as %i', (r, expected) => {
    const root = new Graph('root', 'directed');
    const sub = makeSubg(root, 'sub');
    sub.attrs.set('rank', r);
    expect(rankSetClass(sub)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// collapseRanksetMinMax  @see rank.c:collapse_rankset (min/max bookkeeping)
// ---------------------------------------------------------------------------

describe('collapseRanksetMinMax — minset bookkeeping (MINRANK/SOURCERANK)', () => {
  it('initializes minset on first call, reuses it on the second', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g);
    const v = new Node(1, 'v', g);
    collapseRanksetMinMax(g, MINRANK, u);
    expect(g.info.minset).toBeDefined();
    collapseRanksetMinMax(g, SOURCERANK, v);
    expect(g.info.minset).toBeDefined();
  });
});

describe('collapseRanksetMinMax — maxset bookkeeping (MAXRANK/SINKRANK)', () => {
  it('initializes maxset on first call, reuses it on the second', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g);
    const v = new Node(1, 'v', g);
    collapseRanksetMinMax(g, MAXRANK, u);
    expect(g.info.maxset).toBeDefined();
    collapseRanksetMinMax(g, SINKRANK, v);
    expect(g.info.maxset).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// collapseRankset  @see rank.c:collapse_rankset
// ---------------------------------------------------------------------------

describe('collapseRankset', () => {
  it('returns early when the subgraph has no nodes', () => {
    const root = new Graph('root', 'directed');
    const sub = makeSubg(root, 'sub');
    expect(() => collapseRankset(root, sub, MINRANK)).not.toThrow();
    expect(root.info.minset).toBeUndefined();
  });
  it('SAMERANK does not touch minset/maxset (isMinOrMax false)', () => {
    const root = new Graph('root', 'directed');
    const sub = makeSubg(root, 'sub');
    const a = new Node(0, 'a', root);
    const b = new Node(1, 'b', root);
    sub.nodes.set('a', a); sub.nodes.set('b', b);
    collapseRankset(root, sub, SAMERANK);
    expect(root.info.minset).toBeUndefined();
    expect(root.info.maxset).toBeUndefined();
    expect(a.info.ranktype).toBe(SAMERANK);
    expect(b.info.ranktype).toBe(SAMERANK);
  });
});

// ---------------------------------------------------------------------------
// nodeInduce  @see rank.c:node_induce
// ---------------------------------------------------------------------------

// NOTE (unreachable-by-design): nodeInduce's `if (n.info.clust) continue;`
// guard can never see a truthy n.info.clust — pruneForeignClusterNodes (the
// call immediately preceding it, over the SAME nodesInSeq(clust) set)
// unconditionally clears info.clust to undefined for every member first.
// Verified by inspection of cluster.ts:pruneForeignClusterNodes; no caller
// can reach the guard's true branch without bypassing nodeInduce itself.

describe('nodeInduce — zaps in/out edges leaving the cluster', () => {
  it('drops a foreign-tail in-edge and a foreign-head out-edge', () => {
    const g = new Graph('root', 'directed');
    const clust = makeSubg(g, 'cluster0');
    const inside = new Node(0, 'inside', g);
    const foreign = new Node(1, 'foreign', g);
    clust.nodes.set('inside', inside);
    g.nodes.set('inside', inside); // foreign intentionally NOT in g.nodes
    const inEdge = new Edge(foreign, inside, '');
    const outEdge = new Edge(inside, foreign, '');
    inside.info.in = { list: [inEdge], size: 1 };
    inside.info.out = { list: [outEdge], size: 1 };
    nodeInduce(g, clust);
    expect(inside.info.in.size).toBe(0);
    expect(inside.info.out.size).toBe(0);
  });
  it('keeps in/out edges whose other endpoint is inside par', () => {
    const g = new Graph('root', 'directed');
    const clust = makeSubg(g, 'cluster0');
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g);
    clust.nodes.set('a', a);
    g.nodes.set('a', a); g.nodes.set('b', b); // b IS in par
    const e = new Edge(b, a, '');
    a.info.in = { list: [e], size: 1 };
    nodeInduce(g, clust);
    expect(a.info.in.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// clusterLeaderScan / clusterLeader  @see rank.c:cluster_leader
// ---------------------------------------------------------------------------

describe('clusterLeader — no eligible leader found', () => {
  it('leaves the cluster untouched when no node has rank 0 + node_type 0', () => {
    const g = new Graph('root', 'directed');
    const clust = makeSubg(g, 'cluster0');
    const n = new Node(0, 'n', g);
    n.info.rank = 1; // not rank 0 -> not a candidate leader
    clust.info.nlist = n;
    n.info.next = undefined;
    expect(() => clusterLeader(clust)).not.toThrow();
    expect(clust.info.leader).toBeUndefined();
  });
  it('clusterLeaderScan finds the leader and the max rank', () => {
    const g = new Graph('root', 'directed');
    const clust = makeSubg(g, 'cluster1');
    const a = new Node(0, 'a', g); a.info.rank = 0;
    const b = new Node(1, 'b', g); b.info.rank = 2;
    a.info.next = b; b.info.next = undefined;
    clust.info.nlist = a;
    const [leader, maxrank] = clusterLeaderScan(clust);
    expect(leader).toBe(a);
    expect(maxrank).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// collapseCluster  @see rank.c:collapse_cluster
// ---------------------------------------------------------------------------

describe('collapseCluster — already-parented subgraph is skipped', () => {
  it('is a no-op on the second call for the same subgraph', () => {
    const [g, [a, b]] = makeRankGraph(2);
    addRankEdge(g, a, b);
    const clust = makeSubg(g, 'cluster0');
    clust.nodes.set('a', a);
    collapseCluster(g, clust);
    const nClusterAfterFirst = g.info.n_cluster;
    collapseCluster(g, clust);
    expect(g.info.n_cluster).toBe(nClusterAfterFirst);
  });
});

describe('collapseCluster — GLOBAL clType uses dotScanRanks instead of dot1Rank', () => {
  afterEach(() => setClType(LOCAL));
  it('sets minrank/maxrank via dotScanRanks when clType=GLOBAL', () => {
    const [g, [a, b]] = makeRankGraph(2);
    addRankEdge(g, a, b);
    a.info.rank = 0; b.info.rank = 1;
    const clust = makeSubg(g, 'cluster0');
    clust.nodes.set('a', a); clust.nodes.set('b', b);
    setClType(GLOBAL);
    collapseCluster(g, clust);
    expect(clust.info.minrank).toBe(0);
    expect(clust.info.maxrank).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// findClusters  @see rank.c:find_clusters
// ---------------------------------------------------------------------------

describe('findClusters — set_type gate', () => {
  it('collapses only subgraphs whose set_type is CLUSTER', () => {
    const [g, [a, b]] = makeRankGraph(2);
    addRankEdge(g, a, b);
    const clust = makeSubg(g, 'cluster0');
    clust.info.set_type = CLUSTER;
    clust.nodes.set('a', a);
    const notClust = makeSubg(g, 'plain');
    notClust.info.set_type = 0;
    notClust.nodes.set('b', b);
    g.root.subgraphs.set('cluster0', clust);
    g.root.subgraphs.set('plain', notClust);
    findClusters(g);
    expect(g.info.n_cluster).toBe(1);
    expect(g.info.clust?.[0]).toBe(clust);
  });
});

// ---------------------------------------------------------------------------
// minmaxEdgesReverse  @see rank.c:minmax_edges (per-node reversal helper)
// ---------------------------------------------------------------------------

describe('minmaxEdgesReverse', () => {
  it('isOut=true + SINKRANK reverses the out-edge and returns 1', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    const m = new Node(1, 'm', g);
    n.info.ranktype = SINKRANK;
    const e = new Edge(n, m, '');
    n.info.out = { list: [e], size: 1 };
    m.info.in = { list: [e], size: 1 };
    expect(minmaxEdgesReverse(n, true)).toBe(1);
    expect(n.info.out.size).toBe(0);
  });
  it('isOut=true + non-SINKRANK returns 0 when out is undefined', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    expect(minmaxEdgesReverse(n, true)).toBe(0);
  });
  it('isOut=false + SOURCERANK reverses the in-edge and returns 1', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    const m = new Node(1, 'm', g);
    n.info.ranktype = SOURCERANK;
    const e = new Edge(m, n, '');
    n.info.in = { list: [e], size: 1 };
    m.info.out = { list: [e], size: 1 };
    expect(minmaxEdgesReverse(n, false)).toBe(1);
    expect(n.info.in.size).toBe(0);
  });
  it('isOut=false + empty (but defined) in-list skips the while loop', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    n.info.in = { list: [], size: 0 };
    expect(minmaxEdgesReverse(n, false)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// minmaxEdges  @see rank.c:minmax_edges
// ---------------------------------------------------------------------------

describe('minmaxEdges', () => {
  it('returns [0,0] with neither minset nor maxset', () => {
    const g = new Graph('g', 'directed');
    expect(minmaxEdges(g)).toEqual([0, 0]);
  });
  it('computes slenX only when minset is set (maxset unset)', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g);
    g.info.minset = a;
    const [slenX, slenY] = minmaxEdges(g);
    expect(slenY).toBe(0);
    expect(slenX).toBe(0); // a is not SOURCERANK
  });
  it('computes slenY only when maxset is set (minset unset)', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g);
    a.info.ranktype = SINKRANK;
    g.info.maxset = a;
    const [slenX, slenY] = minmaxEdges(g);
    expect(slenX).toBe(0);
    expect(slenY).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// mmEdges2CheckMax / mmEdges2CheckMin  @see rank.c:minmax_edges2
// ---------------------------------------------------------------------------

describe('mmEdges2CheckMax', () => {
  it('adds a virtual edge to maxset when n has no out edges', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    const other = new Node(1, 'other', g);
    const maxset = new Node(2, 'maxset', g);
    n.info.in = { list: [new Edge(other, n, '')], size: 1 };
    g.info.maxset = maxset;
    expect(mmEdges2CheckMax(g, n, 5)).toBe(true);
    expect(n.info.out?.size).toBe(1);
    expect(n.info.out?.list[0].info.minlen).toBe(5);
    expect(n.info.out?.list[0].info.weight).toBe(0);
  });
  it('treats a defined-but-empty out list as "no out" (adds the edge)', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    n.info.out = { list: [], size: 0 };
    n.info.in = { list: [new Edge(n, n, '')], size: 1 };
    g.info.maxset = new Node(1, 'maxset', g);
    expect(mmEdges2CheckMax(g, n, 1)).toBe(true); // size===0 counts as "no out"
  });
  it('returns false when n already has an out edge', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    n.info.out = { list: [new Edge(n, n, '')], size: 1 };
    g.info.maxset = new Node(1, 'maxset', g);
    expect(mmEdges2CheckMax(g, n, 1)).toBe(false);
  });
  it('returns false when maxset is unset', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    expect(mmEdges2CheckMax(g, n, 1)).toBe(false);
  });
  it('returns false when n IS the maxset leader', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    g.info.maxset = n;
    expect(mmEdges2CheckMax(g, n, 1)).toBe(false);
  });
});

describe('mmEdges2CheckMin', () => {
  it('adds a virtual edge from minset when n has no in edges', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    const other = new Node(1, 'other', g);
    const minset = new Node(2, 'minset', g);
    n.info.out = { list: [new Edge(n, other, '')], size: 1 };
    g.info.minset = minset;
    expect(mmEdges2CheckMin(g, n, 3)).toBe(true);
    expect(n.info.in?.size).toBe(1);
    expect(n.info.in?.list[0].info.minlen).toBe(3);
  });
  it('returns false when n already has an in edge', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    n.info.in = { list: [new Edge(n, n, '')], size: 1 };
    g.info.minset = new Node(1, 'minset', g);
    expect(mmEdges2CheckMin(g, n, 1)).toBe(false);
  });
  it('returns false when n IS the minset leader', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    g.info.minset = n;
    expect(mmEdges2CheckMin(g, n, 1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// minmaxEdges2 — UF-representative skip  @see rank.c:minmax_edges2
// ---------------------------------------------------------------------------

describe('minmaxEdges2', () => {
  it('returns false and adds nothing with neither minset nor maxset', () => {
    const [g] = makeRankGraph(1);
    expect(minmaxEdges2(g, [0, 0])).toBe(false);
  });
  it('skips a non-UF-representative node (n !== ufFind(n))', () => {
    const [g, [a, b, c]] = makeRankGraph(3);
    g.info.minset = a;
    b.info.UF_parent = a; b.info.UF_size = 1; // b is not its own UF root -> skipped
    a.info.UF_parent = a; a.info.UF_size = 1;
    // c has no edges at all and is its own UF root -> not skipped, gets an edge
    const added = minmaxEdges2(g, [7, 9]);
    expect(added).toBe(true);
    expect(b.info.in).toBeUndefined(); // b was skipped by the UF-rep guard
    expect(c.info.in?.size).toBe(1); // c got a virtual edge from minset
    expect(c.info.in?.list[0].info.minlen).toBe(7); // slen[0] (slenX)
  });
});

// ---------------------------------------------------------------------------
// rank1 — nslimit1 truthy branch  @see rank.c:rank1
// ---------------------------------------------------------------------------

describe('rank1 — nslimit1 clamps maxiter via scaleClamp', () => {
  it('still ranks correctly with a small nslimit1 budget', () => {
    const [g, [a, b, c]] = makeRankGraph(3);
    addRankEdge(g, a, b);
    addRankEdge(g, b, c);
    g.attrs.set('nslimit1', '2');
    dot1Rank(g);
    expect(a.info.rank).toBe(0);
    expect(b.info.rank).toBe(1);
    expect(c.info.rank).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// dot1Rank end-to-end — rank=min/max drives minmaxEdges2 -> second decompose
// ---------------------------------------------------------------------------

describe('dot1Rank — rank=min/max subgraphs (minmaxEdges2 re-decompose path)', () => {
  it('pulls an isolated node to rank 0 via {rank=min} and one to the max via {rank=max}', () => {
    const [g, [a, b, c, lo, hi]] = makeRankGraph(5);
    addRankEdge(g, a, b);
    addRankEdge(g, b, c);
    const minSub = makeSubg(g, 'minset');
    minSub.attrs.set('rank', 'min');
    minSub.nodes.set('lo', lo);
    const maxSub = makeSubg(g, 'maxset');
    maxSub.attrs.set('rank', 'max');
    maxSub.nodes.set('hi', hi);
    g.subgraphs.set('minset', minSub);
    g.subgraphs.set('maxset', maxSub);
    dot1Rank(g);
    expect(lo.info.rank).toBe(g.info.minrank);
    expect(hi.info.rank).toBe(g.info.maxrank);
    expect(a.info.rank).toBe(0);
    expect(b.info.rank).toBe(1);
    expect(c.info.rank).toBe(2);
  });
});

describe('dot1Rank — real cluster drives rank1 hasClusters=true branch', () => {
  it('ranks a chain containing one real cluster subgraph', () => {
    const [g, [a, b, c]] = makeRankGraph(3);
    addRankEdge(g, a, b);
    addRankEdge(g, b, c);
    const clust = makeSubg(g, 'cluster0');
    clust.nodes.set('b', b);
    g.subgraphs.set('cluster0', clust);
    dot1Rank(g);
    expect(a.info.rank).toBe(0);
    expect(b.info.rank).toBe(1);
    expect(c.info.rank).toBe(2);
    expect(g.info.n_cluster).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// dotRank dispatch — GD_flags defaults via ??  @see rank.c:dot_rank
// ---------------------------------------------------------------------------

describe('dotRank — newrank=true with GD_flags forced undefined', () => {
  // GraphInfo.flags is a required `number` (default 0 via makeGraphInfo), so
  // the `?? 0` fallback at rank.c:dot_rank's flags assignment is unreachable
  // through type-safe construction. Force it undefined at runtime (bypassing
  // the type system) to exercise the defensive fallback itself.
  it('applies the NEW_RANK bit even when flags is undefined at runtime', () => {
    const [g, [a, b]] = makeRankGraph(2);
    addRankEdge(g, a, b);
    g.attrs.set('newrank', 'true');
    g.info.flags = undefined as unknown as number;
    dotRank(g);
    expect((g.info.flags ?? 0) & NEW_RANK).toBe(NEW_RANK);
    expect(b.info.rank).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// mapbool — leading-digit numeric parse vs. unrecognized-string fallback
// ---------------------------------------------------------------------------

describe('mapbool — digit and fallback branches', () => {
  it('parses a leading-digit string numerically', () => {
    expect(mapbool('5')).toBe(true);
    expect(mapbool('0')).toBe(false);
  });
  it('falls back to false for an unrecognized non-digit string', () => {
    expect(mapbool('none')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// rankSetClass — no rank attr / unmatched value  @see rank.c:rank_set_class
// ---------------------------------------------------------------------------

describe('rankSetClass — unmatched rank value returns 0', () => {
  it('returns 0 when rank is unset', () => {
    const root = new Graph('root', 'directed');
    const sub = makeSubg(root, 'sub');
    expect(rankSetClass(sub)).toBe(0);
  });
  it('returns 0 when rank has an unrecognized value', () => {
    const root = new Graph('root', 'directed');
    const sub = makeSubg(root, 'sub');
    sub.attrs.set('rank', 'bogus');
    expect(rankSetClass(sub)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// collapseSets recursion — non-rankset subgraph wraps a nested rankset
// ---------------------------------------------------------------------------

describe('dot1Rank — collapseSets recurses through a non-rankset wrapper', () => {
  it('finds a rank=min set nested inside a plain (non-cluster) subgraph', () => {
    const [g, [a, b, lo]] = makeRankGraph(3);
    addRankEdge(g, a, b);
    const wrapper = makeSubg(g, 'wrapper'); // rankSetClass(wrapper) === 0
    const innerMin = makeSubg(g, 'innerMin');
    innerMin.attrs.set('rank', 'min');
    innerMin.nodes.set('lo', lo);
    wrapper.subgraphs.set('innerMin', innerMin);
    g.subgraphs.set('wrapper', wrapper);
    dot1Rank(g);
    // ranktype is reset to 0 by expandNode's ufSingleton cleanup at the end
    // of dot1Rank; the observable outcome is lo landing at the graph minimum.
    expect(lo.info.rank).toBe(g.info.minrank);
    expect(a.info.rank).toBe(0);
    expect(b.info.rank).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// expandRankPostprocess — clType=GLOBAL routes to findClusters
// ---------------------------------------------------------------------------

describe('expandRankPostprocess — GLOBAL clType calls findClusters', () => {
  afterEach(() => setClType(LOCAL));
  it('does not throw when ranking a plain graph under clType=GLOBAL', () => {
    const [g, [a, b]] = makeRankGraph(2);
    addRankEdge(g, a, b);
    setClType(GLOBAL);
    expect(() => dot1Rank(g)).not.toThrow();
    expect(a.info.rank).toBe(0);
    expect(b.info.rank).toBe(1);
  });
});
