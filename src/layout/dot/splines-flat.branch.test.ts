// SPDX-License-Identifier: EPL-2.0

/**
 * T3e — branch coverage for layout/dot/splines-flat.ts.
 *
 * Direct unit tests against the pure geometry helpers (topBoxes,
 * bottomBoxes, flatSide, assembleFlatPath, freshFlatPath, flatBboxCtx,
 * cloneGraph) and the exported dispatch/guard functions (isFlatAdjacent,
 * flatVspace, makeFlatEdge, routeFlatEdgeFaithful, runAuxPipeline,
 * makeFlatAdjEdges) with hand-built minimal Graph/Node/Edge fixtures — the
 * pattern proven in splines.test.ts / flat.test.ts, kept local here to avoid
 * re-registering another file's `describe`/`it` blocks via cross-import.
 *
 * Deep pipeline branches only reachable with real routed geometry (arrow
 * copy, label copy, spline-reversal normalization on an adjacent flat-edge
 * group) are covered by the colocated dot fixtures in t3e.fixtures.test.ts
 * instead — see that file's header for the id list.
 *
 * @see lib/dotgen/dotsplines.c:make_flat_edge, make_flat_adj_edges
 */

import { describe, it, expect, vi } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { makeNodeInfo } from '../../model/nodeInfo.js';
import { makeEdgeInfo, makePort } from '../../model/edgeInfo.js';
import type { RankEntry } from '../../model/rankEntry.js';
import type { Box } from '../../model/geom.js';
import { NORMAL, VIRTUAL } from './fastgr.js';
import { EDGE_LABEL } from './rank.js';
import { TOP, BOTTOM } from '../../common/splines-constants.js';
import {
  isFlatAdjacent, flatVspace, makeFlatEdge, cloneGraph,
  topBoxes, bottomBoxes, flatSide, assembleFlatPath, freshFlatPath,
  flatBboxCtx, routeFlatEdgeFaithful, makeFlatAdjEdges,
  runAuxPipeline, runAuxSplines,
} from './splines-flat.js';

// ---------------------------------------------------------------------------
// Local builders (mirrors splines.test.ts's pattern; kept local so importing
// this file never re-registers splines.test.ts's own describe/it blocks).
// ---------------------------------------------------------------------------

function makeRankEntry(nodes: Node[]): RankEntry {
  return {
    n: nodes.length, v: [...nodes], an: 0, av: [],
    ht1: 36, ht2: 36, pht1: 36, pht2: 36,
    candidate: false, valid: false, cache_nc: 0,
  };
}

function makeGraph(): Graph {
  const g = new Graph('g', 'directed');
  g.info.nodesep = 18;
  g.info.ranksep = 36;
  return g;
}

let nextId = 0;
function makeNode(g: Graph, order: number, rank: number): Node {
  const n = new Node(nextId++, `n${nextId}`, g);
  n.info = makeNodeInfo();
  n.info.node_type = NORMAL;
  n.info.rank = rank;
  n.info.order = order;
  n.info.coord = { x: order * 72, y: -rank * 72 };
  n.info.lw = 36;
  n.info.rw = 36;
  n.info.ht = 36;
  g.nodes.set(n.name, n);
  return n;
}

function makeEdge(tail: Node, head: Node, g: Graph): Edge {
  const e = new Edge(tail, head, '');
  e.info = makeEdgeInfo(makePort(), makePort());
  g.edges.push(e);
  if (!tail.info.out) tail.info.out = { list: [], size: 0 };
  tail.info.out.list[tail.info.out.size++] = e;
  if (!head.info.in) head.info.in = { list: [], size: 0 };
  head.info.in.list[head.info.in.size++] = e;
  return e;
}

/** Two adjacent same-rank NORMAL nodes with an `adjacent` flat edge. */
function buildFlatAdjGraph(): { g: Graph; a: Node; b: Node; e: Edge } {
  const g = makeGraph();
  const a = makeNode(g, 0, 0);
  const b = makeNode(g, 1, 0);
  g.info.rank = [makeRankEntry([a, b])];
  g.info.minrank = 0;
  g.info.maxrank = 0;
  g.info.dotroot = g;
  const e = makeEdge(a, b, g);
  e.info.adjacent = 1;
  return { g, a, b, e };
}

// ---------------------------------------------------------------------------
// Pure geometry helpers
// ---------------------------------------------------------------------------

