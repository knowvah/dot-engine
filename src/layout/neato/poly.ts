// SPDX-License-Identifier: EPL-2.0

/**
 * Node polygons for neato's overlap counting (`countOverlap` -> `polyOverlap`).
 * A faithful port of lib/neatogen/poly.c. Units are inches, as in C.
 *
 * C's `makePoly` / `makeAddPoly` fill a caller-owned `Poly` and return a
 * non-zero status on failure; here they return the `Poly`, or `null` where C
 * returns 1. `breakPoly` only frees `verts` (garbage collected here), so it
 * is not ported. The C functions are split only where the repo's complexity
 * limits force it (per-shape vertex builders, `edgesIntersect` advance rule,
 * `inPoly` per-edge crossing); evaluation order is unchanged.
 *
 * @see lib/neatogen/poly.c
 * @see lib/neatogen/poly.h
 */

import type { Node } from '../../model/node.js';
import type { Box, Point } from '../../model/geom.js';
import { ShapeKind } from '../../common/types.js';
import type { PolygonT } from '../../common/types.js';

/** @see lib/neatogen/poly.c:BOX */
export const POLY_BOX = 1;
/** @see lib/neatogen/poly.c:CIRCLE */
export const POLY_CIRCLE = 2;

/** @see lib/common/const.h:DFLT_SAMPLE */
const DFLT_SAMPLE = 20;
/** @see lib/common/geom.h:POINTS_PER_INCH */
const POINTS_PER_INCH = 72;
/** Minimum samplepoints accepted by genRound. @see lib/neatogen/poly.c:genRound */
const MIN_SAMPLES = 3;

/**
 * Polygon of a node, relative to the node centre. `nverts` is `verts.length`.
 * @see lib/neatogen/poly.h:Poly
 */
export interface Poly {
  origin: Point;
  corner: Point;
  verts: Point[];
  kind: number;
}

/** @see lib/common/geom.h:PS2INCH */
function ps2inch(a: number): number {
  return a / POINTS_PER_INCH;
}

/** @see lib/neatogen/poly.c:ISBOX */
function isBoxKind(p: Poly): boolean {
  return (p.kind & POLY_BOX) !== 0;
}

/** @see lib/neatogen/poly.c:ISCIRCLE */
function isCircleKind(p: Poly): boolean {
  return (p.kind & POLY_CIRCLE) !== 0;
}

/**
 * Bounding box of `verts` as [origin, corner].
 * @see lib/neatogen/poly.c:bbox
 */
function bbox(verts: Point[]): { origin: Point; corner: Point } {
  let xMin = verts[0]!.x;
  let xMax = xMin;
  let yMin = verts[0]!.y;
  let yMax = yMin;
  for (let i = 1; i < verts.length; i++) {
    const v = verts[i]!;
    xMin = Math.min(xMin, v.x);
    yMin = Math.min(yMin, v.y);
    xMax = Math.max(xMax, v.x);
    yMax = Math.max(yMax, v.y);
  }
  return { origin: { x: xMin, y: yMin }, corner: { x: xMax, y: yMax } };
}

/**
 * Scale every vertex in place.
 * @see lib/neatogen/poly.c:inflatePts
 */
function inflatePts(verts: Point[], xmargin: number, ymargin: number): void {
  for (const v of verts) {
    v.x *= xmargin;
    v.y *= ymargin;
  }
}

/**
 * True when the 4 vertices form an axis-parallel rectangle (exact compares).
 * @see lib/neatogen/poly.c:isBox
 */
function isBox(verts: Point[]): boolean {
  if (verts.length !== 4) return false;
  const [v0, v1, v2, v3] = verts as [Point, Point, Point, Point];
  if (v0.y === v1.y) {
    return v2.y === v3.y && v0.x === v3.x && v1.x === v2.x;
  }
  return v0.x === v1.x && v2.x === v3.x && v0.y === v3.y && v1.y === v2.y;
}

/** @see lib/neatogen/poly.c:makeScaledTransPoint */
function makeScaledTransPoint(x: number, y: number, dx: number, dy: number): Point {
  return { x: ps2inch(x) + dx, y: ps2inch(y) + dy };
}

