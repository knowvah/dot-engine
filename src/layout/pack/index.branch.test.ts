// SPDX-License-Identifier: EPL-2.0

/**
 * T3f — branch-coverage tests for layout/pack/index.ts.
 *
 * pack.test.ts already unit-tests the poly-pack.ts / array-pack.ts / types.ts
 * primitives directly, and pack-components.test.ts exercises the dot `pack`
 * branch end-to-end. Neither ever calls index.ts's own exported functions
 * (putRects/packRects/putGraphs/packGraphs/packSubgraphs/shiftGraphBBs/
 * shiftEdgePoints/shiftOneGraph/normalizeGraphBB/cccomps/isConnected/
 * chkFlags/parsePackModeInfo/getPackMode/getPack/mapClust) — every corpus
 * caller reaches them only through a full layout pipeline, which never
 * exercises the failure/degenerate branches (Aspect mode, ng<=0, undefined
 * bb/coord, disconnected components, malformed attr strings). This file
 * drives them directly against hand-built Graph/Node/Edge fixtures.
 *
 * Mode: unit (D1/D4/D5) — mirrors pack.test.ts's style; local helpers only
 * (test/helpers/ is T3c's territory).
 *
 * @see lib/pack/pack.c
 * @see lib/pack/ccomps.c
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import type { Box, Point } from '../../model/geom.js';
import type { TextlabelT } from '../../common/types.js';
import {
  putRects, packRects, computeSubgraphBB, subgraphBBs, expandBounds,
  putGraphs, packGraphs, packSubgraphs,
  shiftGraphBBs, shiftEdgePoints, shiftOneGraph, normalizeGraphBB,
  cccomps, isConnected,
  chkFlags, parsePackModeInfo, getPackMode, getPack, mapClust,
  PackMode, PK_COL_MAJOR, PK_TOP_ALIGN, PK_LEFT_ALIGN, PK_BOT_ALIGN,
  PK_USER_VALS,
  type PackInfo,
} from './index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function box(llx: number, lly: number, urx: number, ury: number): Box {
  return { ll: { x: llx, y: lly }, ur: { x: urx, y: ury } };
}

function defaultPackInfo(overrides?: Partial<PackInfo>): PackInfo {
  return {
    aspect: 1, sz: 0, margin: 0, doSplines: false,
    mode: PackMode.Graph, fixed: null, vals: null, flags: 0,
    ...overrides,
  };
}

function makeGraph(name = 'G'): Graph {
  return new Graph(name, 'directed');
}

/** A graph with a single 20x20 node at (x,y), for putGraphs/subgraphBBs. */
function makeGraphWithNode(name: string, x: number, y: number, attrs: Record<string, string> = {}): Graph {
  const g = makeGraph(name);
  for (const [k, v] of Object.entries(attrs)) g.attrs.set(k, v);
  const n = new Node(0, `${name}n`, g);
  n.info.coord = { x, y };
  n.info.lw = 10; n.info.rw = 10; n.info.ht = 10;
  g.nodes.set(n.name, n);
  return g;
}

// ---------------------------------------------------------------------------
// putRects / packRects — the index.ts dispatcher wrapping poly-pack /
// array-pack, never called directly by any prior test.
// @see lib/pack/pack.c:putRects / packRects
// ---------------------------------------------------------------------------

describe('putRects', () => {
  it('returns [] for ng<=0', () => {
    expect(putRects(0, [], defaultPackInfo())).toEqual([]);
  });
  it('returns null for Aspect mode (not implemented in C)', () => {
    const pts = putRects(1, [box(0, 0, 10, 10)], defaultPackInfo({ mode: PackMode.Aspect }));
    expect(pts).toBeNull();
  });
  it('returns null for Node mode (no node geometry available)', () => {
    const pts = putRects(1, [box(0, 0, 10, 10)], defaultPackInfo({ mode: PackMode.Node }));
    expect(pts).toBeNull();
  });
  it('returns null for Cluster mode', () => {
    const pts = putRects(1, [box(0, 0, 10, 10)], defaultPackInfo({ mode: PackMode.Cluster }));
    expect(pts).toBeNull();
  });
  it('delegates to arrayRects for Array mode', () => {
    const pts = putRects(2, [box(0, 0, 10, 10), box(0, 0, 10, 10)], defaultPackInfo({ mode: PackMode.Array }));
    expect(pts).toHaveLength(2);
  });
  it('delegates to polyRects for Graph mode', () => {
    const pts = putRects(2, [box(0, 0, 10, 10), box(0, 0, 10, 10)], defaultPackInfo({ mode: PackMode.Graph }));
    expect(pts).toHaveLength(2);
  });
});

