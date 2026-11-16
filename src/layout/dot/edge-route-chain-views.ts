// SPDX-License-Identifier: EPL-2.0

/**
 * Edge views make_regular_edge routes instead of the edge itself: the forward
 * view of a back edge (`makefwdedge`) and the two hackflag views of an edge
 * routed on another edge's virtual chain (`fwdedgea`, `fwdedgeb`). Split from
 * edge-route-chain.ts, which walks the chain these views drive.
 *
 * @see lib/dotgen/dotsplines.c:makefwdedge
 * @see lib/dotgen/dotsplines.c:make_regular_edge (hackflag)
 */

import type { Edge as GraphEdge } from '../../model/edge.js';
import type { Port } from '../../model/geom.js';
import type { Node } from '../../model/node.js';
import { VIRTUAL } from './fastgr.js';
import { makePort } from '../../model/edgeInfo.js';
import { resolveOrigEdge } from './splines.js';

// ---------------------------------------------------------------------------
// Forward view
// @see lib/dotgen/dotsplines.c:makefwdedge
// ---------------------------------------------------------------------------

/**
 * Forward view of any edge (C `makefwdedge`): tail/head swapped when the edge
 * runs high→low rank (a back edge), fresh portless ends. `beginPath`/`endPath`
 * read `e.tail`/`e.head`, so the chain must be driven by an edge that runs
 * low→high rank. Sets `to_orig`/`edge_type=VIRTUAL` so `clipAndInstall`→
 * `newSpline` installs the spline on the ORIGINAL edge (its `to_orig` loop) and
 * the post-routing `swapSpline` pass reverses it back to tail→head. Shares
 * `attrs`/`root`/`to_virt` with `e`. Consumed by T3 for parallel back-members.
 * @see lib/dotgen/dotsplines.c:makefwdedge
 * @see lib/common/splines.c:clip_and_install (to_orig install loop)
 */
export function makeFwdEdge(e: GraphEdge): GraphEdge {
  const back = (e.head.info.rank ?? 0) < (e.tail.info.rank ?? 0);
  const [tail, head] = back ? [e.head, e.tail] : [e.tail, e.head];
  return {
    ...e,
    tail,
    head,
    info: {
      ...e.info,
      // C makefwdedge SWAPS the ports (does not strip them): a back edge keeps
      // its corner ports across the forward view so make_regular_edge curls it
      // (e.g. #241_0 aux back-edge clone sw/se → size 7). Stripping to an empty
      // Center port straightened every port-bearing back edge (size 4).
      // @see lib/dotgen/dotsplines.c:makefwdedge (ED_tail_port(new)=ED_head_port(old))
      tail_port: e.info.head_port ?? makePort(),
      head_port: e.info.tail_port ?? makePort(),
      to_orig: e,
      edge_type: VIRTUAL,
    },
  } as GraphEdge;
}

// ---------------------------------------------------------------------------
// Hackflag views for an edge routed on another edge's chain
// @see lib/dotgen/dotsplines.c:make_regular_edge (abs(rank diff) > 1)
// ---------------------------------------------------------------------------

/** A port copied by value, as C's struct assignment copies `port`. */
function copyPort(p: Port): Port {
  return { ...p, p: { ...p.p } };
}

/**
 * C's `fwdedgea`: a copy of `e` from its rank-low end to the first vnode of the
 * chain, head port undefined at (0,0), VIRTUAL with `to_orig = e`. beginpath's
 * side-port clip reset therefore lands on `e` itself.
 */
function hackflagBeginView(e: GraphEdge, back: boolean, firstVnode: Node): GraphEdge {
  const tailPort = back ? e.info.head_port : e.info.tail_port;
  return {
    ...e,
    tail: back ? e.head : e.tail,
    head: firstVnode,
    info: {
      ...e.info,
      tail_port: copyPort(tailPort),
      head_port: { ...copyPort(e.info.head_port), defined: false, p: { x: 0, y: 0 } },
      edge_type: VIRTUAL,
      to_orig: e,
    },
  } as GraphEdge;
}

/**
 * C's `fwdedgeb`: for a back edge, `makefwdedge(e)` (VIRTUAL, `to_orig = e`);
 * otherwise a plain struct copy of `e` that stays NORMAL, so endpath's
 * side-port clip reset lands on the copy and `e` keeps its head clip.
 */
function hackflagEndView(e: GraphEdge, back: boolean): GraphEdge {
  if (back) return makeFwdEdge(e);
  return {
    ...e,
    info: { ...e.info, tail_port: copyPort(e.info.tail_port), head_port: copyPort(e.info.head_port) },
  } as GraphEdge;
}

/**
 * The edges that drive the chain's first beginpath and last endpath. A chain
 * owned by `e` itself is C's ordinary walk from the first to the last fast
 * edge. A chain owned by another edge means class2 merged `e` into it
 * (`merge_chain`), so `e` sits in ND_other and C's group loop hands the real
 * edge to make_regular_edge, which takes the hackflag branch: beginpath on
 * `fwdedgea`, endpath on `fwdedgeb`. Driving those calls with the owner's
 * segments reset the owner's clip flags instead of `e`'s (plantuml-ts 41).
 * @see lib/dotgen/dotsplines.c:make_regular_edge (hackflag)
 * @see lib/dotgen/class2.c:class2 (merge_chain, other_edge)
 */
export function chainEnds(e: GraphEdge, segs: GraphEdge[]): [GraphEdge, GraphEdge] {
  const first = segs[0];
  const last = segs[segs.length - 1];
  const orig = resolveOrigEdge(e);
  if (resolveOrigEdge(first) === orig) return [first, last];
  const back = (orig.head.info.rank ?? 0) < (orig.tail.info.rank ?? 0);
  return [hackflagBeginView(orig, back, first.head), hackflagEndView(orig, back)];
}
