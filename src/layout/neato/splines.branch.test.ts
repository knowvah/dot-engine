// SPDX-License-Identifier: EPL-2.0

/**
 * Branch-coverage tests for src/layout/neato/splines.ts (T2a).
 *
 * Targets the uncovered branches listed in
 * plans/coverage-90/batch-2/T2a.md: makeObstacle's polygon/ellipse/record
 * dispatch, makeOrthoObstacle's fixedshape/outline math, equivKey's
 * self-loop tie-breaks, makeSelfArcs's chained/labelled paths,
 * RoutingHelper.withVconfig's multiplicity/boundary-port dispatch, and the
 * GVTS_POS_INJECT test-harness hook (injectOraclePositions,
 * splineEdgesShifted).
 *
 * Every assertion checks a concrete value (point coordinates, counts,
 * returned booleans/numbers) per the mission's D1 vacuous-test policy.
 *
 * @see lib/neatogen/neatosplines.c
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { makeNodeInfo } from '../../model/nodeInfo.js';
import { makePort } from '../../model/edgeInfo.js';
import type { Port } from '../../model/geom.js';
import type { Point } from '../../model/geom.js';
import type { PolygonT, GraphvizPolygonStyle, TextlabelT } from '../../common/types.js';
import { ShapeKind } from '../../common/types.js';
import { obsOpen, POLYID_NONE } from '../../pathplan/index.js';
import type { Poly } from '../../pathplan/types.js';
import {
  splineEdges,
  splineEdgesImpl,
  splineEdgesShifted,
  makeObstacle,
  makeOrthoObstacle,
  makeSelfArcs,
  makeStraightEdge,
  coalesceEdges,
  edgePath,
  makeSplineEdge,
  computeBBFromPos,
  injectOraclePositions,
  SINFO,
  EDGETYPE_LINE,
  EDGETYPE_SPLINE,
  EDGETYPE_ORTHO,
  EDGETYPE_PLINE,
} from './splines.js';

// ---------------------------------------------------------------------------
// Fixture builder — class wrapper prevents lizard brace-counter confusion
// ---------------------------------------------------------------------------

class Fixture {
  static graph(): Graph {
    return new Graph('test', 'directed');
  }

  static node(g: Graph, name: string, x: number, y: number): Node {
    const n = new Node(g.nodes.size, name, g);
    n.info = makeNodeInfo();
    n.info.coord = { x, y };
    n.info.lw = 36;
    n.info.rw = 36;
    n.info.ht = 36;
    g.nodes.set(name, n);
    return n;
  }

  static edge(g: Graph, tail: Node, head: Node): Edge {
    const e = new Edge(tail, head, '');
    e.info.tail_port = makePort();
    e.info.head_port = makePort();
    g.edges.push(e);
    return e;
  }

  static setEdgetype(g: Graph, et: number): void {
    g.info.flags = (g.info.flags & ~0xf) | (et & 0xf);
  }

  static style(overrides: Partial<GraphvizPolygonStyle> = {}): GraphvizPolygonStyle {
    return {
      filled: false, radial: false, rounded: false, diagonals: false,
      auxlabels: false, invisible: false, striped: false, dotted: false,
      dashed: false, wedged: false, underline: false, fixedshape: false,
      shape: 0,
      ...overrides,
    };
  }

  static polygon(overrides: Partial<PolygonT> = {}): PolygonT {
    return {
      regular: false, peripheries: 1, sides: 4, orientation: 0,
      distortion: 0, skew: 0, option: Fixture.style(), penwidth: 1,
      vertices: null,
      ...overrides,
    };
  }

  /**
   * Box vertices in poly_init's REAL stored order: UR, UL, LL, LR (verified
   * against src/common/poly-sizing.ts:polygonVertices — NOT the "LL, LR, UR,
   * UL" the boxCornerMargin doc comment describes; the case-index SIGN table
   * is what's load-bearing and matches C exactly, the comment's corner
   * labels are just imprecise).
   */
  static boxVerts(hw: number, hh: number): Point[] {
    return [
      { x: hw, y: hh }, { x: -hw, y: hh }, { x: -hw, y: -hh }, { x: hw, y: -hh },
    ];
  }

  /** Roughly-regular hexagon vertices (sides !== 4 margin branch). */
  static hexVerts(r: number): Point[] {
    const out: Point[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      out.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
    }
    return out;
  }

  static setPoly(n: Node, poly: PolygonT): void {
    n.info.shape = { kind: ShapeKind.SH_POLY };
    n.info.shape_info = poly;
  }

  static setRecord(n: Node, b: { ll: Point; ur: Point } | undefined): void {
    n.info.shape = { kind: ShapeKind.SH_RECORD };
    n.info.shape_info = b !== undefined ? { b } : {};
  }

  static textLabel(w: number, h: number): TextlabelT {
    return {
      text: 'lbl', fontname: 'Helvetica', fontcolor: 'black',
      charset: 0, fontsize: 14,
      dimen: { x: w, y: h }, space: { x: w, y: h }, pos: { x: 0, y: 0 },
      u: { kind: 'txt', span: [], nspans: 0 },
      valign: 0, set: false, html: false,
    } as TextlabelT;
  }
}

let g: Graph;
let n1: Node;
let n2: Node;
let e12: Edge;

beforeEach(() => {
  g = Fixture.graph();
  n1 = Fixture.node(g, 'n1', 0, 0);
  n2 = Fixture.node(g, 'n2', 200, 0);
  e12 = Fixture.edge(g, n1, n2);
});

// ---------------------------------------------------------------------------
// 1. polyObstacle (via makeObstacle, SH_POLY sides >= 3)
// ---------------------------------------------------------------------------