describe('packRects', () => {
  it('returns -1 and leaves bbs untouched when putRects fails', () => {
    const bbs = [box(0, 0, 10, 10)];
    const rc = packRects(1, bbs, defaultPackInfo({ mode: PackMode.Aspect }));
    expect(rc).toBe(-1);
    expect(bbs[0]).toEqual(box(0, 0, 10, 10));
  });
  it('returns 0 and repositions bbs, preserving each width/height', () => {
    const bbs = [box(0, 0, 10, 10), box(0, 0, 20, 20)];
    const rc = packRects(2, bbs, defaultPackInfo({ mode: PackMode.Graph, margin: 2 }));
    expect(rc).toBe(0);
    expect(bbs[0]!.ur.x - bbs[0]!.ll.x).toBe(10);
    expect(bbs[0]!.ur.y - bbs[0]!.ll.y).toBe(10);
    expect(bbs[1]!.ur.x - bbs[1]!.ll.x).toBe(20);
    expect(bbs[1]!.ur.y - bbs[1]!.ll.y).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// computeSubgraphBB — the refineSplines=true (curve-refined) vs default
// (raw control-point) edge-expansion branches, both requiring a REAL curved
// spline (every prior caller either has no spline or a degenerate one).
// @see lib/common/utils.c:633 compute_bb ; lib/common/emit.c:746 update_bb_bz
// ---------------------------------------------------------------------------

function graphWithCurvedEdge(): Graph {
  const g = makeGraph();
  const a = new Node(0, 'a', g);
  a.info.coord = { x: 0, y: 0 }; a.info.lw = 0; a.info.rw = 0; a.info.ht = 0;
  const b = new Node(1, 'b', g);
  b.info.coord = { x: 200, y: 0 }; b.info.lw = 0; b.info.rw = 0; b.info.ht = 0;
  g.nodes.set('a', a); g.nodes.set('b', b);
  const e = new Edge(a, b, '');
  const bez = {
    list: [{ x: 0, y: 0 }, { x: 50, y: 80 }, { x: 150, y: -80 }, { x: 200, y: 0 }],
    size: 4, sflag: 0, eflag: 0, sp: { x: 0, y: 0 }, ep: { x: 200, y: 0 },
  };
  e.info.spl = { list: [bez], size: 1, bb: box(0, 0, 200, 0) };
  g.edges.push(e);
  return g;
}

describe('computeSubgraphBB — refineSplines=true refines to the curve, not the control hull', () => {
  it('the y-extent stays strictly inside the control-point hull (±80)', () => {
    const bb = computeSubgraphBB(graphWithCurvedEdge(), 0, true);
    expect(bb.ll).toEqual({ x: 0, y: -23.28125 });
    expect(bb.ur).toEqual({ x: 200, y: 23.28125 });
  });
});

describe('computeSubgraphBB — default (pack path) unions the raw control points', () => {
  it('the y-extent reaches the full ±80 control-point hull', () => {
    const bb = computeSubgraphBB(graphWithCurvedEdge(), 0);
    expect(bb.ll).toEqual({ x: 0, y: -80 });
    expect(bb.ur).toEqual({ x: 200, y: 80 });
  });
});

describe('subgraphBBs', () => {
  it('maps computeSubgraphBB across every graph, applying the shared margin', () => {
    const g0 = makeGraphWithNode('g0', 0, 0);
    const g1 = makeGraphWithNode('g1', 100, 0);
    expect(subgraphBBs([g0, g1], 2)).toEqual([box(-12, -7, 12, 7), box(88, -7, 112, 7)]);
  });
});

describe('nodeCoordX / nodeCoordY / expandBounds — undefined-field fallbacks', () => {
  it('falls back to (0,0) for an undefined coord and to 18 for undefined lw/rw/ht', () => {
    const g = makeGraph();
    const n = new Node(0, 'a', g);
    n.info.coord = undefined as unknown as Point;
    n.info.lw = undefined as unknown as number;
    n.info.rw = undefined as unknown as number;
    n.info.ht = undefined as unknown as number;
    const b = { llx: Infinity, lly: Infinity, urx: -Infinity, ury: -Infinity };
    expandBounds(b, n, 0);
    expect(b).toEqual({ llx: -18, lly: -9, urx: 18, ury: 9 });
  });
});

describe('computeSubgraphBB — a sparse spl.list hole (over-allocated list) is skipped', () => {
  function graphWithHoleAndCurvedEdge(): Graph {
    const g = graphWithCurvedEdge();
    const e = g.edges[0]!;
    const real = e.info.spl!.list[0]!;
    e.info.spl = { list: [undefined as unknown as typeof real, real], size: 2, bb: box(0, 0, 200, 0) };
    return g;
  }
  it('refineSplines=true skips the hole, refining only the real bezier', () => {
    const bb = computeSubgraphBB(graphWithHoleAndCurvedEdge(), 0, true);
    expect(bb.ll).toEqual({ x: 0, y: -23.28125 });
    expect(bb.ur).toEqual({ x: 200, y: 23.28125 });
  });
  it('refineSplines=false skips the hole, unioning only the real bezier points', () => {
    const bb = computeSubgraphBB(graphWithHoleAndCurvedEdge(), 0);
    expect(bb.ll).toEqual({ x: 0, y: -80 });
    expect(bb.ur).toEqual({ x: 200, y: 80 });
  });
});

describe('computeSubgraphBB — refineSplines=true skips a cubic with a missing control point', () => {
  it('a hole among p0..p3 skips updateBbBz for that cubic (defensive guard)', () => {
    const g = makeGraph();
    const a = new Node(0, 'a', g);
    a.info.coord = { x: 0, y: 0 }; a.info.lw = 0; a.info.rw = 0; a.info.ht = 0;
    const bnode = new Node(1, 'b', g);
    bnode.info.coord = { x: 10, y: 0 }; bnode.info.lw = 0; bnode.info.rw = 0; bnode.info.ht = 0;
    g.nodes.set('a', a); g.nodes.set('b', bnode);
    const e = new Edge(a, bnode, '');
    const bez = {
      list: [{ x: 0, y: 0 }, undefined as unknown as Point, { x: 5, y: 5 }, { x: 10, y: 0 }],
      size: 4, sflag: 0, eflag: 0, sp: { x: 0, y: 0 }, ep: { x: 10, y: 0 },
    };
    e.info.spl = { list: [bez], size: 1, bb: box(0, 0, 10, 0) };
    g.edges.push(e);
    // updateBbBz never runs -> bb is node-only: (0,0)..(10,0).
    expect(computeSubgraphBB(g, 0, true)).toEqual(box(0, 0, 10, 0));
  });
});

describe('computeSubgraphBB — a sparse bz.list point hole is skipped (pack path)', () => {
  it('unions only the defined points within bz.size', () => {
    const g = makeGraph();
    const a = new Node(0, 'a', g);
    a.info.coord = { x: 0, y: 0 }; a.info.lw = 0; a.info.rw = 0; a.info.ht = 0;
    const bnode = new Node(1, 'b', g);
    bnode.info.coord = { x: 10, y: 0 }; bnode.info.lw = 0; bnode.info.rw = 0; bnode.info.ht = 0;
    g.nodes.set('a', a); g.nodes.set('b', bnode);
    const e = new Edge(a, bnode, '');
    const bez = {
      list: [{ x: 0, y: 0 }, undefined as unknown as Point, { x: 10, y: 5 }],
      size: 3, sflag: 0, eflag: 0, sp: { x: 0, y: 0 }, ep: { x: 10, y: 5 },
    };
    e.info.spl = { list: [bez], size: 1, bb: box(0, 0, 10, 5) };
    g.edges.push(e);
    expect(computeSubgraphBB(g, 0)).toEqual(box(0, 0, 10, 5));
  });
});

describe('computeSubgraphBB — edge label bbox honors rankdir flip (dimen axis swap)', () => {
  it('flip=true swaps dimen.x/dimen.y for the half-width/half-height', () => {
    const g = makeGraph();
    g.info.flip = true;
    const a = new Node(0, 'a', g); // not added to g.nodes: isolates the label contribution
    const bnode = new Node(1, 'b', g);
    const e = new Edge(a, bnode, '');
    e.info.label = { set: true, pos: { x: 50, y: 0 }, dimen: { x: 6, y: 20 } } as unknown as TextlabelT;
    g.edges.push(e);
    // flip=true: hw = dimen.y/2 = 10, hh = dimen.x/2 = 3
    expect(computeSubgraphBB(g, 0)).toEqual(box(40, -3, 60, 3));
  });
});

// ---------------------------------------------------------------------------
// putGraphs / packGraphs / packSubgraphs
// @see lib/pack/pack.c:putGraphs / packGraphs / packSubgraphs
// ---------------------------------------------------------------------------

describe('putGraphs', () => {
  it('returns null for ng<=0', () => {
    expect(putGraphs(0, [], makeGraph('root'), defaultPackInfo())).toBeNull();
  });

  it('mode<=Graph delegates to polyGraphs and records each subgraph bb', () => {
    const root = makeGraph('root');
    const g0 = makeGraphWithNode('g0', 0, 0);
    const pts = putGraphs(1, [g0], root, defaultPackInfo({ mode: PackMode.Graph }));
    expect(pts).not.toBeNull();
    expect(pts).toHaveLength(1);
    expect(g0.info.bb).toEqual(box(-10, -5, 10, 5));
  });

  it('mode=Aspect (neither <=Graph nor Array) returns null', () => {
    const root = makeGraph('root');
    const g0 = makeGraphWithNode('g0', 0, 0);
    expect(putGraphs(1, [g0], root, defaultPackInfo({ mode: PackMode.Aspect }))).toBeNull();
  });

  it('Array mode with PK_USER_VALS parses sortv: valid, negative, NaN, missing', () => {
    const root = makeGraph('root');
    const gs = [
      makeGraphWithNode('g0', 0, 0, { sortv: '3' }),
      makeGraphWithNode('g1', 50, 0, { sortv: '-1' }),
      makeGraphWithNode('g2', 100, 0, { sortv: 'abc' }),
      makeGraphWithNode('g3', 150, 0, {}),
    ];
    const pinfo = defaultPackInfo({ mode: PackMode.Array, flags: PK_USER_VALS });
    const pts = putGraphs(4, gs, root, pinfo);
    expect(pts).not.toBeNull();
    expect(pinfo.vals).toEqual([3, 0, 0, 0]);
  });

  it('Array mode without PK_USER_VALS leaves pinfo.vals untouched', () => {
    const root = makeGraph('root');
    const gs = [makeGraphWithNode('g0', 0, 0, { sortv: '9' })];
    const pinfo = defaultPackInfo({ mode: PackMode.Array });
    const pts = putGraphs(1, gs, root, pinfo);
    expect(pts).not.toBeNull();
    expect(pinfo.vals).toBeNull();
  });
});

describe('packGraphs', () => {
  it('returns 0 on success', () => {
    const root = makeGraph('root');
    const g0 = makeGraphWithNode('g0', 0, 0);
    expect(packGraphs(1, [g0], root, defaultPackInfo({ mode: PackMode.Graph }))).toBe(0);
  });
  it('returns -1 when putGraphs fails (Aspect mode)', () => {
    const root = makeGraph('root');
    const g0 = makeGraphWithNode('g0', 0, 0);
    expect(packGraphs(1, [g0], root, defaultPackInfo({ mode: PackMode.Aspect }))).toBe(-1);
  });
});

describe('packSubgraphs', () => {
  it('recomputes root.info.bb on success', () => {
    const root = makeGraph('root');
    root.info.bb = box(99, 99, 99, 99); // sentinel
    const g0 = makeGraphWithNode('g0', 0, 0);
    const rc = packSubgraphs(1, [g0], root, defaultPackInfo({ mode: PackMode.Graph }));
    expect(rc).toBe(0);
    // root itself has no nodes of its own -> computeSubgraphBB(root,0) is the
    // zero box; what matters is that the sentinel was overwritten.
    expect(root.info.bb).toEqual(box(0, 0, 0, 0));
  });
  it('leaves root.info.bb untouched on failure', () => {
    const root = makeGraph('root');
    root.info.bb = box(99, 99, 99, 99);
    const g0 = makeGraphWithNode('g0', 0, 0);
    const rc = packSubgraphs(1, [g0], root, defaultPackInfo({ mode: PackMode.Aspect }));
    expect(rc).toBe(-1);
    expect(root.info.bb).toEqual(box(99, 99, 99, 99));
  });
});

// ---------------------------------------------------------------------------
// shiftGraphBBs — bb/label/nested-cluster propagation, plus the defensive
// bb-undefined and cluster-slot-undefined branches.
// @see lib/pack/pack.c:shiftGraph
// ---------------------------------------------------------------------------

describe('shiftGraphBBs', () => {
  it('shifts bb, an explicit-set label pos, and a nested cluster bb together', () => {
    const g = makeGraph('g');
    g.info.bb = box(0, 0, 10, 10);
    g.info.label = { set: true, pos: { x: 5, y: 5 } };
    const sub = makeGraph('sub');
    sub.info.bb = box(1, 1, 2, 2);
    g.info.n_cluster = 1;
    g.info.clust = [sub];
    shiftGraphBBs(g, 3, 4);
    expect(g.info.bb).toEqual(box(3, 4, 13, 14));
    expect((g.info.label as { pos: Point }).pos).toEqual({ x: 8, y: 9 });
    expect(sub.info.bb).toEqual(box(4, 5, 5, 6));
  });

  it('is a no-op (does not throw) when bb is undefined', () => {
    const g = makeGraph('g');
    g.info.bb = undefined as unknown as Box;
    expect(() => shiftGraphBBs(g, 1, 1)).not.toThrow();
    expect(g.info.bb).toBeUndefined();
  });

  it('leaves the label pos untouched when label.set is false', () => {
    const g = makeGraph('g');
    g.info.bb = box(0, 0, 1, 1);
    g.info.label = { set: false, pos: { x: 1, y: 1 } };
    shiftGraphBBs(g, 5, 5);
    expect((g.info.label as { pos: Point }).pos).toEqual({ x: 1, y: 1 });
  });

  it('skips an undefined cluster slot without throwing', () => {
    const g = makeGraph('g');
    g.info.bb = box(0, 0, 1, 1);
    g.info.n_cluster = 1;
    g.info.clust = [undefined as unknown as Graph];
    expect(() => shiftGraphBBs(g, 1, 1)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// shiftEdgePoints — bz.sflag / bz.eflag control-endpoint shift.
// @see lib/pack/pack.c:shiftEdge
// ---------------------------------------------------------------------------

describe('shiftEdgePoints', () => {
  it('shifts sp/ep when sflag/eflag are set', () => {
    const g = makeGraph();
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g);
    const e = new Edge(a, b, '');
    e.info.spl = {
      list: [{
        list: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }],
        size: 4, sflag: 1, eflag: 1, sp: { x: 0, y: 0 }, ep: { x: 3, y: 3 },
      }],
      size: 1, bb: box(0, 0, 3, 3),
    };
    shiftEdgePoints(e, 10, 20);
    expect(e.info.spl.list[0]!.sp).toEqual({ x: 10, y: 20 });
    expect(e.info.spl.list[0]!.ep).toEqual({ x: 13, y: 23 });
  });

  it('leaves sp/ep untouched when sflag/eflag are 0', () => {
    const g = makeGraph();
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g);
    const e = new Edge(a, b, '');
    e.info.spl = {
      list: [{
        list: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }],
        size: 4, sflag: 0, eflag: 0, sp: { x: 0, y: 0 }, ep: { x: 3, y: 3 },
      }],
      size: 1, bb: box(0, 0, 3, 3),
    };
    shiftEdgePoints(e, 10, 20);
    expect(e.info.spl.list[0]!.sp).toEqual({ x: 0, y: 0 });
    expect(e.info.spl.list[0]!.ep).toEqual({ x: 3, y: 3 });
  });
});

// ---------------------------------------------------------------------------
// shiftOneGraph — the ?? defensive fallbacks for a missing coord and for
// sparse pos[] entries.
// ---------------------------------------------------------------------------

describe('shiftOneGraph — defensive fallbacks', () => {
  it('falls back coord to (0,0) when info.coord is undefined', () => {
    const g = makeGraph();
    const n = new Node(0, 'a', g);
    n.info.coord = undefined as unknown as Point;
    g.nodes.set('a', n);
    shiftOneGraph(g, 5, 7);
    expect(n.info.coord).toEqual({ x: 5, y: 7 });
  });

  it('applies the ??0 fallback for empty pos[] entries, converting points to inches', () => {
    const g = makeGraph();
    const n = new Node(0, 'a', g);
    n.info.pos = [];
    g.nodes.set('a', n);
    shiftOneGraph(g, 72, 144); // 1in, 2in
    expect(n.info.pos![0]).toBeCloseTo(1, 10);
    expect(n.info.pos![1]).toBeCloseTo(2, 10);
  });
});

// ---------------------------------------------------------------------------
// normalizeGraphBB — the already-at-origin no-op branch.
// @see lib/common/postproc.c:translate_drawing
// ---------------------------------------------------------------------------

describe('normalizeGraphBB', () => {
  it('no-ops when bb.ll is already at the origin', () => {
    const g = makeGraph();
    const n = new Node(0, 'a', g);
    n.info.coord = { x: 5, y: 5 };
    g.nodes.set('a', n);
    g.info.bb = box(0, 0, 10, 10);
    normalizeGraphBB(g);
    expect(n.info.coord).toEqual({ x: 5, y: 5 });
    expect(g.info.bb).toEqual(box(0, 0, 10, 10));
  });

  it('shifts nodes and bb to the origin when bb.ll is not (0,0)', () => {
    const g = makeGraph();
    const n = new Node(0, 'a', g);
    n.info.coord = { x: 5, y: 5 };
    g.nodes.set('a', n);
    g.info.bb = box(-2, -3, 8, 7);
    normalizeGraphBB(g);
    expect(n.info.coord).toEqual({ x: 7, y: 8 });
    expect(g.info.bb).toEqual(box(0, 0, 10, 10));
  });
});

// ---------------------------------------------------------------------------
// cccomps / isConnected — component decomposition wrappers, never called
// directly (only ccomps/pccomps are exercised by the osage/circo/twopi
// pipelines).
// @see lib/pack/ccomps.c:cccomps / isConnected
// ---------------------------------------------------------------------------

describe('cccomps', () => {
  it('matches ccomps for a simple connected graph', () => {
    const g = makeGraph();
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g);
    g.nodes.set('a', a); g.nodes.set('b', b);
    g.edges.push(new Edge(a, b, ''));
    const comps = cccomps(g, 'c');
    expect(comps).toHaveLength(1);
    expect(comps[0]!.nodes.size).toBe(2);
  });
});

describe('isConnected', () => {
  it('true for a single connected component', () => {
    const g = makeGraph();
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g);
    g.nodes.set('a', a); g.nodes.set('b', b);
    g.edges.push(new Edge(a, b, ''));
    expect(isConnected(g)).toBe(true);
  });
  it('false for two disconnected components', () => {
    const g = makeGraph();
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g);
    g.nodes.set('a', a); g.nodes.set('b', b);
    expect(isConnected(g)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// chkFlags / parsePackModeInfo / getPackMode / getPack / mapClust — attribute
// readers, none reached directly by pack.test.ts (which only imports the
// underlying poly-pack.ts / array-pack.ts primitives).
// @see lib/pack/pack.c:chkFlags / parsePackModeInfo / getPackMode / getPack
// ---------------------------------------------------------------------------

describe('chkFlags', () => {
  it('returns p unchanged when it has no leading underscore', () => {
    expect(chkFlags('array3', defaultPackInfo())).toBe('array3');
  });
  it('consumes every valid flag char without an early break', () => {
    const pinfo = defaultPackInfo();
    const rest = chkFlags('_ctlb5', pinfo);
    expect(rest).toBe('5');
    expect(pinfo.flags).toBe(PK_COL_MAJOR | PK_TOP_ALIGN | PK_LEFT_ALIGN | PK_BOT_ALIGN);
  });
  it('stops at the first unrecognized flag char', () => {
    const pinfo = defaultPackInfo();
    const rest = chkFlags('_cX3', pinfo);
    expect(rest).toBe('X3');
    expect(pinfo.flags).toBe(PK_COL_MAJOR);
  });
});

describe('parsePackModeInfo — aspect mode', () => {
  it('a valid positive suffix sets pinfo.aspect', () => {
    const pinfo = defaultPackInfo();
    const mode = parsePackModeInfo('aspect1.5', PackMode.Graph, pinfo);
    expect(mode).toBe(PackMode.Aspect);
    expect(pinfo.aspect).toBe(1.5);
  });
  it('a non-numeric suffix falls back to 1', () => {
    const pinfo = defaultPackInfo();
    parsePackModeInfo('aspectXYZ', PackMode.Graph, pinfo);
    expect(pinfo.aspect).toBe(1);
  });
  it('a non-positive suffix falls back to 1', () => {
    const pinfo = defaultPackInfo();
    parsePackModeInfo('aspect-2', PackMode.Graph, pinfo);
    expect(pinfo.aspect).toBe(1);
  });
});

describe('getPackMode', () => {
  it('reads packmode=array from the graph attr', () => {
    const g = makeGraph();
    g.attrs.set('packmode', 'array');
    expect(getPackMode(g, PackMode.Graph)).toBe(PackMode.Array);
  });
});

describe('getPack', () => {
  it('returns notDef when the pack attr is unset', () => {
    expect(getPack(makeGraph(), -1, 8)).toBe(-1);
  });
  it('returns the parsed non-negative int', () => {
    const g = makeGraph();
    g.attrs.set('pack', '12');
    expect(getPack(g, -1, 8)).toBe(12);
  });
  it('returns dflt for a true-ish (t/T) value', () => {
    const g = makeGraph();
    g.attrs.set('pack', 'true');
    expect(getPack(g, -1, 8)).toBe(8);
    const g2 = makeGraph();
    g2.attrs.set('pack', 'True');
    expect(getPack(g2, -1, 8)).toBe(8);
  });
  it('falls through to notDef for an unrecognized non-numeric value', () => {
    const g = makeGraph();
    g.attrs.set('pack', 'xyz');
    expect(getPack(g, -1, 8)).toBe(-1);
  });
  it('falls back to the root graph attr when a subgraph has none of its own', () => {
    const root = makeGraph('root');
    root.attrs.set('pack', '4');
    const sub = new Graph('sub', 'directed');
    sub.parent = root; sub.root = root;
    expect(getPack(sub, -1, 8)).toBe(4);
  });
});

describe('mapClust', () => {
  it('returns the same graph unchanged', () => {
    const g = makeGraph();
    expect(mapClust(g)).toBe(g);
  });
});
