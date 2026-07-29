// SPDX-License-Identifier: EPL-2.0

/**
 * Branch-coverage tests for src/common/poly-inside.ts (T4c).
 *
 * Targets fixedShapeSize's vertex fold, insideDims's zero-vs-set width/
 * height/outline fallbacks, insideScale's fixedshape/flip/zero-size
 * dispatch, polygonWalk's same-side segment walk (both directions of the
 * loop), insideShape's ellipse (sides<=2) vs polygon-walk (sides>2) split,
 * polyInside/starInside's undefined-node / bp-box / undefined-poly guards
 * and rankdir rotation, and starInside's pentagram far-side count.
 *
 * @see lib/common/shapes.c:poly_inside
 * @see lib/common/shapes.c:star_inside
 */

import { describe, it, expect } from 'vitest';
import {
  sameSide,
  fixedShapeSize,
  polyInside,
  starInside,
} from './poly-inside.js';
import type { InsideContext } from './splines-geom.js';
import { Graph } from '../model/graph.js';
import { Node } from '../model/node.js';
import { makeNodeInfo } from '../model/nodeInfo.js';
import type { PolygonT, GraphvizPolygonStyle } from './types.js';
import type { Point } from '../model/geom.js';

function style(overrides: Partial<GraphvizPolygonStyle> = {}): GraphvizPolygonStyle {
  return {
    filled: false, radial: false, rounded: false, diagonals: false,
    auxlabels: false, invisible: false, striped: false, dotted: false,
    dashed: false, wedged: false, underline: false, fixedshape: false,
    shape: 0,
    ...overrides,
  };
}

function polygon(overrides: Partial<PolygonT> = {}): PolygonT {
  return {
    regular: false, peripheries: 1, sides: 4, orientation: 0,
    distortion: 0, skew: 0, option: style(), penwidth: 1,
    vertices: null,
    ...overrides,
  };
}

/** Box vertices UR, UL, LL, LR (poly-sizing convention). */
function boxVerts(hw: number, hh: number): Point[] {
  return [
    { x: hw, y: hh }, { x: -hw, y: hh }, { x: -hw, y: -hh }, { x: hw, y: -hh },
  ];
}

/** Regular hexagon vertices (sides > 4, exercises the polygonWalk loop). */
function hexVerts(r: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    out.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  return out;
}

function node(overrides: {
  width?: number; height?: number; outline_width?: number; outline_height?: number;
  lw?: number; rw?: number; ht?: number; flip?: boolean; rankdir?: number;
} = {}): Node {
  const g = new Graph('g', 'directed');
  g.info.flip = overrides.flip ?? false;
  g.info.rankdir = overrides.rankdir ?? 0;
  const n = new Node(1, 'n', g);
  n.info = makeNodeInfo();
  n.info.width = overrides.width ?? 0;
  n.info.height = overrides.height ?? 0;
  n.info.outline_width = overrides.outline_width ?? 0;
  n.info.outline_height = overrides.outline_height ?? 0;
  n.info.lw = overrides.lw ?? 36;
  n.info.rw = overrides.rw ?? 36;
  n.info.ht = overrides.ht ?? 40;
  return n;
}

function ctxFor(n: Node, bp: InsideContext['bp'] = null): InsideContext {
  return { nodeCoord: n.info.coord ?? { x: 0, y: 0 }, rw: 0, bp, node: n };
}

describe('sameSide', () => {
  it('true when both points are on the same side of the line', () => {
    expect(sameSide({ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 0, y: 0 }, { x: 0, y: 10 })).toBe(true);
  });
  it('false when points straddle the line', () => {
    expect(sameSide({ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -10 }, { x: 0, y: 10 })).toBe(false);
  });
});

describe('fixedShapeSize', () => {
  it('vertices null (?? fallback) yields a zero box', () => {
    expect(fixedShapeSize(polygon({ vertices: null }))).toEqual({ w: 0, h: 0 });
  });
  it('folds the max abs x/y across all vertices', () => {
    const v = [{ x: 3, y: -4 }, { x: -7, y: 2 }, { x: 1, y: 9 }];
    expect(fixedShapeSize(polygon({ vertices: v }))).toEqual({ w: 14, h: 18 });
  });
});

