// SPDX-License-Identifier: EPL-2.0

/**
 * T4a — branch coverage for layout/dot/position-ycoords.ts.
 *
 * Direct unit tests against the exported y-coordinate assignment helpers:
 * graphMarginY, selfEdgeLabelHt, clustHtScanNode, updateClustNodeHt,
 * clustHtRankScan, clustHtSubclusters, clustHtLabel, clustHt,
 * recomputeMaxht, equalSpaceRanks, setYcoordsInitial, setYcoordsCopy,
 * setYcoords, shiftRanksAbove, adjustSimple, adjustRanksLabel, adjustRanks.
 *
 * @see lib/dotgen/position.c:set_ycoords, clust_ht, adjustRanks, adjustSimple
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { makeNodeInfo } from '../../model/nodeInfo.js';
import type { RankEntry } from '../../model/rankEntry.js';
import type { TextlabelT } from '../../common/types.js';
import {
  graphMarginY, selfEdgeLabelHt, clustHtScanNode, updateClustNodeHt,
  clustHtRankScan, clustHtSubclusters, clustHtLabel, clustHt,
  recomputeMaxht, equalSpaceRanks, setYcoordsInitial, setYcoordsCopy,
  setYcoords, shiftRanksAbove, adjustSimple, adjustRanksLabel, adjustRanks,
} from './position-ycoords.js';

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function makeTestGraph(): Graph {
  return new Graph('g', 'directed');
}

function makeRankEntry(overrides: Partial<RankEntry> = {}): RankEntry {
  return {
    n: 0, v: [], an: 0, av: [],
    ht1: 0, ht2: 0, pht1: 0, pht2: 0,
    candidate: false, valid: false, cache_nc: 0,
    ...overrides,
  };
}

let nextId = 0;
function makeNode(g: Graph, y = 0): Node {
  const n = new Node(nextId++, `n${nextId}`, g);
  n.info = makeNodeInfo();
  n.info.coord = { x: 0, y };
  return n;
}

function makeTextLabel(): TextlabelT {
  return {
    text: 'lbl', fontname: 'Helvetica', fontcolor: 'black',
    charset: 0, fontsize: 14,
    dimen: { x: 10, y: 5 }, space: { x: 10, y: 5 }, pos: { x: 0, y: 0 },
    u: { kind: 'txt', span: [], nspans: 0 },
    valign: 0, set: false, html: false,
  } as unknown as TextlabelT;
}

// ---------------------------------------------------------------------------
// graphMarginY
// ---------------------------------------------------------------------------

describe('graphMarginY', () => {
  it('uses g.info.clusterMargin when explicitly set', () => {
    const g = makeTestGraph();
    g.info.clusterMargin = 12;
    expect(graphMarginY(g)).toBe(12);
  });

  it('falls back to clusterMarginOf(g) (CL_OFFSET=8) when clusterMargin is unset', () => {
    const g = makeTestGraph();
    expect(graphMarginY(g)).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// selfEdgeLabelHt — @see lib/dotgen/position.c:clust_ht
// ---------------------------------------------------------------------------

describe('selfEdgeLabelHt', () => {
  it('returns 0 when the node has no other-edge list', () => {
    const g = makeTestGraph();
    const n = makeNode(g);
    expect(selfEdgeLabelHt(n)).toBe(0);
  });

  it('ignores non-self edges and self-edges with no label', () => {
    const g = makeTestGraph();
    const n0 = makeNode(g);
    const n1 = makeNode(g);
    const cross = new Edge(n0, n1, ''); // tail !== head: skipped
    const selfNoLabel = new Edge(n0, n0, ''); // self edge, no label: skipped
    n0.info.other = { list: [cross, selfNoLabel], size: 2 };
    expect(selfEdgeLabelHt(n0)).toBe(0);
  });

  it('falls back to 0 when a self-edge label has no dimen (?? branch)', () => {
    const g = makeTestGraph();
    const n0 = makeNode(g);
    const lbl = { ...makeTextLabel(), dimen: undefined } as unknown as TextlabelT;
    const selfEdge = new Edge(n0, n0, '');
    selfEdge.info.label = lbl;
    n0.info.other = { list: [selfEdge], size: 1 };
    expect(selfEdgeLabelHt(n0)).toBe(0);
  });

  it('uses dimen.y / 2, tracking the max across multiple self-edges', () => {
    const g = makeTestGraph();
    const n0 = makeNode(g);
    const small = makeTextLabel();
    small.dimen = { x: 0, y: 10 };
    const big = makeTextLabel();
    big.dimen = { x: 0, y: 40 };
    const e0 = new Edge(n0, n0, '');
    e0.info.label = small;
    const e1 = new Edge(n0, n0, '');
    e1.info.label = big;
    n0.info.other = { list: [e0, e1], size: 2 };
    expect(selfEdgeLabelHt(n0)).toBe(20); // max(10/2, 40/2)
  });
});

// ---------------------------------------------------------------------------
// clustHtScanNode
// ---------------------------------------------------------------------------

describe('clustHtScanNode', () => {
  it('uses n.info.ht ?? 0 when ht is forced undefined (defensive fallback)', () => {
    const g = makeTestGraph();
    const n = makeNode(g);
    (n.info as unknown as { ht: undefined }).ht = undefined;
    g.info.rank = [makeRankEntry()];
    expect(clustHtScanNode(g, n, 0)).toBe(0);
  });

  it('computes ht2 from ht/2 vs selfEdgeLabelHt, taking the max', () => {
    const g = makeTestGraph();
    const n = makeNode(g);
    n.info.ht = 10; // ht/2 = 5
    const lbl = makeTextLabel();
    lbl.dimen = { x: 0, y: 20 }; // /2 = 10 > 5
    const e = new Edge(n, n, '');
    e.info.label = lbl;
    n.info.other = { list: [e], size: 1 };
    g.info.rank = [makeRankEntry()];
    expect(clustHtScanNode(g, n, 0)).toBe(10);
  });

  it('updates rk.pht2/ht2 when pht2 < ht2, and leaves pht1/ht1 unchanged otherwise', () => {
    const g = makeTestGraph();
    const n = makeNode(g);
    n.info.ht = 30; // ht2 = 15
    const rk = makeRankEntry({ pht1: 20, pht2: 5 }); // pht1(20) not < 15; pht2(5) < 15
    g.info.rank = [rk];
    clustHtScanNode(g, n, 0);
    expect(rk.pht2).toBe(15);
    expect(rk.ht2).toBe(15);
    expect(rk.pht1).toBe(20);
    expect(rk.ht1).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// updateClustNodeHt
// ---------------------------------------------------------------------------

describe('updateClustNodeHt', () => {
  it('no-ops when the node has no clust', () => {
    const g = makeTestGraph();
    const n = makeNode(g);
    updateClustNodeHt(g, n, 5);
    expect(n.info.clust).toBeUndefined();
  });

  it('clust===g (margin 0): updates both ht2 (minrank) and ht1 (maxrank) for a single-rank cluster', () => {
    const g = makeTestGraph();
    g.info.minrank = 3;
    g.info.maxrank = 3;
    const n = makeNode(g);
    n.info.clust = g;
    n.info.rank = 3;
    updateClustNodeHt(g, n, 7);
    expect(g.info.ht2).toBe(7);
    expect(g.info.ht1).toBe(7);
  });

  it('clust!==g: adds graphMarginY(clust) margin, and only updates the matching side', () => {
    const g = makeTestGraph();
    const clust = makeTestGraph();
    clust.info.minrank = 2;
    clust.info.maxrank = 5;
    clust.info.clusterMargin = 3;
    const n = makeNode(g);
    n.info.clust = clust;
    n.info.rank = 2; // matches minrank only
    updateClustNodeHt(g, n, 7);
    expect(clust.info.ht2).toBe(10); // 7 + margin(3)
    expect(clust.info.ht1).toBeUndefined(); // maxrank branch not taken
  });
});

// ---------------------------------------------------------------------------
// clustHtRankScan
// ---------------------------------------------------------------------------

describe('clustHtRankScan', () => {
  it('scans every rank/node, updating rk.ht2/pht2', () => {
    const g = makeTestGraph();
    g.info.minrank = 0;
    g.info.maxrank = 0;
    const n = makeNode(g);
    n.info.ht = 10; // ht2 = 5
    g.info.rank = [{ ...makeRankEntry(), v: [n], n: 1 }];
    clustHtRankScan(g);
    expect(g.info.rank[0].ht2).toBe(5);
    expect(g.info.rank[0].pht2).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// clustHtSubclusters
// ---------------------------------------------------------------------------

describe('clustHtSubclusters', () => {
  it('accumulates ht1 for subclusters sharing maxrank, ht2 for those sharing minrank', () => {
    const g = makeTestGraph(); // g is its own root
    g.info.minrank = 0;
    g.info.maxrank = 2;
    g.info.rank = [makeRankEntry(), makeRankEntry(), makeRankEntry()];
    const matching = makeTestGraph();
    matching.root = g;
    matching.info.minrank = 0;
    matching.info.maxrank = 2;
    matching.info.ht1 = 9;
    matching.info.ht2 = 11;
    matching.info.n_cluster = 0;
    const nonMatching = makeTestGraph();
    nonMatching.root = g;
    nonMatching.info.minrank = 1;
    nonMatching.info.maxrank = 1;
    nonMatching.info.ht1 = 100; // must NOT affect result (rank mismatch)
    nonMatching.info.ht2 = 100;
    nonMatching.info.n_cluster = 0;
    g.info.clust = [matching, nonMatching];
    g.info.n_cluster = 2;
    const [ht1, ht2, haveLabel] = clustHtSubclusters(g, 2, 0, 0);
    expect(ht1).toBe(11); // matching.ht1(9) + margin(2)
    expect(ht2).toBe(13); // matching.ht2(11) + margin(2)
    expect(haveLabel).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// clustHtLabel — targets L104/L105 (border ?? fallback)
// ---------------------------------------------------------------------------

describe('clustHtLabel', () => {
  function subWithLabel(hasLabel: boolean, rootFlip: boolean | undefined, border: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }] | undefined): Graph {
    const root = makeTestGraph();
    root.info.flip = rootFlip;
    const sub = makeTestGraph();
    sub.root = root;
    if (hasLabel) sub.info.label = makeTextLabel();
    sub.info.border = border;
    return sub;
  }

  it('returns input unchanged with haveLabel=false when g is root', () => {
    const root = makeTestGraph();
    root.info.label = makeTextLabel();
    expect(clustHtLabel(root, 10, 20)).toEqual([10, 20, false]);
  });

  it('returns input unchanged with haveLabel=false when g has no label', () => {
    const sub = subWithLabel(false, false, undefined);
    expect(clustHtLabel(sub, 10, 20)).toEqual([10, 20, false]);
  });

  it('returns input unchanged with haveLabel=true when root is flipped', () => {
    const sub = subWithLabel(true, true, undefined);
    expect(clustHtLabel(sub, 10, 20)).toEqual([10, 20, true]);
  });

  it('adds border[BOTTOM_IX]/[TOP_IX].y when present (non-flip, has label)', () => {
    const zero = { x: 0, y: 0 };
    const border: [typeof zero, typeof zero, typeof zero, typeof zero] =
      [{ x: 0, y: 6 }, zero, { x: 0, y: 9 }, zero]; // BOTTOM=6, TOP=9
    const sub = subWithLabel(true, false, border);
    expect(clustHtLabel(sub, 10, 20)).toEqual([16, 29, true]);
  });

  it('falls back to 0 when border is undefined (?? branch, non-flip has label)', () => {
    const sub = subWithLabel(true, false, undefined);
    expect(clustHtLabel(sub, 10, 20)).toEqual([10, 20, true]);
  });
});

// ---------------------------------------------------------------------------
// clustHt
// ---------------------------------------------------------------------------

describe('clustHt', () => {
  it('computes root ht1/ht2 from ht plus subclusters, and skips the non-root rank write', () => {
    const g = makeTestGraph(); // g.root === g -> isRoot
    g.info.minrank = 0;
    g.info.maxrank = 0;
    g.info.ht1 = 5;
    g.info.ht2 = 6;
    g.info.clust = [];
    g.info.n_cluster = 0;
    const haveLabel = clustHt(g);
    expect(haveLabel).toBe(false);
    expect(g.info.ht1).toBe(5);
    expect(g.info.ht2).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// recomputeMaxht
// ---------------------------------------------------------------------------

describe('recomputeMaxht', () => {
  it('returns the largest y-gap between consecutive rank leaders', () => {
    const g = makeTestGraph();
    g.info.minrank = 0;
    g.info.maxrank = 2;
    // y increases going UP the ranks (bottom/maxrank is anchored near 0);
    // n0 (top, rank 0) has the largest y, n2 (bottom, maxrank) the smallest.
    const n0 = makeNode(g, 50);
    const n1 = makeNode(g, 15);
    const n2 = makeNode(g, 0); // gap n1->n0 is 35 > gap n2->n1 (15)
    g.info.rank = [
      { ...makeRankEntry(), v: [n0], n: 1 },
      { ...makeRankEntry(), v: [n1], n: 1 },
      { ...makeRankEntry(), v: [n2], n: 1 },
    ];
    expect(recomputeMaxht(g)).toBe(35);
  });
});

// ---------------------------------------------------------------------------
// equalSpaceRanks — targets L153
// ---------------------------------------------------------------------------

describe('equalSpaceRanks', () => {
  it('re-spaces populated ranks by maxht, skipping empty ranks', () => {
    const g = makeTestGraph();
    g.info.minrank = 0;
    g.info.maxrank = 2;
    const n1 = makeNode(g, 0);
    const n2 = makeNode(g, 100);
    g.info.rank = [
      makeRankEntry(), // minrank: n=0, last loop iteration -> false branch, safe skip
      { ...makeRankEntry(), v: [n1], n: 1 },
      { ...makeRankEntry(), v: [n2], n: 1 },
    ];
    equalSpaceRanks(g, 10);
    expect(n1.info.coord.y).toBe(110); // 100 + 10
    expect(g.info.rank[0].v.length).toBe(0); // empty rank untouched, no crash
  });
});

// ---------------------------------------------------------------------------
// setYcoordsInitial — targets L177, L184, L186
// ---------------------------------------------------------------------------

describe('setYcoordsInitial', () => {
  it('skips ranks with no nodes (n===0 branch) when computing initial y-coordinates', () => {
    const g = makeTestGraph();
    g.info.minrank = 0;
    g.info.maxrank = 2;
    g.info.ranksep = 20;
    const mid = makeNode(g);
    const bottom = makeNode(g);
    g.info.rank = [
      makeRankEntry(), // minrank: n=0, last iteration -> false branch
      { ...makeRankEntry(), v: [mid], n: 1, ht1: 5, ht2: 5, pht1: 5, pht2: 5 },
      { ...makeRankEntry(), v: [bottom], n: 1, ht1: 5, ht2: 5, pht1: 5, pht2: 5 },
    ];
    setYcoordsInitial(g, false);
    expect(bottom.info.coord.y).toBe(5); // anchored at rank[maxR].ht1
    expect(mid.info.coord.y).toBe(35); // 5 + max(5+5+20, 5+5+8)=30
    expect(g.info.rank[0].v.length).toBe(0);
  });

  it('recomputes maxht and re-spaces ranks when lbl/flip/exact_ranksep all apply', () => {
    const g = makeTestGraph();
    g.info.minrank = 0;
    g.info.maxrank = 1;
    g.info.flip = true;
    g.info.exact_ranksep = true;
    g.info.ranksep = 10;
    const top = makeNode(g);
    const bottom = makeNode(g);
    g.info.rank = [
      { ...makeRankEntry(), v: [top], n: 1, ht1: 3, ht2: 3, pht1: 3, pht2: 3 },
      { ...makeRankEntry(), v: [bottom], n: 1, ht1: 3, ht2: 3, pht1: 3, pht2: 3 },
    ];
    setYcoordsInitial(g, true);
    expect(bottom.info.coord.y).toBe(3);
    expect(top.info.coord.y).toBe(19); // delta=16 initially; adjustRanks no-op; recompute+respace keep it
  });

  it('skips recomputeMaxht when exact_ranksep is false, even if lbl/flip apply', () => {
    const g = makeTestGraph();
    g.info.minrank = 0;
    g.info.maxrank = 1;
    g.info.flip = true;
    g.info.exact_ranksep = false;
    g.info.ranksep = 10;
    const top = makeNode(g);
    const bottom = makeNode(g);
    g.info.rank = [
      { ...makeRankEntry(), v: [top], n: 1, ht1: 3, ht2: 3, pht1: 3, pht2: 3 },
      { ...makeRankEntry(), v: [bottom], n: 1, ht1: 3, ht2: 3, pht1: 3, pht2: 3 },
    ];
    setYcoordsInitial(g, true);
    expect(bottom.info.coord.y).toBe(3);
    expect(top.info.coord.y).toBe(19); // from the initial loop alone
  });

  it('applies equalSpaceRanks from exact_ranksep alone when flip is false', () => {
    const g = makeTestGraph();
    g.info.minrank = 0;
    g.info.maxrank = 1;
    g.info.flip = false; // lbl&&flip false -> adjustRanks/recompute block skipped
    g.info.exact_ranksep = true;
    g.info.ranksep = 10;
    const top = makeNode(g);
    const bottom = makeNode(g);
    g.info.rank = [
      { ...makeRankEntry(), v: [top], n: 1, ht1: 3, ht2: 3, pht1: 3, pht2: 3 },
      { ...makeRankEntry(), v: [bottom], n: 1, ht1: 3, ht2: 3, pht1: 3, pht2: 3 },
    ];
    setYcoordsInitial(g, true);
    expect(bottom.info.coord.y).toBe(3);
    expect(top.info.coord.y).toBe(19);
  });
});

// ---------------------------------------------------------------------------
// setYcoordsCopy / setYcoords
// ---------------------------------------------------------------------------

describe('setYcoordsCopy', () => {
  it('copies the rank-leader y-coordinate to every node via nlist traversal', () => {
    const g = makeTestGraph();
    const n0 = makeNode(g);
    const n1 = makeNode(g);
    n0.info.rank = 0;
    n1.info.rank = 0;
    n0.info.next = n1;
    g.info.nlist = n0;
    g.info.rank = [{ ...makeRankEntry(), v: [n0], n: 1 }];
    n0.info.coord.y = 42;
    setYcoordsCopy(g);
    expect(n0.info.coord.y).toBe(42);
    expect(n1.info.coord.y).toBe(42);
  });
});

describe('setYcoords', () => {
  it('runs the full pipeline: clustHtRankScan -> clustHt -> setYcoordsInitial -> setYcoordsCopy', () => {
    const g = makeTestGraph();
    g.info.minrank = 0;
    g.info.maxrank = 1;
    g.info.clust = [];
    g.info.n_cluster = 0;
    const top = makeNode(g);
    const bottom = makeNode(g);
    top.info.ht = 10;
    bottom.info.ht = 10;
    top.info.rank = 0;
    bottom.info.rank = 1;
    top.info.next = bottom;
    g.info.nlist = top;
    g.info.rank = [
      { ...makeRankEntry(), v: [top], n: 1 },
      { ...makeRankEntry(), v: [bottom], n: 1 },
    ];
    g.info.ranksep = 10;
    setYcoords(g);
    expect(bottom.info.coord.y).toBe(5); // rank[maxR].ht1 after clustHtRankScan (10/2)
    expect(top.info.coord.y).toBeGreaterThan(bottom.info.coord.y);
  });
});

// ---------------------------------------------------------------------------
// shiftRanksAbove — targets L211-213
// ---------------------------------------------------------------------------

describe('shiftRanksAbove', () => {
  it('shifts only ranks whose leader exists (n>0), skipping empty ranks', () => {
    const root = makeTestGraph();
    root.info.minrank = 0;
    const n0 = makeNode(root, 5);
    root.info.rank = [
      { ...makeRankEntry(), v: [n0], n: 1 },
      makeRankEntry(), // n=0: skipped
    ];
    shiftRanksAbove(root, 2, 10);
    expect(n0.info.coord.y).toBe(15);
    expect(root.info.rank[1].v.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// adjustSimple — targets L219-236
// ---------------------------------------------------------------------------

describe('adjustSimple', () => {
  it('delbottom>0: shifts leaders in [minr,maxr], then shifts ranks above minr when deltop>0', () => {
    const root = makeTestGraph();
    root.info.minrank = 0;
    root.info.maxrank = 2;
    const n0 = makeNode(root, 0);
    const n1 = makeNode(root, 0);
    const n2 = makeNode(root, 0);
    root.info.rank = [
      { ...makeRankEntry(), v: [n0], n: 1, ht1: 0, ht2: 0 },
      { ...makeRankEntry(), v: [n1], n: 1, ht1: 4, ht2: 4 },
      { ...makeRankEntry(), v: [n2], n: 1, ht1: 4, ht2: 4 },
    ];
    const g = makeTestGraph();
    g.root = root;
    g.info.minrank = 1;
    g.info.maxrank = 2;
    g.info.ht1 = 20;
    g.info.ht2 = 20;
    adjustSimple(g, 6, 0);
    // bottom=3.5; delbottom = 20+3.5-(rank[2].ht1(4))=19.5 > 0
    expect(n1.info.coord.y).toBeCloseTo(19.5);
    expect(n2.info.coord.y).toBeCloseTo(19.5);
    // deltop = 20+(6-3.5)+19.5-(rank[1].ht2(4)) = 38 > 0 -> shiftRanksAbove(root,1,38)
    expect(n0.info.coord.y).toBeCloseTo(38);
    expect(g.info.ht2).toBeCloseTo(22.5);
    expect(g.info.ht1).toBeCloseTo(23.5);
  });

  it('delbottom>0 loop skips an empty rank; deltop<=0 skips the shiftRanksAbove call', () => {
    const root = makeTestGraph();
    root.info.minrank = 0;
    root.info.maxrank = 2;
    const n0 = makeNode(root, 0);
    const n2 = makeNode(root, 0);
    root.info.rank = [
      { ...makeRankEntry(), v: [n0], n: 1, ht1: 0, ht2: 0 },
      { ...makeRankEntry(), v: [], n: 0, ht1: 0, ht2: 1000 }, // empty leader, huge ht2
      { ...makeRankEntry(), v: [n2], n: 1, ht1: 4, ht2: 4 },
    ];
    const g = makeTestGraph();
    g.root = root;
    g.info.minrank = 1;
    g.info.maxrank = 2;
    g.info.ht1 = 20;
    g.info.ht2 = 0;
    adjustSimple(g, 6, 0);
    expect(n2.info.coord.y).toBeCloseTo(19.5); // delbottom shift applied
    expect(root.info.rank[1].v.length).toBe(0); // empty rank untouched, no crash
    expect(n0.info.coord.y).toBe(0); // deltop<=0: shiftRanksAbove not called
    expect(g.info.ht2).toBeCloseTo(2.5);
    expect(g.info.ht1).toBeCloseTo(23.5);
  });

  it('delbottom<=0 (else branch): still shifts ranks above minr when deltop>0', () => {
    const root = makeTestGraph();
    root.info.minrank = 0;
    root.info.maxrank = 2;
    const n0 = makeNode(root, 0);
    const n1 = makeNode(root, 0);
    const n2 = makeNode(root, 0);
    root.info.rank = [
      { ...makeRankEntry(), v: [n0], n: 1, ht1: 0, ht2: 0 },
      { ...makeRankEntry(), v: [n1], n: 1, ht1: 0, ht2: 0 },
      { ...makeRankEntry(), v: [n2], n: 1, ht1: 100, ht2: 4 }, // large ht1 -> delbottom<=0
    ];
    const g = makeTestGraph();
    g.root = root;
    g.info.minrank = 1;
    g.info.maxrank = 2;
    g.info.ht1 = 0;
    g.info.ht2 = 50;
    adjustSimple(g, 6, 0);
    // bottom=3.5; delbottom = 0+3.5-(100) = -96.5 <= 0 -> else branch: no delbottom shift
    expect(n2.info.coord.y).toBe(0);
    expect(n1.info.coord.y).toBe(0);
    // deltop = 50+(6-3.5)-(rank[1].ht2(0)) = 52.5 > 0 -> shiftRanksAbove(root,1,52.5)
    expect(n0.info.coord.y).toBeCloseTo(52.5);
  });

  it('delbottom<=0 and deltop<=0: neither shift loop runs', () => {
    const root = makeTestGraph();
    root.info.minrank = 0;
    root.info.maxrank = 2;
    const n0 = makeNode(root, 0);
    const n2 = makeNode(root, 0);
    root.info.rank = [
      { ...makeRankEntry(), v: [n0], n: 1, ht1: 0, ht2: 0 },
      { ...makeRankEntry(), v: [], n: 0, ht1: 0, ht2: 1000 },
      { ...makeRankEntry(), v: [n2], n: 1, ht1: 100, ht2: 4 },
    ];
    const g = makeTestGraph();
    g.root = root;
    g.info.minrank = 1;
    g.info.maxrank = 2;
    g.info.ht1 = 0;
    g.info.ht2 = 0;
    adjustSimple(g, 0, 0);
    // bottom=0.5; delbottom = 0+0.5-100 = -99.5 <= 0
    // deltop = 0+(0-0.5)-1000 = -1000.5 <= 0 -> no shift
    expect(n0.info.coord.y).toBe(0);
    expect(n2.info.coord.y).toBe(0);
    expect(g.info.ht2).toBeCloseTo(-0.5);
    expect(g.info.ht1).toBeCloseTo(0.5);
  });
});

// ---------------------------------------------------------------------------
// adjustRanksLabel — targets L250, L251, L255
// ---------------------------------------------------------------------------

describe('adjustRanksLabel', () => {
  function makeClusterGraph(): { root: Graph; g: Graph } {
    const root = makeTestGraph();
    root.info.minrank = 0;
    root.info.maxrank = 1;
    const n0 = makeNode(root, 10); // minrank leader
    const n1 = makeNode(root, 0); // maxrank leader
    root.info.rank = [
      { ...makeRankEntry(), v: [n0], n: 1, ht1: 4, ht2: 4 },
      { ...makeRankEntry(), v: [n1], n: 1, ht1: 4, ht2: 4 },
    ];
    const g = makeTestGraph();
    g.root = root;
    g.info.minrank = 0;
    g.info.maxrank = 1;
    g.info.ht1 = 4;
    g.info.ht2 = 4;
    return { root, g };
  }

  it('returns early when border is undefined (lht falls back to 0, both ?? branches hit)', () => {
    const { root, g } = makeClusterGraph();
    const n0 = root.info.rank![0].v[0];
    adjustRanksLabel(g, root, 0);
    expect(n0.info.coord.y).toBe(10); // untouched
  });

  it('returns early when lht is 0 despite a border array (LEFT/RIGHT both 0)', () => {
    const { root, g } = makeClusterGraph();
    const zero = { x: 0, y: 0 };
    g.info.border = [zero, zero, zero, zero];
    const n0 = root.info.rank![0].v[0];
    adjustRanksLabel(g, root, 0);
    expect(n0.info.coord.y).toBe(10);
  });

  it('delta<=0: lht fits within the existing rank height, no adjustSimple call', () => {
    const { root, g } = makeClusterGraph();
    const zero = { x: 0, y: 0 };
    g.info.border = [zero, { x: 0, y: 2 }, zero, { x: 0, y: 2 }]; // lht=max(2,2)=2
    // rht = 10 - 0 = 10; delta = 2 - (10+4+4) = -16 <= 0
    adjustRanksLabel(g, root, 0);
    const n0 = root.info.rank![0].v[0];
    expect(n0.info.coord.y).toBe(10); // untouched: adjustSimple not invoked
  });

  it('delta>0: calls adjustSimple, which mutates the rank-leader coordinates and g.info.ht1', () => {
    const { root, g } = makeClusterGraph();
    const zero = { x: 0, y: 0 };
    g.info.border = [zero, { x: 0, y: 50 }, zero, { x: 0, y: 50 }]; // lht=50
    // rht = 10-0=10; delta = 50-(10+4+4)=32 > 0 -> adjustSimple(g,32,0)
    adjustRanksLabel(g, root, 0);
    const n1 = root.info.rank![1].v[0];
    expect(n1.info.coord.y).not.toBe(0); // adjustSimple mutated the bottom leader
    expect(g.info.ht1).toBeGreaterThan(4); // adjustSimple updated g.info.ht1
  });
});

// ---------------------------------------------------------------------------
// adjustRanks
// ---------------------------------------------------------------------------

describe('adjustRanks', () => {
  it('recurses into subclusters (margin accumulation) and applies a cluster label reservation', () => {
    const root = makeTestGraph();
    root.info.minrank = 0;
    root.info.maxrank = 1;
    root.info.n_cluster = 0;
    const n0 = makeNode(root, 10);
    const n1 = makeNode(root, 0);
    root.info.rank = [
      { ...makeRankEntry(), v: [n0], n: 1, ht1: 4, ht2: 4 },
      { ...makeRankEntry(), v: [n1], n: 1, ht1: 4, ht2: 4 },
    ];
    const clust = makeTestGraph();
    clust.root = root;
    clust.info.minrank = 0;
    clust.info.maxrank = 1;
    clust.info.n_cluster = 0;
    clust.info.ht1 = 3;
    clust.info.ht2 = 3;
    clust.info.label = makeTextLabel();
    const zero = { x: 0, y: 0 };
    clust.info.border = [zero, { x: 0, y: 50 }, zero, { x: 0, y: 50 }]; // forces adjustRanksLabel delta>0
    adjustRanks(clust, 0);
    expect(clust.info.ht1).toBeGreaterThan(3);
    expect(root.info.rank[1].ht1).toBeGreaterThanOrEqual(clust.info.ht1 as number);
  });

  it('nClust loop: accumulates ht1 only from subclusters matching maxrank, ht2 only from those matching minrank', () => {
    const root = makeTestGraph();
    root.info.minrank = 0;
    root.info.maxrank = 2;
    root.info.rank = [makeRankEntry(), makeRankEntry(), makeRankEntry()];
    const g = makeTestGraph();
    g.root = root;
    g.info.minrank = 0;
    g.info.maxrank = 2;
    g.info.ht1 = 1;
    g.info.ht2 = 1;

    const matchingMax = makeTestGraph(); // maxrank matches g's; minrank does not
    matchingMax.root = root;
    matchingMax.info.minrank = 1;
    matchingMax.info.maxrank = 2;
    matchingMax.info.n_cluster = 0;
    matchingMax.info.ht1 = 9;
    matchingMax.info.ht2 = 2;

    const matchingMin = makeTestGraph(); // minrank matches g's; maxrank does not
    matchingMin.root = root;
    matchingMin.info.minrank = 0;
    matchingMin.info.maxrank = 1;
    matchingMin.info.n_cluster = 0;
    matchingMin.info.ht1 = 2;
    matchingMin.info.ht2 = 7;

    g.info.clust = [matchingMax, matchingMin];
    g.info.n_cluster = 2;

    adjustRanks(g, 0);
    // margin = graphMarginY(g) = clusterMarginOf(g) fallback = CL_OFFSET(8) (g is a
    // non-root cluster with no parent chain / no margin attr set).
    expect(g.info.ht1).toBe(17); // max(1, matchingMax.ht1(9) + margin(8)); matchingMin ignored (maxrank mismatch)
    expect(g.info.ht2).toBe(15); // max(1, matchingMin.ht2(7) + margin(8)); matchingMax ignored (minrank mismatch)
  });
});
