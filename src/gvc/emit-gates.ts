// SPDX-License-Identifier: EPL-2.0

/**
 * emit_node / emit_edge preambles: the node_in_box gate and the
 * gvrender_comment calls C makes before an object's style=invis shortcircuit.
 * Split from device.ts to keep that file under the size cap.
 *
 * @see lib/common/emit.c:emit_node, emit_edge
 */

import type { Box } from '../model/geom.js';
import { boxOverlap } from '../model/geom.js';
import type { Node } from '../model/node.js';
import type { Edge } from '../model/edge.js';
import type { RendererPlugin } from './context.js';
import type { RenderJob } from './job.js';
import { nodeAttr } from '../common/poly-init.js';
import { edgeHasDrawableContent } from '../common/edge-in-box.js';

/**
 * A node's own layout bounding box: coord ± (lw/rw, ht/2).
 * @see lib/common/types.h:ND_bb
 * @see lib/common/emit.c:4140-4143 init_bb_node
 */
function nodeBBox(n: Node): Box {
  const { coord, lw, rw, ht } = n.info;
  return {
    ll: { x: coord.x - lw, y: coord.y - ht / 2 },
    ur: { x: coord.x + rw, y: coord.y + ht / 2 },
  };
}

/**
 * node_in_box: is the node's own bbox within job's page/view clip?
 *
 * C's `job->clip` is derived from `job->bb` (= `GD_bb(g)`) expanded by
 * `job->pad` on every side (init_job_viewport's `job->bb = gvc->bb ±
 * job->pad`, feeding `job->view`/`job->focus`, which setup_page's `job->clip`
 * algebraically reduces back to for the single-page, unpaginated case this
 * port implements — Z and rotation cancel out of that derivation). This port
 * has no separate `page=` pagination model, so `job.bb` padded by `job.pad`
 * IS `job->clip` here.
 *
 * @see lib/common/emit.c:1636-1639 node_in_box
 * @see lib/common/emit.c:1808 emit_node gate
 * @see lib/common/emit.c:3356 init_job_viewport (job->bb = gvc->bb ± pad)
 * @see lib/common/emit.c:1553-1564 setup_page (job->clip from focus/view)
 */
export function nodeInBox(n: Node, job: RenderJob): boolean {
  const clip: Box = {
    ll: { x: job.bb.ll.x - job.pad.x, y: job.bb.ll.y - job.pad.y },
    ur: { x: job.bb.ur.x + job.pad.x, y: job.bb.ur.y + job.pad.y },
  };
  return boxOverlap(nodeBBox(n), clip);
}

/**
 * gvrender_comment: pass a non-empty string to the renderer's comment hook
 * (SVG is the only ported renderer that has one).
 * @see lib/gvc/gvrender.c:gvrender_comment
 */
function gvrenderComment(renderer: RendererPlugin, job: RenderJob, str: string | undefined): void {
  if (str === undefined || str.length === 0) return;
  renderer.comment?.(str, job);
}

/**
 * The node's name and `comment` attribute, emitted after node_in_box and
 * before the invis shortcircuit (an invisible node still gets its comments).
 * @see lib/common/emit.c:emit_node (gvrender_comment x2)
 */
export function emitNodeComments(n: Node, renderer: RendererPlugin, job: RenderJob): void {
  gvrenderComment(renderer, job, n.name);
  gvrenderComment(renderer, job, nodeAttr(n, n.root, 'comment'));
}

/**
 * When edge_in_box passes: the `tail->head` name (`--` when the head's graph
 * is undirected) and the `comment` attribute, before the invis shortcircuit.
 * The renderers re-test the same gate for the edge group.
 * @see lib/common/emit.c:emit_edge (gvrender_comment x2)
 */
export function emitEdgeComments(e: Edge, renderer: RendererPlugin, job: RenderJob): void {
  if (!edgeHasDrawableContent(e, job.bb)) return;
  const kind = e.head.root.kind; // agisdirected(agraphof(aghead(e)))
  const op = kind === 'directed' || kind === 'strict-directed' ? '->' : '--';
  gvrenderComment(renderer, job, e.tail.name + op + e.head.name);
  gvrenderComment(renderer, job, e.attrs.get('comment'));
}