/** @see lib/neatogen/poly.c:makeScaledPoint */
function makeScaledPoint(x: number, y: number): Point {
  return { x: ps2inch(x), y: ps2inch(y) };
}

/** C `atoi`: leading integer, 0 when there is none. */
function atoi(s: string | undefined): number {
  const v = s === undefined ? 0 : parseInt(s, 10);
  return Number.isNaN(v) ? 0 : v;
}

/**
 * Sample an ellipse (`samplepoints` points, default 20) of the node's
 * half-size plus the additive margin.
 * @see lib/neatogen/poly.c:genRound
 */
function genRound(n: Node, xm: number, ym: number): Point[] {
  const isides = atoi(n.attrs.get('samplepoints'));
  const sides = isides < MIN_SAMPLES ? DFLT_SAMPLE : isides;
  const verts: Point[] = [];
  for (let i = 0; i < sides; i++) {
    verts.push({
      x: (n.info.width / 2.0 + xm) * Math.cos((i / sides) * Math.PI * 2.0),
      y: (n.info.height / 2.0 + ym) * Math.sin((i / sides) * Math.PI * 2.0),
    });
  }
  return verts;
}

/** `ND_shape(n)->name`; empty for an unbound shape. */
function shapeName(n: Node): string {
  return (n.info.shape as { name?: string } | undefined)?.name ?? '';
}

/** `shapeOf(n)`. @see lib/common/shapes.c:shapeOf */
function shapeOf(n: Node): ShapeKind {
  const s = n.info.shape as { kind?: ShapeKind } | undefined;
  return s?.kind ?? ShapeKind.SH_UNSET;
}

/** `ND_shape_info(n)` of a polygon shape; vertices are always set post-init. */
function polygonOf(n: Node): PolygonT & { vertices: Point[] } {
  const poly = n.info.shape_info as PolygonT;
  if (poly.vertices === null) {
    throw new Error(`poly: node ${n.name} has no polygon vertices`);
  }
  return poly as PolygonT & { vertices: Point[] };
}

/** `((field_t*)ND_shape_info(n))->b`. */
function recordBox(n: Node): Box {
  return (n.info.shape_info as { b: Box }).b;
}

/** Cluster-node box, half-size `ND_width/2 + margin`, CCW from the UR. */
function clusterVerts(n: Node, xmargin: number, ymargin: number): Point[] {
  const bx = n.info.width / 2.0 + xmargin;
  const by = n.info.height / 2.0 + ymargin;
  return [
    { x: bx, y: by },
    { x: -bx, y: by },
    { x: -bx, y: -by },
    { x: bx, y: -by },
  ];
}

/**
 * Polygon kind, shared by makePoly and makeAddPoly: BOX for "box" or a
 * box-shaped "polygon", CIRCLE for a regular shape with fewer than 3 sides.
 * `verts` are the first `sides` vertices (C passes `sides` as the count, so
 * extra periphery rings are ignored); points or inches are equivalent because
 * isBox compares for exact equality.
 * @see lib/neatogen/poly.c:makeAddPoly
 */
function polyKind(n: Node, poly: PolygonT, verts: Point[]): number {
  const name = shapeName(n);
  if (name === 'box') return POLY_BOX;
  if (name === 'polygon' && isBox(verts)) return POLY_BOX;
  if (poly.sides < 3 && poly.regular) return POLY_CIRCLE;
  return 0;
}

/**
 * Additive margin for a real polygon. BOX relies on the vertices being CCW
 * starting from the UR; other polygons grow each vertex radially.
 * @see lib/neatogen/poly.c:makeAddPoly
 */
function addPolyVerts(poly: PolygonT & { vertices: Point[] }, box: boolean, m: Point): Point[] {
  const pv = poly.vertices;
  if (box) {
    return [
      { x: ps2inch(pv[0]!.x) + m.x, y: ps2inch(pv[0]!.y) + m.y },
      { x: ps2inch(pv[1]!.x) - m.x, y: ps2inch(pv[1]!.y) + m.y },
      { x: ps2inch(pv[2]!.x) - m.x, y: ps2inch(pv[2]!.y) - m.y },
      { x: ps2inch(pv[3]!.x) + m.x, y: ps2inch(pv[3]!.y) - m.y },
    ];
  }
  const verts: Point[] = [];
  for (let i = 0; i < poly.sides; i++) {
    const h = Math.hypot(pv[i]!.x, pv[i]!.y);
    verts.push({
      x: ps2inch(pv[i]!.x * (1.0 + m.x / h)),
      y: ps2inch(pv[i]!.y * (1.0 + m.y / h)),
    });
  }
  return verts;
}

