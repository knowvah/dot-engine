// SPDX-License-Identifier: EPL-2.0

/**
 * The record exit of C `make_flat_adj_edges`: a flat edge between adjacent
 * nodes one of which has a record shape gets no spline (graphviz #1323), and
 * the first such edge of a process is reported.
 *
 * @see lib/dotgen/dotsplines.c:make_flat_adj_edges (1143-1152)
 */

import type { Graph } from '../../model/graph.js';
import type { Edge } from '../../model/edge.js';
import type { Node } from '../../model/node.js';
import { ShapeKind, type ShapeDesc } from '../../common/types.js';
import { agerr, agwarningf } from '../../common/agerr.js';
import { registerRenderState } from '../../common/render-state.js';
import { isFlatAdjacent, flatLeadPair } from './splines-flat.js';

/** @see lib/dotgen/dotsplines.c:1145 */
export const MSG_FLAT_ADJ_RECORD =
  'flat edge between adjacent nodes one of which has a record shape - replace records with HTML-like labels';

const EDGEOP_DIRECTED = '->';
const EDGEOP_UNDIRECTED = '--';

/**
 * C's `static atomic_flag warned`: one warning per process, so one per render
 * here (reset at render entry, AD-4).
 * @see lib/dotgen/dotsplines.c:1141
 */
const flatAdjRecord = { warned: false };
registerRenderState(() => {
  flatAdjRecord.warned = false;
});

/** `shapeOf(n) == SH_RECORD`. @see lib/common/shapes.c:shapeOf */
function isRecord(n: Node): boolean {
  return (n.info.shape as ShapeDesc | undefined)?.kind === ShapeKind.SH_RECORD;
}

/** `agisdirected(g) ? "->" : "--"`. */
function edgeOp(g: Graph): string {
  const kind = g.root.kind;
  return kind === 'directed' || kind === 'strict-directed' ? EDGEOP_DIRECTED : EDGEOP_UNDIRECTED;
}

/**
 * True when `e` takes the record exit, in which case the caller leaves it
 * unrouted (`map_edge` then reports it lost and it is never drawn). The first
 * call that takes the exit warns, naming C's `e0`: the group's lead edge after
 * `make_flat_edge`'s makefwdedge, i.e. the ends in rank order, by their raw
 * `agnameof` names.
 * @see lib/dotgen/dotsplines.c:make_flat_adj_edges (1143-1152)
 * @see lib/dotgen/dotsplines.c:make_flat_edge (makefwdedge of *edges)
 */
export function lostFlatAdjRecordEdge(g: Graph, e: Edge): boolean {
  const tr = e.tail.info.rank;
  if (tr === undefined || tr !== e.head.info.rank) return false;
  if (!isFlatAdjacent(g, e)) return false;
  const { tn, hn } = flatLeadPair([e]);
  if (!isRecord(tn) && !isRecord(hn)) return false;
  if (!flatAdjRecord.warned) {
    flatAdjRecord.warned = true;
    agwarningf(MSG_FLAT_ADJ_RECORD);
    agerr('prev', `  Edge ${tn.name} ${edgeOp(g)} ${hn.name}`);
  }
  return true;
}
