// SPDX-License-Identifier: EPL-2.0

/**
 * Rank geometry extraction for edge routing.
 *
 * Computes the RankEdgeInfo needed by routeWithRank by reading the
 * graph's rank table and deriving left/right bounds from node extents.
 *
 * @see lib/dotgen/dotsplines.c:make_regular_edge (rank geometry access)
 * @see lib/dotgen/dotsplines.c:sd.LeftBound / sd.RightBound
 */

import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';
import type { Edge } from '../../model/edge.js';
import { swapBezier, swapEndsP } from './splines.js';
import type { RankEdgeInfo } from './edge-route-routing.js';

/** Minimum edge routing width. @see lib/dotgen/dotsplines.c:MINW */
const MINW = 16;

/** Minimum x extent across all nodes minus MINW. @see lib/dotgen/dotsplines.c:sd.LeftBound */
export function computeLeftBound(g: Graph): number {
  const ranks = g.info.rank;
  if (ranks === undefined) return -32;
  const minr = g.info.minrank ?? 0;
  const maxr = g.info.maxrank ?? ranks.length - 1;
  let lb = 0;
  for (let i = minr; i <= maxr; i++) {
    const n = ranks[i]?.v[0];
    if (n) lb = Math.min(lb, n.info.coord.x - n.info.lw);
    lb -= MINW;
  }
  return lb;
}

/** Maximum x extent across all nodes plus MINW. @see lib/dotgen/dotsplines.c:sd.RightBound */
export function computeRightBound(g: Graph): number {
  const ranks = g.info.rank;
  if (ranks === undefined) return 60;
  const minr = g.info.minrank ?? 0;
  const maxr = g.info.maxrank ?? ranks.length - 1;
  let rb = 0;
  for (let i = minr; i <= maxr; i++) {
    const rk = ranks[i];
    const n = rk !== undefined && rk.n > 0 ? rk.v[rk.n - 1] : undefined;
    if (n) rb = Math.max(rb, n.info.coord.x + n.info.rw);
    rb += MINW;
  }
  return rb;
}

/** Default a rank half-height to node half-height when the rank value is unset. */
export function rankHt(rankVal: number, nodeHt: number): number {
  return rankVal > 0 ? rankVal : nodeHt / 2;
}

// ---------------------------------------------------------------------------
// Per-pass bounds snapshot — mirrors C's spline_info_t sd
// @see lib/dotgen/dotsplines.c:dot_splines_ (sd computed once, threaded through
// maximal_bbox / rank_box / make_regular_edge / make_flat_edge)
// ---------------------------------------------------------------------------

/** The two fields of spline_info_t that this port derives from live rank/node
 *  state. @see lib/dotgen/dotsplines.c:spline_info_t (LeftBound/RightBound) */
export interface SplineBoundsSnapshot {
  leftBound: number;
  rightBound: number;
}

/** Per-graph memo of the current pass's bounds snapshot. Keyed by Graph so an
 *  aux graph (always a fresh `new Graph(...)`, @see splines-flat.ts:cloneGraph)
 *  never collides with the main graph's entry. */
const boundsSnapshotByGraph = new WeakMap<Graph, SplineBoundsSnapshot>();

/**
 * Return this pass's frozen {leftBound, rightBound}, computing it on first
 * access after a `resetSplineBounds` (or the very first access ever, for a
 * graph never routed before). C's `dot_splines_` computes `spline_info_t sd`
 * ONCE per call and threads it by pointer/value through every routing
 * helper for that pass; the port previously called computeLeftBound/
 * computeRightBound fresh on every routed edge, so edges routed later in the
 * same pass saw a corridor narrowed by recoverSlack/resizeVn mutations to
 * vnode coord.x/lw/rw from EARLIER edges in the pass (measured on 2646:
 * 6002 of the pass's bound reads drifted 26pt narrower per side; the very
 * first, pre-mutation computeLeftBound call is byte-identical to C's
 * one-time value, so the formula is faithful and only the call timing
 * drifted). NOTE: 2646's residual 3-edge divergence (Δ42.09 worst) proved
 * to be a separate mechanism — those edges route before/independent of the
 * drift — but the frozen snapshot is the faithful C semantics regardless.
 * @see lib/dotgen/dotsplines.c:dot_splines_ (sd computed once, threaded through)
 */
export function getSplineBounds(g: Graph): SplineBoundsSnapshot {
  let snap = boundsSnapshotByGraph.get(g);
  if (snap === undefined) {
    snap = { leftBound: computeLeftBound(g), rightBound: computeRightBound(g) };
    boundsSnapshotByGraph.set(g, snap);
  }
  return snap;
}