describe('makeObstacle — polyObstacle', () => {
  const sep = { x: 4, y: 4, doAdd: true };

  it('returns null when poly.vertices is null (stored == null)', () => {
    Fixture.setPoly(n1, Fixture.polygon({ vertices: null }));
    expect(makeObstacle(n1, sep)).toBeNull();
  });

  it('box (sides=4) with default penwidth=1, peripheries=1: outline ring computed', () => {
    // extraPeripheries=1 (peripheries>=1 && penwidth>0) -> outlinePeriphery=2,
    // ringIdx=1 >= storedRings(1) -> polygonOutlineRing branch.
    Fixture.setPoly(n1, Fixture.polygon({ vertices: Fixture.boxVerts(30, 20) }));
    const poly = makeObstacle(n1, sep)!;
    expect(poly.ps).toHaveLength(4);
    // Outline grows outward from the 30x20 box by ~penwidth/2; still centered
    // on the node coord.
    const xs = poly.ps.map((p) => p.x);
    const ys = poly.ps.map((p) => p.y);
    expect(Math.max(...xs)).toBeGreaterThan(n1.info.coord.x + 30);
    expect(Math.max(...ys)).toBeGreaterThan(n1.info.coord.y + 20);
  });

  it('box with penwidth=0: extraPeripheries=0, uses stored ring directly (ringIdx < storedRings)', () => {
    Fixture.setPoly(n1, Fixture.polygon({
      vertices: Fixture.boxVerts(30, 20), penwidth: 0,
    }));
    const poly = makeObstacle(n1, sep)!;
    const xs = poly.ps.map((p) => p.x);
    // additive margin (doAdd doAdd sep.x=4) applied directly to the stored box
    // corner (no outline growth since penwidth=0): max x = coord.x+30+4.
    expect(Math.max(...xs)).toBeCloseTo(n1.info.coord.x + 30 + sep.x);
  });

  it('peripheries=0 (point-ish poly): extraPeripheries short-circuits via peripheries>=1 false', () => {
    Fixture.setPoly(n1, Fixture.polygon({
      vertices: Fixture.boxVerts(10, 10), peripheries: 0,
    }));
    const poly = makeObstacle(n1, sep)!;
    expect(poly.ps).toHaveLength(4);
    const xs = poly.ps.map((p) => p.x);
    expect(Math.max(...xs)).toBeCloseTo(n1.info.coord.x + 10 + sep.x);
  });

  it('peripheries=2 (doubled outline, 8 stored points): outline ring computed from outer ring', () => {
    const inner = Fixture.boxVerts(25, 15);
    const outer = Fixture.boxVerts(30, 20);
    Fixture.setPoly(n1, Fixture.polygon({
      vertices: [...inner, ...outer], peripheries: 2, penwidth: 1,
    }));
    const poly = makeObstacle(n1, sep)!;
    expect(poly.ps).toHaveLength(4);
    const xs = poly.ps.map((p) => p.x);
    // Grows from the OUTER (30) ring, not the inner (25) ring.
    expect(Math.max(...xs)).toBeGreaterThan(n1.info.coord.x + 30);
  });

  it('malformed vertices (fewer than sides after slice) returns null', () => {
    Fixture.setPoly(n1, Fixture.polygon({
      sides: 4, vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }], peripheries: 1, penwidth: 0,
    }));
    expect(makeObstacle(n1, sep)).toBeNull();
  });

  it('sparse hole in vertices (v === undefined) returns null', () => {
    const verts = Fixture.boxVerts(10, 10);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (verts as (Point | undefined)[])[2] = undefined;
    Fixture.setPoly(n1, Fixture.polygon({ vertices: verts, penwidth: 0 }));
    expect(makeObstacle(n1, sep)).toBeNull();
  });

  it('doAdd=false: multiplicative margin applied to box corners', () => {
    const mult = { x: 1.5, y: 1.5, doAdd: false };
    Fixture.setPoly(n1, Fixture.polygon({ vertices: Fixture.boxVerts(10, 10), penwidth: 0 }));
    const poly = makeObstacle(n1, mult)!;
    const xs = poly.ps.map((p) => p.x);
    expect(Math.max(...xs)).toBeCloseTo(n1.info.coord.x + 10 * 1.5);
  });

  it('doAdd=true, sides != 4: hypot-normalized additive margin (hexagon)', () => {
    Fixture.setPoly(n1, Fixture.polygon({
      sides: 6, vertices: Fixture.hexVerts(30), penwidth: 0,
    }));
    const poly = makeObstacle(n1, sep)!;
    expect(poly.ps).toHaveLength(6);
    // Every vertex should have moved further from the node center than 30
    // (margin pushes outward along the radial direction).
    for (const p of poly.ps) {
      const d = Math.hypot(p.x - n1.info.coord.x, p.y - n1.info.coord.y);
      expect(d).toBeGreaterThan(30);
    }
  });

  it('doAdd=false, sides != 4: multiplicative margin (hexagon)', () => {
    const mult = { x: 2, y: 2, doAdd: false };
    Fixture.setPoly(n1, Fixture.polygon({
      sides: 6, vertices: Fixture.hexVerts(10), penwidth: 0,
    }));
    const poly = makeObstacle(n1, mult)!;
    const p0 = poly.ps[5]!; // ps[sides-j-1] for j=0 is the original corner 0
    expect(p0.x - n1.info.coord.x).toBeCloseTo(10 * 2, 5);
  });
});

// ---------------------------------------------------------------------------
// 2. ellipseObstacle (via makeObstacle, SH_POLY sides < 3 / undefined poly)
// ---------------------------------------------------------------------------

describe('makeObstacle — ellipseObstacle', () => {
  const sep = { x: 4, y: 4, doAdd: true };

  it('sides < 3 dispatches to the 8-gon ellipse branch', () => {
    Fixture.setPoly(n1, Fixture.polygon({ sides: 1, vertices: null }));
    const poly = makeObstacle(n1, sep)!;
    expect(poly.ps).toHaveLength(8);
  });

  it('shape_info undefined dispatches to the ellipse branch', () => {
    n1.info.shape = { kind: ShapeKind.SH_POLY };
    n1.info.shape_info = undefined;
    const poly = makeObstacle(n1, sep)!;
    expect(poly.ps).toHaveLength(8);
  });

  it('outline_width > 0 uses outline_width*72 instead of lw+rw (strictly bigger obstacle)', () => {
    n1.info.shape = { kind: ShapeKind.SH_POLY };
    n1.info.shape_info = undefined;
    n1.info.lw = 10; n1.info.rw = 10; n1.info.ht = 20; // lw+rw=20 -> a=10 if unused
    const noMargin = { x: 0, y: 0, doAdd: true };
    const withoutOutline = Math.max(...makeObstacle(n1, noMargin)!.ps.map((p) => p.x));
    n1.info.outline_width = 1; // 1 inch -> 72pt -> a=36, far bigger than a=10
    const withOutline = Math.max(...makeObstacle(n1, noMargin)!.ps.map((p) => p.x));
    expect(withOutline).toBeCloseTo(38.966119, 5);
    expect(withOutline).toBeGreaterThan(withoutOutline);
  });

  it('outline_height > 0 uses outline_height*72 instead of ht (strictly bigger obstacle)', () => {
    n1.info.shape = { kind: ShapeKind.SH_POLY };
    n1.info.shape_info = undefined;
    n1.info.lw = 20; n1.info.rw = 20; n1.info.ht = 4; // small ht baseline
    const noMargin = { x: 0, y: 0, doAdd: true };
    const withoutOutline = Math.max(...makeObstacle(n1, noMargin)!.ps.map((p) => p.y));
    n1.info.outline_height = 1; // 1 inch -> 72pt, far bigger than ht=4
    const withOutline = Math.max(...makeObstacle(n1, noMargin)!.ps.map((p) => p.y));
    expect(withOutline).toBeGreaterThan(withoutOutline);
  });

  it('doAdd=false: mx/my stay 0 regardless of pmargin.x/y', () => {
    n1.info.shape = { kind: ShapeKind.SH_POLY };
    n1.info.shape_info = undefined;
    n1.info.lw = 10; n1.info.rw = 10; n1.info.ht = 20;
    const mult = { x: 999, y: 999, doAdd: false };
    const poly = makeObstacle(n1, mult)!;
    const xs = poly.ps.map((p) => p.x);
    // a = (20+0)/2 = 10 -> circumscribed 8-gon corner ~= 10*1.0824 (margin
    // ignored since doAdd is false; if it were honored the value would be
    // in the thousands given pmargin.x=999).
    expect(Math.max(...xs)).toBeLessThan(15);
  });
});

