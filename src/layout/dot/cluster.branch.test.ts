// SPDX-License-Identifier: EPL-2.0
/**
 * T4a — branch-coverage tests for layout/dot/cluster.ts.
 *
 * D1 (unit-first): every branch targeted here is exercised directly against
 * hand-built Graph/Node/Edge fixtures (mirroring rank.branch.test.ts /
 * ns.branch.test.ts), bypassing the full dot1Rank pipeline so each `??`
 * fallback and each `if` arm can be forced independently.
 *
 * @see lib/dotgen/cluster.c
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import {
  interclexpRanksEq, interclexpHeadHigher, interclexpFlat,
  mergeRanksOne, mergeRanks, expandCluster, markClustersVnodes,
  buildSkeletonEdgeCounts, buildSkeletonCountsNode, buildSkeletonTrimSize,
  installClusterRanks, installCluster, agDeleteFromCluster, makeClusterCtx,
} from './cluster.js';
import { VIRTUAL, flatEdge } from './fastgr.js';
import { makeEmptyRank } from './mincross-build.js';

// ---------------------------------------------------------------------------
// interclexpRanksEq / interclexpHeadHigher — ?? 0 fallbacks  @see cluster.c:interclexp
// ---------------------------------------------------------------------------

describe('interclexpRanksEq — both ranks default to 0 when unset', () => {
  it('treats two undefined ranks as equal (0 === 0)', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g);
    const e = new Edge(a, b, ''); // tail/head .info.rank left undefined
    expect(interclexpRanksEq(e)).toBe(true);
  });
});

describe('interclexpHeadHigher — both ranks default to 0 when unset', () => {
  it('returns false when both undefined ranks fall back to 0 (0 > 0 is false)', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g);
    const e = new Edge(a, b, '');
    expect(interclexpHeadHigher(e)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// interclexpFlat — mergeOneway skipped when e already has a virtual rep
// ---------------------------------------------------------------------------

describe('interclexpFlat — merges e into fe via mergeOneway when e has no rep yet', () => {
  it('sets e.info.to_virt to fe (the true branch of the to_virt guard)', () => {
    const g = new Graph('g', 'directed');
    const tail = new Node(0, 't', g);
    const head = new Node(1, 'h', g);
    const fe = new Edge(tail, head, ''); // pre-existing registered flat edge
    flatEdge(g, fe);
    const e = new Edge(tail, head, ''); // to_virt left undefined -> mergeOneway runs
    const result = interclexpFlat(g, e, undefined);
    expect(result).toBeUndefined();
    expect(e.info.to_virt).toBe(fe);
  });
});

describe('interclexpFlat — skips mergeOneway when e.info.to_virt is already set', () => {
  it('still records e via safeOtherEdge but leaves to_virt untouched', () => {
    const g = new Graph('g', 'directed');
    const tail = new Node(0, 't', g);
    const head = new Node(1, 'h', g);
    const fe = new Edge(tail, head, ''); // pre-existing registered flat edge
    flatEdge(g, fe);
    const rep = new Edge(tail, head, '');
    const e = new Edge(tail, head, ''); // distinct edge object, e !== fe
    e.info.to_virt = rep;
    const result = interclexpFlat(g, e, undefined);
    expect(result).toBeUndefined(); // returns `prev` unchanged
    expect(e.info.to_virt).toBe(rep); // untouched — mergeOneway was skipped
    expect(tail.info.other?.list).toContain(e); // safeOtherEdge still ran
  });
});

// ---------------------------------------------------------------------------
// mergeRanksOne — rankleader order fallback  @see cluster.c:merge_ranks
// ---------------------------------------------------------------------------

describe('mergeRanksOne — defaults ipos to 0 when the rankleader has no order', () => {
  it('installs the single subg member at root rank slot 0', () => {
    const subg = new Graph('subg', 'directed');
    const root = new Graph('root', 'directed');
    subg.root = root;
    const member = new Node(0, 'member', subg);
    const leader = new Node(1, 'leader', subg); // .info.order left undefined
    subg.info.rankleader = [leader];
    const subgRank = makeEmptyRank();
    subgRank.n = 1; subgRank.v = [member]; subgRank.an = 1; subgRank.av = [member];
    subg.info.rank = [subgRank];
    const rootRank = makeEmptyRank();
    rootRank.n = 0; rootRank.v = [null as unknown as Node]; rootRank.an = 2;
    root.info.rank = [rootRank];
    mergeRanksOne(subg, root, 0);
    expect(member.info.order).toBe(0);
    expect(root.info.rank[0].v[0]).toBe(member);
  });
});

// ---------------------------------------------------------------------------
// mergeRanks — root.info.maxrank ?? 0 fallback  @see cluster.c:merge_ranks
// ---------------------------------------------------------------------------

describe('mergeRanks — root maxrank defaults to 0 when unset', () => {
  it('flips the mn-1 rank invalid and marks the cluster expanded (mn > mx skips the loop)', () => {
    const subg = new Graph('subg', 'directed');
    const root = new Graph('root', 'directed');
    subg.root = root;
    subg.info.minrank = 1;
    subg.info.maxrank = 0; // mn > mx: the per-rank merge loop body never runs
    const rk0 = makeEmptyRank();
    rk0.valid = true;
    root.info.rank = [rk0]; // index [mn-1] = [0] must exist
    root.info.maxrank = undefined; // forces the ?? 0 fallback at cluster.c:167
    mergeRanks(subg);
    expect(subg.info.expanded).toBe(true);
    expect(root.info.rank[0].valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// expandCluster — comp/nlist ?? fallbacks and buildRanks failure propagation
// ---------------------------------------------------------------------------

/** A cluster subgraph that is its own dotRoot, so class2's trailing
 *  `if (g !== dotRoot(g))` branch never seeds `subg.info.comp`. */