/**
 * Force the next `getSplineBounds(g)` call to recompute a fresh snapshot.
 * Called once at the top of each `dotSplines_` pass (main graph or aux
 * graph), exactly where C zero-initializes then computes `spline_info_t sd`
 * fresh for that call. @see lib/dotgen/dotsplines.c:dot_splines_ (`spline_info_t
 * sd = {0};` followed by the one-time LeftBound/RightBound loop)
 */
export function resetSplineBounds(g: Graph): void {
  boundsSnapshotByGraph.delete(g);
}

/**
 * Per-edge count of the beziers a pass found already on the edge, which only a
 * layout with no gvFreeLayout before it leaves there. An edge with no entry had
 * no spline at the start of the pass. Rewritten by every `beginRoutingPass`.
 */
const staleBeziersByEdge = new WeakMap<Edge, number>();

/**
 * Start a `dotSplines_` pass on `g`: the bounds snapshot above, and the record of
 * what an earlier layout left on each edge. C routes each edge once per
 * `dot_splines_` and `new_spline` appends to whatever `ED_spl` holds, so stale
 * beziers neither stop this pass routing an edge nor count as this pass's route.
 * A stale `lost` is the same: this pass has not lost the edge yet.
 * @see lib/dotgen/dotsplines.c:dot_splines_
 * @see lib/common/splines.c:new_spline
 */
export function beginRoutingPass(g: Graph): void {
  resetSplineBounds(g);
  for (const e of g.edges) {
    e.info.lost = undefined;
    if (e.info.spl === undefined) staleBeziersByEdge.delete(e);
    else staleBeziersByEdge.set(e, e.info.spl.size);
  }
}

/**
 * True when this routing pass has installed a bezier on `e`. On a first layout no
 * edge has a stale count, and this is exactly `e.info.spl !== undefined`.
 */
export function routedThisPass(e: Edge): boolean {
  const spl = e.info.spl;
  if (spl === undefined) return false;
  const stale = staleBeziersByEdge.get(e);
  return stale === undefined || spl.size > stale;
}

/** The beziers `e` came into this routing pass holding, 0 on a first layout. */
export function staleBezierCount(e: Edge): number {
  return staleBeziersByEdge.get(e) ?? 0;
}

/**
 * True when `e` kept ED_adjacent from an earlier layout. C never clears the flag,
 * so it routes `e` as adjacent even if a node now sits between its ends. A flat
 * edge this layout merged into a new reversed edge goes by that edge's flag: C
 * routes the representative, whose record has no stale flag.
 * @see lib/dotgen/flat.c:236
 * @see lib/dotgen/dotsplines.c:366
 * @see lib/dotgen/mincross.c:flat_rev
 */
export function staleAdjacent(e: Edge): boolean {
  let rep = e;
  while (rep.info.to_virt !== undefined && rep.info.to_virt !== rep) rep = rep.info.to_virt;
  const samePair = (rep.tail === e.tail && rep.head === e.head)
    || (rep.tail === e.head && rep.head === e.tail);
  return staleBezierCount(e) > 0 && ((samePair ? rep : e).info.adjacent ?? 0) !== 0;
}

/**
 * Finish a pass's edge_normalize for the beziers an earlier layout left. C swaps
 * the whole spline once, at the end of the pass, so a swapped edge's stale beziers
 * end up reversed and after the new ones. The port's routers orient what they
 * install as they go, and `swapSpline` leaves the stale beziers alone for this.
 * @see lib/dotgen/dotsplines.c:edge_normalize
 * @see lib/dotgen/dotsplines.c:swap_spline
 */
export function swapStaleBeziers(g: Graph): void {
  for (const e of g.edges) {
    const stale = staleBezierCount(e);
    const spl = e.info.spl;
    if (stale === 0 || spl === undefined || !swapEndsP(e)) continue;
    const old = spl.list.splice(0, stale).reverse();
    for (const bz of old) swapBezier(bz);
    spl.list.push(...old);
  }
}

/**
 * Extract RankEdgeInfo from the graph's rank table for an edge.
 * Returns undefined if rank geometry is not available.
 * @see lib/dotgen/dotsplines.c:make_regular_edge (rank geometry access)
 */
export function rankEdgeInfoOf(
  g: Graph,
  tailNode: Node,
  headNode: Node,
): RankEdgeInfo | undefined {
  const rankTable = g.info.rank;
  if (rankTable === undefined) return undefined;
  const tailRank = tailNode.info.rank;
  const headRank = headNode.info.rank;
  if (tailRank === undefined || headRank === undefined) return undefined;
  const tr = rankTable[tailRank];
  const hr = rankTable[headRank];
  if (tr === undefined || hr === undefined) return undefined;
  return {
    ...getSplineBounds(g),
    tailHt1: rankHt(tr.ht1, tailNode.info.ht),
    tailHt2: rankHt(tr.ht2, tailNode.info.ht),
    headHt1: rankHt(hr.ht1, headNode.info.ht),
    headHt2: rankHt(hr.ht2, headNode.info.ht),
  };
}
