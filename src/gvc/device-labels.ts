// SPDX-License-Identifier: EPL-2.0

/**
 * Label emission shared by edge labels, node xlabels and cluster/graph
 * labels (split from device.ts for the file-size cap; re-exported there).
 *
 * @see lib/common/labels.c:emit_label
 * @see lib/common/emit.c:emit_label
 */

import type { Graph } from '../model/graph.js';
import type { Node } from '../model/node.js';
import type { RendererPlugin } from './context.js';
import type { RenderJob } from './job.js';
import type { TextlabelT } from '../common/types.js';
import type { TextSpan } from '../common/emit-types.js';
import type { PlacedHtml } from '../common/htmltable-pos.js';
import { gvrenderTextspan, withLabelEmitState } from './textspan-emit.js';
import { emitHtmlLabel } from '../common/htmltable-emit.js';

/** valign codes stored on textlabel_t. @see lib/common/types.h:textlabel_t.valign */
const VALIGN_TOP = 't'.charCodeAt(0);
const VALIGN_BOTTOM = 'b'.charCodeAt(0);

/** First-span baseline y per valign. @see lib/common/labels.c:emit_label (240-251) */
function labelFirstSpanY(lp: TextlabelT): number {
  if (lp.valign === VALIGN_TOP) return lp.pos.y + lp.space.y / 2.0 - lp.fontsize;
  if (lp.valign === VALIGN_BOTTOM) {
    return lp.pos.y - lp.space.y / 2.0 + lp.dimen.y - lp.fontsize;
  }
  return lp.pos.y + lp.dimen.y / 2.0 - lp.fontsize;
}

/** Span x position per justification. @see lib/common/labels.c:emit_label (254-266) */
function labelSpanX(lp: TextlabelT, just: 'l' | 'n' | 'r'): number {
  if (just === 'l') return lp.pos.x - lp.space.x / 2.0;
  if (just === 'r') return lp.pos.x + lp.space.x / 2.0;
  return lp.pos.x;
}

/**
 * Emit one label's text spans if present and placed.
 * Shared by edge-label, node-xlabel, and graph-label slots.
 * URL/anchor/map machinery and E_decorate attachment (emit.c:emit_attachment)
 * are not ported, matching the live path's AD-2 scope.
 * @see lib/common/emit.c:emit_label
 * @see lib/common/labels.c:emit_label
 */
export function renderOneLabel(
  lp: TextlabelT | undefined,
  renderer: RendererPlugin,
  job: RenderJob,
  requireSet = true,
): void {
  // C gates `->set` at the xlabel/edge-label CALL SITES (emit.c:1829,
  // emit_edge_label:2891), but draws root-graph and cluster labels on
  // existence alone (emit.c:3656, 3920) — an unplaced label (e.g. fdp's
  // non-comparable-clusters abort skips gv_postprocess) still renders at its
  // default pos. Callers mirroring the existence-only sites pass false.
  if (!lp) return;
  if (requireSet && !lp.set) return;
  // HTML branch: @see lib/common/labels.c:emit_label (226-230)
  // C routes to emit_html_label(job, lp->u.html, lp) using lp->pos as anchor.
  if (lp.html) {
    if (lp.u.kind === 'html') {
      // Route the whole HTML label (table box/fill polygons + text) into the
      // object's LABEL emit-state so its ops land in _ldraw_, not _draw_.
      const html = lp.u.html as PlacedHtml;
      const pos = lp.pos;
      withLabelEmitState(job, () => emitHtmlLabel(html, pos, renderer, job));
    }
    return;
  }
  if (lp.u.kind !== 'txt' || lp.u.nspans < 1) return;
  let y = labelFirstSpanY(lp);
  for (let i = 0; i < lp.u.nspans; i++) {
    const span = lp.u.span[i] as TextSpan | undefined;
    if (!span) break;
    // Emit only visible spans; the baseline still advances below so blank
    // lines reserve vertical space. @see gvrender_textspan (gvrender.c:419).
    gvrenderTextspan(renderer, { x: labelSpanX(lp, span.just), y }, span, job);
    y -= span.size.y; // UL position for next span (unconditional)
  }
}

/**
 * Emit node external label (ND_xlabel) if placed.
 * Must run inside the node group, after codefn (shape draw), matching C order.
 * @see lib/common/emit.c:emit_node (1829-1830)
 */
export function renderNodeXLabel(n: Node, renderer: RendererPlugin, job: RenderJob): void {
  renderOneLabel(n.info.xlabel as TextlabelT | undefined, renderer, job);
}

/** Cluster labels go through the single emit_label port. @see labels.c:emit_label */
export function renderClusterLabel(sg: Graph, renderer: RendererPlugin, job: RenderJob): void {
  renderOneLabel(sg.info.label as TextlabelT | undefined, renderer, job, false);
}
