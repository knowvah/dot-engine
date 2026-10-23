// SPDX-License-Identifier: EPL-2.0

/**
 * Bezier subdivision and node-boundary clipping for edge spline routing.
 *
 * @see lib/common/utils.c:Bezier
 * @see lib/common/splines.c:bezier_clip
 * @see lib/common/splines.c:shape_clip0
 */

import type { Point } from '../../model/geom.js';
import { parseArrow, resolveArrowType } from '../../common/arrows.js';
import { arrowLength } from '../../common/arrows-shapes.js';
import { bezier } from '../../common/bezier.js';
import { fma } from '../../common/fma.js';

// ---------------------------------------------------------------------------
// De Casteljau subdivision
// @see lib/common/utils.c:Bezier
// ---------------------------------------------------------------------------

/**
 * De Casteljau subdivision of a cubic Bezier at parameter t.
 * Returns [left4, right4, midpoint], computed by the shared fused bezier().
 * @see lib/common/utils.c:Bezier
 */
export function bezierSubdivide(
  sp: Point[],
  t: number,
): [Point[], Point[], Point] {
  const left: Point[] = [];
  const right: Point[] = [];
  const mid = bezier(sp, t, left, right);
  return [left, right, mid];
}

// ---------------------------------------------------------------------------
// bezierClipNode
// @see lib/common/splines.c:bezier_clip
// @see lib/common/splines.c:shape_clip0
// ---------------------------------------------------------------------------

/** State carried through one bisection iteration. */
interface BisectState {
  low: number;
  high: number;
  best: Point[];
  found: boolean;
  pt: Point;
}

/** Perform one bisection step; returns updated state. */
function bisectStep(
  c: Point[],
  insideFn: (lx: number, ly: number) => boolean,
  leftInside: boolean,
  s: BisectState,
): BisectState {
  const t = (s.high + s.low) / 2;
  const [left, right, mid] = bezierSubdivide(c, t);
  if (insideFn(mid.x, mid.y)) {
    return leftInside
      ? { low: t, high: s.high, best: right, found: true, pt: mid }
      : { low: s.low, high: t, best: left, found: true, pt: mid };
  }
  return leftInside
    ? { ...s, high: t, pt: mid }
    : { ...s, low: t, pt: mid };
}

/**
 * Binary-search clip of a Bezier in node-local coords.
 * @see lib/common/splines.c:bezier_clip
 */
function bezierClipLocal(
  c: Point[],
  insideFn: (lx: number, ly: number) => boolean,
  leftInside: boolean,
): Point[] {
  let s: BisectState = {
    low: 0, high: 1, best: c.slice(), found: false,
    pt: leftInside ? c[0] : c[3],
  };
  let opt: Point;
  do {
    opt = s.pt;
    s = bisectStep(c, insideFn, leftInside, s);
  } while (Math.abs(opt.x - s.pt.x) > 0.5 || Math.abs(opt.y - s.pt.y) > 0.5);
  if (s.found) return s.best;
  const [left, right] = bezierSubdivide(c, (s.high + s.low) / 2);
  return leftInside ? right : left;
}

/**
 * Clip Bezier to node boundary using binary search.
 *
 * sp is in global coords. insideFn receives node-local coords (center
 * subtracted). leftInside=true: sp[0] is inside node (tail clip).
 * leftInside=false: sp[3] is inside node (head clip).
 *
 * @see lib/common/splines.c:bezier_clip
 * @see lib/common/splines.c:shape_clip0
 */
export function bezierClipNode(
  sp: Point[],
  cx: number,
  cy: number,
  insideFn: (lx: number, ly: number) => boolean,
  leftInside: boolean,
): Point[] {
  const c: Point[] = sp.map(p => ({ x: p.x - cx, y: p.y - cy }));
  return bezierClipLocal(c, insideFn, leftInside).map(p => ({
    x: p.x + cx,
    y: p.y + cy,
  }));
}

/**
 * DIST(p, q) = sqrt(SQR(dx) + SQR(dy)) as the oracle compiles it
 * (libgvc 16.1 `_arrowEndClip`: `fmul dy*dy; fmadd dx, dx; fsqrt`), i.e.
 * sqrt(fma(dx, dx, dy * dy)) -- not Math.hypot.
 * @see lib/common/geom.h:DIST
 */
export function distFused(p: Point, q: Point): number {
  const dx = p.x - q.x;
  const dy = p.y - q.y;
  return Math.sqrt(fma(dx, dx, dy * dy));
}

