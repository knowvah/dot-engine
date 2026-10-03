// SPDX-License-Identifier: EPL-2.0

/**
 * Graph-to-device point transform (split from device.ts for the file-size
 * cap; re-exported there).
 *
 * @see lib/gvc/gvrender.c:gvrender_ptf
 */

import type { Point } from '../model/geom.js';
import { type RenderJob, GVRENDER_DOES_TRANSFORM } from './job.js';

// ---------------------------------------------------------------------------
// transformPoint — @see lib/gvc/gvrender.c:gvrender_ptf
// ---------------------------------------------------------------------------

/**
 * Transform a point from graph to device coordinates.
 * Short-circuits when GVRENDER_DOES_TRANSFORM is set (renderer owns mapping).
 *
 * @see lib/gvc/gvrender.c:gvrender_ptf
 */
export function transformPoint(p: Point, job: RenderJob): Point {
  if ((job.flags & GVRENDER_DOES_TRANSFORM) !== 0) {
    return p;
  }
  const sx = job.zoom * job.devscale.x;
  const sy = job.zoom * job.devscale.y;
  const tx = job.translation.x;
  const ty = job.translation.y;
  // ADR-2: SVG landscape rotation lives entirely in the graph `<g>` group
  // transform (svg_begin_page emits rotate(-job->rotation)); inner coords stay
  // in the unrotated frame. The ptf rotation branch (applyRotation) is the
  // raster/imagemap path and must NOT fire here, else job.rotation=90 would
  // double-rotate every SVG coordinate. applyRotation stays exported as the
  // faithful gvrender_ptf port (currently dead). @see ADR-2; gvrender.c:gvrender_ptf
  return applyScale(p, tx, ty, sx, sy);
}

/** Rotation branch: out.x = -(p.y+ty)*sx, out.y = (p.x+tx)*sy @see gvrender_ptf */
export function applyRotation(p: Point, tx: number, ty: number, sx: number, sy: number): Point {
  const x = -(p.y + ty) * sx;
  const y = (p.x + tx) * sy;
  return buildPoint(x, y);
}

/** No-rotation branch: out.x = (p.x+tx)*sx, out.y = (p.y+ty)*sy @see gvrender_ptf */
export function applyScale(p: Point, tx: number, ty: number, sx: number, sy: number): Point {
  const x = (p.x + tx) * sx;
  const y = (p.y + ty) * sy;
  return buildPoint(x, y);
}

/** Construct a Point value. Extracted to avoid inline object literals in return position. */
export function buildPoint(x: number, y: number): Point {
  const pt: Point = { x, y };
  return pt;
}
