// SPDX-License-Identifier: EPL-2.0

/**
 * emit_edge's edge_in_box gate, shared by the device walk (edge comments) and
 * the SVG / xdot renderers (edge group and draw ops). Moved out of
 * render/svg.ts unchanged.
 *
 * @see lib/common/emit.c:edge_in_box, lib/common/utils.c:overlap_label
 */

import type { Box } from '../model/geom.js';
import { boxOverlap } from '../model/geom.js';
import type { Edge } from '../model/edge.js';
import type { TextlabelT } from './types.js';

/** overlap_label: does the label's box (pos ± dimen/2) overlap clip box b?
 * @see lib/common/utils.c:overlap_label */
function overlapLabel(lp: TextlabelT, b: Box): boolean {
  const sx = lp.dimen.x / 2;
  const sy = lp.dimen.y / 2;
  const bb: Box = {
    ll: { x: lp.pos.x - sx, y: lp.pos.y - sy },
    ur: { x: lp.pos.x + sx, y: lp.pos.y + sy },
  };
  return boxOverlap(b, bb);
}

/**
 * Faithful-to-outcome `edge_in_box`: true when the edge has something to draw.
 * C's gvrender defers the `<g>` until a draw op, so an edge whose content falls
 * entirely outside the clip emits no group (emit.c:edge_in_box tests each piece
 * vs job->clip via boxf_overlap/overlap_label).
 *
 * The only piece that can legitimately fall OUTSIDE the clip on this corpus is a
 * degenerate labeled-flat label: it is spline-less, so map_edge leaves it at its
 * internal (un-normalized) x-frame position while the clip is the final frame.
 * The `overlapLabel` test on the main label reproduces C's draw-iff-overlap for
 * exactly that case — on-canvas (2368) → drawn; off-canvas (2368_1, negative
 * un-normalized x) → suppressed. A present spline always lies within the clip
 * (GD_bb contains it), and head/tail/xlabels are positioned at on-canvas
 * endpoints, so those keep their existing unconditional triggers — adding an
 * overlap test there only risks suppressing legitimately-drawn content (it
 * regressed neato/circo edges whose spl.bb is computed differently). The `set`
 * guard on the main label is kept: the port retains an unplaced (`pos=0,0`,
 * `set=false`) label on merged back-edges where C has none.
 * @see lib/common/emit.c:edge_in_box, lib/common/utils.c:overlap_label
 */
export function edgeHasDrawableContent(e: Edge, clip: Box): boolean {
  const i = e.info;
  return i.spl !== undefined
    || (i.label !== undefined && i.label.set && overlapLabel(i.label, clip))
    || i.xlabel !== undefined
    || i.head_label !== undefined || i.tail_label !== undefined;
}
