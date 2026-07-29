// SPDX-License-Identifier: EPL-2.0
/**
 * T4a — branch-coverage tests for layout/dot/classify.ts.
 *
 * classify.ts exports only class1, class2, makeChain, mergeChain, mergeable,
 * portsEq, nonconstraintEdge — every other helper (epClass, interclust1*,
 * labelVnode, incrWidth, leaderOf, nodeRank/edgeCount/edgeXpenalty/edgeWeight,
 * handleClusterMergeable, concentrateOrMerge, handleMultiSameRank, tryOppEdge,
 * class2OneEdge, ...) is module-private. Mixed mode (D1): every test here
 * drives one of the exported entry points against a small hand-built real
 * Graph/Node/Edge fixture (fastNode/fastEdge wiring happens inside classify.ts
 * itself, so private-symbol fakes are not an option — the real model classes
 * are required). Each describe block targets the specific uncovered ?? / if
 * branch(es) named in its @see comment, and each fixture deliberately leaves
 * the minimum set of fields unset so the ?? default arm actually fires.
 *
 * @see lib/dotgen/class1.c
 * @see lib/dotgen/class2.c
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import type { EdgeInfo } from '../../model/edgeInfo.js';
import { class1, class2, makeChain, mergeChain } from './classify.js';
import { ufUnion } from './decomp.js';
import { CL_BACK, IGNORED } from './rank.js';

/** A minimal defined (non-undefined) label stand-in — only presence matters
 *  for the branches under test, never its rendered content. */
function stubLabel(): NonNullable<EdgeInfo['label']> {
  return {} as unknown as NonNullable<EdgeInfo['label']>;
}

// ---------------------------------------------------------------------------
// epClass weight_class ?? default, via applyVirtualWeight  @see classify.ts:75
// ---------------------------------------------------------------------------

