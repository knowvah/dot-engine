// SPDX-License-Identifier: EPL-2.0
//
// Which precomputed arrow ops to draw for each bezier of an edge.
//
// C draws arrows at render time inside emit_edge_graphics' per-bezier loop:
// every bezier whose sflag/eflag is set gets its own arrow_gen call. The port
// computes arrows at clip time (arrowhead-geometry ADR-2) and keeps one op list
// per edge end (`e.info.tailArrowOps` / `headArrowOps`) — enough while at most
// one bezier carries each flag, which is every spline except neato's
// multispline fallback (neatosplines.c:683-701: makeMultiSpline fails partway,
// then makeSpline appends a second flagged bezier). For that case each bezier
// also carries its own ops (`Bezier.sArrowOps` / `eArrowOps`, set by
// clipAndInstall), and these helpers hand the emitters one list per bezier.
// With at most one flagged bezier per end, the edge-level ops stay the source:
// dot's swap, flat-edge and compound passes rewrite only those.
//
// @see lib/common/emit.c:emit_edge_graphics (2669-2675)

import type { Edge } from '../model/edge.js';
import type { Bezier } from '../model/geom.js';
import type { ArrowDrawOp } from './arrows-types.js';

/** Edge end: `tail` pairs with a bezier's sflag/sp, `head` with eflag/ep. */
export type ArrowEnd = 'head' | 'tail';

const flagOf = (bz: Bezier, end: ArrowEnd): number => (end === 'head' ? bz.eflag : bz.sflag);
const ownOps = (bz: Bezier, end: ArrowEnd): ArrowDrawOp[] | undefined =>
  (end === 'head' ? bz.eArrowOps : bz.sArrowOps);
const edgeOps = (e: Edge, end: ArrowEnd): ArrowDrawOp[] | undefined =>
  (end === 'head' ? e.info.headArrowOps : e.info.tailArrowOps);

function flaggedBeziers(e: Edge, end: ArrowEnd): Bezier[] {
  const list = (e.info.spl?.list ?? []) as (Bezier | undefined)[];
  return list.filter((bz): bz is Bezier => bz !== undefined && flagOf(bz, end) !== 0);
}

/** Two or more beziers carry `end`'s flag: C draws an arrow for each. */
function multiFlagged(e: Edge, end: ArrowEnd): boolean {
  return flaggedBeziers(e, end).length > 1;
}

/**
 * The ops C's per-bezier loop draws right after `bz` for `end`, when the edge
 * has several beziers flagged at that end; undefined otherwise (the caller's
 * edge-level path applies).
 */
export function bezierEndOps(e: Edge, bz: Bezier, end: ArrowEnd): ArrowDrawOp[] | undefined {
  if (flagOf(bz, end) === 0 || !multiFlagged(e, end)) return undefined;
  return ownOps(bz, end) ?? edgeOps(e, end);
}

/** Every arrow to draw for `end`, one op list per arrow, in bezier order. */
export function endArrowOps(e: Edge, end: ArrowEnd): ArrowDrawOp[][] {
  const lists = multiFlagged(e, end)
    ? flaggedBeziers(e, end).map((bz) => ownOps(bz, end) ?? edgeOps(e, end))
    : [edgeOps(e, end)];
  return lists.filter((ops): ops is ArrowDrawOp[] => ops !== undefined && ops.length > 0);
}