/** SH_POLY case of makeAddPoly. */
function addPolyShape(n: Node, m: Point): { verts: Point[]; kind: number } {
  const poly = polygonOf(n);
  const kind = polyKind(n, poly, poly.vertices.slice(0, poly.sides));
  if (poly.sides < 3) return { verts: genRound(n, m.x, m.y), kind };
  return { verts: addPolyVerts(poly, kind === POLY_BOX, m), kind };
}

/** SH_RECORD case of makeAddPoly. */
function addPolyRecord(n: Node, xmargin: number, ymargin: number): Point[] {
  const b = recordBox(n);
  return [
    makeScaledTransPoint(b.ll.x, b.ll.y, -xmargin, -ymargin),
    makeScaledTransPoint(b.ur.x, b.ll.y, xmargin, -ymargin),
    makeScaledTransPoint(b.ur.x, b.ur.y, xmargin, ymargin),
    makeScaledTransPoint(b.ll.x, b.ur.y, -xmargin, ymargin),
  ];
}

/** Assemble a Poly from its vertices; origin/corner come from `bbox`. */
function finishPoly(verts: Point[], kind: number): Poly {
  const { origin, corner } = bbox(verts);
  return { origin, corner, verts, kind };
}

/**
 * Polygon of node `n` with an additive margin (inches) on each side.
 * Returns null (C returns 1) for an unsupported shape type.
 * @see lib/neatogen/poly.c:makeAddPoly
 */
export function makeAddPoly(n: Node, xmargin: number, ymargin: number): Poly | null {
  if (n.info.clust !== undefined) {
    return finishPoly(clusterVerts(n, xmargin, ymargin), POLY_BOX);
  }
  switch (shapeOf(n)) {
    case ShapeKind.SH_POLY: {
      const { verts, kind } = addPolyShape(n, { x: xmargin, y: ymargin });
      return finishPoly(verts, kind);
    }
    case ShapeKind.SH_RECORD:
      return finishPoly(addPolyRecord(n, xmargin, ymargin), POLY_BOX);
    case ShapeKind.SH_POINT:
      return finishPoly(genRound(n, xmargin, ymargin), POLY_CIRCLE);
    default:
      console.error(`Error: makeAddPoly: unknown shape type ${shapeName(n)}\n`);
      return null;
  }
}

/** Polygon vertices in inches, or sampled ellipse when `sides < 3`. */
function polyVerts(n: Node, poly: PolygonT & { vertices: Point[] }): Point[] {
  if (poly.sides < 3) return genRound(n, 0, 0);
  return poly.vertices.slice(0, poly.sides).map((v) => makeScaledPoint(v.x, v.y));
}

/** SH_RECORD case of makePoly. */
function recordVerts(n: Node): Point[] {
  const b = recordBox(n);
  return [
    makeScaledPoint(b.ll.x, b.ll.y),
    makeScaledPoint(b.ur.x, b.ll.y),
    makeScaledPoint(b.ur.x, b.ur.y),
    makeScaledPoint(b.ll.x, b.ur.y),
  ];
}

/** Vertices and kind per shape, before the multiplicative margin. */
function baseShape(n: Node): { verts: Point[]; kind: number } | null {
  if (n.info.clust !== undefined) {
    return { verts: clusterVerts(n, 0, 0), kind: POLY_BOX };
  }
  switch (shapeOf(n)) {
    case ShapeKind.SH_POLY: {
      const poly = polygonOf(n);
      const verts = polyVerts(n, poly);
      return { verts, kind: polyKind(n, poly, verts) };
    }
    case ShapeKind.SH_RECORD:
      return { verts: recordVerts(n), kind: POLY_BOX };
    case ShapeKind.SH_POINT:
      return { verts: genRound(n, 0, 0), kind: POLY_CIRCLE };
    default:
      console.error(`Error: makePoly: unknown shape type ${shapeName(n)}\n`);
      return null;
  }
}