function selfRootSubg(): Graph {
  const subg = new Graph('subg', 'directed');
  subg.root = subg;
  subg.info.minrank = 0;
  subg.info.maxrank = 0;
  subg.info.n_cluster = 0;
  return subg;
}

describe('expandCluster — comp falsy after class2 and nlist stays undefined', () => {
  it('initializes comp to [] and seeds comp[0] with null (nlist ?? null)', () => {
    const subg = selfRootSubg();
    const v = new Node(0, 'v', subg);
    v.info.rank = 0;
    subg.nodes.set('v', v);
    // Excludes v from class2ProcessNodes' fastNode call (n === ufFind(n) is
    // false), so subg.info.nlist stays undefined through class2.
    const other = new Node(1, 'other', subg);
    v.info.UF_parent = other;
    const leader = new Node(2, 'leader', subg);
    subg.info.rankleader = [leader];
    const rc = expandCluster(subg);
    expect(rc).toBe(0);
    expect(subg.info.comp).toEqual([null]);
    expect(subg.info.expanded).toBe(true);
  });
});

describe('expandCluster — propagates a non-zero buildRanks rc (L216)', () => {
  it('returns -1 without reaching mergeRanks when a node lands in an unallocated rank slot', () => {
    const subg = selfRootSubg();
    const v = new Node(0, 'v', subg);
    v.info.rank = 1; // outside [minrank,maxrank]=[0,0] -> lands in the an=0 slot
    subg.nodes.set('v', v);
    const rc = expandCluster(subg);
    expect(rc).toBe(-1);
    expect(subg.info.expanded).toBeUndefined(); // mergeRanks (sets this) never ran
  });
});

// ---------------------------------------------------------------------------
// markClustersVnodes — virtual-chain walk  @see cluster.c:mark_clusters
// ---------------------------------------------------------------------------

