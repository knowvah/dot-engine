// SPDX-License-Identifier: EPL-2.0

/**
 * `gvLayout` sets the `bb` attribute for the basic layout, whatever is rendered
 * next. No engine parses this space-separated form, and a dot or xdot render
 * overwrites it.
 *
 * The `dot` command runs gvLayoutJobs and never writes it, and the JSON writer
 * was built against that: it prints the root's attribute table as it stood.
 * `attrsWithoutLayoutBb` hands it that table.
 *
 * @see lib/gvc/gvc.c:67-78 gvLayout
 */

import type { Graph } from '../model/graph.js';
import { cround } from '../common/arith.js';
import { printfFixed } from '../util/printf-round.js';
import { parseLandscape } from './landscape.js';

/** What `writeLayoutBb` wrote on each graph, and the value it replaced. */
const layoutBbByGraph = new WeakMap<Graph, { written: string; replaced: string | undefined }>();

/** @see lib/gvc/gvc.c:67-78 gvLayout */
export function writeLayoutBb(g: Graph): void {
  const bb = g.info?.bb;
  if (bb === undefined || !g.attrs) return;
  const parts = parseLandscape(g)
    ? [bb.ll.y, bb.ll.x, bb.ur.y, bb.ur.x]
    : [bb.ll.x, bb.ll.y, bb.ur.x, bb.ur.y];
  const written = parts.map((v) => printfFixed(cround(v), 0)).join(' ');
  layoutBbByGraph.set(g, { written, replaced: g.attrs.get('bb') });
  g.attrs.set('bb', written);
}

/** `g.attrs` as it was before the layout's own `bb`, if nothing has replaced that since. */
export function attrsWithoutLayoutBb(g: Graph): Map<string, string> {
  const own = layoutBbByGraph.get(g);
  if (own === undefined || g.attrs.get('bb') !== own.written) return g.attrs;
  const attrs = new Map(g.attrs);
  if (own.replaced === undefined) attrs.delete('bb');
  else attrs.set('bb', own.replaced);
  return attrs;
}
