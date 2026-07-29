// SPDX-License-Identifier: EPL-2.0
/**
 * T2d — branch-coverage tests for layout/dot/rank-dot2.ts (dot2_rank, the
 * newrank=true ranking pipeline).
 *
 * Mixed mode (D1): most branches are small pure helpers building the Xg
 * (level-assignment constraint) graph, unit-tested directly against
 * hand-built Graph/Node/Edge fixtures. A few branches (real strong clusters,
 * multi-component readout) are driven end-to-end via dot2Rank and asserted
 * on concrete rank values. Each describe block stays under 30 physical
 * lines (lizard -L 30).
 *
 * @see lib/dotgen/rank.c (dot2_rank pipeline)
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import {
  eMinlen, eWeight, nRankOrZero, gMaxrankOrNeg, gMinrankOrMax, gHasParent,
  gLevel, gParentOrSelf, d2find, d2unionOne, d2unionAll, xgFindEdge,
  xgAddEdge, xgDeleteEdge, xgMerge, csRanksetKind, csSetupCluster,
  csProcessClusterNodes, csProcessRankset, csCheckDegenerate, compileSamerank,
  compileNodes, xgStrong, xgWeakExists, xgWeakSetWeights, xgWeak,
  isNonConstraint, isAStrongCluster, dotLca, isInternalToCluster,
  ceShouldSwap, ceInternal, compileEdgeItem, compileEdges, ccProcessNode,
  reverseEdge2, dfsNode, dfsStep, connectComponents, addFastEdges,
  setMinMax2, readoutCopyRank, readoutUpdateMinrk, readoutApplyMinrk,
  readoutShiftAll, readoutScanNodes, readoutNormalize, dot2Rank,
} from './rank-dot2.js';
import { MINRANK, SOURCERANK, MAXRANK, SINKRANK, SAMERANK } from './rank.js';
import type { XgState } from './rank-dot2.js';

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

function addRankEdge(g: Graph, tail: Node, head: Node): Edge {
  const e = new Edge(tail, head, '');
  g.edges.push(e);
  return e;
}

function makeSt(): XgState {
  return { lastNode: undefined, weakId: 0 };
}

function makeXg(): Graph {
  return new Graph('level assignment constraints', 'strict-directed');
}

function makeSubg(root: Graph, name: string): Graph {
  const sub = new Graph(name, 'directed');
  sub.root = root;
  return sub;
}

// ---------------------------------------------------------------------------
// Accessor helpers — ?? defaults  @see rank.c (ND_/GD_ accessors)
// ---------------------------------------------------------------------------

describe('rank-dot2 accessor helpers — ?? defaults', () => {
  it('eMinlen/eWeight fall back when unset, read through when set', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g);
    const e = new Edge(a, b, '');
    expect(eMinlen(e)).toBe(1);
    expect(eWeight(e)).toBe(1);
    e.info.minlen = 3; e.info.weight = 4;
    expect(eMinlen(e)).toBe(3);
    expect(eWeight(e)).toBe(4);
  });
  it('nRankOrZero/gMaxrankOrNeg/gMinrankOrMax fall back, then read through', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    expect(nRankOrZero(n)).toBe(0);
    n.info.rank = 5;
    expect(nRankOrZero(n)).toBe(5);
    expect(gMaxrankOrNeg(g)).toBe(-1);
    g.info.maxrank = 2;
    expect(gMaxrankOrNeg(g)).toBe(2);
    expect(gMinrankOrMax(g)).toBe(Number.MAX_SAFE_INTEGER);
    g.info.minrank = 1;
    expect(gMinrankOrMax(g)).toBe(1);
  });
  it('gHasParent/gLevel/gParentOrSelf fall back, then read through', () => {
    const g = new Graph('g', 'directed');
    const sub = makeSubg(g, 'sub');
    expect(gHasParent(sub)).toBe(false);
    expect(gLevel(sub)).toBe(0);
    expect(gParentOrSelf(sub)).toBe(sub);
    sub.info.parent = g; sub.info.level = 2;
    expect(gHasParent(sub)).toBe(true);
    expect(gLevel(sub)).toBe(2);
    expect(gParentOrSelf(sub)).toBe(g);
  });
});

// ---------------------------------------------------------------------------
// d2find / d2unionOne / d2unionAll  @see rank.c:find/union_one/union_all
// ---------------------------------------------------------------------------

describe('d2find — path compression', () => {
  it('compresses a chain to the root on find', () => {
    const g = new Graph('g', 'directed');
    const n1 = new Node(0, 'n1', g);
    const n2 = new Node(1, 'n2', g);
    const n3 = new Node(2, 'n3', g);
    n3.info.set = n3; n2.info.set = n3; n1.info.set = n2;
    expect(d2find(n1)).toBe(n3);
    expect(n1.info.set).toBe(n3); // path-compressed
  });
});

describe('d2unionOne', () => {
  it('is a no-op when n is undefined, unions when defined', () => {
    const g = new Graph('g', 'directed');
    const leader = new Node(0, 'leader', g);
    expect(d2unionOne(leader, undefined)).toBe(leader);
    const n = new Node(1, 'n', g);
    d2unionOne(leader, n);
    expect(d2find(n)).toBe(d2find(leader));
  });
});

describe('d2unionAll', () => {
  it('returns undefined for an empty graph', () => {
    const g = new Graph('g', 'directed');
    expect(d2unionAll(g)).toBeUndefined();
  });
  it('unions every node under the first (AGSEQ) node', () => {
    const [g, [a, b, c]] = makeRankGraph(3);
    const leader = d2unionAll(g);
    expect(leader).toBe(d2find(a));
    expect(d2find(b)).toBe(leader);
    expect(d2find(c)).toBe(leader);
  });
});

// ---------------------------------------------------------------------------
// xgFindEdge / xgAddEdge / xgDeleteEdge / xgMerge  @see rank.c (Xg helpers)
// ---------------------------------------------------------------------------

describe('xgFindEdge / xgAddEdge / xgDeleteEdge', () => {
  it('finds an added edge and deletes it', () => {
    const Xg = makeXg();
    const t = new Node(0, 't', Xg);
    const h = new Node(1, 'h', Xg);
    expect(xgFindEdge(Xg, t, h)).toBeUndefined();
    const e = xgAddEdge(Xg, t, h);
    expect(e.info.minlen).toBe(0);
    expect(e.info.weight).toBe(0);
    expect(xgFindEdge(Xg, t, h)).toBe(e);
    xgDeleteEdge(Xg, e);
    expect(Xg.edges).not.toContain(e);
    expect(() => xgDeleteEdge(Xg, e)).not.toThrow(); // already removed: i<0 branch
  });
});

describe('xgMerge', () => {
  it('takes the max minlen and accumulates weight', () => {
    const Xg = makeXg();
    const t = new Node(0, 't', Xg);
    const h = new Node(1, 'h', Xg);
    const e = xgAddEdge(Xg, t, h);
    e.info.minlen = 2; e.info.weight = 3;
    xgMerge(e, 1, 5); // minlen stays 2 (max(2,1)), weight becomes 8
    expect(e.info.minlen).toBe(2);
    expect(e.info.weight).toBe(8);
    xgMerge(e, 9, 1); // minlen becomes 9
    expect(e.info.minlen).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// csRanksetKind  @see rank.c:rankset_kind
// ---------------------------------------------------------------------------

describe('csRanksetKind', () => {
  it.each([
    ['min', MINRANK], ['source', SOURCERANK], ['max', MAXRANK],
    ['sink', SINKRANK], ['same', SAMERANK], ['bogus', 6 /* NORANK */],
  ])('rank=%s classifies correctly', (r, expected) => {
    const root = new Graph('root', 'directed');
    const sub = makeSubg(root, 'sub');
    if (r !== 'bogus') sub.attrs.set('rank', r);
    expect(csRanksetKind(sub)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// csSetupCluster  @see rank.c:set_parent + compile_samerank cluster setup
// ---------------------------------------------------------------------------

describe('csSetupCluster', () => {
  it('non-cluster subgraph passes parentClust through unchanged', () => {
    const root = new Graph('root', 'directed');
    const sub = makeSubg(root, 'sub');
    const parentClust = makeSubg(root, 'cluster0');
    expect(csSetupCluster(sub, parentClust)).toBe(parentClust);
  });
  it('cluster with a parentClust nests one level deeper', () => {
    const root = new Graph('root', 'directed');
    const outer = makeSubg(root, 'cluster0');
    const inner = makeSubg(root, 'cluster1');
    outer.info.level = 0;
    const ret = csSetupCluster(inner, outer);
    expect(ret).toBe(inner);
    expect(inner.info.level).toBe(1);
    expect(inner.info.parent).toBe(outer);
  });
  it('cluster with no parentClust becomes level 0', () => {
    const root = new Graph('root', 'directed');
    const clust = makeSubg(root, 'cluster0');
    expect(csSetupCluster(clust, undefined)).toBe(clust);
    expect(clust.info.level).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// csProcessClusterNodes  @see rank.c:compile_samerank (ND_clust seeding)
// ---------------------------------------------------------------------------

describe('csProcessClusterNodes', () => {
  it('seeds ND_clust only for nodes lacking one', () => {
    const root = new Graph('root', 'directed');
    const g = makeSubg(root, 'cluster0');
    const other = makeSubg(root, 'cluster1');
    const a = new Node(0, 'a', root);
    const b = new Node(1, 'b', root);
    b.info.clust = other;
    g.nodes.set('a', a); g.nodes.set('b', b);
    csProcessClusterNodes(g);
    expect(a.info.clust).toBe(g);
    expect(b.info.clust).toBe(other); // untouched
  });
});

// ---------------------------------------------------------------------------
// csProcessRankset  @see rank.c:compile_samerank (rankset leader bookkeeping)
// ---------------------------------------------------------------------------

describe('csProcessRankset', () => {
  it('is a no-op for NORANK', () => {
    const root = new Graph('root', 'directed');
    const g = makeSubg(root, 'sub');
    const a = new Node(0, 'a', root);
    g.nodes.set('a', a);
    const clust = makeSubg(root, 'cluster0');
    csProcessRankset(g, clust);
    expect(clust.info.minrep).toBeUndefined();
  });
  it('is a no-op when the subgraph has no nodes (leader undefined)', () => {
    const root = new Graph('root', 'directed');
    const g = makeSubg(root, 'sub');
    g.attrs.set('rank', 'min');
    const clust = makeSubg(root, 'cluster0');
    expect(() => csProcessRankset(g, clust)).not.toThrow();
    expect(clust.info.minrep).toBeUndefined();
  });
  it('is a no-op when clust is undefined', () => {
    const root = new Graph('root', 'directed');
    const g = makeSubg(root, 'sub');
    g.attrs.set('rank', 'min');
    const a = new Node(0, 'a', root);
    g.nodes.set('a', a);
    expect(() => csProcessRankset(g, undefined)).not.toThrow();
  });
  it('MINRANK/SOURCERANK sets clust.minrep', () => {
    const root = new Graph('root', 'directed');
    const g = makeSubg(root, 'sub');
    g.attrs.set('rank', 'source');
    const a = new Node(0, 'a', root);
    g.nodes.set('a', a);
    const clust = makeSubg(root, 'cluster0');
    csProcessRankset(g, clust);
    expect(clust.info.minrep).toBeDefined();
  });
  it('MAXRANK/SINKRANK sets clust.maxrep', () => {
    const root = new Graph('root', 'directed');
    const g = makeSubg(root, 'sub');
    g.attrs.set('rank', 'sink');
    const a = new Node(0, 'a', root);
    g.nodes.set('a', a);
    const clust = makeSubg(root, 'cluster0');
    csProcessRankset(g, clust);
    expect(clust.info.maxrep).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// csCheckDegenerate  @see rank.c:compile_samerank (degenerate min==max fixup)
// ---------------------------------------------------------------------------

describe('csCheckDegenerate', () => {
  it('skips a non-cluster graph', () => {
    const root = new Graph('root', 'directed');
    const g = makeSubg(root, 'sub');
    g.info.minrep = new Node(0, 'a', root);
    expect(() => csCheckDegenerate(g)).not.toThrow();
  });
  it('skips a cluster with no minrep', () => {
    const root = new Graph('root', 'directed');
    const clust = makeSubg(root, 'cluster0');
    expect(() => csCheckDegenerate(clust)).not.toThrow();
  });
  it('skips when minrep !== maxrep', () => {
    const root = new Graph('root', 'directed');
    const clust = makeSubg(root, 'cluster0');
    clust.info.minrep = new Node(0, 'a', root);
    clust.info.maxrep = new Node(1, 'b', root);
    csCheckDegenerate(clust);
    expect(clust.info.minrep?.name).toBe('a'); // unchanged
  });
  it('re-unions the whole cluster when minrep === maxrep', () => {
    const root = new Graph('root', 'directed');
    const clust = makeSubg(root, 'cluster0');
    const a = new Node(0, 'a', root);
    clust.nodes.set('a', a);
    clust.info.minrep = a; clust.info.maxrep = a;
    csCheckDegenerate(clust);
    expect(clust.info.minrep).toBe(d2find(a));
    expect(clust.info.maxrep).toBe(d2find(a));
  });
});

// ---------------------------------------------------------------------------
// compileSamerank — empty graph early return  @see rank.c:compile_samerank
// ---------------------------------------------------------------------------

describe('compileSamerank', () => {
  it('returns immediately for a graph with no nodes', () => {
    const root = new Graph('root', 'directed');
    const g = makeSubg(root, 'sub');
    expect(() => compileSamerank(g, undefined)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// compileNodes  @see rank.c:compile_nodes
// ---------------------------------------------------------------------------

describe('compileNodes', () => {
  it('makes one Xg node per UF representative; followers inherit .rep', () => {
    const [g, [a, b]] = makeRankGraph(2);
    b.info.set = a; a.info.set = a; // b follows a
    const Xg = makeXg();
    const st = makeSt();
    compileNodes(g, Xg, st);
    expect(a.info.rep).toBeDefined();
    expect(b.info.rep).toBe(a.info.rep);
    expect(Xg.nodes.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// xgStrong / xgWeakExists / xgWeakSetWeights / xgWeak
// ---------------------------------------------------------------------------

describe('xgStrong', () => {
  it('reuses a reverse-direction edge if one exists', () => {
    const Xg = makeXg();
    const t = new Node(0, 't', Xg);
    const h = new Node(1, 'h', Xg);
    const rev = xgAddEdge(Xg, h, t);
    const orig = new Edge(t, h, ''); orig.info.minlen = 4; orig.info.weight = 2;
    xgStrong(Xg, t, h, orig);
    expect(rev.info.minlen).toBe(4);
    expect(rev.info.weight).toBe(2);
    expect(xgFindEdge(Xg, t, h)).toBeUndefined(); // no NEW forward edge added
  });
});

describe('xgWeakExists', () => {
  it('finds a v->t, v->h diamond', () => {
    const Xg = makeXg();
    const t = new Node(0, 't', Xg);
    const h = new Node(1, 'h', Xg);
    const v = new Node(2, 'v', Xg);
    xgAddEdge(Xg, v, t); xgAddEdge(Xg, v, h);
    expect(xgWeakExists(Xg, t, h)).toBe(true);
  });
  it('returns false with no diamond', () => {
    const Xg = makeXg();
    const t = new Node(0, 't', Xg);
    const h = new Node(1, 'h', Xg);
    expect(xgWeakExists(Xg, t, h)).toBe(false);
  });
});

describe('xgWeakSetWeights', () => {
  it('applies the BACKWARD_PENALTY to e, the raw weight to f', () => {
    const Xg = makeXg();
    const v = new Node(0, 'v', Xg);
    const t = new Node(1, 't', Xg);
    const h = new Node(2, 'h', Xg);
    const e = xgAddEdge(Xg, v, t);
    const f = xgAddEdge(Xg, v, h);
    xgWeakSetWeights(e, f, 2, 5);
    expect(e.info.weight).toBe(2000); // 2 * BACKWARD_PENALTY
    expect(f.info.minlen).toBe(5);
    expect(f.info.weight).toBe(2);
  });
});

describe('xgWeak', () => {
  it('creates a weak node with two edges on first call', () => {
    const Xg = makeXg();
    const st = makeSt();
    const t = new Node(0, 't', Xg);
    const h = new Node(1, 'h', Xg);
    const orig = new Edge(t, h, '');
    xgWeak(Xg, t, h, orig, st);
    expect(st.weakId).toBe(1);
    expect(Xg.nodes.has('_weak_0')).toBe(true);
  });
  it('is a no-op when a v->t,v->h diamond already exists', () => {
    const Xg = makeXg();
    const st = makeSt();
    const t = new Node(0, 't', Xg);
    const h = new Node(1, 'h', Xg);
    const v = new Node(2, 'v', Xg);
    xgAddEdge(Xg, v, t); xgAddEdge(Xg, v, h);
    const orig = new Edge(t, h, '');
    xgWeak(Xg, t, h, orig, st);
    expect(st.weakId).toBe(0); // no new weak node created
  });
});

// ---------------------------------------------------------------------------
// isNonConstraint / isAStrongCluster  @see rank.c:is_nonconstraint / is_a_strong_cluster
// ---------------------------------------------------------------------------

describe('isNonConstraint', () => {
  it('false when constraint is unset', () => {
    const g = new Graph('g', 'directed');
    const e = new Edge(new Node(0, 'a', g), new Node(1, 'b', g), '');
    expect(isNonConstraint(e)).toBe(false);
  });
  it('true when constraint=false', () => {
    const g = new Graph('g', 'directed');
    const e = new Edge(new Node(0, 'a', g), new Node(1, 'b', g), '');
    e.attrs.set('constraint', 'false');
    expect(isNonConstraint(e)).toBe(true);
  });
  it('false when constraint=true', () => {
    const g = new Graph('g', 'directed');
    const e = new Edge(new Node(0, 'a', g), new Node(1, 'b', g), '');
    e.attrs.set('constraint', 'true');
    expect(isNonConstraint(e)).toBe(false);
  });
});

describe('isAStrongCluster', () => {
  it('false when compact is unset, true when compact=true', () => {
    const root = new Graph('root', 'directed');
    const g = makeSubg(root, 'cluster0');
    expect(isAStrongCluster(g)).toBe(false);
    g.attrs.set('compact', 'true');
    expect(isAStrongCluster(g)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// dotLca / isInternalToCluster / ceShouldSwap / ceInternal
// ---------------------------------------------------------------------------

function makeClusterPair(root: Graph): [Graph, Graph] {
  const a = makeSubg(root, 'cluster0');
  const b = makeSubg(root, 'cluster1');
  a.info.level = 1; b.info.level = 1;
  return [a, b];
}

describe('isInternalToCluster', () => {
  it('true when both endpoints share the same cluster', () => {
    const root = new Graph('root', 'directed');
    const clust = makeSubg(root, 'cluster0');
    const t = new Node(0, 't', root); t.info.clust = clust;
    const h = new Node(1, 'h', root); h.info.clust = clust;
    expect(isInternalToCluster(new Edge(t, h, ''))).toBe(true);
  });
  it('false when only one endpoint has a cluster', () => {
    const root = new Graph('root', 'directed');
    const clust = makeSubg(root, 'cluster0');
    const t = new Node(0, 't', root); t.info.clust = clust;
    const h = new Node(1, 'h', root);
    expect(isInternalToCluster(new Edge(t, h, ''))).toBe(false);
  });
  it('walks dotLca when clusters differ, returning based on the LCA', () => {
    const root = new Graph('root', 'directed');
    const [ca, cb] = makeClusterPair(root);
    cb.info.parent = ca; cb.info.level = 2; // cb nested inside ca
    const t = new Node(0, 't', root); t.info.clust = ca;
    const h = new Node(1, 'h', root); h.info.clust = cb;
    expect(dotLca(ca, cb)).toBe(ca);
    expect(isInternalToCluster(new Edge(t, h, ''))).toBe(true);
  });
});

describe('ceShouldSwap / ceInternal', () => {
  it('swaps when the tail is the enclosing cluster maxrep', () => {
    const root = new Graph('root', 'directed');
    const Xg = makeXg();
    const clust = makeSubg(root, 'cluster0');
    const t = new Node(0, 't', root); t.info.clust = clust;
    const h = new Node(1, 'h', root); h.info.clust = clust;
    clust.info.maxrep = d2find(t);
    const e = new Edge(t, h, '');
    expect(ceShouldSwap(e, clust, clust)).toBe(true);
    const Xt = new Node(2, 'Xt', Xg);
    const Xh = new Node(3, 'Xh', Xg);
    ceInternal(Xg, e, Xt, Xh);
    expect(xgFindEdge(Xg, Xh, Xt)).toBeDefined(); // swapped: h then t
  });
  it('does not swap in the ordinary case', () => {
    const root = new Graph('root', 'directed');
    const Xg = makeXg();
    const clust = makeSubg(root, 'cluster0');
    const t = new Node(0, 't', root); t.info.clust = clust;
    const h = new Node(1, 'h', root); h.info.clust = clust;
    const e = new Edge(t, h, '');
    expect(ceShouldSwap(e, clust, clust)).toBe(false);
    const Xt = new Node(2, 'Xt', Xg);
    const Xh = new Node(3, 'Xh', Xg);
    ceInternal(Xg, e, Xt, Xh);
    expect(xgFindEdge(Xg, Xt, Xh)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// compileEdgeItem / compileEdges  @see rank.c:compile_edges
// ---------------------------------------------------------------------------

describe('compileEdgeItem', () => {
  it('skips a non-constraint edge', () => {
    const [g] = makeRankGraph(2);
    const [a, b] = [...g.nodes.values()];
    const Xg = makeXg();
    const st = makeSt();
    a.info.rep = new Node(0, 'Xa', Xg); b.info.rep = new Node(1, 'Xb', Xg);
    const e = new Edge(a, b, ''); e.attrs.set('constraint', 'false');
    compileEdgeItem(Xg, e, a.info.rep, st);
    expect(Xg.edges.length).toBe(0);
  });
  it('skips when the head has no rep', () => {
    const [g] = makeRankGraph(2);
    const [a, b] = [...g.nodes.values()];
    const Xg = makeXg();
    const st = makeSt();
    a.info.rep = new Node(0, 'Xa', Xg); // b has no rep
    const e = new Edge(a, b, '');
    expect(() => compileEdgeItem(Xg, e, a.info.rep!, st)).not.toThrow();
    expect(Xg.edges.length).toBe(0);
  });
  it('skips a self-collapsed edge (Xt === Xh)', () => {
    const [g] = makeRankGraph(2);
    const [a, b] = [...g.nodes.values()];
    const Xg = makeXg();
    const st = makeSt();
    const shared = new Node(0, 'shared', Xg);
    a.info.rep = shared; b.info.rep = shared;
    const e = new Edge(a, b, '');
    compileEdgeItem(Xg, e, a.info.rep, st);
    expect(Xg.edges.length).toBe(0);
  });
  it('routes through xgWeak when either endpoint is in a strong cluster', () => {
    const root = new Graph('root', 'directed');
    const a = new Node(0, 'a', root);
    const b = new Node(1, 'b', root);
    const clust = makeSubg(root, 'cluster0');
    clust.attrs.set('compact', 'true');
    a.info.clust = clust; // b has no cluster -> not internal
    const Xg = makeXg();
    const st = makeSt();
    a.info.rep = new Node(0, 'Xa', Xg); b.info.rep = new Node(1, 'Xb', Xg);
    const e = new Edge(a, b, '');
    compileEdgeItem(Xg, e, a.info.rep, st);
    expect(Xg.nodes.has('_weak_0')).toBe(true);
  });
});

describe('compileEdges', () => {
  it('skips a node with no Xg representative', () => {
    const [g, [a, b]] = makeRankGraph(2);
    addRankEdge(g, a, b); // a has no .info.rep -> Xt undefined -> continue
    const Xg = makeXg();
    const st = makeSt();
    expect(() => compileEdges(g, Xg, st)).not.toThrow();
    expect(Xg.edges.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ccProcessNode  @see rank.c:compile_clusters (TOP/BOT wiring)
// ---------------------------------------------------------------------------

describe('ccProcessNode', () => {
  it('skips a node with no Xg representative', () => {
    const root = new Graph('root', 'directed');
    const g = makeSubg(root, 'cluster0');
    const n = new Node(0, 'n', root);
    g.nodes.set('n', n);
    const Xg = makeXg();
    const st = makeSt();
    expect(() => ccProcessNode(g, Xg, st, n, { top: undefined, bot: undefined })).not.toThrow();
  });
  it('creates TOP on first no-in-edge node, reuses it on the second', () => {
    const root = new Graph('root', 'directed');
    const g = makeSubg(root, 'cluster0');
    const a = new Node(0, 'a', root);
    const b = new Node(1, 'b', root);
    g.nodes.set('a', a); g.nodes.set('b', b);
    const Xg = makeXg();
    const st = makeSt();
    a.info.rep = new Node(0, 'Xa', Xg);
    b.info.rep = new Node(1, 'Xb', Xg);
    const bounds: { top: Node | undefined; bot: Node | undefined } = { top: undefined, bot: undefined };
    ccProcessNode(g, Xg, st, a, bounds);
    expect(bounds.top).toBeDefined();
    const firstTop = bounds.top;
    ccProcessNode(g, Xg, st, b, bounds);
    expect(bounds.top).toBe(firstTop); // reused, not recreated
  });
});

// ---------------------------------------------------------------------------
// reverseEdge2  @see rank.c:break_cycles (reverse helper)
// ---------------------------------------------------------------------------

describe('reverseEdge2', () => {
  it('creates a new reverse edge when none exists', () => {
    const Xg = makeXg();
    const t = new Node(0, 't', Xg);
    const h = new Node(1, 'h', Xg);
    const e = xgAddEdge(Xg, t, h);
    e.info.minlen = 2; e.info.weight = 3;
    reverseEdge2(Xg, e);
    expect(Xg.edges).not.toContain(e);
    const rev = xgFindEdge(Xg, h, t);
    expect(rev?.info.minlen).toBe(2);
    expect(rev?.info.weight).toBe(3);
  });
  it('merges into an existing reverse edge', () => {
    const Xg = makeXg();
    const t = new Node(0, 't', Xg);
    const h = new Node(1, 'h', Xg);
    const existing = xgAddEdge(Xg, h, t);
    existing.info.minlen = 1; existing.info.weight = 1;
    const e = xgAddEdge(Xg, t, h);
    e.info.minlen = 5; e.info.weight = 2;
    reverseEdge2(Xg, e);
    expect(existing.info.minlen).toBe(5);
    expect(existing.info.weight).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// dfsNode / dfsStep  @see rank.c:break_cycles (iterative DFS)
// ---------------------------------------------------------------------------

describe('dfsNode', () => {
  it('does not push a frame for an already-marked node', () => {
    const Xg = makeXg();
    const v = new Node(0, 'v', Xg);
    v.info.mark = 1;
    const frames: { v: Node; edges: Edge[]; i: number }[] = [];
    dfsNode(Xg, v, frames);
    expect(frames.length).toBe(0);
  });
});

describe('dfsStep', () => {
  it('reverses an edge into an on-stack node', () => {
    const Xg = makeXg();
    const v = new Node(0, 'v', Xg);
    const w = new Node(1, 'w', Xg);
    w.info.onstack = 1;
    const e = xgAddEdge(Xg, v, w);
    const frames = [{ v, edges: [e], i: 0 }];
    dfsStep(Xg, frames);
    expect(Xg.edges).not.toContain(e);
    expect(xgFindEdge(Xg, w, v)).toBeDefined();
  });
  it('skips an edge into a visited-but-not-on-stack node', () => {
    const Xg = makeXg();
    const v = new Node(0, 'v', Xg);
    const w = new Node(1, 'w', Xg);
    w.info.mark = 1; w.info.onstack = 0;
    const e = xgAddEdge(Xg, v, w);
    const frames = [{ v, edges: [e], i: 0 }];
    dfsStep(Xg, frames);
    expect(Xg.edges).toContain(e); // untouched: neither branch fired
    expect(frames.length).toBe(1); // no new frame pushed
  });
  it('pops the frame once all edges are processed', () => {
    const Xg = makeXg();
    const v = new Node(0, 'v', Xg);
    v.info.onstack = 1;
    const frames = [{ v, edges: [], i: 0 }];
    dfsStep(Xg, frames);
    expect(frames.length).toBe(0);
    expect(v.info.onstack).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// connectComponents  @see rank.c:connect_components
// ---------------------------------------------------------------------------

describe('connectComponents', () => {
  it('adds a synthetic root linking multiple disconnected components', () => {
    const Xg = makeXg();
    const st = makeSt();
    const a = new Node(0, 'a', Xg);
    const b = new Node(1, 'b', Xg);
    a.info.next = b; Xg.info.nlist = a;
    Xg.nodes.set('a', a); Xg.nodes.set('b', b);
    // no edges between a and b -> two separate components
    const cc = connectComponents(Xg, st);
    expect(cc).toBe(2);
    expect(Xg.nodes.has('\x7froot')).toBe(true);
    expect(xgFindEdge(Xg, Xg.nodes.get('\x7froot')!, b)).toBeDefined();
  });
  it('reports one component for a connected graph', () => {
    const Xg = makeXg();
    const st = makeSt();
    const a = new Node(0, 'a', Xg);
    const b = new Node(1, 'b', Xg);
    Xg.nodes.set('a', a); Xg.nodes.set('b', b);
    xgAddEdge(Xg, a, b);
    const cc = connectComponents(Xg, st);
    expect(cc).toBe(1);
    expect(Xg.nodes.has('\x7froot')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// addFastEdges  @see rank.c:add_fast_edges
// ---------------------------------------------------------------------------

describe('addFastEdges', () => {
  it('initializes and appends to fresh in/out lists', () => {
    const Xg = makeXg();
    const t = new Node(0, 't', Xg);
    const h = new Node(1, 'h', Xg);
    const e = xgAddEdge(Xg, t, h);
    addFastEdges(Xg);
    expect(t.info.out?.list[0]).toBe(e);
    expect(h.info.in?.list[0]).toBe(e);
  });
});

// ---------------------------------------------------------------------------
// setMinMax2  @see rank.c:setMinMax
// ---------------------------------------------------------------------------

describe('setMinMax2', () => {
  it('returns early for a parentless graph when doRoot=false', () => {
    const g = new Graph('g', 'directed');
    setMinMax2(g, false);
    expect(g.info.leader).toBeUndefined();
  });
  it('scans nodes and sets minrank/maxrank/leader when doRoot=true', () => {
    const [g, [a, b]] = makeRankGraph(2);
    a.info.rank = 3; b.info.rank = 1;
    setMinMax2(g, true);
    expect(g.info.minrank).toBe(1);
    expect(g.info.maxrank).toBe(3);
    expect(g.info.leader).toBe(b);
  });
  it('recurses into clusters even when the graph itself is skipped', () => {
    const root = new Graph('root', 'directed');
    const clust = makeSubg(root, 'cluster0');
    clust.info.parent = root; // gHasParent(clust) must be true to proceed
    const a = new Node(0, 'a', root); a.info.rank = 2;
    clust.nodes.set('a', a);
    root.info.n_cluster = 1; root.info.clust = [clust];
    setMinMax2(root, false);
    expect(clust.info.minrank).toBe(2);
    expect(clust.info.maxrank).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// readout* helpers  @see rank.c:readout_levels
// ---------------------------------------------------------------------------

describe('readoutCopyRank / readoutUpdateMinrk', () => {
  it('copies rank from the Xg rep and tracks per-hop minima', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    const Xg = makeXg();
    const xn = new Node(0, 'xn', Xg);
    xn.info.rank = 4; xn.info.hops = 1;
    n.info.set = n; n.info.rep = xn;
    readoutCopyRank(g, n);
    expect(n.info.rank).toBe(4);
    expect(g.info.maxrank).toBe(4);
    expect(g.info.minrank).toBe(4);
    const minrk = [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
    readoutUpdateMinrk(n, xn, minrk);
    expect(n.info.hops).toBe(1);
    expect(minrk[1]).toBe(4);
  });
});

describe('readoutApplyMinrk / readoutShiftAll', () => {
  it('subtracts the per-hop minimum from each node rank', () => {
    const [g, [a, b]] = makeRankGraph(2);
    a.info.rank = 5; a.info.hops = 0;
    b.info.rank = 7; b.info.hops = 1;
    readoutApplyMinrk(g, [2, 3]);
    expect(a.info.rank).toBe(3);
    expect(b.info.rank).toBe(4);
  });
  it('shifts every node by a constant delta', () => {
    const [g, [a, b]] = makeRankGraph(2);
    a.info.rank = 5; b.info.rank = 7;
    readoutShiftAll(g, 2);
    expect(a.info.rank).toBe(3);
    expect(b.info.rank).toBe(5);
  });
});

describe('readoutScanNodes', () => {
  it('updates minrk only when a minrk array is supplied', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    g.nodes.set('n', n);
    const Xg = makeXg();
    const xn = new Node(0, 'xn', Xg);
    xn.info.rank = 1; xn.info.hops = 0;
    n.info.set = n; n.info.rep = xn;
    readoutScanNodes(g, undefined);
    expect(n.info.rank).toBe(1);
    const minrk = [Number.MAX_SAFE_INTEGER];
    readoutScanNodes(g, minrk);
    expect(minrk[0]).toBe(1);
  });
});

describe('readoutNormalize', () => {
  it('applies minrk and returns true when minrk is supplied', () => {
    const [g] = makeRankGraph(1);
    const [a] = [...g.nodes.values()];
    a.info.rank = 5; a.info.hops = 0;
    expect(readoutNormalize(g, [2])).toBe(true);
    expect(a.info.rank).toBe(3);
  });
  it('shifts by minrank when no minrk and minrank>0', () => {
    const [g, [a]] = makeRankGraph(1);
    a.info.rank = 5;
    g.info.minrank = 3; g.info.maxrank = 8;
    expect(readoutNormalize(g, undefined)).toBe(false);
    expect(a.info.rank).toBe(2);
    expect(g.info.minrank).toBe(0);
    expect(g.info.maxrank).toBe(5);
  });
  it('is a no-op when minrank is MAX_SAFE_INTEGER (empty graph)', () => {
    const [g] = makeRankGraph(0);
    g.info.minrank = Number.MAX_SAFE_INTEGER;
    expect(readoutNormalize(g, undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// dot2Rank end-to-end — constraint=false, strong cluster, multi-component
// ---------------------------------------------------------------------------

describe('dot2Rank — constraint=false edge is excluded from leveling', () => {
  it('a constraint=false edge does not force a rank gap', () => {
    const [g, [a, b]] = makeRankGraph(2);
    const e = addRankEdge(g, a, b);
    e.attrs.set('constraint', 'false');
    dot2Rank(g);
    expect(a.info.rank).toBe(b.info.rank); // no ordering constraint applied
  });
});

describe('dot2Rank — strong cluster (compact=true) pulls members together', () => {
  it('ranks a chain containing one compact cluster', () => {
    const [g, [a, b, c]] = makeRankGraph(3);
    addRankEdge(g, a, b);
    addRankEdge(g, b, c);
    const clust = makeSubg(g, 'cluster0');
    clust.attrs.set('compact', 'true');
    clust.nodes.set('b', b);
    g.subgraphs.set('cluster0', clust);
    dot2Rank(g);
    expect(a.info.rank).toBe(0);
    expect(b.info.rank).toBe(1);
    expect(c.info.rank).toBe(2);
  });
});

describe('dot2Rank — multi-component graph exercises the minrk readout path', () => {
  it('ranks two disconnected chains independently from rank 0', () => {
    const [g, [a, b, c, d]] = makeRankGraph(4);
    addRankEdge(g, a, b);
    addRankEdge(g, c, d);
    dot2Rank(g);
    expect(a.info.rank).toBe(0);
    expect(b.info.rank).toBe(1);
    expect(c.info.rank).toBe(0);
    expect(d.info.rank).toBe(1);
  });
});