describe('polyInside — node/bp/poly guards', () => {
  it('undefined node returns false', () => {
    expect(polyInside({ nodeCoord: { x: 0, y: 0 }, rw: 0, bp: null }, { x: 0, y: 0 })).toBe(false);
  });

  it('bp box present: point inside the box is true', () => {
    const n = node();
    const bp = { ll: { x: -10, y: -10 }, ur: { x: 10, y: 10 } };
    expect(polyInside(ctxFor(n, bp), { x: 5, y: 5 })).toBe(true);
  });

  it('bp box present: point outside the box is false', () => {
    const n = node();
    const bp = { ll: { x: -10, y: -10 }, ur: { x: 10, y: 10 } };
    expect(polyInside(ctxFor(n, bp), { x: 50, y: 5 })).toBe(false);
  });

  it('bp box: rankdir rotates the query point before the box test', () => {
    const n = node({ rankdir: 1 }); // LR: ccwrotatepf(p, 90)
    // A wide-short box in the label frame.
    const bp = { ll: { x: -30, y: -5 }, ur: { x: 30, y: 5 } };
    // (0, 25) -> ccwrotatepf(., 90) = (-25, 0): inside the wide box.
    expect(polyInside(ctxFor(n, bp), { x: 0, y: 25 })).toBe(true);
  });

  it('poly undefined returns false', () => {
    const n = node();
    n.info.shape_info = undefined;
    expect(polyInside(ctxFor(n), { x: 0, y: 0 })).toBe(false);
  });

  it('poly.vertices null returns false', () => {
    const n = node();
    n.info.shape_info = polygon({ vertices: null, sides: 4 });
    expect(polyInside(ctxFor(n), { x: 0, y: 0 })).toBe(false);
  });
});

describe('polyInside — ellipse branch (sides <= 2)', () => {
  it('center point is inside', () => {
    const n = node({ width: 100 / 72, height: 50 / 72, lw: 36, rw: 36, ht: 50 });
    n.info.shape_info = polygon({ sides: 1, vertices: [] });
    expect(polyInside(ctxFor(n), { x: 0, y: 0 })).toBe(true);
  });
  it('far point is outside', () => {
    const n = node({ width: 100 / 72, height: 50 / 72, lw: 36, rw: 36, ht: 50 });
    n.info.shape_info = polygon({ sides: 1, vertices: [] });
    expect(polyInside(ctxFor(n), { x: 1000, y: 1000 })).toBe(false);
  });
});

describe('polyInside — polygon-walk branch (sides > 2), non-fixedshape', () => {
  it('center of a box node is inside', () => {
    const n = node({ lw: 36, rw: 36, ht: 40 });
    n.info.shape_info = polygon({ sides: 4, vertices: boxVerts(36, 20), penwidth: 1 });
    expect(polyInside(ctxFor(n), { x: 0, y: 0 })).toBe(true);
  });

  it('point far outside the outline box (scaled coord check) is false', () => {
    const n = node({ lw: 36, rw: 36, ht: 40 });
    n.info.shape_info = polygon({ sides: 4, vertices: boxVerts(36, 20), penwidth: 1 });
    expect(polyInside(ctxFor(n), { x: 1000, y: 1000 })).toBe(false);
  });

  it('point just outside one edge of a hexagon (loop iterates, s branch)', () => {
    const n = node({ lw: 40, rw: 40, ht: 80 });
    n.info.shape_info = polygon({
      sides: 6, peripheries: 1, vertices: hexVerts(40), penwidth: 1,
    });
    // Along +x axis, outside the hex boundary.
    expect(polyInside(ctxFor(n), { x: 39, y: 0 })).toBe(false);
  });

  it('point inside a hexagon near center is true (loop iterates, other s branch)', () => {
    const n = node({ lw: 40, rw: 40, ht: 80 });
    n.info.shape_info = polygon({
      sides: 6, peripheries: 1, vertices: hexVerts(40), penwidth: 1,
    });
    expect(polyInside(ctxFor(n), { x: 5, y: 5 })).toBe(true);
  });

  it('multiple peripheries: uses the outermost ring (outerStart offset)', () => {
    const n = node({ lw: 46, rw: 46, ht: 52 });
    const inner = boxVerts(36, 20);
    const outer = boxVerts(46, 26);
    n.info.shape_info = polygon({
      sides: 4, peripheries: 2, vertices: [...inner, ...outer], penwidth: 1,
    });
    // Between the two rings: inside the outer ring, so true.
    expect(polyInside(ctxFor(n), { x: 40, y: 0 })).toBe(true);
  });
});