describe('makeChain — epClass weight_class ?? default (L75)', () => {
  it('computes CLASSIFY_WEIGHT_TABLE from one explicit and one defaulted weight_class', () => {
    const g = new Graph('g', 'directed');
    const from = new Node(0, 'from', g);
    const to = new Node(1, 'to', g);
    from.info.rank = 0;
    to.info.rank = 1; // single-hop chain: makeChain wires from->to directly
    from.info.weight_class = 0; // explicit -> SINGLETON (weight_class<=1)
    // to.info.weight_class left unset -> epClass default (??2) -> ORDINARY
    const orig = new Edge(from, to, '');
    makeChain(g, from, to, orig);
    // CLASSIFY_WEIGHT_TABLE[SINGLETON=1][ORDINARY=0] = 1; orig.weight defaults to 1.
    // (column 0 is uniformly 1, so this only proves both epClass calls ran
    // without throwing — the ?? branch coverage is what this test targets.)
    expect(from.info.out?.list[0].info.weight).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// labelVnode ND_lw ?? default  @see classify.ts:167
// ---------------------------------------------------------------------------

describe('makeChain — labelVnode lw uses root nodesep ?? 0 (L167)', () => {
  it('sets the label vnode lw to 0 when the root graph has no nodesep', () => {
    const g = new Graph('g', 'directed');
    const from = new Node(0, 'from', g);
    const to = new Node(1, 'to', g);
    from.info.rank = 0;
    to.info.rank = 2;
    const orig = new Edge(from, to, '');
    // A defined label with no dimen, so labelVnodeDimen() returns undefined
    // and only the lw ?? 0 fallback is exercised (not the ht/rw block).
    orig.info.label = stubLabel();
    makeChain(g, from, to, orig);
    const vnode = from.info.out?.list[0].head;
    expect(vnode?.info.lw).toBe(0);
    expect(vnode?.info.label).toBe(orig.info.label);
  });
});

// ---------------------------------------------------------------------------
// makeChain labelRank/toRank/loop-init ?? defaults  @see classify.ts:204,207,208
// ---------------------------------------------------------------------------

describe('makeChain — rank ?? 0 fallbacks with both endpoints unranked (L204,L207,L208)', () => {
  it('evaluates the fallbacks even though the resulting chain is a structural no-op', () => {
    const g = new Graph('g', 'directed');
    const from = new Node(0, 'from', g);
    const to = new Node(1, 'to', g);
    // from.rank / to.rank intentionally left unset.
    const orig = new Edge(from, to, '');
    orig.info.label = stubLabel(); // forces the labelRank ternary's true arm
    makeChain(g, from, to, orig);
    // toRank = to.rank??0 = 0; loop start r = (from.rank??0)+1 = 1; 1<=0 is
    // false, so no virtual edge is ever created.
    expect(from.info.out).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// mergeChain: lastrank/rep.head.rank ?? defaults, edgeCount/xpenalty/weight ??
// defaults, incrWidth lw/rw ?? default  @see classify.ts:178,179,220-223,238,242
// ---------------------------------------------------------------------------

describe('mergeChain — rank/count/xpenalty/weight ?? defaults on an unranked merge (L220-223,L238,L242)', () => {
  it('accumulates through the ?? defaults when e and rep.head are all unranked', () => {
    const g = new Graph('g', 'directed');
    const x = new Node(0, 'x', g);
    const y = new Node(1, 'y', g);
    // e.tail/head rank left unset -> lastrank = Math.max(??0, ??0) = 0.
    const e = new Edge(x, y, '');
    // e.info.count/xpenalty/weight left unset -> the "e" side of every ??.
    const stub = new Node(2, 'stub', g);
    const v1 = new Node(3, 'v1', g); // rank left unset -> matches lastrank(0)
    const f = new Edge(stub, v1, '');
    f.info.count = 5;
    f.info.xpenalty = 2;
    f.info.weight = 3;
    mergeChain(g, e, f, true);
    expect(e.info.to_virt).toBe(f);
    expect(f.info.count).toBe(6); // 5 + edgeCount(e) default 1
    expect(f.info.xpenalty).toBe(2); // 2 + edgeXpenalty(e) default 0
    expect(f.info.weight).toBe(4); // 3 + edgeWeight(e) default 1
  });
});

describe('mergeChain — incrWidth lw/rw ?? default on a mismatched rep.head (L178,L179)', () => {
  it('defaults lw/rw to 0 before adding the nodesep-derived width', () => {
    const g = new Graph('g', 'directed');
    const x = new Node(0, 'x', g);
    const y = new Node(1, 'y', g);
    x.info.rank = 0;
    y.info.rank = 5; // lastrank = 5
    g.info.nodesep = 10; // incrWidth width = floor(10/2) = 5
    const e = new Edge(x, y, '');
    const stub = new Node(2, 'stub', g);
    const v2 = new Node(3, 'v2', g);
    v2.info.rank = 1; // !== lastrank(5) -> mismatch, loop reaches incrWidth
    // Force lw/rw undefined (NodeInfo normally guarantees them numeric via
    // makeNodeInfo) to exercise incrWidth's defensive ?? 0 fallback — the
    // same calloc-zero coercion hazard documented project-wide.
    v2.info.lw = undefined as unknown as number;
    v2.info.rw = undefined as unknown as number;
    const f = new Edge(stub, v2, '');
    mergeChain(g, e, f, false);
    expect(v2.info.lw).toBe(5);
    expect(v2.info.rw).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// class1Edge skips already-classified edges  @see classify.ts:126
// ---------------------------------------------------------------------------

describe('class1 — class1Edge skips edges whose to_virt is already set (L126)', () => {
  it('does not touch the fast graph when to_virt is pre-set', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g);
    g.nodes.set('a', a);
    g.nodes.set('b', b);
    const e = new Edge(a, b, '');
    g.edges.push(e);
    e.info.to_virt = e; // sentinel: "already classified"
    class1(g);
    expect(a.info.out).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// interclust1 rank/minlen ?? defaults  @see classify.ts:91,96,100
// ---------------------------------------------------------------------------

describe('class1 — interclust1 rank/minlen ?? defaults for two single-member clusters (L91,L96,L100)', () => {
  it('builds slack-node aux edges with defaulted (0/1) lengths when ranks/minlen are unset', () => {
    const g = new Graph('g', 'directed');
    const leaderA = new Node(0, 'la', g);
    const leaderB = new Node(1, 'lb', g);
    g.nodes.set('la', leaderA);
    g.nodes.set('lb', leaderB);
    const edge = new Edge(leaderA, leaderB, '');
    g.edges.push(edge);
    const clustA = new Graph('clustA', 'directed');
    clustA.info.leader = leaderA;
    clustA.nodes.set('la', leaderA);
    const clustB = new Graph('clustB', 'directed');
    clustB.info.leader = leaderB;
    clustB.nodes.set('lb', leaderB);
    g.info.n_cluster = 2;
    g.info.clust = [clustA, clustB];
    class1(g);
    // offset = (minlen??1) + tRank(0) - hRank(0) = 1 > 0 -> [tLen=0, hLen=1]
    expect(leaderA.info.in?.size).toBe(1);
    expect(leaderA.info.in?.list[0].info.minlen).toBe(0);
    expect(leaderA.info.in?.list[0].info.weight).toBe(CL_BACK);
    expect(leaderB.info.in?.size).toBe(1);
    expect(leaderB.info.in?.list[0].info.minlen).toBe(1);
    expect(leaderB.info.in?.list[0].info.weight).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// leaderOf/nodeRank/handleClusterMergeable ?? defaults  @see classify.ts:190,220,303
// ---------------------------------------------------------------------------

describe('class2 — handleClusterMergeable/leaderOf/nodeRank ?? defaults on an unranked cluster edge (L190,L220,L303)', () => {
  it('merges a duplicate cluster edge via mergeOneway when ranks default to 0', () => {
    const g = new Graph('g', 'directed');
    const t = new Node(0, 't', g);
    const h = new Node(1, 'h', g);
    g.nodes.set('t', t);
    g.nodes.set('h', h);
    const clustG = new Graph('cg', 'directed');
    clustG.info.leader = h;
    clustG.nodes.set('h', h);
    clustG.info.rankleader = [h]; // indexed by h.info.rank ?? 0 = 0
    g.info.n_cluster = 1;
    g.info.clust = [clustG];
    const e1 = new Edge(t, h, '');
    const e2 = new Edge(t, h, '');
    g.edges.push(e1, e2);
    class2(g);
    expect(e2.info.to_virt).toBe(e1);
  });
});

// ---------------------------------------------------------------------------
// concentrateOrMerge falls to the merge branch when concentrate is unset
// @see classify.ts:328
// ---------------------------------------------------------------------------

describe('class2 — concentrateOrMerge merges when concentrate is unset (L328)', () => {
  it('merges a duplicate multi-rank edge into the prior virtual chain', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g);
    g.nodes.set('a', a);
    g.nodes.set('b', b);
    a.info.rank = 0;
    b.info.rank = 2;
    const e1 = new Edge(a, b, '');
    const e2 = new Edge(a, b, '');
    g.edges.push(e1, e2);
    // g.info.concentrate intentionally left unset -> ?? false = false.
    class2(g);
    expect(e1.info.to_virt).toBeDefined();
    expect(e2.info.to_virt).toBe(e1.info.to_virt);
    expect(e2.info.edge_type).not.toBe(IGNORED);
  });
});

// ---------------------------------------------------------------------------
// handleMultiSameRank rank ?? defaults  @see classify.ts:335
// ---------------------------------------------------------------------------

describe('class2 — handleMultiSameRank rank ?? defaults on an unranked flat duplicate (L335)', () => {
  it('merges a duplicate same-rank edge via mergeOneway when both ranks default to 0', () => {
    const g = new Graph('g', 'directed');
    const c = new Node(0, 'c', g);
    const d = new Node(1, 'd', g);
    g.nodes.set('c', c);
    g.nodes.set('d', d);
    // c.rank / d.rank intentionally left unset -> both default to 0 (equal).
    const e3 = new Edge(c, d, '');
    const e4 = new Edge(c, d, '');
    g.edges.push(e3, e4);
    class2(g);
    expect(e4.info.to_virt).toBe(e3);
  });
});

// ---------------------------------------------------------------------------
// tryOppEdge skips an opp already marked IGNORED  @see classify.ts:373
// ---------------------------------------------------------------------------

describe('class2 — tryOppEdge skips an opp already marked IGNORED (L373)', () => {
  it('falls through to a fresh chain when the only candidate opp is IGNORED', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g);
    g.nodes.set('a', a);
    g.nodes.set('b', b);
    a.info.rank = 0;
    b.info.rank = 1;
    const forward = new Edge(a, b, '');
    forward.info.edge_type = IGNORED; // pre-marked, e.g. by an earlier concentrate merge
    const back = new Edge(b, a, '');
    g.edges.push(forward, back);
    class2(g);
    expect(back.info.to_virt).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// class2OneEdge skips an edge whose tail/head is not its own UF root
// @see classify.ts:412
// ---------------------------------------------------------------------------

describe('class2 — class2OneEdge returns prev when tail resolves to a different UF root (L412)', () => {
  it('leaves the edge unprocessed when the tail is not its own UF root', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g);
    const c = new Node(2, 'c', g);
    g.nodes.set('a', a);
    g.nodes.set('b', b);
    g.nodes.set('c', c);
    ufUnion(a, b); // b's UF root becomes a
    const e = new Edge(b, c, '');
    g.edges.push(e);
    class2(g);
    expect(e.info.to_virt).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// class2 comp fallback for a non-root subgraph  @see classify.ts:461
// ---------------------------------------------------------------------------

describe('class2 — non-root subgraph comp falls back to null when nlist is unset (L461)', () => {
  it('sets comp to [null] for an empty non-root subgraph', () => {
    const rootG = new Graph('root', 'directed');
    const subg = new Graph('sub', 'directed');
    subg.root = rootG;
    class2(subg);
    expect(subg.info.comp).toEqual([null]);
  });
});
