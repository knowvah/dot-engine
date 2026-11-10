// SPDX-License-Identifier: EPL-2.0

/**
 * emit_edge's edge_in_box gate, shared by the device walk (edge comments) and
 * the SVG / xdot renderers (edge group and draw ops).
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
 * `edge_in_box`: whether any piece of the edge overlaps the page clip — the
 * spline's box (`spl->bb`, which init_bb computes before every render; see
 * emit-bb.ts), the label, or a placed xlabel. emit_edge draws nothing, not even
 * the edge's group, when this fails. Head and tail labels are not tested.
 * @see lib/common/emit.c:2686 edge_in_box, lib/common/utils.c:overlap_label
 */
export function edgeHasDrawableContent(e: Edge, clip: Box): boolean {
  const i = e.info;
  if (i.spl !== undefined && boxOverlap(i.spl.bb, clip)) return true;
  if (i.label !== undefined && overlapLabel(i.label, clip)) return true;
  return i.xlabel !== undefined && i.xlabel.set && overlapLabel(i.xlabel, clip);
}