describe('polyInside — insideDims width/height/outline fallbacks', () => {
  it('n.info.width set (truthy) uses it instead of xsize/72', () => {
    const n = node({ width: 200 / 72, height: 100 / 72, lw: 100, rw: 100, ht: 100 });
    n.info.shape_info = polygon({ sides: 4, vertices: boxVerts(100, 50), penwidth: 1 });
    // w = 72*200/72 = 200, scalex = w/(lw+rw=200) = 1. Center is inside.
    expect(polyInside(ctxFor(n), { x: 0, y: 0 })).toBe(true);
  });

  it('n.info.width zero falls back to xsize/72 (lw+rw)', () => {
    const n = node({ width: 0, height: 0, lw: 36, rw: 36, ht: 40 });
    n.info.shape_info = polygon({ sides: 4, vertices: boxVerts(36, 20), penwidth: 1 });
    expect(polyInside(ctxFor(n), { x: 0, y: 0 })).toBe(true);
  });

  it('outline_width set (truthy) is used for boxURx instead of w', () => {
    const n = node({ width: 0, height: 0, outline_width: 50 / 72, lw: 36, rw: 36, ht: 40 });
    n.info.shape_info = polygon({ sides: 4, vertices: boxVerts(36, 20), penwidth: 1 });
    // ow = 72*50/72 = 50, boxURx = 25. A point at x=30 is outside boxURx.
    expect(polyInside(ctxFor(n), { x: 30, y: 0 })).toBe(false);
  });

  it('outline_height set (truthy) is used for boxURy instead of h', () => {
    const n = node({ width: 0, height: 0, outline_height: 10 / 72, lw: 36, rw: 36, ht: 40 });
    n.info.shape_info = polygon({ sides: 4, vertices: boxVerts(36, 20), penwidth: 1 });
    // oh = 72*10/72 = 10, boxURy = 5. A point at y=8 is outside boxURy.
    expect(polyInside(ctxFor(n), { x: 0, y: 8 })).toBe(false);
  });
});

describe('polyInside — insideScale flip and zero-size branches', () => {
  it('flip=true swaps xsize/ysize (non-fixedshape): a tall shape reads as wide', () => {
    const n = node({ flip: true, lw: 36, rw: 36, ht: 100 });
    n.info.shape_info = polygon({ sides: 4, vertices: boxVerts(36, 20), penwidth: 1 });
    // xsize = ht = 100 (flip), ysize = lw+rw = 72.
    expect(polyInside(ctxFor(n), { x: 0, y: 0 })).toBe(true);
  });

  it('zero xsize (non-fixedshape) takes the scalex=w branch', () => {
    const n = node({ lw: 0, rw: 0, ht: 0, width: 20 / 72, height: 20 / 72 });
    n.info.shape_info = polygon({ sides: 4, vertices: boxVerts(10, 10), penwidth: 1 });
    // xsize = lw+rw = 0 -> scalex = w (=20). P.x = p.x*20.
    // boxURx = ow/2; ow falls back to w = 20, boxURx = 10.
    // A point at p.x=0.4 -> P.x=8 < 10: inside on x. p.y=0 similarly.
    expect(polyInside(ctxFor(n), { x: 0.4, y: 0 })).toBe(true);
    expect(polyInside(ctxFor(n), { x: 1, y: 0 })).toBe(false);
  });
});

