// SPDX-License-Identifier: EPL-2.0
/**
 * Edge lengths: scan_graph_mode's MODE_KK and MODE_SGD branches call
 * setEdgeLen on every node, storing `len` (default 1.0) in ED_dist.
 *
 * @see lib/neatogen/stuff.c:setEdgeLen
 * @see lib/neatogen/stuff.c:lenattr
 */

import type { Graph } from '../../model/graph.js';
import { agNameOf } from '../../model/cgraph-ops.js';
import type { Edge } from '../../model/edge.js';
import { agwarningf } from '../../common/agerr.js';
import { buildOutEdgeIndex } from '../../model/node.js';

/** `dfltlen` passed by scan_graph_mode. @see lib/neatogen/stuff.c:scan_graph_mode */
export const DEFAULT_EDGE_LEN = 1.0;

/** sscanf("%lf") number prefix: decimal, hex, inf/infinity, nan (case-insensitive). */
const DOUBLE_PREFIX =
  /^\s*([+-]?)(0x(?:[\da-f]+\.?[\da-f]*|\.[\da-f]+)(?:p[+-]?\d+)?|(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|inf(?:inity)?|nan(?:\([\w]*\))?)/i;

/** `sscanf(s, "%lf", &v)`: the parsed value (NaN for "nan"), or null when nothing scans. */
function scanDouble(s: string): number | null {
  const m = DOUBLE_PREFIX.exec(s);
  if (m === null) return null;
  const body = m[2]!.toLowerCase();
  const sign = m[1] === '-' ? -1 : 1;
  if (body.startsWith('nan')) return Number.NaN;
  if (body.startsWith('inf')) return sign * Infinity;
  if (!body.startsWith('0x')) return sign * parseFloat(body);
  const [mant, exp] = body.slice(2).split('p');
  const [ip = '', fp = ''] = mant!.split('.');
  const digits = parseInt(ip + fp || '0', 16);
  return sign * digits * 2 ** (Number(exp ?? 0) - 4 * fp.length);
}

/**
 * The edge's `len`, or the default when it is absent or empty; a value that
 * does not parse as a positive number warns and falls back to the default.
 * @see lib/neatogen/stuff.c:lenattr
 */
export function lenattr(ep: Edge, g: Graph): number {
  const s = ep.attrs.get('len');
  if (s === undefined || s === '') return DEFAULT_EDGE_LEN;
  const len = scanDouble(s);
  if (len === null || len < 0 || len === 0) {
    agwarningf(`bad edge len "${s}" in ${agNameOf(g)} - setting to ${DEFAULT_EDGE_LEN.toFixed(2)}`);
    return DEFAULT_EDGE_LEN;
  }
  return len;
}

/**
 * Store every edge's length in `info.dist` (ED_dist), visiting nodes in order and each
 * node's out-edges in `agfstout` order as scan_graph_mode does; returns the total length.
 * @see lib/neatogen/stuff.c:setEdgeLen
 */
export function setEdgeLen(g: Graph): number {
  const out = buildOutEdgeIndex(g);
  let total = 0;
  for (const np of g.nodes.values()) {
    for (const ep of out.get(np) ?? []) {
      ep.info.dist = lenattr(ep, g);
      total += ep.info.dist;
    }
  }
  return total;
}