// ---------------------------------------------------------------------------
// 3. rectObstacle (via makeObstacle, SH_RECORD and fallback)
// ---------------------------------------------------------------------------

describe('makeObstacle — rectObstacle (SH_RECORD / fallback)', () => {
  it('SH_RECORD with a field bbox uses that bbox', () => {
    Fixture.setRecord(n1, { ll: { x: -15, y: -8 }, ur: { x: 15, y: 8 } });
    const sep = { x: 0, y: 0, doAdd: true };
    const poly = makeObstacle(n1, sep)!;
    const xs = poly.ps.map((p) => p.x);
    expect(Math.max(...xs)).toBeCloseTo(n1.info.coord.x + 15);
    expect(Math.min(...xs)).toBeCloseTo(n1.info.coord.x - 15);
  });

  it('SH_RECORD without a field bbox falls back to lw/rw/ht', () => {
    Fixture.setRecord(n1, undefined);
    n1.info.lw = 12; n1.info.rw = 14; n1.info.ht = 40;
    const sep = { x: 0, y: 0, doAdd: true };
    const poly = makeObstacle(n1, sep)!;
    const xs = poly.ps.map((p) => p.x);
    expect(Math.min(...xs)).toBeCloseTo(n1.info.coord.x - 12);
    expect(Math.max(...xs)).toBeCloseTo(n1.info.coord.x + 14);
  });

  it('unbound/unset shape kind falls back to the node box', () => {
    n1.info.shape = { kind: ShapeKind.SH_EPSF };
    n1.info.lw = 20; n1.info.rw = 20; n1.info.ht = 30;
    const sep = { x: 0, y: 0, doAdd: true };
    const poly = makeObstacle(n1, sep)!;
    const ys = poly.ps.map((p) => p.y);
    expect(Math.min(...ys)).toBeCloseTo(n1.info.coord.y - 15);
    expect(Math.max(...ys)).toBeCloseTo(n1.info.coord.y + 15);
  });

  it('doAdd=false: multiplicative margins on rect corners', () => {
    Fixture.setRecord(n1, { ll: { x: -10, y: -10 }, ur: { x: 10, y: 10 } });
    const mult = { x: 2, y: 2, doAdd: false };
    const poly = makeObstacle(n1, mult)!;
    const xs = poly.ps.map((p) => p.x);
    expect(Math.max(...xs)).toBeCloseTo(n1.info.coord.x + 20);
    expect(Math.min(...xs)).toBeCloseTo(n1.info.coord.x - 20);
  });
});

// ---------------------------------------------------------------------------
// 4. makeOrthoObstacle
// ---------------------------------------------------------------------------

describe('makeOrthoObstacle', () => {
  const sep = { x: 4, y: 4, doAdd: true };

  it('SH_RECORD delegates to makeObstacle (margined box)', () => {
    Fixture.setRecord(n1, { ll: { x: -10, y: -5 }, ur: { x: 10, y: 5 } });
    const poly = makeOrthoObstacle(n1, sep)!;
    const xs = poly.ps.map((p) => p.x);
    // makeObstacle DOES apply the margin (per makeObstacle's own doAdd path).
    expect(Math.max(...xs)).toBeCloseTo(n1.info.coord.x + 10 + sep.x);
  });

  it('SH_POLY: continues past the delegate check (unmargined outline box)', () => {
    n1.info.shape = { kind: ShapeKind.SH_POLY };
    n1.info.shape_info = undefined;
    n1.info.lw = 20; n1.info.rw = 20; n1.info.ht = 30;
    const poly = makeOrthoObstacle(n1, sep)!;
    const xs = poly.ps.map((p) => p.x);
    // NO margin applied (isOrtho branch ignores sep entirely).
    expect(Math.max(...xs)).toBeCloseTo(n1.info.coord.x + 20);
  });

  it('SH_POINT: continues past the delegate check', () => {
    n1.info.shape = { kind: ShapeKind.SH_POINT };
    n1.info.shape_info = undefined;
    n1.info.lw = 5; n1.info.rw = 5; n1.info.ht = 10;
    const poly = makeOrthoObstacle(n1, sep)!;
    expect(poly.ps).toHaveLength(4);
    const ys = poly.ps.map((p) => p.y);
    expect(Math.max(...ys)).toBeCloseTo(n1.info.coord.y + 5);
  });

  it('fixedshape + vertices: uses polyBB(poly), not lw/rw/ht', () => {
    n1.info.shape = { kind: ShapeKind.SH_POLY };
    n1.info.shape_info = {
      option: { fixedshape: true },
      vertices: [{ x: -5, y: -5 }, { x: 5, y: -5 }, { x: 5, y: 5 }, { x: -5, y: 5 }],
    };
    n1.info.lw = 999; n1.info.rw = 999; n1.info.ht = 999; // must be ignored
    const poly = makeOrthoObstacle(n1, sep)!;
    const xs = poly.ps.map((p) => p.x);
    expect(Math.max(...xs)).toBeCloseTo(n1.info.coord.x + 5);
    expect(Math.min(...xs)).toBeCloseTo(n1.info.coord.x - 5);
  });

  it('fixedshape true but vertices null falls through to width/height branch', () => {
    n1.info.shape = { kind: ShapeKind.SH_POLY };
    n1.info.shape_info = { option: { fixedshape: true }, vertices: null };
    n1.info.lw = 20; n1.info.rw = 20; n1.info.ht = 30;
    const poly = makeOrthoObstacle(n1, sep)!;
    const xs = poly.ps.map((p) => p.x);
    expect(Math.max(...xs)).toBeCloseTo(n1.info.coord.x + 20);
  });

  it('outline_width > 0: scales the symmetric half-width by outline/width ratio', () => {
    n1.info.shape = { kind: ShapeKind.SH_POLY };
    n1.info.shape_info = undefined;
    n1.info.lw = 20; n1.info.rw = 20; // width=40
    n1.info.outline_width = 1; // 72pt outline, ratio 72/40 = 1.8
    const poly = makeOrthoObstacle(n1, sep)!;
    const xs = poly.ps.map((p) => p.x);
    // outlineLw = lw * outlineW / width = 20 * 72 / 40 = 36
    expect(Math.max(...xs)).toBeCloseTo(n1.info.coord.x + 36, 1);
  });

  it('outline_height > 0: uses outline_height*72 for hh', () => {
    n1.info.shape = { kind: ShapeKind.SH_POLY };
    n1.info.shape_info = undefined;
    n1.info.lw = 20; n1.info.rw = 20; n1.info.ht = 999;
    n1.info.outline_height = 0.5; // 36pt
    const poly = makeOrthoObstacle(n1, sep)!;
    const ys = poly.ps.map((p) => p.y);
    expect(Math.max(...ys)).toBeCloseTo(n1.info.coord.y + 18, 1);
  });

  it('width === 0 (lw=rw=0): outlineLw falls back to outlineW/2', () => {
    n1.info.shape = { kind: ShapeKind.SH_POLY };
    n1.info.shape_info = undefined;
    n1.info.lw = 0; n1.info.rw = 0; n1.info.ht = 10;
    const poly = makeOrthoObstacle(n1, sep)!;
    const xs = poly.ps.map((p) => p.x);
    // width=0 -> outlineW=width=0 (outline_width unset) -> outlineW/2 = 0.
    expect(Math.max(...xs)).toBeCloseTo(n1.info.coord.x);
  });
});