describe('topBoxes / bottomBoxes', () => {
  const tlast: Box = { ll: { x: 0, y: 0 }, ur: { x: 10, y: 10 } };
  const hlast: Box = { ll: { x: 100, y: 0 }, ur: { x: 110, y: 10 } };

  it('topBoxes builds the three connecting boxes above the endpoints', () => {
    const [b0, b1, b2] = topBoxes(tlast, hlast, 5, 8, 8);
    expect(b0).toEqual({ ll: { x: 0, y: 10 }, ur: { x: 15, y: 18 } });
    expect(b1).toEqual({ ll: { x: 0, y: 18 }, ur: { x: 110, y: 26 } });
    expect(b2).toEqual({ ll: { x: 95, y: 10 }, ur: { x: 110, y: 18 } });
  });

  it('bottomBoxes builds the three connecting boxes below the endpoints', () => {
    const [b0, b1, b2] = bottomBoxes(tlast, hlast, 5, 8, 8);
    expect(b0).toEqual({ ll: { x: 0, y: -8 }, ur: { x: 15, y: 0 } });
    expect(b1).toEqual({ ll: { x: 0, y: -16 }, ur: { x: 110, y: -8 } });
    expect(b2).toEqual({ ll: { x: 95, y: -8 }, ur: { x: 110, y: 0 } });
  });
});

describe('flatSide', () => {
  function edgeWithSides(tside: number, hside: number): Edge {
    const g = makeGraph();
    const a = makeNode(g, 0, 0);
    const b = makeNode(g, 1, 0);
    const e = makeEdge(a, b, g);
    e.info.tail_port = { ...makePort(), side: tside };
    e.info.head_port = { ...makePort(), side: hside };
    return e;
  }

  it('neither side BOTTOM: routes on TOP', () => {
    expect(flatSide(edgeWithSides(TOP, TOP))).toEqual({ bottom: false, side: TOP });
  });

  it('tail BOTTOM, head not TOP: routes on BOTTOM', () => {
    expect(flatSide(edgeWithSides(BOTTOM, 0))).toEqual({ bottom: true, side: BOTTOM });
  });

  it('head BOTTOM, tail not TOP: routes on BOTTOM', () => {
    expect(flatSide(edgeWithSides(0, BOTTOM))).toEqual({ bottom: true, side: BOTTOM });
  });

  it('tail BOTTOM but head IS TOP: stays on TOP (opposing-TOP override)', () => {
    expect(flatSide(edgeWithSides(BOTTOM, TOP))).toEqual({ bottom: false, side: TOP });
  });
});

describe('assembleFlatPath / freshFlatPath', () => {
  it('concatenates tail boxes forward, mid boxes, head boxes reversed', () => {
    const p = freshFlatPath();
    expect(p.nbox).toBe(0);
    expect(p.boxes).toEqual([]);
    const tb0: Box = { ll: { x: 0, y: 0 }, ur: { x: 1, y: 1 } };
    const tb1: Box = { ll: { x: 1, y: 1 }, ur: { x: 2, y: 2 } };
    const hb0: Box = { ll: { x: 10, y: 0 }, ur: { x: 11, y: 1 } };
    const hb1: Box = { ll: { x: 11, y: 1 }, ur: { x: 12, y: 2 } };
    const mid: Box = { ll: { x: 5, y: 5 }, ur: { x: 6, y: 6 } };
    const tend = { nb: tb0, np: { x: 0, y: 0 }, sidemask: 0, boxn: 2, boxes: [tb0, tb1] };
    const hend = { nb: hb0, np: { x: 0, y: 0 }, sidemask: 0, boxn: 2, boxes: [hb0, hb1] };
    assembleFlatPath(p, tend, hend, [mid]);
    // tail forward (tb0,tb1), mid (mid), head REVERSED (hb1,hb0).
    expect(p.boxes).toEqual([tb0, tb1, mid, hb1, hb0]);
  });
});

describe('flatBboxCtx', () => {
  it('sets splinesep to floor(nodesep/4) (integer division)', () => {
    const g = makeGraph();
    g.info.nodesep = 19; // trunc(19/4) = 4, not 4.75
    const ctx = flatBboxCtx(g);
    expect(ctx.sp.splinesep).toBe(4);
    expect(ctx.g).toBe(g);
  });

  it('defaults nodesep to 18 when unset', () => {
    const g = makeGraph();
    g.info.nodesep = undefined;
    expect(flatBboxCtx(g).sp.splinesep).toBe(4); // trunc(18/4)
  });
});