/**
 * Polygon of node `n` scaled by (xmargin, ymargin) about the node centre.
 * Returns null (C returns 1) for an unsupported shape type.
 * @see lib/neatogen/poly.c:makePoly
 */
export function makePoly(n: Node, xmargin: number, ymargin: number): Poly | null {
  const base = baseShape(n);
  if (base === null) return null;
  if (xmargin !== 1.0 || ymargin !== 1.0) {
    inflatePts(base.verts, xmargin, ymargin);
  }
  return finishPoly(base.verts, base.kind);
}

/** @see lib/neatogen/poly.c:pintersect */
function pintersect(originp: Point, cornerp: Point, originq: Point, cornerq: Point): boolean {
  return (
    originp.x <= cornerq.x &&
    originq.x <= cornerp.x &&
    originp.y <= cornerq.y &&
    originq.y <= cornerp.y
  );
}

/** @see lib/neatogen/geometry.c:area_2 */
function area2(a: Point, b: Point, c: Point): number {
  return (a.y - b.y) * (c.x - b.x) - (c.y - b.y) * (a.x - b.x);
}

/** @see lib/neatogen/geometry.c:leftOf */
function leftOf(a: Point, b: Point, c: Point): boolean {
  return area2(a, b, c) > 0;
}

/**
 * Segment ab versus cd (parallel segments report false).
 * @see lib/neatogen/geometry.c:intersection
 */
function intersection(a: Point, b: Point, c: Point, d: Point): boolean {
  const denom = a.x * (d.y - c.y) + b.x * (c.y - d.y) + d.x * (b.y - a.y) + c.x * (a.y - b.y);
  if (denom === 0.0) return false;
  const s = (a.x * (d.y - c.y) + c.x * (a.y - d.y) + d.x * (c.y - a.y)) / denom;
  const t = -(a.x * (c.y - b.y) + b.x * (a.y - c.y) + c.x * (b.y - a.y)) / denom;
  return 0.0 <= s && s <= 1.0 && 0.0 <= t && t <= 1.0;
}

/** Cursor state of the `edgesIntersect` walk (`a`, `b`, `aa`, `ba`). */
interface EdgeWalk {
  a: number;
  b: number;
  aa: number;
  ba: number;
}

/**
 * Advance rules of `edgesIntersect`; `advance(A,B,N)` is `B++, A=(A+1)%N`.
 * @see lib/neatogen/poly.c:edgesIntersect
 */
function advanceRule(
  w: EdgeWalk,
  turn: { cross: number; bHA: boolean; aHB: boolean },
  n: number,
  m: number,
): void {
  const advanceA = (): void => {
    w.aa++;
    w.a = (w.a + 1) % n;
  };
  const advanceB = (): void => {
    w.ba++;
    w.b = (w.b + 1) % m;
  };
  if (turn.cross === 0 && !turn.bHA && !turn.aHB) advanceA();
  else if (turn.cross >= 0) {
    if (turn.bHA) advanceA();
    else advanceB();
  } else if (turn.aHB) advanceB();
  else advanceA();
}

/**
 * True when the boundaries of convex-walked polygons P and Q cross.
 * @see lib/neatogen/poly.c:edgesIntersect
 */
function edgesIntersect(P: Point[], Q: Point[], n: number, m: number): boolean {
  const w: EdgeWalk = { a: 0, b: 0, aa: 0, ba: 0 };
  do {
    const a1 = (w.a + n - 1) % n;
    const b1 = (w.b + m - 1) % m;
    const pa = P[w.a]!;
    const pa1 = P[a1]!;
    const qb = Q[w.b]!;
    const qb1 = Q[b1]!;
    const A = { x: pa.x - pa1.x, y: pa.y - pa1.y };
    const B = { x: qb.x - qb1.x, y: qb.y - qb1.y };
    const cross = area2({ x: 0, y: 0 }, A, B);
    const bHA = leftOf(pa1, pa, qb);
    const aHB = leftOf(qb1, qb, pa);
    if (intersection(pa1, pa, qb1, qb)) return true;
    advanceRule(w, { cross, bHA, aHB }, n, m);
  } while ((w.aa < n || w.ba < m) && w.aa < 2 * n && w.ba < 2 * m);
  return false;
}

