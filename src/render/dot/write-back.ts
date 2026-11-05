// SPDX-License-Identifier: EPL-2.0

/**
 * The attribute half of attach_attrs_and_arrows and the xdot writer (part-9
 * AD-12). C writes layout results into the graph's attributes, and the next
 * layout reads them. The serializer overlays the same values at output, so a
 * first render prints what it always did, and this runs after it has written:
 * the attributes then hold what the output printed.
 *
 * Symbols are not declared: C's safe_dcl gives a symbol an empty default, which
 * write.c never prints and every reader treats as unset, as the port treats a
 * missing key.
 *
 * @see lib/common/output.c:254 attach_attrs_and_arrows
 * @see plugin/core/gvrender_core_dot.c:427 xdot_end_graph
 */

import type { Edge } from '../../model/edge.js';
import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';
import { ownAttrs } from '../../model/lazy-attrs.js';
import type { FieldT, ShapeDesc, TextlabelT } from '../../common/types.js';
import { appendRecordRects, edgeAttrsAttached, edgePosRaw, nodePosRaw } from './attrs.js';
import { gfmt2, gfmt5, lpStr, XDOT_VERSION } from './xdot-ops.js';
import type { XdotDraws } from './types.js';

const POINTS_PER_INCH = 72;

/** The draw strings of one object, or undefined for an object drawn with none. */
type DrawsOf = (obj: Node | Edge | Graph) => XdotDraws | undefined;

/** @see lib/common/output.c:296-317 */
function attachNode(n: Node): void {
  const attrs = ownAttrs(n);
  const info = n.info;
  attrs.set('pos', nodePosRaw(n));
  attrs.set('height', gfmt5(info.ht / POINTS_PER_INCH));
  attrs.set('width', gfmt5((info.lw + info.rw) / POINTS_PER_INCH));
  const xlabel = info.xlabel as TextlabelT | undefined;
  if (xlabel?.set) attrs.set('xlp', lpStr(xlabel.pos));
  if ((info.shape as ShapeDesc | undefined)?.name === 'record') {
    const rects: string[] = [];
    appendRecordRects(n, info.shape_info as FieldT, rects);
    attrs.set('rects', rects.join(' '));
  }
}

/** @see lib/common/output.c:349-396 */
function attachEdge(e: Edge): void {
  if (!edgeAttrsAttached(e)) return;
  const pos = edgePosRaw(e);
  if (pos === null) return;
  const attrs = ownAttrs(e);
  const { label, xlabel, head_label: head, tail_label: tail } = e.info;
  attrs.set('pos', pos);
  if (label) attrs.set('lp', lpStr(label.pos));
  if (xlabel?.set) attrs.set('xlp', lpStr(xlabel.pos));
  if (head) attrs.set('head_lp', lpStr(head.pos));
  if (tail) attrs.set('tail_lp', lpStr(tail.pos));
}

/** GD_clust(g)[1..GD_n_cluster(g)]. */
function clustersOf(g: Graph): Graph[] {
  return (g.info.clust ?? []).slice(0, g.info.n_cluster ?? 0).filter(Boolean);
}

/** @see lib/common/output.c:229 rec_attach_bb */
function recAttachBb(g: Graph): void {
  const { ll, ur } = g.info.bb;
  g.attrs.set('bb', gfmt5(ll.x) + ',' + gfmt5(ll.y) + ',' + gfmt5(ur.x) + ',' + gfmt5(ur.y));
  const label = g.info.label as TextlabelT | undefined;
  if (label && label.text.length > 0) {
    g.attrs.set('lp', lpStr(label.pos));
    g.attrs.set('lwidth', gfmt2(label.dimen.x / POINTS_PER_INCH));
    g.attrs.set('lheight', gfmt2(label.dimen.y / POINTS_PER_INCH));
  }
  for (const sg of clustersOf(g)) recAttachBb(sg);
}

/**
 * `attach_attrs`: pos, sizes and label positions on every node and edge, bb and
 * the label triple on the graph and its clusters.
 * @see lib/common/output.c:416 attach_attrs
 */
export function attachAttrs(g: Graph): void {
  for (const n of g.nodes.values()) attachNode(n);
  for (const e of g.edges) attachEdge(e);
  recAttachBb(g);
}

/** The draw strings an earlier render, or the input, left in `attrs`. */
export function storedDraws(attrs: Map<string, string>): XdotDraws {
  return {
    draw: attrs.get('_draw_'),
    ldraw: attrs.get('_ldraw_'),
    hdraw: attrs.get('_hdraw_'),
    tdraw: attrs.get('_tdraw_'),
    hldraw: attrs.get('_hldraw_'),
    tldraw: attrs.get('_tldraw_'),
  };
}

/** One object's non-empty draw strings; an empty buffer leaves the slot alone. */
function attachDraws(attrs: Map<string, string>, d: XdotDraws | undefined): void {
  if (d?.draw) attrs.set('_draw_', d.draw);
  if (d?.ldraw) attrs.set('_ldraw_', d.ldraw);
  if (d?.hdraw) attrs.set('_hdraw_', d.hdraw);
  if (d?.tdraw) attrs.set('_tdraw_', d.tdraw);
  if (d?.hldraw) attrs.set('_hldraw_', d.hldraw);
  if (d?.tldraw) attrs.set('_tldraw_', d.tldraw);
}

/** @see plugin/core/gvrender_core_dot.c:281 xdot_end_cluster */
function attachClusterDraws(g: Graph, drawsOf: DrawsOf): void {
  for (const sg of clustersOf(g)) {
    const d = drawsOf(sg);
    sg.attrs.set('_draw_', d?.draw ?? '');
    if (d?.ldraw) sg.attrs.set('_ldraw_', d.ldraw);
    attachClusterDraws(sg, drawsOf);
  }
}

/**
 * `attach_attrs`, then for the xdot writer the draw strings it stored on every
 * object, and `xdotversion`. `-Tdot` passes no `drawsOf` and leaves those alone.
 * @see plugin/core/gvrender_core_dot.c:427 xdot_end_graph
 * @see plugin/core/gvrender_core_dot.c xdot_end_node, xdot_end_edge
 */
export function attachXdotAttrs(g: Graph, drawsOf: DrawsOf | undefined): void {
  attachAttrs(g);
  if (drawsOf === undefined) return;
  for (const n of g.nodes.values()) attachDraws(ownAttrs(n), drawsOf(n));
  for (const e of g.edges) attachDraws(ownAttrs(e), drawsOf(e));
  attachDraws(g.attrs, drawsOf(g));
  attachClusterDraws(g, drawsOf);
  g.attrs.set('xdotversion', XDOT_VERSION);
}