describe('markClustersVnodes — walks a one-hop virtual chain', () => {
  it('marks the virtual head with clust, then stops (empty out list)', () => {
    const g = new Graph('g', 'directed');
    const clust = new Graph('clust', 'directed');
    const n = new Node(0, 'n', g);
    const other = new Node(1, 'other', g);
    const vnode = new Node(2, 'vnode', g);
    vnode.info.node_type = VIRTUAL;
    vnode.info.out = { list: [], size: 0 };
    const orig = new Edge(n, other, '');
    orig.info.to_virt = new Edge(n, vnode, '');
    clust.edges.push(orig);
    markClustersVnodes(clust, n);
    expect(vnode.info.clust).toBe(clust);
  });
});

// ---------------------------------------------------------------------------
// buildSkeletonEdgeCounts — rank ?? 0 fallbacks + count ?? 1  @see cluster.c:build_skeleton
// ---------------------------------------------------------------------------

describe('buildSkeletonEdgeCounts', () => {
  it('defaults v.info.rank to 0 and accumulates the leader out-edge count from its default', () => {
    const subg = new Graph('subg', 'directed');
    const v = new Node(0, 'v', subg); // rank left undefined -> lo defaults to 0
    const head = new Node(1, 'head', subg);
    head.info.rank = 2; // hi=2, so the lo..hi span loop runs twice
    const e = new Edge(v, head, '');
    subg.edges.push(e);
    const rl = new Node(2, 'rl', subg);
    rl.info.out = { list: [new Edge(rl, rl, '')], size: 1 }; // count left undefined
    subg.info.rankleader = [rl];
    buildSkeletonEdgeCounts(subg, v);
    expect(rl.info.out.list[0].info.count).toBe(3); // (undefined??1)+1, then +1
  });

  it('defaults e.head.info.rank to 0 when unset', () => {
    const subg = new Graph('subg', 'directed');
    const v = new Node(0, 'v', subg);
    v.info.rank = -1; // lo=-1, so the loop still runs once against hi=0
    const head = new Node(1, 'head', subg); // rank left undefined -> hi defaults to 0
    const e = new Edge(v, head, '');
    subg.edges.push(e);
    const rl = new Node(2, 'rl', subg);
    rl.info.out = { list: [new Edge(rl, rl, '')], size: 1 };
    rl.info.out.list[0].info.count = 5; // pre-defined: isolates this test to head.rank
    subg.info.rankleader = []; // lo=-1 indexes rankleader[-1] (v.info.rank=-1)
    subg.info.rankleader[-1] = rl;
    buildSkeletonEdgeCounts(subg, v);
    expect(rl.info.out.list[0].info.count).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// buildSkeletonCountsNode — rank/UF_size ?? fallbacks  @see cluster.c:build_skeleton
// ---------------------------------------------------------------------------

describe('buildSkeletonCountsNode', () => {
  it('defaults v.info.rank and rl.info.UF_size to 0 via ??', () => {
    const subg = new Graph('subg', 'directed');
    const v = new Node(0, 'v', subg); // rank undefined -> rankleader[0]
    const rl = new Node(1, 'rl', subg); // UF_size undefined -> 0 + 1 = 1
    subg.info.rankleader = [rl];
    buildSkeletonCountsNode(subg, v);
    expect(rl.info.UF_size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// buildSkeletonTrimSize — UF_size ?? 0 (x2)  @see cluster.c:build_skeleton
// ---------------------------------------------------------------------------

describe('buildSkeletonTrimSize', () => {
  it('leaves UF_size untouched when unset (?? 0 is not > 1)', () => {
    const subg = new Graph('subg', 'directed');
    const rl = new Node(0, 'rl', subg); // UF_size left undefined
    subg.info.rankleader = [rl];
    buildSkeletonTrimSize(subg, 0, 0);
    expect(rl.info.UF_size).toBeUndefined();
  });

  it('decrements UF_size by 1 when it exceeds 1', () => {
    const subg = new Graph('subg', 'directed');
    const rl = new Node(0, 'rl', subg);
    rl.info.UF_size = 3;
    subg.info.rankleader = [rl];
    buildSkeletonTrimSize(subg, 0, 0);
    expect(rl.info.UF_size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// installClusterRanks — rc propagation  @see cluster.c:install_cluster
// ---------------------------------------------------------------------------

describe('installClusterRanks — propagates a non-zero rc from installInRank', () => {
  it('stops at the first rank whose leader cannot be placed (rank.an <= 0)', () => {
    const g = new Graph('g', 'directed');
    const clust = new Graph('clust', 'directed');
    const leader = new Node(0, 'leader', g);
    leader.info.rank = 0;
    clust.info.rankleader = [leader];
    const rk = makeEmptyRank(); // an=0 -> placeInRankSlot fails
    g.info.rank = [rk];
    const ctx = makeClusterCtx(g, 0, 0);
    const rc = installClusterRanks(ctx, g, clust, 0, 0);
    expect(rc).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// installCluster — minrank/maxrank ?? 0 + rc propagation  @see cluster.c:install_cluster
// ---------------------------------------------------------------------------

describe('installCluster', () => {
  it('defaults an unset clust minrank/maxrank to 0 and returns early on rc != 0', () => {
    const g = new Graph('g', 'directed');
    const clust = new Graph('clust', 'directed');
    const n = new Node(0, 'n', g);
    n.info.clust = clust;
    const leader = new Node(1, 'leader', g);
    leader.info.rank = 0;
    clust.info.rankleader = [leader];
    // clust.info.minrank / maxrank intentionally left undefined.
    const rk = makeEmptyRank();
    g.info.rank = [rk]; // an=0 -> installClusterRanks fails
    const q: Node[] = [];
    const rc = installCluster(g, n, 0, q);
    expect(rc).toBe(-1);
    expect(clust.info.installed).toBeUndefined(); // never reached the success path
    expect(q.length).toBe(0); // enqueueNeighbors never ran
  });
});

// ---------------------------------------------------------------------------
// agDeleteFromCluster — nested-subtree image cascade  @see cluster.c:mark_clusters
// ---------------------------------------------------------------------------

describe('agDeleteFromCluster — cascades the node image into a nested subgraph', () => {
  it('removes n from a rank subgraph nested inside the cluster', () => {
    const g = new Graph('root', 'directed');
    const clust = new Graph('cluster0', 'directed');
    const n = new Node(0, 'n', g);
    clust.nodes.set('n', n);
    const nested = new Graph('nested', 'directed');
    nested.nodes.set('n', n);
    clust.subgraphs.set('nested', nested);
    agDeleteFromCluster(clust, n);
    expect(clust.nodes.has('n')).toBe(false);
    expect(nested.nodes.has('n')).toBe(false);
  });
});

// NOTE (unreachable-by-design): buildSkeleton's `e.info.xpenalty ?? 1`
// (cluster.c:build_skeleton, virtual-chain edge) can never take the ??
// fallback branch. `e` is always the edge just returned by
// `newVirtualEdge(prev, v, null)`, which unconditionally sets
// `e.info.xpenalty = 1` on the `orig === null` path (fastgr.ts:newVirtualEdge)
// before buildSkeleton ever reads it. No caller can observe an undefined
// xpenalty on that edge without bypassing buildSkeleton's own construction.

// NOTE (unreachable-by-design): buildSkeletonTrimSize's second `??` — the
// `rl.info.UF_size ?? 0` inside the assignment `rl.info.UF_size = (... ?? 0)
// - 1` — can never take the fallback branch. The assignment only runs when
// the guard `(rl.info.UF_size ?? 0) > 1` was true, which requires
// rl.info.UF_size to already be a defined number > 1; the guard and the
// assignment read the same field with no intervening mutation, so by the
// time the assignment's `??` evaluates, UF_size is provably non-nullish.
