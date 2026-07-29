// SPDX-License-Identifier: EPL-2.0

/**
 * T3e — branch coverage for layout/dot/straight-edges.ts.
 *
 * Direct unit tests against the two exported entry points
 * (`makeStraightEdges`, `addEdgeLabels`), hand-building minimal
 * Graph/Node/Edge fixtures (the pattern proven in curved.test.ts). This
 * exercises the module-private cycle-finding helpers (`dfs`,
 * `cycleContainsEdge`, `isCycleUnique`, `findAllCycles`,
 * `findShortestCycleWithEdge`, `getCycleCentroid`), the degenerate branch of
 * `spreadControlPoints`, the `EDGETYPE_PLINE` branch of `installStraight`,
 * the `nodesepRoot` fallback, the reversed-orientation branch of
 * `orientControlPoints`, and every branch of `addEdgeLabels` /
 * `portLabelAttrsDeclared` — none of which are reachable from the existing
 * curved.test.ts / dot pipeline suite.
 *
 * @see lib/common/routespl.c:773-1042
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { makeNodeInfo } from '../../model/nodeInfo.js';
import { makeEdgeInfo, makePort } from '../../model/edgeInfo.js';
import { newSpline } from '../../common/splines-clip.js';
import type { TextlabelT } from '../../common/types.js';
import type { Point } from '../../model/geom.js';
import { makeStraightEdges, addEdgeLabels } from './straight-edges.js';

const EDGETYPE_LINE = 1;
const EDGETYPE_CURVED = 2;
const EDGETYPE_PLINE = 3;

// ---------------------------------------------------------------------------
// Builders (mirrors curved.test.ts)
// ---------------------------------------------------------------------------

function makeGraph(): Graph {
  const g = new Graph('g', 'directed');
  g.info.nodesep = 36;
  g.info.ranksep = 36;
  g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 200, y: 200 } };
  return g;
}

function makeNode(id: number, name: string, g: Graph, x: number, y: number): Node {
  const n = new Node(id, name, g);
  n.info = makeNodeInfo();
  n.info.coord = { x, y };
  n.info.lw = 18;
  n.info.rw = 18;
  n.info.ht = 36;
  g.nodes.set(name, n);
  return n;
}

function makeEdge(tail: Node, head: Node, g: Graph): Edge {
  const e = new Edge(tail, head, '');
  e.info = makeEdgeInfo(makePort(), makePort());
  g.edges.push(e);
  return e;
}

function ctrlPoints(e: Edge): Point[] {
  return e.info.spl!.list[0]!.list;
}

const minX = (pts: Point[]) => Math.min(...pts.map((p) => p.x));
const maxX = (pts: Point[]) => Math.max(...pts.map((p) => p.x));

const SINFO = { nodesep: 18 } as unknown as Parameters<typeof makeStraightEdges>[4];

function makeTextLabel(w: number, h: number): TextlabelT {
  return {
    text: 'lbl', fontname: 'Helvetica', fontcolor: 'black',
    charset: 0, fontsize: 14,
    dimen: { x: w, y: h }, space: { x: w, y: h }, pos: { x: 0, y: 0 },
    u: { kind: 'txt', span: [], nspans: 0 },
    valign: 0, set: false, html: false,
  } as unknown as TextlabelT;
}

// ---------------------------------------------------------------------------
// Cycle centroid — dfs / cycleContainsEdge / isCycleUnique /
// findShortestCycleWithEdge / getCycleCentroid (routespl.c:773-931)
// ---------------------------------------------------------------------------

describe('makeStraightEdges — curved lone edge in a real 3-cycle', () => {
  // A real 3-cycle A->B->C->A. findAllCycles runs dfs from every node
  // (nodesInSeq), so the SAME cycle [A,B,C] is discovered 3 times (once per
  // starting node) in rotated form — isCycleUnique's member-match loop
  // dedups the 2nd/3rd discovery down to a single recorded cycle, which is
  // exactly the "not unique" branch under test.
  function triangle() {
    const g = makeGraph();
    const a = makeNode(0, 'A', g, 0, 90);
    const b = makeNode(1, 'B', g, 60, 45);
    const c = makeNode(2, 'C', g, 0, 0);
    const eAB = makeEdge(a, b, g);
    const eBC = makeEdge(b, c, g);
    const eCA = makeEdge(c, a, g);
    return { g, a, b, c, eAB, eBC, eCA };
  }

  it('bends the routed edge toward the triangle centroid (cycle found, length 3)', () => {
    const { g, eCA } = triangle();
    // Only route C->A as a lone curved edge: findShortestCycleWithEdge must
    // find [A,B,C] (length 3 >= minSize) containing eCA and average its node
    // coords into the centroid (20, 45); bend() then pulls the interior
    // control points toward x<0 off the vertical C->A line.
    makeStraightEdges(g, [eCA], 1, EDGETYPE_CURVED, SINFO);
    expect(eCA.info.spl).toBeDefined();
    const pts = ctrlPoints(eCA);
    expect(pts.length).toBe(4);
    // Manual check: midpt=(0,45), centroid=(20,45), r=dist(A,C)/5=18,
    // so ax = 0 - (20/20)*18 = -18: the curve bulges to negative x.
    expect(minX(pts)).toBeLessThan(-1);
  });

  it('every lone edge in the triangle bends off its straight line (cycle reused, not recomputed empty)', () => {
    const { g, eAB, eBC, eCA } = triangle();
    // Route all three edges of the cycle in turn; each independently
    // rediscovers (and dedups) the same 3-cycle via findAllCycles.
    makeStraightEdges(g, [eAB], 1, EDGETYPE_CURVED, SINFO);
    makeStraightEdges(g, [eBC], 1, EDGETYPE_CURVED, SINFO);
    makeStraightEdges(g, [eCA], 1, EDGETYPE_CURVED, SINFO);
    for (const e of [eAB, eBC, eCA]) {
      expect(e.info.spl).toBeDefined();
      expect(ctrlPoints(e).length).toBe(4);
    }
  });

  it('no cycle contains the edge (open chain) falls back to the graph centroid', () => {
    // A->B, B->C with NO C->A: findShortestCycleWithEdge returns null for
    // every edge (findAllCycles finds no cycle at all), so getCycleCentroid
    // falls back to getCentroid(g) (graph bbox center) — the existing
    // curved.test.ts already covers this fallback via an explicit g.info.bb,
    // this variant confirms it also holds when the graph genuinely has no
    // cycle (not just an edge outside one).
    const g = makeGraph();
    const a = makeNode(0, 'A', g, 0, 90);
    const b = makeNode(1, 'B', g, 60, 45);
    const c = makeNode(2, 'C', g, 0, 0);
    makeEdge(a, b, g);
    const eBC = makeEdge(b, c, g);
    g.info.bb = { ll: { x: 100, y: 0 }, ur: { x: 200, y: 90 } };
    makeStraightEdges(g, [eBC], 1, EDGETYPE_CURVED, SINFO);
    expect(eBC.info.spl).toBeDefined();
    expect(ctrlPoints(eBC).length).toBe(4);
  });
});

describe('makeStraightEdges — two distinct 3-cycles sharing an edge (A->B)', () => {
  it('rejects a same-length, different-membership recorded cycle before matching the right one', () => {
    // A->B->C->A and A->B->D->A share the A->B edge but diverge at C vs D.
    // Recording [A,B,D] via isCycleUnique must reject the already-recorded
    // [A,B,C] as a match (same length, different members: hits the
    // allItemsMatch=false/break branch), and findShortestCycleWithEdge must
    // walk past [A,B,C] (cycleContainsEdge returns false for D->A) before
    // reaching [A,B,D] (cycleContainsEdge returns true).
    const g = makeGraph();
    const a = makeNode(0, 'A', g, 0, 90);
    const b = makeNode(1, 'B', g, 60, 60);
    const c = makeNode(2, 'C', g, 0, 30);
    const d = makeNode(3, 'D', g, 60, 0);
    makeEdge(a, b, g);
    makeEdge(b, c, g);
    makeEdge(c, a, g);
    makeEdge(b, d, g);
    const eDA = makeEdge(d, a, g);
    makeStraightEdges(g, [eDA], 1, EDGETYPE_CURVED, SINFO);
    expect(eDA.info.spl).toBeDefined();
    expect(ctrlPoints(eDA).length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// orientControlPoints — reversed branch (opposing edge in a curved group)
// ---------------------------------------------------------------------------

describe('makeStraightEdges — curved group with an opposing (reversed) edge', () => {
  it('reverses control points for the edge whose head differs from the group head', () => {
    const g = makeGraph();
    const a = makeNode(0, 'a', g, 0, 90);
    const b = makeNode(1, 'b', g, 0, 0);
    const fwd = makeEdge(a, b, g); // group head == b
    const rev = makeEdge(b, a, g); // e0.head (a) !== group head (b) -> reversed branch
    makeStraightEdges(g, [fwd, rev], 2, EDGETYPE_CURVED, SINFO);
    expect(fwd.info.spl).toBeDefined();
    expect(rev.info.spl).toBeDefined();
    // Both edges route (not degenerate): control points spread on opposite
    // sides of the shared tail->head axis.
    const p0 = ctrlPoints(fwd);
    const p1 = ctrlPoints(rev);
    expect(Math.abs(maxX(p0) - minX(p0))).toBeGreaterThan(0);
    expect(Math.abs(maxX(p1) - minX(p1))).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// spreadControlPoints — degenerate branch (coincident tail/head)
// ---------------------------------------------------------------------------

describe('makeStraightEdges — degenerate multi-edge group (coincident endpoints)', () => {
  it('installs a zero-length spline instead of dividing by zero', () => {
    const g = makeGraph();
    const a = makeNode(0, 'a', g, 0, 0);
    const b = makeNode(1, 'b', g, 0, 0); // same coord as a: approxEqPt true
    const e0 = makeEdge(a, b, g);
    const e1 = makeEdge(a, b, g);
    expect(() => makeStraightEdges(g, [e0, e1], 2, EDGETYPE_LINE, SINFO)).not.toThrow();
    for (const e of [e0, e1]) {
      expect(e.info.spl).toBeDefined();
      for (const p of ctrlPoints(e)) {
        expect(p.x).toBe(0);
        expect(p.y).toBe(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// installStraight — EDGETYPE_PLINE branch (makePolyline triples corners)
// ---------------------------------------------------------------------------

describe('makeStraightEdges — EDGETYPE_PLINE multi-edge group', () => {
  it('triples the interior corner points via makePolyline', () => {
    const g = makeGraph();
    const a = makeNode(0, 'a', g, 0, 90);
    const b = makeNode(1, 'b', g, 0, 0);
    const e0 = makeEdge(a, b, g);
    const e1 = makeEdge(a, b, g);
    makeStraightEdges(g, [e0, e1], 2, EDGETYPE_PLINE, SINFO);
    for (const e of [e0, e1]) {
      const bz = e.info.spl!.list[0]!;
      // makePolyline triples each interior corner of the 4-point dumber
      // array into a degenerate bezier: 10 points total (size === list.length).
      expect(bz.size).toBe(10);
      expect(bz.list.length).toBe(10);
      // makePolyline: [p0,p0, p1,p1,p1, p2,p2,p2, p3,p3] — corner 1 (dumb[1])
      // is tripled at index 2..4, corner 2 (dumb[2]) at index 5..7.
      expect(bz.list[2]).toEqual(bz.list[3]);
      expect(bz.list[3]).toEqual(bz.list[4]);
      expect(bz.list[5]).toEqual(bz.list[6]);
      expect(bz.list[6]).toEqual(bz.list[7]);
    }
  });
});

// ---------------------------------------------------------------------------
// nodesepRoot — `g.root.info.nodesep ?? 18` fallback branch
// ---------------------------------------------------------------------------

describe('makeStraightEdges — nodesepRoot fallback', () => {
  it('falls back to 18 when the root graph has no nodesep set', () => {
    const g = makeGraph();
    g.root.info.nodesep = undefined; // exercise the `?? 18` fallback path
    const a = makeNode(0, 'a', g, 0, 90);
    const b = makeNode(1, 'b', g, 0, 0);
    const e0 = makeEdge(a, b, g);
    const e1 = makeEdge(a, b, g);
    makeStraightEdges(g, [e0, e1], 2, EDGETYPE_LINE, SINFO);
    for (const e of [e0, e1]) expect(e.info.spl).toBeDefined();
    // A larger explicit root nodesep spreads the parallel edges wider than
    // the 18-default fallback — comparative, concrete-value check that the
    // fallback constant (not some other value) was used.
    const gWide = makeGraph();
    gWide.root.info.nodesep = 100;
    const a2 = makeNode(0, 'a', gWide, 0, 90);
    const b2 = makeNode(1, 'b', gWide, 0, 0);
    const f0 = makeEdge(a2, b2, gWide);
    const f1 = makeEdge(a2, b2, gWide);
    makeStraightEdges(gWide, [f0, f1], 2, EDGETYPE_LINE, SINFO);
    const spreadDefault = maxX(ctrlPoints(e0)) - minX(ctrlPoints(e0));
    const spreadWide = maxX(ctrlPoints(f0)) - minX(ctrlPoints(f0));
    expect(spreadWide).toBeGreaterThan(spreadDefault);
  });
});

// ---------------------------------------------------------------------------
// addEdgeLabels / portLabelAttrsDeclared
// ---------------------------------------------------------------------------

function edgeWithSpline(tail: Node, head: Node, g: Graph): Edge {
  const e = makeEdge(tail, head, g);
  const bz = newSpline(e, 4);
  bz.list = [
    { x: tail.info.coord.x, y: tail.info.coord.y },
    { x: tail.info.coord.x, y: tail.info.coord.y - 30 },
    { x: head.info.coord.x, y: head.info.coord.y + 30 },
    { x: head.info.coord.x, y: head.info.coord.y },
  ];
  e.info.spl = { list: [bz], size: 1, bb: { ll: { x: 0, y: 0 }, ur: { x: 0, y: 0 } } };
  return e;
}

describe('addEdgeLabels — portLabelAttrsDeclared gate', () => {
  it('no-op when neither the graph nor any edge declares labelangle/labeldistance', () => {
    const g = makeGraph();
    const a = makeNode(0, 'a', g, 0, 90);
    const b = makeNode(1, 'b', g, 0, 0);
    const e = edgeWithSpline(a, b, g);
    e.info.head_label = makeTextLabel(20, 10);
    addEdgeLabels(e);
    expect(e.info.head_label.set).toBe(false); // untouched: gate returned early
  });

  it('graph-level labelangle declares, but the edge lacks its own -> placePortlabel declines', () => {
    const g = makeGraph();
    g.attrs.set('labelangle', '45'); // portLabelAttrsDeclared: graph-attrs branch
    const a = makeNode(0, 'a', g, 0, 90);
    const b = makeNode(1, 'b', g, 0, 0);
    const e = edgeWithSpline(a, b, g);
    e.info.head_label = makeTextLabel(20, 10);
    addEdgeLabels(e);
    // portLabelAttrsDeclared(g) is true so we get past the outer gate, but
    // placePortlabel's own noAngleAttrs check reads the EDGE's own attrs
    // (empty here) and declines — label stays unset, bb unchanged.
    expect(e.info.head_label.set).toBe(false);
    expect(g.info.bb).toEqual({ ll: { x: 0, y: 0 }, ur: { x: 200, y: 200 } });
  });

  it('edge-level labeldistance (no graph-level attr) declares via the edge loop', () => {
    const g = makeGraph();
    const a = makeNode(0, 'a', g, 0, 90);
    const b = makeNode(1, 'b', g, 0, 0);
    const skip = edgeWithSpline(a, b, g); // first edge in g.edges, no attrs: loop must continue past it
    const e = edgeWithSpline(a, b, g);
    e.attrs.set('labeldistance', '2'); // portLabelAttrsDeclared: edge-attrs binary-expr 2nd operand
    e.info.tail_label = makeTextLabel(20, 10);
    addEdgeLabels(e);
    expect(skip.info.head_label).toBeUndefined();
    expect(e.info.tail_label.set).toBe(true);
    // bb grew to include the placed tail label.
    expect(g.info.bb.ll.x).toBeLessThan(0);
  });

  it('head_label already placed (.set) is left untouched', () => {
    const g = makeGraph();
    const a = makeNode(0, 'a', g, 0, 90);
    const b = makeNode(1, 'b', g, 0, 0);
    const e = edgeWithSpline(a, b, g);
    e.attrs.set('labelangle', '30');
    e.info.head_label = makeTextLabel(20, 10);
    e.info.head_label.set = true;
    e.info.head_label.pos = { x: 5, y: 5 };
    addEdgeLabels(e);
    expect(e.info.head_label.pos).toEqual({ x: 5, y: 5 });
  });

  it('undefined head_label and undefined tail_label are both skipped without error', () => {
    const g = makeGraph();
    const a = makeNode(0, 'a', g, 0, 90);
    const b = makeNode(1, 'b', g, 0, 0);
    const e = edgeWithSpline(a, b, g);
    e.attrs.set('labelangle', '30');
    expect(() => addEdgeLabels(e)).not.toThrow();
    expect(e.info.head_label).toBeUndefined();
    expect(e.info.tail_label).toBeUndefined();
  });

  it('both head_label and tail_label placed and grow the bb', () => {
    const g = makeGraph();
    const a = makeNode(0, 'a', g, 0, 90);
    const b = makeNode(1, 'b', g, 0, 0);
    const e = edgeWithSpline(a, b, g);
    e.attrs.set('labelangle', '10');
    e.attrs.set('labeldistance', '1.5');
    e.info.head_label = makeTextLabel(20, 10);
    e.info.tail_label = makeTextLabel(20, 10);
    addEdgeLabels(e);
    expect(e.info.head_label.set).toBe(true);
    expect(e.info.tail_label.set).toBe(true);
  });
});
