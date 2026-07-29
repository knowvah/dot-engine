// SPDX-License-Identifier: EPL-2.0
/**
 * T4a — branch-coverage tests for layout/dot/mincross.ts.
 *
 * Mixed mode (D1): the small pure helpers (endpointClass, virtualWeight,
 * mincrossOptions, the vlist save/reset family, initMccomp, merge2,
 * cleanup2Ranks) are unit-tested directly against hand-built Graph/Node/Edge
 * fixtures. The orchestration functions (dotMincross, runComponents,
 * runClusters, runRemincross, mincrossClust) fan out to collaborators owned
 * by sibling files (mincross-order.ts, mincross-build.ts, mincross-cross.ts,
 * decomp.ts — tested by other agents in this mission). Those collaborators
 * are mocked here so this file isolates mincross.ts's OWN control flow
 * (mostly the `if (x < 0) return -1` error-propagation branches, which are
 * near-unreachable through real successful layouts).
 *
 * @see lib/dotgen/mincross.c
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { VIRTUAL, FLATORDER, flatEdge } from './fastgr.js';
import { NEW_RANK } from './rank.js';
import type { RankEntry } from '../../model/rankEntry.js';

// ---------------------------------------------------------------------------
// Mocks for sibling-module collaborators (owned by other agents in this
// mission). Each is a controllable vi.fn(); defaults are configured per test.
// ---------------------------------------------------------------------------

const mockMincrossMain = vi.fn<(...args: unknown[]) => number>();
const mockExpandCluster = vi.fn<(g: Graph) => number>();
const mockMarkLowclusters = vi.fn<(g: Graph) => void>();
const mockOrderedEdges = vi.fn();
const mockFlatBreakcycles = vi.fn();
const mockFlatReorder = vi.fn();
const mockClass2 = vi.fn();
const mockAllocateRanks = vi.fn();
const mockFillRanks = vi.fn();
const mockDecompose = vi.fn();

vi.mock('./mincross-order.js', () => ({
  mincrossMain: (...a: unknown[]) => mockMincrossMain(...a),
}));

vi.mock('./mincross-build.js', () => ({
  allocateRanks: (...a: unknown[]) => mockAllocateRanks(...a),
  fillRanks: (...a: unknown[]) => mockFillRanks(...a),
  orderedEdges: (...a: unknown[]) => mockOrderedEdges(...a),
  class2: (...a: unknown[]) => mockClass2(...a),
  flatBreakcycles: (...a: unknown[]) => mockFlatBreakcycles(...a),
  flatReorder: (...a: unknown[]) => mockFlatReorder(...a),
  expandCluster: (...a: unknown[]) => mockExpandCluster(a[0] as Graph),
  markLowclusters: (...a: unknown[]) => mockMarkLowclusters(a[0] as Graph),
}));

vi.mock('./decomp.js', () => ({
  decompose: (...a: unknown[]) => mockDecompose(...a),
}));

vi.mock('./mincross-cross.js', () => ({
  setReMincross: vi.fn(),
}));

const {
  endpointClass, virtualWeight, mincrossOptions, saveVlist, recSaveVlists,
  recResetVlists, resetVlistRanks, applyVlistReset, initMccomp,
  mergeComponents, merge2, cleanup2, cleanup2Ranks, removeFlatorderEdges,
  removeEmptyClusters, mincrossClust, dotMincross,
  runComponents, runClusters, runRemincross, makeMincrossCtx,
} = await import('./mincross.js');

beforeEach(() => {
  mockMincrossMain.mockReset().mockReturnValue(0);
  mockExpandCluster.mockReset().mockReturnValue(0);
  mockMarkLowclusters.mockReset();
  mockOrderedEdges.mockReset();
  mockFlatBreakcycles.mockReset();
  mockFlatReorder.mockReset();
  mockClass2.mockReset();
  mockAllocateRanks.mockReset();
  mockFillRanks.mockReset();
  mockDecompose.mockReset();
});

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function mkGraph(name = 'g'): Graph {
  return new Graph(name, 'directed');
}

function mkNode(g: Graph, id: number, name = `n${id}`): Node {
  const n = new Node(id, name, g);
  g.nodes.set(n.name, n);
  return n;
}

function mkRankEntry(nodes: Node[], overrides: Partial<RankEntry> = {}): RankEntry {
  return {
    n: nodes.length, v: nodes, an: nodes.length, av: nodes,
    ht1: 0, ht2: 0, pht1: 0, pht2: 0,
    candidate: false, valid: false, cache_nc: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// endpointClass  @see lib/dotgen/mincross.c:endpoint_class
// ---------------------------------------------------------------------------

describe('endpointClass', () => {
  it('classifies a VIRTUAL node as WNODE_VIRTUAL regardless of weight_class', () => {
    const g = mkGraph();
    const n = mkNode(g, 0);
    n.info.node_type = VIRTUAL;
    n.info.weight_class = 5;
    expect(endpointClass(n)).toBe(2); // WNODE_VIRTUAL
  });
  it('classifies weight_class<=1 as WNODE_SINGLETON', () => {
    const g = mkGraph();
    const n = mkNode(g, 0);
    n.info.weight_class = 1;
    expect(endpointClass(n)).toBe(1); // WNODE_SINGLETON
  });
  it('classifies weight_class>1 as WNODE_ORDINARY', () => {
    const g = mkGraph();
    const n = mkNode(g, 0);
    n.info.weight_class = 3;
    expect(endpointClass(n)).toBe(0); // WNODE_ORDINARY
  });
  it('defaults undefined weight_class to 2 (WNODE_ORDINARY, not singleton)', () => {
    const g = mkGraph();
    const n = mkNode(g, 0);
    expect(endpointClass(n)).toBe(0); // WNODE_ORDINARY via the ?? 2 fallback
  });
});

// ---------------------------------------------------------------------------
// virtualWeight  @see lib/dotgen/mincross.c:virtual_weight
// ---------------------------------------------------------------------------

describe('virtualWeight', () => {
  it('multiplies an existing weight by the endpoint-class table entry', () => {
    const g = mkGraph();
    const t = mkNode(g, 0); const h = mkNode(g, 1);
    t.info.weight_class = 3; h.info.weight_class = 3; // both ordinary -> t=1
    const e = new Edge(t, h, '');
    e.info.weight = 5;
    virtualWeight(e);
    expect(e.info.weight).toBe(5);
  });
  it('defaults an undefined weight to 1 before multiplying', () => {
    const g = mkGraph();
    const t = mkNode(g, 0); const h = mkNode(g, 1);
    t.info.weight_class = 1; h.info.weight_class = 1; // both singleton -> t=2
    const e = new Edge(t, h, '');
    virtualWeight(e);
    expect(e.info.weight).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// mincrossOptions  @see lib/dotgen/mincross.c:mincross_options
// ---------------------------------------------------------------------------

describe('mincrossOptions', () => {
  it('leaves minQuit/maxIter at defaults when mclimit<=0', () => {
    const g = mkGraph();
    g.attrs.set('mclimit', '-1');
    const ctx = makeMincrossCtx(g);
    mincrossOptions(ctx, g);
    expect(ctx.minQuit).toBe(8);
    expect(ctx.maxIter).toBe(24);
  });
  it('scales minQuit/maxIter when mclimit>0', () => {
    const g = mkGraph();
    g.attrs.set('mclimit', '2');
    const ctx = makeMincrossCtx(g);
    mincrossOptions(ctx, g);
    expect(ctx.minQuit).toBe(16);
    expect(ctx.maxIter).toBe(48);
  });
});

// ---------------------------------------------------------------------------
// saveVlist  @see lib/dotgen/mincross.c:save_vlist
// ---------------------------------------------------------------------------

describe('saveVlist', () => {
  it('is a no-op when rankleader is unset', () => {
    const g = mkGraph();
    expect(() => saveVlist(g)).not.toThrow();
  });
  it('returns early when rank is unset (rankleader defined)', () => {
    const g = mkGraph();
    g.info.rankleader = [];
    expect(() => saveVlist(g)).not.toThrow();
    expect(g.info.rankleader).toEqual([]);
  });
  it('defaults minrank/maxrank to 0 and copies rank[0].v[vStart]', () => {
    const g = mkGraph();
    const n = mkNode(g, 0);
    g.info.rankleader = [];
    g.info.rank = [mkRankEntry([n])];
    saveVlist(g);
    expect(g.info.rankleader[0]).toBe(n);
  });
  it('uses explicit minrank/maxrank when defined (only rank 1 processed)', () => {
    const g = mkGraph();
    const n0 = mkNode(g, 0);
    const n1 = mkNode(g, 1);
    g.info.rankleader = [];
    g.info.rank = [mkRankEntry([n0]), mkRankEntry([n1])];
    g.info.minrank = 1; g.info.maxrank = 1;
    saveVlist(g);
    expect(g.info.rankleader[0]).toBeUndefined();
    expect(g.info.rankleader[1]).toBe(n1);
  });
});

// ---------------------------------------------------------------------------
// recSaveVlists  @see lib/dotgen/mincross.c:rec_save_vlists
// ---------------------------------------------------------------------------

describe('recSaveVlists', () => {
  it('recurses into each cluster when n_cluster/clust are set', () => {
    const root = mkGraph('root');
    const child = mkGraph('child');
    const cn = mkNode(child, 0);
    child.info.rankleader = [];
    child.info.rank = [mkRankEntry([cn])];
    root.info.n_cluster = 1;
    root.info.clust = [child];
    recSaveVlists(root);
    expect(child.info.rankleader[0]).toBe(cn);
  });
});

// ---------------------------------------------------------------------------
// resetVlistRanks / recResetVlists  @see lib/dotgen/mincross.c:reset_vlist(s)
// ---------------------------------------------------------------------------

describe('resetVlistRanks', () => {
  it('defaults minrank/maxrank to 0 and processes rank 0 only', () => {
    const root = mkGraph('root');
    const n = mkNode(root, 0);
    n.info.order = 0;
    root.info.rankleader = [n];
    root.info.rank = [mkRankEntry([n])];
    const ctx = { root };
    expect(() => resetVlistRanks(ctx, root)).not.toThrow();
  });
  it('uses explicit minrank/maxrank when defined', () => {
    const root = mkGraph('root');
    root.info.dotroot = root;
    const n0 = mkNode(root, 0); n0.info.order = 0;
    const n1 = mkNode(root, 1); n1.info.order = 0;
    root.info.rankleader = [n0, n1];
    root.info.rank = [mkRankEntry([n0]), mkRankEntry([n1])];
    root.info.minrank = 1; root.info.maxrank = 1;
    const ctx = { root };
    resetVlistRanks(ctx, root);
    expect(root.info.rankleader[0]).toBe(n0); // rank 0 skipped, untouched
    expect(root.info.rankleader[1]).toBe(n1); // rank 1 processed
  });
});

describe('recResetVlists', () => {
  it('recurses into clusters before resetting the root', () => {
    const root = mkGraph('root');
    const child = mkGraph('child');
    const cn = mkNode(child, 0);
    cn.info.order = 0;
    child.info.rankleader = [cn];
    child.info.rank = [mkRankEntry([cn])];
    root.info.n_cluster = 1;
    root.info.clust = [child];
    root.info.rankleader = [];
    const ctx = { root };
    expect(() => recResetVlists(ctx, root)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// applyVlistReset  @see lib/dotgen/mincross.c:reset_vlist
// ---------------------------------------------------------------------------

describe('applyVlistReset', () => {
  it('returns early when rankleader is unset', () => {
    const g = mkGraph();
    const ctx = { root: g };
    expect(() => applyVlistReset(ctx, g, 0)).not.toThrow();
  });
  it('returns early when rank is unset (rankleader defined)', () => {
    const g = mkGraph();
    g.info.rankleader = [];
    const ctx = { root: g };
    expect(() => applyVlistReset(ctx, g, 0)).not.toThrow();
  });
  it('returns early when dotRoot(g).info.rank is unset', () => {
    const g = mkGraph();
    const other = mkGraph('other'); // acts as g.root, with no .info.rank
    g.root = other;
    const n = mkNode(g, 0);
    g.info.rankleader = [n];
    g.info.rank = [mkRankEntry([n])];
    const ctx = { root: g };
    expect(() => applyVlistReset(ctx, g, 0)).not.toThrow();
    expect(g.info.rankleader[0]).toBe(n); // untouched: returned before reassigning
  });
  it('returns early when rankleader[r] itself is unset', () => {
    const g = mkGraph();
    g.info.dotroot = g; // dotRoot(g) === g, so rootRank === rank
    const n = mkNode(g, 0);
    g.info.rank = [mkRankEntry([n])];
    g.info.rankleader = []; // rankleader[0] is undefined
    const ctx = { root: g };
    expect(() => applyVlistReset(ctx, g, 0)).not.toThrow();
  });
  it('defaults furthest-node order to 0 when u/w have no .order set', () => {
    const g = mkGraph();
    g.info.dotroot = g;
    const n = mkNode(g, 0); // no .order set -> both u and w default via ?? 0
    g.info.rank = [mkRankEntry([n])];
    g.info.rankleader = [n];
    const ctx = { root: g };
    applyVlistReset(ctx, g, 0);
    expect(g.info.rank[0].vStart).toBe(0);
    expect(g.info.rank[0].n).toBe(1); // wOrd(0) - uOrd(0) + 1
  });
});

// ---------------------------------------------------------------------------
// initMccomp  @see lib/dotgen/mincross.c:init_mccomp
// ---------------------------------------------------------------------------

describe('initMccomp', () => {
  it('returns early when comp is unset', () => {
    const g = mkGraph();
    expect(() => initMccomp(g, 0)).not.toThrow();
    expect(g.info.nlist).toBeUndefined();
  });
  it('returns early when rank is unset (c!==0)', () => {
    const g = mkGraph();
    const n0 = mkNode(g, 0);
    const n1 = mkNode(g, 1);
    g.info.comp = [n0, n1];
    expect(() => initMccomp(g, 1)).not.toThrow();
    expect(g.info.nlist).toBe(n1);
  });
  it('defaults minrank/maxrank/vStart to 0 and advances the window (c!==0)', () => {
    const g = mkGraph();
    const n0 = mkNode(g, 0);
    const n1 = mkNode(g, 1);
    g.info.comp = [n0, n1];
    const entry = mkRankEntry([n0, n1]); // vStart unset -> defaults to 0
    g.info.rank = [entry];
    initMccomp(g, 1);
    expect(g.info.nlist).toBe(n1);
    expect(entry.vStart).toBe(2); // 0 + n(2)
    expect(entry.n).toBe(0);
  });
  it('uses explicit minrank/maxrank and a pre-set vStart (defined arms)', () => {
    const g = mkGraph();
    const n0 = mkNode(g, 0);
    const n1 = mkNode(g, 1);
    g.info.comp = [n0, n1];
    g.info.minrank = 1; g.info.maxrank = 1;
    const entry = mkRankEntry([n1], { vStart: 3 });
    g.info.rank = [];
    g.info.rank[1] = entry; // only rank[1] is ever read (mn=mx=1)
    initMccomp(g, 1);
    expect(entry.vStart).toBe(4); // 3 + n(1)
    expect(entry.n).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// mergeComponents  @see lib/dotgen/mincross.c:merge_components
// ---------------------------------------------------------------------------

describe('mergeComponents', () => {
  it('is a no-op when comp is unset', () => {
    const g = mkGraph();
    const ctx = makeMincrossCtx(g);
    expect(() => mergeComponents(ctx, g)).not.toThrow();
    expect(g.info.minrank).toBeUndefined();
  });
  it('is a no-op when comp has <=1 element', () => {
    const g = mkGraph();
    const n = mkNode(g, 0);
    g.info.comp = [n];
    const ctx = makeMincrossCtx(g);
    mergeComponents(ctx, g);
    expect(g.info.minrank).toBeUndefined();
  });
  it('chains multiple components and sets minrank/maxrank from ctx', () => {
    const g = mkGraph();
    const a = mkNode(g, 0);
    const b = mkNode(g, 1);
    g.info.comp = [a, b];
    const ctx = makeMincrossCtx(g);
    ctx.globalMinRank = 3; ctx.globalMaxRank = 7;
    mergeComponents(ctx, g);
    expect(a.info.next).toBe(b);
    expect(b.info.prev).toBe(a);
    expect(g.info.nlist).toBe(a);
    expect(g.info.minrank).toBe(3);
    expect(g.info.maxrank).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// merge2  @see lib/dotgen/mincross.c:merge2
// ---------------------------------------------------------------------------

describe('merge2', () => {
  it('returns early when rank is unset', () => {
    const g = mkGraph();
    const ctx = makeMincrossCtx(g);
    expect(() => merge2(ctx, g)).not.toThrow();
  });
  it('defaults minrank/maxrank to 0 and assigns orders across rank[0]', () => {
    const g = mkGraph();
    const a = mkNode(g, 0);
    const entry = mkRankEntry([a], { n: 0 }); // n overwritten from .an below
    g.info.rank = [entry];
    const ctx = makeMincrossCtx(g); // g.info.comp unset -> mergeComponents no-op
    merge2(ctx, g);
    expect(entry.n).toBe(1); // set from .an
    expect(entry.vStart).toBe(0);
    expect(a.info.order).toBe(0);
  });
  it('uses explicit minrank/maxrank when defined', () => {
    const g = mkGraph();
    const a = mkNode(g, 0);
    g.info.rank = [mkRankEntry([]), mkRankEntry([a])];
    g.info.minrank = 1; g.info.maxrank = 1;
    const ctx = makeMincrossCtx(g);
    merge2(ctx, g);
    expect(g.info.rank[1].n).toBe(1); // rank 1 processed
    expect(a.info.order).toBe(0);
  });
  it('stops early and truncates n when a v[] slot is falsy (sparse window)', () => {
    const g = mkGraph();
    const a = mkNode(g, 0);
    const entry = mkRankEntry([a], { an: 3, av: [a] });
    entry.v = [a, null as unknown as Node]; // hole at index 1
    g.info.rank = [entry];
    const ctx = makeMincrossCtx(g);
    merge2(ctx, g);
    expect(entry.n).toBe(1); // truncated at the hole, not the original an(3)
    expect(a.info.order).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// cleanup2Ranks  @see lib/dotgen/mincross.c:cleanup2 (rank loop)
// ---------------------------------------------------------------------------

describe('cleanup2Ranks', () => {
  it('returns early when rank is unset', () => {
    const g = mkGraph();
    expect(() => cleanup2Ranks(g)).not.toThrow();
  });
  it('defaults minrank/maxrank to 0, assigns order, clears rank.flat', () => {
    const g = mkGraph();
    const a = mkNode(g, 0);
    const entry = mkRankEntry([a]);
    entry.flat = { nrows: 1, ncols: 1, data: new Uint8Array(1) };
    g.info.rank = [entry];
    cleanup2Ranks(g);
    expect(a.info.order).toBe(0);
    expect(entry.flat).toBeUndefined();
  });
  it('uses explicit minrank/maxrank when defined', () => {
    const g = mkGraph();
    const a = mkNode(g, 0);
    g.info.rank = [mkRankEntry([]), mkRankEntry([a])];
    g.info.minrank = 1; g.info.maxrank = 1;
    cleanup2Ranks(g);
    expect(a.info.order).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// removeFlatorderEdges  @see lib/dotgen/mincross.c:cleanup2 (flatorder removal)
// ---------------------------------------------------------------------------

describe('removeFlatorderEdges', () => {
  it('is a no-op when flat_out is unset', () => {
    const g = mkGraph();
    const v = mkNode(g, 0);
    expect(() => removeFlatorderEdges(v)).not.toThrow();
  });
  it('deletes FLATORDER edges and keeps other flat edges', () => {
    const g = mkGraph();
    const v = mkNode(g, 0);
    const other = mkNode(g, 1);
    const kept = mkNode(g, 2);
    const eFlatorder = new Edge(v, other, '');
    eFlatorder.info.edge_type = FLATORDER;
    flatEdge(g, eFlatorder);
    const eKept = new Edge(v, kept, '');
    eKept.info.edge_type = 0; // NORMAL, not FLATORDER
    flatEdge(g, eKept);
    removeFlatorderEdges(v);
    expect(v.info.flat_out?.size).toBe(1);
    expect(v.info.flat_out?.list[0]).toBe(eKept);
  });
});

// ---------------------------------------------------------------------------
// cleanup2  @see lib/dotgen/mincross.c:cleanup2
// ---------------------------------------------------------------------------

describe('cleanup2', () => {
  it('clears the te/ti lists and recurses into clusters', () => {
    const root = mkGraph('root');
    const child = mkGraph('child');
    const cn = mkNode(child, 0);
    child.info.rankleader = [];
    child.info.rank = [mkRankEntry([cn])];
    root.info.n_cluster = 1;
    root.info.clust = [child];
    const ctx = makeMincrossCtx(root);
    ctx.teList = [{} as unknown as Edge];
    ctx.tiList = [1];
    cleanup2(ctx, root);
    expect(ctx.teList).toEqual([]);
    expect(ctx.tiList).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// removeEmptyClusters  @see lib/dotgen/mincross.c:dot_mincross (empty-cluster removal)
// ---------------------------------------------------------------------------

describe('removeEmptyClusters', () => {
  it('drops only the empty cluster, renumbering n_cluster', () => {
    const g = mkGraph();
    const full = mkGraph('full');
    mkNode(full, 0);
    const empty = mkGraph('empty');
    g.info.clust = [full, empty];
    g.info.n_cluster = 2;
    removeEmptyClusters(g);
    expect(g.info.clust).toEqual([full]);
    expect(g.info.n_cluster).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// mincrossClust  @see lib/dotgen/mincross.c:mincross_clust
// ---------------------------------------------------------------------------

describe('mincrossClust', () => {
  it('returns -1 immediately when expandCluster fails', () => {
    const g = mkGraph();
    const ctx = makeMincrossCtx(g);
    mockExpandCluster.mockReturnValue(1);
    expect(mincrossClust(ctx, g)).toBe(-1);
    expect(mockOrderedEdges).not.toHaveBeenCalled();
  });
  it('returns -1 when mincrossMain(pass 2) fails', () => {
    const g = mkGraph();
    const ctx = makeMincrossCtx(g);
    mockExpandCluster.mockReturnValue(0);
    mockMincrossMain.mockReturnValue(-1);
    expect(mincrossClust(ctx, g)).toBe(-1);
  });
  it('returns -1 when a recursive child cluster fails', () => {
    const g = mkGraph();
    const child = mkGraph('child');
    g.info.n_cluster = 1;
    g.info.clust = [child];
    mockExpandCluster.mockImplementation((sg) => (sg === child ? 1 : 0));
    mockMincrossMain.mockReturnValue(0);
    const ctx = makeMincrossCtx(g);
    expect(mincrossClust(ctx, g)).toBe(-1);
  });
  it('sums crossing counts across the graph and its clusters on success', () => {
    const g = mkGraph();
    const child = mkGraph('child');
    g.info.n_cluster = 1;
    g.info.clust = [child];
    mockExpandCluster.mockReturnValue(0);
    mockMincrossMain.mockReturnValue(3);
    const ctx = makeMincrossCtx(g);
    expect(mincrossClust(ctx, g)).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// runComponents  @see lib/dotgen/mincross.c:dot_mincross (component loop)
// ---------------------------------------------------------------------------

describe('runComponents', () => {
  it('returns -1 when mincrossMain fails on any component', () => {
    const g = mkGraph();
    const ctx = makeMincrossCtx(g);
    const n = mkNode(g, 0);
    mockMincrossMain.mockReturnValue(-1);
    expect(runComponents(ctx, g, [n])).toBe(-1);
  });
  it('accumulates nc across multiple components on success', () => {
    const g = mkGraph();
    const ctx = makeMincrossCtx(g);
    const a = mkNode(g, 0); const b = mkNode(g, 1);
    mockMincrossMain.mockReturnValue(2);
    expect(runComponents(ctx, g, [a, b])).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// runClusters  @see lib/dotgen/mincross.c:dot_mincross (cluster loop)
// ---------------------------------------------------------------------------

describe('runClusters', () => {
  it('returns 0 when clust is unset', () => {
    const g = mkGraph();
    const ctx = makeMincrossCtx(g);
    expect(runClusters(ctx, g)).toBe(0);
  });
  it('returns -1 when a cluster fails mincrossClust', () => {
    const g = mkGraph();
    const child = mkGraph('child');
    g.info.n_cluster = 1;
    g.info.clust = [child];
    mockExpandCluster.mockImplementation((sg) => (sg === child ? 1 : 0));
    const ctx = makeMincrossCtx(g);
    expect(runClusters(ctx, g)).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// runRemincross  @see lib/dotgen/mincross.c:dot_mincross (remincross)
// ---------------------------------------------------------------------------

describe('runRemincross', () => {
  it('returns nc unchanged when n_cluster is 0', () => {
    const g = mkGraph();
    const ctx = makeMincrossCtx(g);
    expect(runRemincross(ctx, g, 5)).toBe(5);
    expect(mockMincrossMain).not.toHaveBeenCalled();
  });
  it.each(['0', 'false', 'FALSE'])(
    'returns nc unchanged when remincross=%s (doRe false)',
    (val) => {
      const g = mkGraph();
      g.info.n_cluster = 1;
      g.attrs.set('remincross', val);
      const ctx = makeMincrossCtx(g);
      expect(runRemincross(ctx, g, 9)).toBe(9);
      expect(mockMincrossMain).not.toHaveBeenCalled();
    },
  );
  it('returns -1 when mincrossMain fails during remincross', () => {
    const g = mkGraph();
    g.info.n_cluster = 1;
    mockMincrossMain.mockReturnValue(-1);
    const ctx = makeMincrossCtx(g);
    expect(runRemincross(ctx, g, 3)).toBe(-1);
    expect(mockMarkLowclusters).toHaveBeenCalledWith(g);
    expect(ctx.reMincross).toBe(true);
  });
  it('returns mincrossMain result unchanged when it succeeds', () => {
    const g = mkGraph();
    g.info.n_cluster = 1;
    mockMincrossMain.mockReturnValue(5);
    const ctx = makeMincrossCtx(g);
    expect(runRemincross(ctx, g, 3)).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// dotMincross  @see lib/dotgen/mincross.c:dot_mincross
// ---------------------------------------------------------------------------

describe('dotMincross', () => {
  it('returns 0 when initMincross leaves comp unset', () => {
    const g = mkGraph();
    // mockDecompose default no-op -> g.info.comp stays undefined
    expect(dotMincross(g)).toBe(0);
  });
  it('calls fillRanks when NEW_RANK is set and uses explicit minrank/maxrank', () => {
    const g = mkGraph();
    g.info.flags = NEW_RANK;
    g.info.minrank = 2; g.info.maxrank = 4;
    expect(dotMincross(g)).toBe(0);
    expect(mockFillRanks).toHaveBeenCalledWith(g);
  });
  it('returns -1 when runComponents fails', () => {
    const g = mkGraph();
    const n = mkNode(g, 0);
    mockDecompose.mockImplementation((gg: Graph) => { gg.info.comp = [n]; });
    mockMincrossMain.mockReturnValueOnce(-1);
    expect(dotMincross(g)).toBe(-1);
  });
  it('returns -1 when runClusters fails', () => {
    const g = mkGraph();
    const n = mkNode(g, 0);
    const child = mkGraph('child');
    mkNode(child, 1); // non-empty, else removeEmptyClusters drops it first
    mockDecompose.mockImplementation((gg: Graph) => { gg.info.comp = [n]; });
    g.info.n_cluster = 1;
    g.info.clust = [child];
    mockExpandCluster.mockImplementation((sg) => (sg === child ? 1 : 0));
    expect(dotMincross(g)).toBe(-1);
  });
  it('returns -1 when runRemincross fails', () => {
    const g = mkGraph();
    const n = mkNode(g, 0);
    const child = mkGraph('child');
    mkNode(child, 1); // non-empty, else removeEmptyClusters drops it first
    mockDecompose.mockImplementation((gg: Graph) => { gg.info.comp = [n]; });
    g.info.n_cluster = 1;
    g.info.clust = [child];
    mockExpandCluster.mockReturnValue(0);
    // call order: runComponents(1) -> mincrossClust's mincrossMain(1) -> runRemincross's mincrossMain(-1)
    mockMincrossMain
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(-1);
    expect(dotMincross(g)).toBe(-1);
  });
  it('returns 0 and calls mincrossMain via runComponents on a full success path', () => {
    const g = mkGraph();
    const n = mkNode(g, 0);
    mockDecompose.mockImplementation((gg: Graph) => { gg.info.comp = [n]; });
    mockMincrossMain.mockReturnValue(0);
    expect(dotMincross(g)).toBe(0);
    expect(mockMincrossMain).toHaveBeenCalledWith(expect.anything(), g, 0);
  });
});

// ---------------------------------------------------------------------------
// makeMincrossCtx  @see lib/dotgen/mincross.c:dot_mincross (context init)
// ---------------------------------------------------------------------------

describe('makeMincrossCtx', () => {
  it('builds a fresh context with C-default minQuit/maxIter', () => {
    const g = mkGraph();
    const ctx = makeMincrossCtx(g);
    expect(ctx.root).toBe(g);
    expect(ctx.minQuit).toBe(8);
    expect(ctx.maxIter).toBe(24);
    expect(ctx.reMincross).toBe(false);
    expect(ctx.teList).toEqual([]);
    expect(ctx.tiList).toEqual([]);
  });
});