describe('cloneGraph', () => {
  it('flip=true parent: aux gets rankdir=TB, flip=false', () => {
    const g = makeGraph();
    g.info.flip = true;
    const auxg = cloneGraph(g);
    expect(auxg.info.rankdir).toBe(0);
    expect(auxg.info.flip).toBe(false);
  });

  it('flip=false (or unset) parent: aux gets rankdir=LR, flip=true', () => {
    const g = makeGraph();
    g.info.flip = false;
    const auxg = cloneGraph(g);
    expect(auxg.info.rankdir).toBe((1 << 2) | 1);
    expect(auxg.info.flip).toBe(true);
    expect(auxg.info.dotroot).toBe(auxg);
  });
});

// ---------------------------------------------------------------------------
// isFlatAdjacent — blocksAdjacency / noBlockerBetween
// ---------------------------------------------------------------------------

describe('isFlatAdjacent', () => {
  it('true: no rank / order mismatch and no blocker between', () => {
    const { g, e } = buildFlatAdjGraph();
    expect(isFlatAdjacent(g, e)).toBe(true);
  });

  it('false: tail and head are on different ranks', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 0);
    const b = makeNode(g, 0, 1);
    const e = makeEdge(a, b, g);
    expect(isFlatAdjacent(g, e)).toBe(false);
  });

  it('false: tail rank is undefined', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 0);
    a.info.rank = undefined;
    const b = makeNode(g, 1, 0);
    const e = makeEdge(a, b, g);
    expect(isFlatAdjacent(g, e)).toBe(false);
  });

  it('false: g.info.rank has no entry for the shared rank', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 0);
    const b = makeNode(g, 1, 0);
    const e = makeEdge(a, b, g);
    g.info.rank = []; // rank[0] undefined
    expect(isFlatAdjacent(g, e)).toBe(false);
  });

  it('a NORMAL node strictly between blocks adjacency', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 0);
    const mid = makeNode(g, 1, 0);
    const b = makeNode(g, 2, 0);
    g.info.rank = [makeRankEntry([a, mid, b])];
    const e = makeEdge(a, b, g);
    expect(isFlatAdjacent(g, e)).toBe(false);
  });

  it('an unlabeled VIRTUAL node strictly between does NOT block adjacency', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 0);
    const mid = makeNode(g, 1, 0);
    mid.info.node_type = VIRTUAL;
    const b = makeNode(g, 2, 0);
    g.info.rank = [makeRankEntry([a, mid, b])];
    const e = makeEdge(a, b, g);
    expect(isFlatAdjacent(g, e)).toBe(true);
  });

  it('a LABELED VIRTUAL node strictly between DOES block adjacency', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 0);
    const mid = makeNode(g, 1, 0);
    mid.info.node_type = VIRTUAL;
    mid.info.label = {} as unknown as typeof mid.info.label;
    const b = makeNode(g, 2, 0);
    g.info.rank = [makeRankEntry([a, mid, b])];
    const e = makeEdge(a, b, g);
    expect(isFlatAdjacent(g, e)).toBe(false);
  });

  it('order is symmetric: a head with a LOWER order than its tail still checks the interval', () => {
    const g = makeGraph();
    const b = makeNode(g, 0, 0);
    const mid = makeNode(g, 1, 0);
    const a = makeNode(g, 2, 0);
    g.info.rank = [makeRankEntry([b, mid, a])];
    const e = makeEdge(a, b, g); // tail order(2) > head order(0)
    expect(isFlatAdjacent(g, e)).toBe(false); // mid (NORMAL) sits between
  });

  it('falls back to order 0 (?? 0) when tail/head order is unset', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 0);
    const b = makeNode(g, 1, 0);
    a.info.order = undefined;
    b.info.order = undefined;
    g.info.rank = [makeRankEntry([a, b])];
    const e = makeEdge(a, b, g);
    expect(isFlatAdjacent(g, e)).toBe(true);
  });

  it('a genuine hole in the rank (v[i] undefined) is treated as a non-blocker via ?? null', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 0);
    const b = makeNode(g, 2, 0);
    const rk = makeRankEntry([a, b]);
    // Sparse array: index 1 (between a's order 0 and b's order 2) is a
    // genuine hole, not a node — noBlockerBetween's `v[i] ?? null` and
    // blocksAdjacency's `vn === null` early-return both fire here.
    rk.v = [a, undefined as unknown as Node, b];
    rk.n = 3;
    g.info.rank = [rk];
    const e = makeEdge(a, b, g);
    expect(isFlatAdjacent(g, e)).toBe(true);
  });

  it('a between-node with node_type left unset (?? NORMAL) still blocks adjacency', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 0);
    const mid = makeNode(g, 1, 0);
    mid.info.node_type = undefined; // exercise the `?? NORMAL` fallback
    const b = makeNode(g, 2, 0);
    g.info.rank = [makeRankEntry([a, mid, b])];
    const e = makeEdge(a, b, g);
    expect(isFlatAdjacent(g, e)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// flatVspace
// ---------------------------------------------------------------------------

describe('flatVspace', () => {
  function graphWithRanks(nRanks: number): Graph {
    const g = makeGraph();
    g.info.ranksep = 36;
    const ranks: RankEntry[] = [];
    for (let r = 0; r < nRanks; r++) {
      const n = makeNode(g, 0, r);
      ranks.push(makeRankEntry([n]));
    }
    g.info.rank = ranks;
    g.info.minrank = 0;
    g.info.maxrank = nRanks - 1;
    return g;
  }

  it('top: r<=0 falls back to graphRanksep', () => {
    const g = graphWithRanks(2);
    const tn = g.info.rank![0].v[0];
    expect(flatVspace(g, tn, true)).toBe(36);
  });

  it('bottom: r>=maxrank falls back to graphRanksep', () => {
    const g = graphWithRanks(2);
    const tn = g.info.rank![1].v[0];
    expect(flatVspace(g, tn, false)).toBe(36);
  });

  it('top: reads the previous NODE rank (r-1) when has_labels has no EDGE_LABEL bit', () => {
    const g = graphWithRanks(3);
    g.root.info.has_labels = 0;
    const tn = g.info.rank![2].v[0];
    tn.info.coord = { x: 0, y: -100 };
    const prev = g.info.rank![1].v[0];
    prev.info.coord = { x: 0, y: -50 };
    const space = flatVspace(g, tn, true);
    // prev.v[0].coord.y(-50) - prev.ht1(36) - tn.coord.y(-100) - rank[2].ht2(36)
    expect(space).toBe(-50 - 36 - -100 - 36);
  });

  it('top: reads r-2 (skipping the label rank) when has_labels carries EDGE_LABEL', () => {
    const g = graphWithRanks(4);
    g.root.info.has_labels = EDGE_LABEL;
    const tn = g.info.rank![3].v[0];
    tn.info.coord = { x: 0, y: -150 };
    const prevNode = g.info.rank![1].v[0]; // r-2
    prevNode.info.coord = { x: 0, y: -50 };
    const space = flatVspace(g, tn, true);
    expect(space).toBe(-50 - 36 - -150 - 36);
  });

  it('top: EDGE_LABEL prevIdx underflow (r-2 < minrank) falls back to graphRanksep', () => {
    const g = graphWithRanks(3);
    g.root.info.has_labels = EDGE_LABEL;
    const tn = g.info.rank![1].v[0]; // r=1, r-2=-1 < minrank(0)
    expect(flatVspace(g, tn, true)).toBe(36);
  });

  it('bottom: reads the next rank (r+1) via pht1/pht2', () => {
    const g = graphWithRanks(3);
    const tn = g.info.rank![0].v[0];
    tn.info.coord = { x: 0, y: 0 };
    const next = g.info.rank![1].v[0];
    next.info.coord = { x: 0, y: -50 };
    const space = flatVspace(g, tn, false);
    // tn.coord.y(0) - rank[0].pht1(36) - (next.coord.y(-50) + rank[1].pht2(36))
    expect(space).toBe(0 - 36 - (-50 + 36));
  });
});

// ---------------------------------------------------------------------------
// makeFlatEdge — dispatch
// ---------------------------------------------------------------------------

describe('makeFlatEdge', () => {
  it('cnt===0 returns 0 without dispatching', () => {
    const g = makeGraph();
    expect(makeFlatEdge(g, {} as never, [], 0, 0)).toBe(0);
  });

  it('edges.length===0 returns 0', () => {
    const g = makeGraph();
    expect(makeFlatEdge(g, {} as never, [], 5, 0)).toBe(0);
  });

  it('non-adjacent group returns 0 (labeled dispatch lives in the live router)', () => {
    const { g, e } = buildFlatAdjGraph();
    e.info.adjacent = 0;
    expect(makeFlatEdge(g, {} as never, [e], 1, 0)).toBe(0);
  });

  it('adjacent group dispatches to makeFlatAdjEdges', () => {
    const { g, e } = buildFlatAdjGraph();
    expect(makeFlatEdge(g, {} as never, [e], 1, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// routeFlatEdgeFaithful — early guards + bottom-routing attempt
// ---------------------------------------------------------------------------

describe('routeFlatEdgeFaithful', () => {
  it('returns null when g.info.rank is undefined', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 0);
    const b = makeNode(g, 1, 0);
    const e = makeEdge(a, b, g);
    expect(routeFlatEdgeFaithful(g, e)).toBeNull();
  });

  it('returns null when the tail has no rank assigned', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 0);
    a.info.rank = undefined;
    const b = makeNode(g, 1, 0);
    const e = makeEdge(a, b, g);
    g.info.rank = [makeRankEntry([b])];
    expect(routeFlatEdgeFaithful(g, e)).toBeNull();
  });

  it('returns null when the head is on a different rank', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 0);
    const b = makeNode(g, 0, 1);
    const e = makeEdge(a, b, g);
    g.info.rank = [makeRankEntry([a]), makeRankEntry([b])];
    g.info.minrank = 0;
    g.info.maxrank = 1;
    expect(routeFlatEdgeFaithful(g, e)).toBeNull();
  });

  it('a BOTTOM-side port takes the bottom-routing branch without throwing', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 0);
    const mid = makeNode(g, 1, 0);
    const b = makeNode(g, 2, 0);
    g.info.rank = [makeRankEntry([a, mid, b])];
    g.info.minrank = 0;
    g.info.maxrank = 0;
    const e = makeEdge(a, b, g);
    e.info.tail_port = { ...makePort(), side: BOTTOM };
    e.info.head_port = { ...makePort(), side: 0 };
    expect(() => routeFlatEdgeFaithful(g, e)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// runAuxPipeline
// ---------------------------------------------------------------------------

describe('runAuxPipeline', () => {
  it('returns 0 for an empty graph (dotRank/dotMincross/dotPosition all succeed)', () => {
    const g = makeGraph();
    g.info.dotroot = g;
    expect(runAuxPipeline(g)).toBe(0);
  });

  // dotMincross practically never fails on a well-formed graph (its negative
  // return is reserved for internal component-count corruption); mock it to
  // exercise runAuxPipeline's failure-propagation branch directly rather than
  // trying to corrupt mincross's internal state from the outside.
  it('propagates a non-zero dotMincross failure', async () => {
    vi.resetModules();
    vi.doMock('./mincross.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('./mincross.js')>();
      return { ...actual, dotMincross: () => 1 };
    });
    const mod = await import('./splines-flat.js');
    const g2 = makeGraph();
    g2.info.dotroot = g2;
    expect(mod.runAuxPipeline(g2)).toBe(1);
    vi.doUnmock('./mincross.js');
    vi.resetModules();
  });
});

describe('runAuxSplines', () => {
  it('runs sameports + splines on the graph and returns dotSplines_ result', () => {
    const { g } = buildFlatAdjGraph();
    expect(runAuxSplines(g)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// makeFlatAdjEdges — toNormalEdge loop body + reversed declaration order
// ---------------------------------------------------------------------------

describe('makeFlatAdjEdges', () => {
  it('walks a to_orig chain to the NORMAL edge before cloning (toNormalEdge loop body)', () => {
    const { g, a, b, e } = buildFlatAdjGraph();
    // A synthetic non-NORMAL "virtual" wrapper edge whose to_orig chain leads
    // back to the real NORMAL edge e — mirrors how a dedup'd edge group
    // member points at its original via ED_to_orig.
    const wrapper = new Edge(a, b, '');
    g.edges.push(wrapper);
    wrapper.info = makeEdgeInfo(makePort(), makePort());
    wrapper.info.edge_type = 5; // anything !== NORMAL(0)
    wrapper.info.to_orig = e;
    wrapper.info.adjacent = 1;
    expect(() => makeFlatAdjEdges(g, [wrapper], 1, 0)).not.toThrow();
    expect(makeFlatAdjEdges(g, [wrapper], 1, 0)).toBe(0);
  });

  it('a reversed-declaration-order group (tail order > head order) still routes', () => {
    // b (order 1) declared as the edge's tail, a (order 0) as head: exercises
    // flatLeadPair's swap branch (tn/hn picked by MIN order, not decl order).
    const { g, a, b } = buildFlatAdjGraph();
    const rev = makeEdge(b, a, g);
    rev.info.adjacent = 1;
    expect(makeFlatAdjEdges(g, [rev], 1, 0)).toBe(0);
  });

  it('a multi-edge (cnt=2) adjacent group with one portless edge reuses it as the ordering edge', () => {
    const { g, a, b, e } = buildFlatAdjGraph();
    const e2 = makeEdge(a, b, g);
    e2.info.adjacent = 1;
    expect(makeFlatAdjEdges(g, [e, e2], 2, 0)).toBe(0);
  });

  it('flatLeadPair falls back to order 0 (?? 0) when the lead edge endpoints have no order', () => {
    const { g, a, b, e } = buildFlatAdjGraph();
    a.info.order = undefined;
    b.info.order = undefined;
    expect(makeFlatAdjEdges(g, [e], 1, 0)).toBe(0);
  });
});
