// SPDX-License-Identifier: EPL-2.0
/**
 * GTS's enclosing triangle, split from cdt-surface.ts to mirror the GTS source
 * file it ports (the oracle links libgts 0.7.6 for neato's constrained
 * Delaunay triangulation).
 * @see gts-0.7.6 src/triangle.c
 */

import { fma } from '../../common/fma.js';

/** `#define SQRT3 1.73205080757` (gts-0.7.6 src/triangle.c). */
const SQRT3 = 1.73205080757;

/**
 * Vertices of the triangle enclosing points (px[0..n), py[0..n)). The oracle's
 * libgts (arm64) fuses r*SQRT3 + xo, r*2 + yo, xo - r*SQRT3 and
 * dx*dx + dy*dy (fmadd/fmsub in _gts_triangle_enclosing), so those are fma.
 * @see gts-0.7.6 src/triangle.c:gts_triangle_enclosing
 */
export function gtsTriangleEnclosing(
  px: number[], py: number[], n: number, scale: number,
): [[number, number], [number, number], [number, number]] {
  let xmin = px[0]!; let xmax = px[0]!;
  let ymin = py[0]!; let ymax = py[0]!;
  for (let i = 1; i < n; i++) {
    if (px[i]! > xmax) xmax = px[i]!;
    else if (px[i]! < xmin) xmin = px[i]!;
    if (py[i]! > ymax) ymax = py[i]!;
    else if (py[i]! < ymin) ymin = py[i]!;
  }
  const xo = (xmax + xmin) / 2;
  const yo = (ymax + ymin) / 2;
  const dx = xmax - xo;
  const dy = ymax - yo;
  let r = scale * Math.sqrt(fma(dx, dx, dy * dy));
  if (r === 0) r = scale;
  return [
    [fma(r, SQRT3, xo), yo - r],
    [xo, fma(r, 2, yo)],
    [fma(-r, SQRT3, xo), yo - r],
  ];
}
