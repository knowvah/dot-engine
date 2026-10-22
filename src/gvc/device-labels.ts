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
import type { Edge } from '../model/edge.js';
import type { RendererPlugin } from './context.js';
import type { RenderJob } from './job.js';
import type { TextlabelT } from '../common/types.js';
import type { TextSpan } from '../common/emit-types.js';
import type { PlacedHtml } from '../common/htmltable-pos.js';
import { gvrenderTextspan, withLabelEmitState } from './textspan-emit.js';
import { emitHtmlLabel } from '../common/htmltable-emit.js';
import { reportColorNames } from '../render/color-resolve.js';
import { htmlLabelColors } from '../common/htmltable-emit-fill.js';

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
 * The names emit_label hands to gvrender_resolve_color: an HTML label's walk,
 * or a plain label's fontcolor (set once, before the spans, when there is a
 * span).
 * @see lib/common/labels.c:emit_label
 */
export function labelColorNames(lp: TextlabelT): string[] {
  if (lp.html) return lp.u.kind === 'html' ? htmlLabelColors(lp.u.html as PlacedHtml) : [];
  return lp.u.kind === 'txt' && lp.u.nspans >= 1 ? [lp.fontcolor] : [];
}

/**
 * Report the unknown colours of an edge's four labels in emit_end_edge order
 * (label, xlabel, head, tail), each only when placed.
 * @see lib/common/emit.c:emit_edge_label
 */
export function reportEdgeLabelColors(e: Edge): void {
  const labels = [e.info.label, e.info.xlabel, e.info.head_label, e.info.tail_label];
  for (const lp of labels as Array<TextlabelT | undefined>) {
    if (lp?.set) reportColorNames(labelColorNames(lp));
  }
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
  reportColorNames(labelColorNames(lp));
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
