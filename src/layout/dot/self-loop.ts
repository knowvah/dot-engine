// SPDX-License-Identifier: EPL-2.0

/**
 * Self-loop routing for the dot engine.
 *
 * Ports the self-edge branch of dot_splines_ in lib/dotgen/dotsplines.c:305-409.
 * Self-loops are stored in ND_other (node.info.other) by class2OneEdge.
 * This module: collects them, computes sizey from the rank table, and calls
 * the shared makeSelfEdge dispatcher.
 *
 * @see lib/dotgen/dotsplines.c:305-409
 * @see lib/common/splines.c:makeSelfEdge
 */

import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';
import type { Edge } from '../../model/edge.js';
import type { SplineInfo } from '../../common/types.js';
import { NORMAL } from './fastgr.js';
import { setflags, AUXGRAPH } from './splines.js';
import { swapEndsP, splineMerge } from './splines.js';
import { makeSelfEdge } from '../../common/splines-selfedge.js';

// ---------------------------------------------------------------------------
// buildDotSinfo — dot-specific SplineInfo
// @see lib/dotgen/dotsplines.c:125-126
// ---------------------------------------------------------------------------

/**
 * Build the dot-engine SplineInfo (sinfo).
 * @see lib/dotgen/dotsplines.c:125-126
 */
export function buildDotSinfo(): SplineInfo {
  return {
    swapEnds: swapEndsP as (e: unknown) => boolean,
    splineMerge: splineMerge as (n: unknown) => boolean,
    ignoreSwap: false,
    isOrtho: false,
  };
}

// ---------------------------------------------------------------------------
// collectOtherEdges — add ND_other edges to the routing list
// @see lib/dotgen/dotsplines.c:305-318
// ---------------------------------------------------------------------------

/**
 * Collect node.info.other edges into `edges`, restoring rw from mval first.
 *
 * In position(), each NORMAL node that has self-loops has its rw increased to
 * accommodate the loop geometry and the original value saved in mval.
 * We restore the original rw here before routing.
 *
 * @see lib/dotgen/dotsplines.c:305-318
 */
export function collectOtherEdges(n: Node, edges: Edge[]): void {
  const other = n.info.other;
  if (!other?.size) return;
  if ((n.info.node_type ?? NORMAL) === NORMAL) {
    // SWAP(&ND_rw(n), &ND_mval(n))
    const savedRw = n.info.rw ?? 0;
    n.info.rw = n.info.mval ?? 0;
    n.info.mval = savedRw;
  }
  for (let k = 0; k < other.size; k++) {
    const e = other.list[k];
    setflags(e, 0, 0, AUXGRAPH);
    edges.push(e);
  }
}

// ---------------------------------------------------------------------------
// computeSizey — rank-gap geometry for self-loop sizing
// @see lib/dotgen/dotsplines.c:dot_splines_ (16.1.1 :396-411)
// ---------------------------------------------------------------------------

/** C's `GD_rank(g)[r].v[0] != NULL`: rank r is not empty. The port's empty
 * ranks carry `v[0]` as null or as absent (`v` is `[]`), so the test is loose.
 * @see lib/dotgen/dotsplines.c:dot_splines_ (16.1.1, ca3353d80, 1a77ac9df) */
function rankHasLeader(g: Graph, r: number): boolean {
  return g.info.rank![r].v[0] != null;
}

/** y-coord of first node in rank r. @see lib/dotgen/dotsplines.c:394 */
function rankY(g: Graph, r: number): number {
  return g.info.rank![r].v[0].info.coord?.y ?? 0;
}

/** sizey when n is at the maximum rank, or the rank below it is empty. C's
 * `r > 0` is a literal index test; after abomination C's rank is
 * r - abomShift (AD-2 renumbers +1 where C uses index -1). 16.1.1 also wants
 * a leader on the rank above: `r > 0 && GD_rank(g)[r - 1].v[0] != NULL`.
 * @see lib/dotgen/dotsplines.c:dot_splines_ (16.1.1 :400-404, 1a77ac9df) */
function sizeyAtMaxrank(g: Graph, n: Node, r: number): number {
  if (r - (g.info.abomShift ?? 0) > 0 && rankHasLeader(g, r - 1)) {
    return rankY(g, r - 1) - (n.info.coord?.y ?? 0);
  }
  return n.info.ht ?? 0;
}

/** sizey when n is at the minimum rank. @see lib/dotgen/dotsplines.c:397-398 */
function sizeyAtMinrank(g: Graph, n: Node, r: number): number {
  return (n.info.coord?.y ?? 0) - rankY(g, r + 1);
}

/** sizey when n is at a middle rank. @see lib/dotgen/dotsplines.c:400-402 */
function sizeyAtMidrank(g: Graph, n: Node, r: number): number {
  const ny  = n.info.coord?.y ?? 0;
  const upy  = rankY(g, r - 1) - ny;
  const dwny = ny - rankY(g, r + 1);
  return Math.min(upy, dwny);
}

/**
 * Compute the vertical sizing parameter for self-loops on node n.
 *
 * Mirrors the C branch exactly (16.1.1 guards an empty neighbouring rank):
 *   if r == maxrank || rank[r+1].v[0] == NULL:
 *     sizey = rank[r-1].v[0].y - n.y   (or ht if r==0 or rank[r-1] is empty)
 *   elif r == minrank || rank[r-1].v[0] == NULL:
 *     sizey = n.y - rank[r+1].v[0].y
 *   else: sizey = min(rank[r-1].v[0].y - n.y, n.y - rank[r+1].v[0].y)
 *
 * The `||` order is C's: the rank table has no entry past either end, so the
 * neighbour is read only once `r` is known not to be that end.
 *
 * @see lib/dotgen/dotsplines.c:dot_splines_ (16.1.1 :396-411; ca3353d80
 *   "anticipate an empty rank above", 1a77ac9df "anticipate an empty rank
 *   below")
 */
export function computeSizey(g: Graph, n: Node): number {
  const r       = n.info.rank ?? 0;
  const minrank = g.info.minrank ?? 0;
  const maxrank = g.info.maxrank ?? 0;
  if (r === maxrank || !rankHasLeader(g, r + 1)) return sizeyAtMaxrank(g, n, r);
  if (r === minrank || !rankHasLeader(g, r - 1)) return sizeyAtMinrank(g, n, r);
  return sizeyAtMidrank(g, n, r);
}

// ---------------------------------------------------------------------------
// routeSelfEdgeGroup — route one group of parallel self-loops
// @see lib/dotgen/dotsplines.c:388-409
// ---------------------------------------------------------------------------

/**
 * Route a contiguous group of cnt parallel self-loops via makeSelfEdge.
 *
 * @param g       - the graph (provides rank table for sizey)
 * @param edges   - slice of the sorted edge list starting at the group
 * @param cnt     - number of parallel self-loops in this group
 * @param multisep - sd.Multisep (= nodesep)
 * @param sinfo   - dot SplineInfo callbacks
 *
 * @see lib/dotgen/dotsplines.c:388-409
 */
export function routeSelfEdgeGroup(
  g: Graph,
  edges: Edge[],
  cnt: number,
  multisep: number,
  sinfo: SplineInfo,
): void {
  const e0 = edges[0];
  const n = e0.tail;
  const sizey = computeSizey(g, n);
  makeSelfEdge(edges, cnt, multisep, sizey / 2, sinfo);
}