/** Marker: the query point lies on the polygon boundary. */
const ON_BOUNDARY = -1;

/**
 * Crossing of an edge that straddles the x-axis with the +x ray from the
 * origin: ON_BOUNDARY, 0, 0.5 (through a vertex) or 1.
 * @see lib/neatogen/poly.c:inPoly
 */
function straddleCrossing(t: Point, t1: Point): number {
  const x = (t.x * t1.y - t1.x * t.y) / (t1.y - t.y);
  if (x === 0) return ON_BOUNDARY;
  if (x <= 0) return 0;
  return t.y === 0 || t1.y === 0 ? 0.5 : 1.0;
}

/**
 * Ray-crossing contribution of edge (t1 -> t) with the query at the origin,
 * or ON_BOUNDARY when the origin is on the edge.
 * @see lib/neatogen/poly.c:inPoly
 */
function edgeCrossing(t: Point, t1: Point): number {
  // horizontal edge: test whether the point is on it
  if (t.y === 0 && t1.y === 0) {
    return t.x * t1.x < 0 ? ON_BOUNDARY : 0;
  }
  const straddles = (t.y >= 0 && t1.y <= 0) || (t1.y >= 0 && t.y <= 0);
  return straddles ? straddleCrossing(t, t1) : 0;
}

/**
 * True when q is inside polygon `vertex` (CCW order assumed).
 * @see lib/neatogen/poly.c:inPoly
 */
function inPoly(vertex: Point[], n: number, q: Point): boolean {
  const tp3 = vertex.map((v) => ({ x: v.x - q.x, y: v.y - q.y }));
  let crossings = 0;
  for (let i = 0; i < n; i++) {
    const c = edgeCrossing(tp3[i]!, tp3[(i + n - 1) % n]!);
    if (c === ON_BOUNDARY) return true;
    crossings += c;
  }
  return Math.trunc(crossings) % 2 === 1;
}

/** @see lib/neatogen/poly.c:inBox */
function inBox(p: Point, originPoint: Point, corner: Point): boolean {
  return p.x <= corner.x && p.x >= originPoint.x && p.y <= corner.y && p.y >= originPoint.y;
}

/** @see lib/neatogen/poly.c:transCopy */
function transCopy(inp: Point[], off: Point): Point[] {
  return inp.map((v) => ({ x: v.x + off.x, y: v.y + off.y }));
}

/**
 * True when polygon `pp` placed at `p` overlaps `qp` placed at `q`.
 * Bounding boxes first, then the BOX/CIRCLE shortcuts, then the exact
 * polygon test.
 * @see lib/neatogen/poly.c:polyOverlap
 */
export function polyOverlap(p: Point, pp: Poly, q: Point, qp: Poly): boolean {
  // translate bounding boxes
  const op = { x: p.x + pp.origin.x, y: p.y + pp.origin.y };
  const cp = { x: p.x + pp.corner.x, y: p.y + pp.corner.y };
  const oq = { x: q.x + qp.origin.x, y: q.y + qp.origin.y };
  const cq = { x: q.x + qp.corner.x, y: q.y + qp.corner.y };

  // if bounding boxes don't overlap, done
  if (!pintersect(op, cp, oq, cq)) return false;

  if (isBoxKind(pp) && isBoxKind(qp)) return true;
  if (isCircleKind(pp) && isCircleKind(qp)) {
    const d = pp.corner.x - pp.origin.x + qp.corner.x - qp.origin.x;
    const dx = p.x - q.x;
    const dy = p.y - q.y;
    return dx * dx + dy * dy <= (d * d) / 4.0;
  }

  const tp1 = transCopy(pp.verts, p);
  const tp2 = transCopy(qp.verts, q);
  return (
    edgesIntersect(tp1, tp2, pp.verts.length, qp.verts.length) ||
    (inBox(tp1[0]!, oq, cq) && inPoly(tp2, qp.verts.length, tp1[0]!)) ||
    (inBox(tp2[0]!, op, cp) && inPoly(tp1, pp.verts.length, tp2[0]!))
  );
}
