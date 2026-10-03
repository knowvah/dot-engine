// SPDX-License-Identifier: EPL-2.0
/**
 * Edge lengths: scan_graph_mode's MODE_KK and MODE_SGD branches call
 * setEdgeLen on every node, storing `len` (default 1.0) in ED_dist.
 *
 * @see lib/neatogen/stuff.c:setEdgeLen
 * @see lib/neatogen/stuff.c:lenattr
 */

import type { Graph } from '../../model/graph.js';
import type { Edge } from '../../model/edge.js';

/** `dfltlen` passed by scan_graph_mode. @see lib/neatogen/stuff.c:scan_graph_mode */
export const DEFAULT_EDGE_LEN = 1.0;

/**
 * The edge's `len`, or the default when it is absent or empty; a value that
 * does not parse as a positive number warns and falls back to the default.
 * @see lib/neatogen/stuff.c:lenattr
 */
export function lenattr(ep: Edge, g: Graph): number {
  const s = ep.attrs.get('len');
  if (s === undefined || s === '') return DEFAULT_EDGE_LEN;
  const val = /^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(s);
  const len = val === null ? Number.NaN : parseFloat(val[0]);
  if (Number.isNaN(len) || len < 0 || len === 0) {
    console.warn(`bad edge len "${s}" in ${g.name} - setting to ${DEFAULT_EDGE_LEN.toFixed(2)}`);
    return DEFAULT_EDGE_LEN;
  }
  return len;
}

/** Store every edge's length in `info.dist` (ED_dist). @see lib/neatogen/stuff.c:setEdgeLen */
export function setEdgeLen(g: Graph): void {
  for (const ep of g.edges) ep.info.dist = lenattr(ep, g);
}
