// SPDX-License-Identifier: EPL-2.0

/**
 * The graph's own draw ops: `_background`, or else the `_draw_` an earlier xdot
 * render wrote, parsed when a layout starts. emit-xdot.ts replays them.
 *
 * @see lib/common/emit.c:69 init_xdot
 * @see lib/common/input.c:784
 */

import { agerr, agwarningf } from '../common/agerr.js';
import type { Graph } from '../model/graph.js';
import { parseXDot } from '../xdot/index.js';
import type { Xdot } from '../xdot/types.js';

/** GD_drawing(g)->xdots: set per layout, read by the render after it. */
const xdotsByGraph = new WeakMap<Graph, Xdot>();

/** @see lib/common/emit.c:69 init_xdot */
export function initXdot(g: Graph): void {
  xdotsByGraph.delete(g);
  const p = g.attrs?.get('_background') || g.attrs?.get('_draw_');
  if (!p) return;
  const xd = parseXDot(p);
  if (xd === null) {
    agwarningf(`Could not parse "_background" attribute in graph ${g.name}`);
    agerr('prev', `  "${p}"`);
    return;
  }
  xdotsByGraph.set(g, xd);
}

/** The draw ops of the last layout of `g`. */
export function graphXdots(g: Graph): Xdot | undefined {
  return xdotsByGraph.get(g);
}