describe('polyInside — fixedshape branch', () => {
  it('fixedshape, flip=false: center inside, corner-beyond-vertex outside', () => {
    const n = node({ lw: 999, rw: 999, ht: 999 }); // ignored under fixedshape
    n.info.shape_info = polygon({
      sides: 4, vertices: boxVerts(30, 15), penwidth: 1,
      option: style({ fixedshape: true }),
    });
    expect(polyInside(ctxFor(n), { x: 0, y: 0 })).toBe(true);
    expect(polyInside(ctxFor(n), { x: 100, y: 100 })).toBe(false);
  });

  it('fixedshape, flip=true: swaps xsize/ysize from the vertex box', () => {
    const n = node({ flip: true });
    n.info.shape_info = polygon({
      sides: 4, vertices: boxVerts(30, 15), penwidth: 1,
      option: style({ fixedshape: true }),
    });
    // fixedShapeSize -> w=60,h=30; flip swaps xsize=h=30,ysize=w=60.
    // scalex = w/xsize = 2, scaley = h/ysize = 0.5.
    // boxURx=w/2=30, boxURy=h/2=15.
    // p=(10,10): P=(20,5) -> inside (|20|<=30,|5|<=15).
    expect(polyInside(ctxFor(n), { x: 10, y: 10 })).toBe(true);
    // p=(20,10): P=(40,5) -> |40|>30 outside.
    expect(polyInside(ctxFor(n), { x: 20, y: 10 })).toBe(false);
  });

  it('fixedshape with a degenerate (zero-size) vertex box takes the w/h (zero) branch', () => {
    const n = node();
    n.info.shape_info = polygon({
      sides: 4, vertices: boxVerts(0, 0), penwidth: 1,
      option: style({ fixedshape: true }),
    });
    // w=h=0, xsize=ysize=0 -> scalex=w=0, scaley=h=0 (the zero branch of the
    // cond-exprs). Every query point scales to P=(0,0), which trivially
    // passes the boxURx/boxURy bounding check (0 <= 0) and the degenerate
    // same-side walk over collapsed (all-origin) vertices.
    expect(polyInside(ctxFor(n), { x: 1, y: 0 })).toBe(true);
  });
});

describe('polyInside — rankdir rotation (poly branch)', () => {
  it('rankdir != 0 rotates the point before the polygon walk', () => {
    const n = node({ rankdir: 1, lw: 36, rw: 20, ht: 60 }); // LR, wide-tall asym
    n.info.shape_info = polygon({ sides: 4, vertices: boxVerts(28, 30), penwidth: 1 });
    // ccwrotatepf((0,25), 90) = (-25, 0), well within a wide box.
    expect(polyInside(ctxFor(n), { x: 0, y: 25 })).toBe(true);
  });
});

describe('starInside', () => {
  function starPoly(sides: number, tipR: number): PolygonT {
    const v: Point[] = [];
    for (let i = 0; i < sides; i++) {
      const a = (2 * Math.PI * i) / sides - Math.PI / 2;
      const r = i % 2 === 0 ? tipR : tipR * 0.4;
      v.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
    }
    return polygon({ sides, vertices: v, penwidth: 1 });
  }

  it('undefined node returns false', () => {
    expect(starInside({ nodeCoord: { x: 0, y: 0 }, rw: 0, bp: null }, { x: 0, y: 0 })).toBe(false);
  });

  it('bp box present short-circuits the pentagram test', () => {
    const n = node();
    const bp = { ll: { x: -5, y: -5 }, ur: { x: 5, y: 5 } };
    expect(starInside(ctxFor(n, bp), { x: 0, y: 0 })).toBe(true);
    expect(starInside(ctxFor(n, bp), { x: 50, y: 0 })).toBe(false);
  });

  it('poly undefined returns false', () => {
    const n = node();
    n.info.shape_info = undefined;
    expect(starInside(ctxFor(n), { x: 0, y: 0 })).toBe(false);
  });

  it('poly.vertices null returns false', () => {
    const n = node();
    n.info.shape_info = polygon({ vertices: null, sides: 10 });
    expect(starInside(ctxFor(n), { x: 0, y: 0 })).toBe(false);
  });

  it('center of a 10-point star is inside (outcnt stays below 2)', () => {
    const n = node({ lw: 40, rw: 40, ht: 80 });
    n.info.shape_info = starPoly(10, 40);
    expect(starInside(ctxFor(n), { x: 0, y: 0 })).toBe(true);
  });

  it('far outside point trips outcnt to 2 and returns false early', () => {
    const n = node({ lw: 40, rw: 40, ht: 80 });
    n.info.shape_info = starPoly(10, 40);
    expect(starInside(ctxFor(n), { x: 1000, y: 1000 })).toBe(false);
  });

  it('rankdir rotates the query point before the pentagram test', () => {
    const n = node({ rankdir: 2 }); // BT: ccwrotatepf(p, 180) = (x, -y)
    n.info.shape_info = starPoly(10, 40);
    // Symmetric star: rotation by 180 keeps center-relative points inside.
    expect(starInside(ctxFor(n), { x: 0, y: 0 })).toBe(true);
  });
});
