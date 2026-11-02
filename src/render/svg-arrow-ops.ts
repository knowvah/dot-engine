// SPDX-License-Identifier: EPL-2.0

/**
 * SVG emission for typed arrowhead draw-ops (ADR-1). Each {@link ArrowDrawOp}
 * becomes the matching SVG primitive with the edge pen color: filled polygons
 * and ellipses use the pen color for both fill and stroke; open shapes,
 * polylines, and Bézier arms use `fill="none"`. Geometry is transformed from
 * layout space to device space via `transformPoint`, matching the existing
 * arrow-polygon emitter.
 *
 * @see plugin/core/gvrender_core_svg.c:svg_polygon / svg_ellipse / svg_polyline
 * @see lib/common/arrows.c:arrow_gen (emit sequence)
 */

import type { Point } from '../model/geom.js';
import type { RenderJob } from '../gvc/job.js';
import type { ArrowDrawOp } from '../common/arrows-types.js';
import { transformPoint } from '../gvc/device.js';
import { emitPoints, emitBezierPath, emitPenWidth } from './svg-helpers.js';

const PENWIDTH_NORMAL = 1.0;
const PENWIDTH_THRESHOLD = 0.005;

/** Emit ` stroke-width` only when the pen width differs from the SVG default. */
function emitArrowPenWidth(job: RenderJob, pw: number): void {
  if (Math.abs(pw - PENWIDTH_NORMAL) >= PENWIDTH_THRESHOLD) emitPenWidth(job, pw);
}

/** Emit ` <attr>="<opacity>"` when the pen color carries partial alpha. */
function emitArrowOpacity(job: RenderJob, attr: string, opacity: string | null): void {
  if (opacity !== null) job.write(' ' + attr + '="' + opacity + '"');
}

/**
 * The paint an arrow primitive is drawn with: the stroke (pen) and the fill
 * colour with their stringified alphas (null when opaque).
 * @see lib/common/arrows.c:arrow_gen
 */
export interface ArrowInk { pen: string; penOpacity: string | null; fill: string; fillOpacity: string | null }

/** `<polygon>` with Adobe first-point repetition (matches svg_polygon). */
function emitPolygonOp(points: Point[], filled: boolean, ink: ArrowInk, job: RenderJob, pw: number): void {
  const pts = points.map((p) => transformPoint(p, job));
  job.write('<polygon fill="' + (filled ? ink.fill : 'none') + '"');
  if (filled) emitArrowOpacity(job, 'fill-opacity', ink.fillOpacity);
  job.write(' stroke="' + ink.pen + '"');
  emitArrowPenWidth(job, pw);
  emitArrowOpacity(job, 'stroke-opacity', ink.penOpacity);
  job.write(' points="');
  emitPoints(job, pts);
  if (pts.length > 0) {
    const p0 = pts[0]!;
    job.write(' ');
    job.printDouble(p0.x);
    job.write(',');
    job.printDouble(p0.y);
  }
  job.write('"/>\n');
}

/** Ellipse op shape (dot/odot). */
interface EllipseOp { center: Point; rx: number; ry: number; filled: boolean }

/** `<ellipse>` (dot/odot). rx/ry are emitted in layout units (device scale 1). */
function emitEllipseOp(op: EllipseOp, ink: ArrowInk, job: RenderJob, pw: number): void {
  const c = transformPoint(op.center, job);
  job.write('<ellipse fill="' + (op.filled ? ink.fill : 'none') + '"');
  if (op.filled) emitArrowOpacity(job, 'fill-opacity', ink.fillOpacity);
  job.write(' stroke="' + ink.pen + '"');
  emitArrowPenWidth(job, pw);
  emitArrowOpacity(job, 'stroke-opacity', ink.penOpacity);
  job.write(' cx="');
  job.printDouble(c.x);
  job.write('" cy="');
  job.printDouble(c.y);
  job.write('" rx="');
  job.printDouble(op.rx);
  job.write('" ry="');
  job.printDouble(op.ry);
  job.write('"/>\n');
}

/** `<polyline>` (tee/box/gap/curve shaft) — never filled. */
function emitPolylineOp(points: Point[], penColor: string, job: RenderJob, pw: number, opacity: string | null): void {
  const pts = points.map((p) => transformPoint(p, job));
  job.write('<polyline fill="none" stroke="' + penColor + '"');
  emitArrowPenWidth(job, pw);
  emitArrowOpacity(job, 'stroke-opacity', opacity);
  job.write(' points="');
  emitPoints(job, pts);
  job.write('"/>\n');
}

/** `<path>` cubic Bézier (curve/icurve arms) — never filled. */
function emitBezierOp(points: Point[], penColor: string, job: RenderJob, pw: number, opacity: string | null): void {
  const pts = points.map((p) => transformPoint(p, job));
  job.write('<path fill="none" stroke="' + penColor + '"');
  emitArrowPenWidth(job, pw);
  emitArrowOpacity(job, 'stroke-opacity', opacity);
  job.write(' d="');
  emitBezierPath(job, pts);
  job.write('"/>\n');
}

/**
 * Emit one edge end's arrowhead draw-ops, in order, with the given ink.
 * @see lib/common/arrows.c:arrow_gen
 */
export function emitArrowOpsInk(ops: ArrowDrawOp[], ink: ArrowInk, job: RenderJob, pw: number): void {
  for (const op of ops) {
    switch (op.kind) {
      case 'polygon': emitPolygonOp(op.points, op.filled, ink, job, pw); break;
      case 'ellipse': emitEllipseOp(op, ink, job, pw); break;
      case 'polyline': emitPolylineOp(op.points, ink.pen, job, pw, ink.penOpacity); break;
      case 'bezier': emitBezierOp(op.points, ink.pen, job, pw, ink.penOpacity); break;
    }
  }
}

/**
 * {@link emitArrowOpsInk} with the pen colour also as the fill (the multicolor
 * paths set fill = segment colour). `opacity` is the stringified alpha
 * (`colorOpacity`) or null when the pen color is opaque; it drives the SVG
 * fill/stroke-opacity attributes (e.g. an edge color="#rrggbbaa").
 * @see lib/common/arrows.c:arrow_gen
 */
export function emitArrowOps(ops: ArrowDrawOp[], penColor: string, job: RenderJob, pw: number, opacity: string | null = null): void {
  emitArrowOpsInk(ops, { pen: penColor, penOpacity: opacity, fill: penColor, fillOpacity: opacity }, job, pw);
}