/**
 * Clip the path endpoint to the arrowhead BASE (not the node boundary).
 *
 * Ports the bezier part of lib/common/arrows.c:arrowEndClip (:285-330); the
 * `spl->eflag/ep` bookkeeping and the `endp -= 3` back-up (:288-296) live in
 * the callers (compound.ts:arrowEndClipIdx). Line map (C -> here):
 *   :299-302 sp[3..0] = ps[endp..], sp[0] = spl->ep -> `sp` below
 *   :304     if (elen > 0)                           -> `elen > 0`
 *   :305-307 inside_context {p = &sp[0], r = &elen}  -> `inside` (centre = tip)
 *   :308     bezier_clip(&ctx, inside, sp, true)     -> bezierClipNode, left
 *            inside, in ABSOLUTE coordinates (centre 0,0), as C does
 *   :311-314 ps[endp..endp+3] = sp[3..0]             -> returned array
 *   :281-283 inside(): DIST(p, a.p[0]) <= a.r[0]     -> distFused <= elen
 *
 * @see lib/common/arrows.c:arrowEndClip
 */
export function arrowEndClip(
  path4: Point[],
  arrowTip: Point,
  elen: number,
): Point[] {
  const sp: Point[] = [arrowTip, path4[2]!, path4[1]!, path4[0]!];
  const clipped = elen > 0
    ? bezierClipNode(sp, 0, 0, (x, y) => distFused({ x, y }, arrowTip) <= elen, true)
    : sp;
  return [clipped[3]!, clipped[2]!, clipped[1]!, clipped[0]!];
}

/**
 * Per-type spline clip length for an arrow string: the sum of the parsed
 * compound arrow's component lengths (`arrow_length`). Replaces the normal-only
 * `normalArrowLen` so non-normal arrows clip by their true length (ADR-4); the
 * caller still gates on the edge flag (no clip when the end has no arrow).
 * @see lib/common/arrows.c:arrow_length (:253)
 */
export function arrowClipLength(arrowName: string, arrowsize: number, penwidth: number): number {
  const comps = parseArrow(arrowName).map(resolveArrowType);
  return arrowLength(comps, arrowsize, penwidth);
}

/**
 * Default node pen width. @see lib/common/const.h:DEFAULT_NODEPENWIDTH
 */
export const DEFAULT_NODEPENWIDTH = 1.0;

/**
 * Returns a box-shape inside function for use with bezierClipNode.
 *
 * Matches C's poly_inside bounding-box test which uses the OUTLINE boundary
 * (node + penwidth/2) rather than the geometric boundary:
 *   box_URx = (lw + rw + penwidth) / 2
 *   box_URy = (ht + penwidth) / 2
 *
 * @see lib/common/shapes.c:poly_inside (box_URx/box_URy computation)
 */
export function makeBoxInsideFn(
  halfW: number,
  halfH: number,
  penwidth = DEFAULT_NODEPENWIDTH,
): (lx: number, ly: number) => boolean {
  const uw = halfW + penwidth / 2;
  const uh = halfH + penwidth / 2;
  return (lx: number, ly: number): boolean =>
    Math.abs(lx) <= uw && Math.abs(ly) <= uh;
}

/**
 * Returns an ellipse-shape inside function for use with bezierClipNode.
 *
 * Matches C's poly_inside ellipse branch (sides <= 2):
 *   hypot(P.x/box_URx, P.y/box_URy) < 1  (strict less-than, matching C)
 * where box_URx = lw + penwidth/2 and box_URy = ht/2 + penwidth/2.
 *
 * C uses strict < 1 (not <=) — the one-bit difference matters during
 * binary search: a point exactly on the boundary is classified as outside
 * in C, which determines when the search terminates.
 *
 * @see lib/common/shapes.c:poly_inside (sides <= 2 branch)
 */
export function makeEllipseInsideFn(
  rx: number,
  ry: number,
  penwidth = DEFAULT_NODEPENWIDTH,
): (lx: number, ly: number) => boolean {
  const erx = rx + penwidth / 2;
  const ery = ry + penwidth / 2;
  return (lx: number, ly: number): boolean =>
    (lx * lx) / (erx * erx) + (ly * ly) / (ery * ery) < 1.0;
}

/**
 * Clip path START to the tail arrowhead base (symmetric to arrowEndClip).
 *
 * path4[0] = tail node boundary (inside arrowhead sphere); after clip,
 * path4[0] = arrowhead base (elen from tailTip).
 *
 * @see lib/common/arrows.c:arrowEndClip
 */
export function tailArrowEndClip(
  path4: Point[],
  tailTip: Point,
  elen: number,
): Point[] {
  if (elen <= 0) return path4;
  const inside = (lx: number, ly: number): boolean => Math.hypot(lx, ly) <= elen;
  return bezierClipNode(path4, tailTip.x, tailTip.y, inside, true);
}