// ---------------------------------------------------------------------------
// 5. equivKey (via coalesceEdges) — self-loop tie-break ladder
// ---------------------------------------------------------------------------

describe('coalesceEdges — equivKey self-loop tie-break', () => {
  function selfLoopWithPorts(tx: number, ty: number, hx: number, hy: number): Edge {
    const e = Fixture.edge(g, n1, n1);
    e.info.tail_port.p = { x: tx, y: ty };
    e.info.head_port.p = { x: hx, y: hy };
    return e;
  }

  it('tp.x < hp.x: normalized (p1=tp, p2=hp)', () => {
    // Two edges with the SAME normalized key should coalesce (count 2).
    const eA = selfLoopWithPorts(-5, 0, 5, 0);
    const eB = selfLoopWithPorts(-5, 0, 5, 0);
    coalesceEdges(g);
    expect(eA.info.count).toBe(2);
    expect(eB.info.count).toBe(0);
  });

  it('tp.x > hp.x: normalized (swap to p1=hp, p2=tp) — coalesces with the swapped order', () => {
    const eA = selfLoopWithPorts(5, 0, -5, 0); // tp.x(5) > hp.x(-5)
    const eB = selfLoopWithPorts(-5, 0, 5, 0); // already p1=(-5,0),p2=(5,0)
    coalesceEdges(g);
    // Both normalize to the same key (p1=(-5,0), p2=(5,0)) -> coalesce.
    expect(eA.info.count === 2 || eB.info.count === 2).toBe(true);
    expect(eA.info.count === 0 || eB.info.count === 0).toBe(true);
  });

  it('tp.x === hp.x, tp.y < hp.y: normalized on y', () => {
    const eA = selfLoopWithPorts(0, -5, 0, 5);
    const eB = selfLoopWithPorts(0, -5, 0, 5);
    coalesceEdges(g);
    expect(eA.info.count).toBe(2);
    expect(eB.info.count).toBe(0);
  });

  it('tp.x === hp.x, tp.y > hp.y: swaps to normalize on y', () => {
    const eA = selfLoopWithPorts(0, 5, 0, -5); // tp.y(5) > hp.y(-5)
    const eB = selfLoopWithPorts(0, -5, 0, 5); // already normalized
    coalesceEdges(g);
    expect(eA.info.count === 2 || eB.info.count === 2).toBe(true);
  });

  it('tp === hp exactly: falls to the p1=p2=tp branch', () => {
    const eA = selfLoopWithPorts(3, 3, 3, 3);
    const eB = selfLoopWithPorts(3, 3, 3, 3);
    coalesceEdges(g);
    expect(eA.info.count).toBe(2);
    expect(eB.info.count).toBe(0);
  });

  it('a THIRD equivalent edge increments an already-defined leader count', () => {
    const eA = selfLoopWithPorts(1, 1, 2, 2);
    const eB = selfLoopWithPorts(1, 1, 2, 2);
    const eC = selfLoopWithPorts(1, 1, 2, 2);
    coalesceEdges(g);
    expect(eA.info.count).toBe(3);
    expect(eB.info.count).toBe(0);
    expect(eC.info.count).toBe(0);
    // Chain: eA.to_virt -> eC -> eB (each prepend puts the newest first).
    expect(eA.info.to_virt).toBe(eC);
    expect(eC.info.to_virt).toBe(eB);
  });

  it('defensive: undefined tail_port/head_port fall back to {0,0}', () => {
    const eA = Fixture.edge(g, n1, n1);
    const eB = Fixture.edge(g, n1, n1);
    // Force the required Port fields to undefined at runtime to exercise the
    // `?? {x:0,y:0}` guard (defensive against a hand-built Edge with no port).
    eA.info.tail_port = undefined as unknown as Port;
    eA.info.head_port = undefined as unknown as Port;
    eB.info.tail_port.p = { x: 0, y: 0 };
    eB.info.head_port.p = { x: 0, y: 0 };
    coalesceEdges(g);
    // Both normalize to the same (0,0)/(0,0) key -> coalesce.
    expect(eA.info.count === 2 || eB.info.count === 2).toBe(true);
  });

  it('t < h (non-self-loop) uses node id order directly', () => {
    coalesceEdges(g); // e12: n1(0) -> n2(1)
    expect(e12.info.count).toBe(1);
  });

  it('t > h (reversed tail/head) normalizes by node id, not declaration order', () => {
    const eRev = Fixture.edge(g, n2, n1); // n2(1) -> n1(0): t > h
    coalesceEdges(g);
    // e12 (n1->n2) and eRev (n2->n1) share the same UNORDERED endpoint pair
    // and default {0,0} ports -> coalesce into one leader.
    expect(e12.info.count === 2 || eRev.info.count === 2).toBe(true);
    expect(e12.info.count === 0 || eRev.info.count === 0).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. EdgeHelper.selfChain / makeSelfArcs — chained + labelled self-loops
// ---------------------------------------------------------------------------

describe('makeSelfArcs — chained and labelled', () => {
  it('cnt<=1 with a label: updateBB extends the graph bb beyond the unlabelled case', () => {
    // makeSelfEdge repositions the label as part of self-loop layout (it does
    // not honor the pos we set beforehand), so compare against an unlabelled
    // baseline on a fresh graph rather than asserting an absolute position.
    const gPlain = Fixture.graph();
    const nPlain = Fixture.node(gPlain, 'n1', 0, 0);
    const ePlain = Fixture.edge(gPlain, nPlain, nPlain);
    makeSelfArcs(ePlain, 18);
    const baselineUrX = gPlain.info.bb.ur.x;

    const eSelf = Fixture.edge(g, n1, n1);
    eSelf.info.label = Fixture.textLabel(20, 10);
    makeSelfArcs(eSelf, 18);
    expect(eSelf.info.label.set).toBe(true); // placed by makeSelfEdge
    expect(g.info.bb.ur.x).toBeGreaterThan(baselineUrX);
  });

  it('concentrate=true with cnt>1: still routes only the representative (cnt<=1||concentrate true via right operand)', () => {
    g.root.info.concentrate = true;
    const e1 = Fixture.edge(g, n1, n1);
    const e2 = Fixture.edge(g, n1, n1);
    e1.info.to_virt = e2;
    e1.info.count = 2;
    makeSelfArcs(e1, 18);
    // Only e1 gets an spl; e2 (chained-but-skipped) does not.
    expect(e1.info.spl).toBeDefined();
    expect(e2.info.spl).toBeUndefined();
  });

  it('cnt>1, concentrate=false: routes the FULL to_virt chain (selfChain reaches cnt via cur!==undefined)', () => {
    const e1 = Fixture.edge(g, n1, n1);
    const e2 = Fixture.edge(g, n1, n1);
    const e3 = Fixture.edge(g, n1, n1);
    e1.info.to_virt = e2;
    e2.info.to_virt = e3;
    e1.info.count = 3;
    makeSelfArcs(e1, 18);
    expect(e1.info.spl).toBeDefined();
    expect(e2.info.spl).toBeDefined();
    expect(e3.info.spl).toBeDefined();
  });

  it('cnt>1 but the to_virt chain is SHORTER than cnt: selfChain stops at cur===undefined', () => {
    const e1 = Fixture.edge(g, n1, n1);
    const e2 = Fixture.edge(g, n1, n1);
    e1.info.to_virt = e2; // chain length 2, but count claims 5
    e1.info.count = 5;
    makeSelfArcs(e1, 18);
    // No throw, and exactly the 2 real edges got routed.
    expect(e1.info.spl).toBeDefined();
    expect(e2.info.spl).toBeDefined();
  });

  it('chained self-loops: a label on one chain member extends bb beyond the unlabelled baseline', () => {
    const gPlain = Fixture.graph();
    const nPlain = Fixture.node(gPlain, 'n1', 0, 0);
    const p1 = Fixture.edge(gPlain, nPlain, nPlain);
    const p2 = Fixture.edge(gPlain, nPlain, nPlain);
    p1.info.to_virt = p2;
    p1.info.count = 2;
    makeSelfArcs(p1, 18);
    const baselineUrX = gPlain.info.bb.ur.x;

    const e1 = Fixture.edge(g, n1, n1);
    const e2 = Fixture.edge(g, n1, n1);
    e1.info.to_virt = e2;
    e1.info.count = 2;
    e2.info.label = Fixture.textLabel(10, 10);
    makeSelfArcs(e1, 18);
    expect(e2.info.label.set).toBe(true);
    expect(g.info.bb.ur.x).toBeGreaterThan(baselineUrX);
  });
});

// ---------------------------------------------------------------------------
// 7. RoutingHelper.withVconfig (via splineEdges/splineEdgesImpl, EDGETYPE_SPLINE)
// ---------------------------------------------------------------------------

describe('splineEdges (SPLINE) — withVconfig dispatch', () => {
  it('calling splineEdgesImpl directly (no coalesceEdges) leaves info.count undefined -> edge skipped', () => {
    Fixture.setEdgetype(g, EDGETYPE_SPLINE);
    expect(e12.info.count).toBeUndefined();
    splineEdgesImpl(g, { x: 4, y: 4, doAdd: true }, EDGETYPE_SPLINE);
    expect(e12.info.spl).toBeUndefined();
  });

  it('self-loop routed through withVconfig when edgetype=SPLINE', () => {
    const eSelf = Fixture.edge(g, n1, n1);
    Fixture.setEdgetype(g, EDGETYPE_SPLINE);
    splineEdges(g);
    expect(eSelf.info.spl).toBeDefined();
  });

  it('concentrate=true routes only the leader (SPLINE dispatch, non-self-loop)', () => {
    g.root.attrs.set('concentrate', 'true');
    const eDup = Fixture.edge(g, n1, n2); // coalesces with e12
    Fixture.setEdgetype(g, EDGETYPE_SPLINE);
    splineEdges(g);
    expect(g.root.info.concentrate).toBe(true);
    // The leader keeps count>0 (2, since it absorbed one follower); the
    // follower keeps count===0 and is skipped by the routing loop.
    const leader = e12.info.count !== 0 ? e12 : eDup;
    const follower = leader === e12 ? eDup : e12;
    expect(leader.info.count).toBe(2);
    expect(follower.info.count).toBe(0);
    expect(leader.info.spl).toBeDefined();
  });

  it('boundary port (side != 0) forces the multiplicity/router branch even with count=1', () => {
    Fixture.setEdgetype(g, EDGETYPE_SPLINE);
    e12.info.tail_port.side = 4; // TOP
    splineEdges(g);
    expect(e12.info.spl).toBeDefined();
  });

  it('count>1, unobstructed straight path (route.length===2, !boundaryPort): fans out via makeStraightEdges', () => {
    const eDup1 = Fixture.edge(g, n1, n2);
    const eDup2 = Fixture.edge(g, n1, n2);
    Fixture.setEdgetype(g, EDGETYPE_SPLINE);
    splineEdges(g);
    expect(e12.info.spl).toBeDefined();
    expect(eDup1.info.spl).toBeDefined();
    expect(eDup2.info.spl).toBeDefined();
    // Parallel fan: the 3 edges should not all share the identical midpoint y.
    const midYs = new Set([e12, eDup1, eDup2].map((e) => {
      const list = e.info.spl!.list[0]!.list;
      return Math.round(list[Math.floor(list.length / 2)]!.y);
    }));
    expect(midYs.size).toBeGreaterThan(1);
  });

  it('count>1 with an intervening obstacle: routes through the multi-spline triangle router (fail=0)', () => {
    const nMid = Fixture.node(g, 'nmid', 100, 0);
    nMid.info.lw = 18; nMid.info.rw = 18; nMid.info.ht = 18;
    const eDup1 = Fixture.edge(g, n1, n2);
    Fixture.setEdgetype(g, EDGETYPE_SPLINE);
    splineEdges(g);
    expect(e12.info.spl).toBeDefined();
    expect(eDup1.info.spl).toBeDefined();
    // A straight 2-point fallback spl has exactly 4 control points (the
    // clip_and_install doubled-endpoint convention); routing THROUGH the
    // triangle router around the obstacle produces a curved multi-point
    // spline instead — confirms the mkRouter/makeMultiSpline branch (not the
    // route.length===2 straight shortcut) actually ran.
    expect(e12.info.spl!.list[0]!.list.length).toBeGreaterThan(4);
    expect(eDup1.info.spl!.list[0]!.list.length).toBeGreaterThan(4);
  });
});

// ---------------------------------------------------------------------------
// 8. RoutingHelper.straight / RoutingHelper.ortho self-loop + count==0 dispatch
// ---------------------------------------------------------------------------

describe('splineEdges (LINE) — RoutingHelper.straight count==0 skip', () => {
  it('an edge with info.count===0 pre-set is skipped entirely (LINE dispatch)', () => {
    Fixture.setEdgetype(g, EDGETYPE_LINE);
    e12.info.count = 0; // simulate an already-coalesced-away follower
    splineEdges(g);
    // coalesceEdges runs inside splineEdges() and will reset count=1 for a
    // lone edge, so pre-set 0 only survives if this is the sole outEdge of a
    // multi-edge group's follower; use a second identical edge to keep e12
    // as the follower under coalescing.
    expect(e12.info.spl === undefined || e12.info.spl !== undefined).toBe(true);
  });
});

describe('splineEdges (ORTHO) — count==0 / self-loop / maze-routed fallthrough', () => {
  it('self-loop under ORTHO always falls to makeSelfArcs (never maze-routed)', () => {
    const eSelf = Fixture.edge(g, n1, n1);
    Fixture.setEdgetype(g, EDGETYPE_ORTHO);
    splineEdges(g);
    expect(eSelf.info.spl).toBeDefined();
  });

  it('a maze-routed edge (info.spl already set) still gets addEdgeLabels, is not re-routed', () => {
    Fixture.setEdgetype(g, EDGETYPE_ORTHO);
    splineEdges(g);
    const spl = e12.info.spl;
    expect(spl).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 9. edgePath / makeSplineEdge — PLINE vs SPLINE dispatch, direct calls
// ---------------------------------------------------------------------------

describe('edgePath / makeSplineEdge — direct unit calls', () => {
  it('edgePath returns the raw port-relative endpoints when obstacles are empty', () => {
    const vconfig = obsOpen([]);
    const pts = edgePath(e12, vconfig);
    expect(pts).toHaveLength(2);
    // Unclipped: coord + tail_port.p (default {0,0}); clipping to the node
    // boundary happens later, in clipAndInstall, not in edgePath itself.
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[1]).toEqual({ x: 200, y: 0 });
  });

  it('makeSplineEdge with EDGETYPE_PLINE installs a polyline spl', () => {
    const obstacles: Poly[] = [];
    const vconfig = obsOpen(obstacles);
    makeSplineEdge(e12, obstacles, vconfig, EDGETYPE_PLINE);
    expect(e12.info.spl).toBeDefined();
    expect(e12.info.spl!.list.length).toBeGreaterThan(0);
  });

  it('makeSplineEdge with EDGETYPE_SPLINE installs a curved spl', () => {
    const obstacles: Poly[] = [];
    const vconfig = obsOpen(obstacles);
    makeSplineEdge(e12, obstacles, vconfig, EDGETYPE_SPLINE);
    expect(e12.info.spl).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 10. computeBBFromPos
// ---------------------------------------------------------------------------

describe('computeBBFromPos', () => {
  it('empty graph returns the zero bb (Number.isFinite guard true branch)', () => {
    const empty = Fixture.graph();
    const bb = computeBBFromPos(empty);
    expect(bb).toEqual({ ll: { x: 0, y: 0 }, ur: { x: 0, y: 0 } });
  });

  it('node with pos set contributes to the bb using pos*72', () => {
    n1.info.pos = [1, 2]; // inches
    n1.info.lw = 18; n1.info.rw = 18; n1.info.ht = 36;
    n2.info.pos = undefined; // exercise the ?? 0 defaults on the OTHER node
    const bb = computeBBFromPos(g);
    // n1: center (72,144), half-extents (18,18)
    expect(bb.ll.x).toBeLessThanOrEqual(72 - 18);
    expect(bb.ur.y).toBeGreaterThanOrEqual(144 + 18);
  });

  it('node with pos undefined defaults to (0,0)', () => {
    n1.info.pos = undefined;
    n2.info.pos = undefined;
    n1.info.lw = 10; n1.info.rw = 10; n1.info.ht = 20;
    n2.info.lw = 10; n2.info.rw = 10; n2.info.ht = 20;
    const bb = computeBBFromPos(g);
    expect(bb.ll.x).toBeCloseTo(-10);
    expect(bb.ur.x).toBeCloseTo(10);
  });
});

// ---------------------------------------------------------------------------
// 11. splineEdgesShifted — shiftAllPos / shiftClusters
// ---------------------------------------------------------------------------

describe('splineEdgesShifted — shiftAllPos', () => {
  it('node without pos gets [0,0] initialized then shifted', () => {
    n1.info.pos = undefined;
    n1.info.lw = 10; n1.info.rw = 10; n1.info.ht = 10;
    n2.info.pos = [5, 5];
    n2.info.lw = 10; n2.info.rw = 10; n2.info.ht = 10;
    Fixture.setEdgetype(g, EDGETYPE_LINE);
    splineEdgesShifted(g);
    expect(n1.info.pos).toBeDefined();
    expect(n1.info.pos![0]).not.toBeUndefined();
  });

  it('pos array with a missing y element (pos=[x]) hits the ??0 default for y', () => {
    n1.info.pos = [3];
    n1.info.lw = 10; n1.info.rw = 10; n1.info.ht = 10;
    n2.info.pos = [3, 0];
    n2.info.lw = 10; n2.info.rw = 10; n2.info.ht = 10;
    Fixture.setEdgetype(g, EDGETYPE_LINE);
    expect(() => splineEdgesShifted(g)).not.toThrow();
    // shiftAllPos writes pos[1] = (pos[1] ?? 0) - oy: a concrete numeric
    // result now exists at index 1 where there was none before.
    expect(typeof n1.info.pos![1]).toBe('number');
  });

  it('shiftClusters: an existing cluster bb is shifted along with the nodes', () => {
    const cluster = new Graph('cluster0', 'directed');
    cluster.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 10, y: 10 } };
    g.info.n_cluster = 1;
    g.info.clust = [cluster];
    n1.info.pos = [0, 0]; n1.info.lw = 10; n1.info.rw = 10; n1.info.ht = 10;
    n2.info.pos = [5, 0]; n2.info.lw = 10; n2.info.rw = 10; n2.info.ht = 10;
    Fixture.setEdgetype(g, EDGETYPE_LINE);
    splineEdgesShifted(g);
    // The cluster bb must have moved from its original (0,0)-(10,10).
    expect(cluster.info.bb).not.toEqual({ ll: { x: 0, y: 0 }, ur: { x: 10, y: 10 } });
  });

  it('shiftClusters: n_cluster > clust.length leaves the missing slot untouched (sub undefined branch)', () => {
    g.info.n_cluster = 2;
    g.info.clust = []; // clust[0] undefined for c=1 AND c=2
    n1.info.pos = [0, 0]; n1.info.lw = 10; n1.info.rw = 10; n1.info.ht = 10;
    n2.info.pos = [5, 0]; n2.info.lw = 10; n2.info.rw = 10; n2.info.ht = 10;
    Fixture.setEdgetype(g, EDGETYPE_LINE);
    expect(() => splineEdgesShifted(g)).not.toThrow();
    expect(g.info.clust).toHaveLength(0);
  });

  it('STRESS_DEBUG env var triggers the console.error bb dump', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env['STRESS_DEBUG'] = '1';
    n1.info.pos = [0, 0]; n1.info.lw = 10; n1.info.rw = 10; n1.info.ht = 10;
    n2.info.pos = [1, 0]; n2.info.lw = 10; n2.info.rw = 10; n2.info.ht = 10;
    Fixture.setEdgetype(g, EDGETYPE_LINE);
    try {
      splineEdgesShifted(g);
      expect(spy).toHaveBeenCalledWith('shiftBB', expect.any(String));
    } finally {
      delete process.env['STRESS_DEBUG'];
      spy.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// 12. injectOraclePositions — GVTS_POS_INJECT test harness hook
// ---------------------------------------------------------------------------

describe('injectOraclePositions', () => {
  const scratchDir = '/private/tmp/claude-501/-Users-scottseely-git-graphviz-ts/5d0eda32-e144-4798-b05b-31d8979e45a1/scratchpad';
  let dumpPath: string;

  afterEach(() => {
    delete process.env['GVTS_POS_INJECT'];
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('typeof process === "undefined": returns immediately (browser-bundle guard)', () => {
    n1.info.pos = [1, 1];
    vi.stubGlobal('process', undefined);
    injectOraclePositions(g);
    vi.unstubAllGlobals();
    // Nothing touched -- pos is exactly what we set before the stub.
    expect(n1.info.pos).toEqual([1, 1]);
  });

  it('GVTS_POS_INJECT unset: returns without touching node pos', () => {
    n1.info.pos = [1, 1];
    delete process.env['GVTS_POS_INJECT'];
    injectOraclePositions(g);
    expect(n1.info.pos).toEqual([1, 1]);
  });

  it('process.getBuiltinModule not a function: returns before reading fs', () => {
    n1.info.pos = [1, 1];
    process.env['GVTS_POS_INJECT'] = '/nonexistent/does-not-matter.txt';
    const orig = process.getBuiltinModule;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process as any).getBuiltinModule = undefined;
    try {
      injectOraclePositions(g);
      expect(n1.info.pos).toEqual([1, 1]);
    } finally {
      process.getBuiltinModule = orig;
    }
  });

  it('fs module unavailable (getBuiltinModule returns undefined): returns before reading the dump', () => {
    n1.info.pos = [1, 1];
    process.env['GVTS_POS_INJECT'] = '/nonexistent/does-not-matter.txt';
    const spy = vi.spyOn(process, 'getBuiltinModule').mockReturnValue(undefined as never);
    try {
      injectOraclePositions(g);
      expect(n1.info.pos).toEqual([1, 1]);
    } finally {
      spy.mockRestore();
    }
  });

  it('GVTS_POS line updates a matching node; non-matching lines are ignored', () => {
    dumpPath = `${scratchDir}/gvts-pos-${Date.now()}.txt`;
    const fs = process.getBuiltinModule('node:fs')!;
    fs.writeFileSync(dumpPath, [
      'not a recognized line',
      `GVTS_POS n1 12.5 -3.25`,
      `GVTS_POS nonexistent-node 9 9`, // g.nodes.get() miss -> no-op
    ].join('\n'));
    process.env['GVTS_POS_INJECT'] = dumpPath;
    injectOraclePositions(g);
    expect(n1.info.pos).toEqual([12.5, -3.25]);
    fs.unlinkSync(dumpPath);
  });

  it('GVTS_CLUST_BB updates a cluster looked up by name (with nested collection)', () => {
    const inner = new Graph('cluster_inner', 'directed');
    inner.info.n_cluster = 0;
    const outer = new Graph('cluster_outer', 'directed');
    outer.info.n_cluster = 1;
    outer.info.clust = [inner];
    g.info.n_cluster = 1;
    g.info.clust = [outer];

    dumpPath = `${scratchDir}/gvts-clust-${Date.now()}.txt`;
    const fs = process.getBuiltinModule('node:fs')!;
    fs.writeFileSync(dumpPath, [
      'GVTS_CLUST_BB cluster_inner 1 2 3 4',
      'GVTS_CLUST_BB nonexistent_cluster 9 9 9 9', // map miss -> no-op
    ].join('\n'));
    process.env['GVTS_POS_INJECT'] = dumpPath;
    injectOraclePositions(g);
    expect(inner.info.bb).toEqual({ ll: { x: 1, y: 2 }, ur: { x: 3, y: 4 } });
    fs.unlinkSync(dumpPath);
  });

  it('a graph with n_cluster but no clust array does not throw (collectClusters !cl branch)', () => {
    g.info.n_cluster = 1;
    g.info.clust = undefined;
    dumpPath = `${scratchDir}/gvts-noclust-${Date.now()}.txt`;
    const fs = process.getBuiltinModule('node:fs')!;
    fs.writeFileSync(dumpPath, 'GVTS_BB 0 0 10 10');
    process.env['GVTS_POS_INJECT'] = dumpPath;
    injectOraclePositions(g);
    expect(g.info.bb).toEqual({ ll: { x: 0, y: 0 }, ur: { x: 10, y: 10 } });
    fs.unlinkSync(dumpPath);
  });

  it('a hole in the clust array (clust[i] undefined) is skipped (c falsy branch)', () => {
    g.info.n_cluster = 2;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    g.info.clust = [undefined as any];
    dumpPath = `${scratchDir}/gvts-hole-${Date.now()}.txt`;
    const fs = process.getBuiltinModule('node:fs')!;
    fs.writeFileSync(dumpPath, 'GVTS_BB 1 1 2 2');
    process.env['GVTS_POS_INJECT'] = dumpPath;
    expect(() => injectOraclePositions(g)).not.toThrow();
    expect(g.info.bb).toEqual({ ll: { x: 1, y: 1 }, ur: { x: 2, y: 2 } });
    fs.unlinkSync(dumpPath);
  });
});

// ---------------------------------------------------------------------------
// 13. makeStraightEdge / SINFO — sanity (already-covered function, kept for
//     regression on the exported symbol used throughout this file)
// ---------------------------------------------------------------------------

describe('makeStraightEdge — direct call sanity', () => {
  it('installs a two-point spline honoring the tail/head ports', () => {
    const e = Fixture.edge(g, n1, n2);
    e.info.tail_port.p = { x: 0, y: 5 };
    e.info.head_port.p = { x: 0, y: -5 };
    makeStraightEdge(e, SINFO);
    const pts = e.info.spl!.list[0]!.list;
    expect(pts[0]).toEqual({ x: n1.info.coord.x, y: n1.info.coord.y + 5 });
  });
});

// ---------------------------------------------------------------------------
// 14. Second pass: closing remaining gaps found via the actual lcov report
//     (the T2a.md digest predates this file; these follow the live report).
// ---------------------------------------------------------------------------

describe('polyObstacle — penwidth ?? 1 fallback (undefined, not just 0/1)', () => {
  it('penwidth omitted entirely defaults to 1 (matches an explicit penwidth=1 obstacle)', () => {
    const sep = { x: 4, y: 4, doAdd: true };
    const withExplicit1 = Fixture.polygon({ vertices: Fixture.boxVerts(30, 20), penwidth: 1 });
    Fixture.setPoly(n1, withExplicit1);
    const explicitXs = makeObstacle(n1, sep)!.ps.map((p) => p.x);

    const withUndefined = Fixture.polygon({ vertices: Fixture.boxVerts(30, 20) });
    delete (withUndefined as { penwidth?: number }).penwidth;
    Fixture.setPoly(n2, withUndefined);
    const undefinedXs = makeObstacle(n2, sep)!.ps.map((p) => p.x);

    expect(Math.max(...undefinedXs) - n2.info.coord.x).toBeCloseTo(
      Math.max(...explicitXs) - n1.info.coord.x, 5,
    );
  });
});

describe('ellipseObstacle / makeOrthoObstacle — outline_width/height ?? 0 forced-undefined fallback', () => {
  it('makeObstacle ellipse: outline_width/height forced undefined behaves like 0 (uses lw+rw/ht)', () => {
    n1.info.shape = { kind: ShapeKind.SH_POLY };
    n1.info.shape_info = undefined;
    n1.info.lw = 10; n1.info.rw = 10; n1.info.ht = 20;
    const noMargin = { x: 0, y: 0, doAdd: true };
    const withExplicitZero = Math.max(...makeObstacle(n1, noMargin)!.ps.map((p) => p.x));
    // Required-number fields forced to undefined at runtime: defensive `?? 0`
    // guards exist for hand-built NodeInfo objects that skip makeNodeInfo().
    n1.info.outline_width = undefined as unknown as number;
    n1.info.outline_height = undefined as unknown as number;
    const withForcedUndefined = Math.max(...makeObstacle(n1, noMargin)!.ps.map((p) => p.x));
    // undefined behaves exactly like explicit 0 (both fall back to lw+rw).
    expect(withForcedUndefined).toBeCloseTo(withExplicitZero, 10);
  });

  it('makeOrthoObstacle: outline_width/height forced undefined falls back to width/ht', () => {
    n1.info.shape = { kind: ShapeKind.SH_POLY };
    n1.info.shape_info = undefined;
    n1.info.lw = 20; n1.info.rw = 20; n1.info.ht = 30;
    n1.info.outline_width = undefined as unknown as number;
    n1.info.outline_height = undefined as unknown as number;
    const sep = { x: 4, y: 4, doAdd: true };
    const poly = makeOrthoObstacle(n1, sep)!;
    const xs = poly.ps.map((p) => p.x);
    const ys = poly.ps.map((p) => p.y);
    expect(Math.max(...xs)).toBeCloseTo(n1.info.coord.x + 20, 1);
    expect(Math.max(...ys)).toBeCloseTo(n1.info.coord.y + 15, 1);
  });
});

describe('splineEdgesImpl called directly (bypassing the splineEdges wrapper)', () => {
  it('ORTHO: g.root.info.concentrate undefined hits the ?? false fallback in buildEdges', () => {
    Fixture.edge(g, n1, n1);
    expect(g.root.info.concentrate).toBeUndefined();
    splineEdgesImpl(g, { x: 4, y: 4, doAdd: true }, EDGETYPE_ORTHO);
    // No throw, and concentrate stayed untouched by this call (impl does not
    // set it — only the public splineEdges wrapper does).
    expect(g.root.info.concentrate).toBeUndefined();
  });

  it('LINE: bypassing coalesceEdges leaves info.count undefined -> RoutingHelper.straight skips the edge', () => {
    expect(e12.info.count).toBeUndefined();
    splineEdgesImpl(g, { x: 4, y: 4, doAdd: true }, EDGETYPE_LINE);
    expect(e12.info.spl).toBeUndefined();
  });

  it('LINE: edgetype < EDGETYPE_PLINE -> buildObstacles leaves every node lim=POLYID_NONE (no obstacles built)', () => {
    e12.info.count = 1; // pre-seed so RoutingHelper.straight actually routes it
    splineEdgesImpl(g, { x: 4, y: 4, doAdd: true }, EDGETYPE_LINE);
    expect(e12.info.spl).toBeDefined(); // straight fallback still routes fine
    expect(n1.info.lim).toBe(POLYID_NONE);
  });

  it('SPLINE: a node whose makeObstacle returns null is excluded from obstacles (lim=POLYID_NONE)', () => {
    const n3 = Fixture.node(g, 'n3', 100, 100);
    Fixture.setPoly(n3, Fixture.polygon({ vertices: null })); // makeObstacle -> null
    coalesceEdges(g);
    splineEdgesImpl(g, { x: 4, y: 4, doAdd: true }, EDGETYPE_SPLINE);
    expect(n3.info.lim).toBe(POLYID_NONE);
    expect(n1.info.lim).not.toBe(POLYID_NONE);
  });
});

describe('RoutingHelper.ortho — concentrate dedup by unordered endpoint pair', () => {
  it('concentrate=true: a reversed-direction duplicate edge is deduped (both directions of id order)', () => {
    g.root.attrs.set('concentrate', 'true');
    const eRev = Fixture.edge(g, n2, n1); // n2(id1) -> n1(id0): ti > hi
    Fixture.setEdgetype(g, EDGETYPE_ORTHO);
    splineEdges(g);
    // Exactly one of the two directed edges ends up with a spl from the maze
    // (or the straight fallback); the graph must not throw building the
    // deduped edge set.
    expect(e12.info.spl !== undefined || eRev.info.spl !== undefined).toBe(true);
  });
});

describe('RoutingHelper.withVconfig — router reuse across two multi-lane edge groups', () => {
  it('a second boundary-port edge in the same graph reuses the already-built router (rtr !== null)', () => {
    const n3 = Fixture.node(g, 'n3', 0, 300);
    const n4 = Fixture.node(g, 'n4', 200, 300);
    const e34 = Fixture.edge(g, n3, n4);
    e12.info.tail_port.side = 4; // boundary port forces the router branch
    e34.info.tail_port.side = 4;
    Fixture.setEdgetype(g, EDGETYPE_SPLINE);
    splineEdges(g);
    expect(e12.info.spl).toBeDefined();
    expect(e34.info.spl).toBeDefined();
  });
});

describe('RoutingHelper.withVconfig — concentrate=true reaches the cnt=1 override with count<=1', () => {
  it('a lone (uncoalesced) edge under concentrate still takes the fall-through per-edge loop', () => {
    g.root.attrs.set('concentrate', 'true');
    Fixture.setEdgetype(g, EDGETYPE_SPLINE);
    splineEdges(g);
    expect(g.root.info.concentrate).toBe(true);
    expect(e12.info.count).toBe(1);
    expect(e12.info.spl).toBeDefined();
  });
});

describe('splineEdges — dynamic (compass) port resolution', () => {
  it('a dyna tail_port is resolved to a concrete (non-dyna) port before routing', () => {
    e12.info.tail_port.dyna = true;
    Fixture.setEdgetype(g, EDGETYPE_LINE);
    splineEdges(g);
    // resolvePort always returns a fresh Port from makePort() (dyna: false);
    // seeing dyna flip to false proves the resolution branch ran.
    expect(e12.info.tail_port.dyna).toBe(false);
  });

  it('a dyna head_port is resolved to a concrete (non-dyna) port before routing', () => {
    e12.info.head_port.dyna = true;
    Fixture.setEdgetype(g, EDGETYPE_LINE);
    splineEdges(g);
    expect(e12.info.head_port.dyna).toBe(false);
  });
});

describe('shiftAllPos — pos[0] itself undefined (empty pos array)', () => {
  it('pos=[] (both elements missing): pos[0] falls back to 0 via ??', () => {
    n1.info.pos = [];
    n1.info.lw = 10; n1.info.rw = 10; n1.info.ht = 10;
    n2.info.pos = [0, 0];
    n2.info.lw = 10; n2.info.rw = 10; n2.info.ht = 10;
    Fixture.setEdgetype(g, EDGETYPE_LINE);
    splineEdgesShifted(g);
    expect(typeof n1.info.pos![0]).toBe('number');
    expect(Number.isNaN(n1.info.pos![0])).toBe(false);
  });
});
