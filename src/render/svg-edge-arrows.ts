// SPDX-License-Identifier: EPL-2.0
//
// SVG arrowheads for one edge, drawn inside svgEdgePath's per-bezier loop the
// way emit_edge_graphics calls arrow_gen after each bezier.
//
// @see lib/common/emit.c:emit_edge_graphics (2668-2676)

import type { Edge } from '../model/edge.js';
import type { Bezier } from '../model/geom.js';
import type { RenderJob } from '../gvc/job.js';
import { bezierEndOps } from '../common/bezier-arrows.js';
import { emitArrowOps } from './svg-arrow-ops.js';

/** The edge pen an arrow is drawn with. */
export interface ArrowPaint { job: RenderJob; penColor: string; opacity: string | null; pw: number }

/** Which ends have drawn their edge-level arrow. */
export interface ArrowsDone { tailDone: boolean; headDone: boolean }

/**
 * One end's arrow after bezier `bz`. With several beziers flagged at that end
 * each draws its own arrow (bezierEndOps); otherwise the edge-level ops are
 * drawn once, at the first flagged bezier.
 */
export function emitBezierEndArrow(
  e: Edge, bz: Bezier, end: 'head' | 'tail', st: ArrowsDone, p: ArrowPaint,
): void {
  const tail = end === 'tail';
  const flag = tail ? bz.sflag : bz.eflag;
  const done = tail ? st.tailDone : st.headDone;
  const edgeOps = tail ? e.info.tailArrowOps : e.info.headArrowOps;
  const ops = bezierEndOps(e, bz, end)
    ?? (flag !== 0 && !done && edgeOps?.length ? edgeOps : undefined);
  if (ops === undefined) return;
  emitArrowOps(ops, p.penColor, p.job, p.pw, p.opacity);
  if (tail) st.tailDone = true;
  else st.headDone = true;
}

/**
 * Arrow ops whose bezier carried no s/eflag (a port-model seam: ops are stored
 * per edge end, flags per bezier). C cannot reach this state — an arrow is only
 * generated where a flag is set — so this emits at the old position (group
 * end) purely to keep behavior identical if a router ever stashes ops without
 * setting the flag.
 */
export function emitRemainingArrows(e: Edge, st: ArrowsDone, p: ArrowPaint): void {
  if (!st.tailDone && e.info.tailArrowOps?.length) {
    emitArrowOps(e.info.tailArrowOps, p.penColor, p.job, p.pw, p.opacity);
  }
  if (!st.headDone && e.info.headArrowOps?.length) {
    emitArrowOps(e.info.headArrowOps, p.penColor, p.job, p.pw, p.opacity);
  }
}
