// SPDX-License-Identifier: EPL-2.0
/**
 * add_segment and its helpers for Seidel trapezoidation.
 *
 * @see lib/ortho/trapezoid.c:add_segment
 */

import {
  TRAP_MAX, INVALID_TRAP, isValidTrap,
  fpEqual, equalTo, greaterThanOrEq,
  lessThan, newQNode, newTrap,
  T_X, T_SINK, T_Y,
  FIRSTPT, LASTPT, S_LEFT, S_RIGHT,
} from "./trap-types.js";
import type { SegPoint, SegmentT, TrapT, QNode } from "./trap-types.js";
import { isLeftOf, inserted, locateEndpoint, mergeTrapezoids } from "./trap-query.js";
import { updateTrapezoid } from "./trap-update.js";

// ─── Insert v0 endpoint ───────────────────────────────────────────────────────

export function insertV0(
  s: SegmentT,
  seg: SegmentT[],
  tr: TrapT[],
  qs: QNode[],
  segnum: number,
): number {
  const tu = locateEndpoint(s.v0, s.v1, s.root0, seg, qs);
  const tl = newTrap(tr);
  tr[tl] = { ...tr[tu] };
  tr[tu].lo = s.v0; tr[tl].hi = s.v0;
  tr[tu].d0 = tl;   tr[tu].d1 = INVALID_TRAP;
  tr[tl].u0 = tu;   tr[tl].u1 = INVALID_TRAP;
  patchLowerNeighbours(tr, tl, tu);
  wireV0QNodes(tr, qs, tu, tl, segnum, s.v0);
  return tl;
}

function patchLowerNeighbours(tr: TrapT[], tl: number, tu: number): void {
  let d = tr[tl].d0;
  if (isValidTrap(d) && tr[d].u0 === tu) tr[d].u0 = tl;
  if (isValidTrap(d) && tr[d].u1 === tu) tr[d].u1 = tl;
  d = tr[tl].d1;
  if (isValidTrap(d) && tr[d].u0 === tu) tr[d].u0 = tl;
  if (isValidTrap(d) && tr[d].u1 === tu) tr[d].u1 = tl;
}

function wireV0QNodes(
  tr: TrapT[], qs: QNode[],
  tu: number, tl: number,
  segnum: number, yval: SegPoint,
): void {
  const i1 = newQNode(qs); const i2 = newQNode(qs);
  const sk = tr[tu].sink;
  qs[sk].nodetype = T_Y; qs[sk].yval = yval;
  qs[sk].segnum = segnum; qs[sk].left = i2; qs[sk].right = i1;
  qs[i1].nodetype = T_SINK; qs[i1].trnum = tu; qs[i1].parent = sk;
  qs[i2].nodetype = T_SINK; qs[i2].trnum = tl; qs[i2].parent = sk;
  tr[tu].sink = i1; tr[tl].sink = i2;
}

// ─── Insert v1 endpoint ───────────────────────────────────────────────────────

export function insertV1(
  s: SegmentT,
  seg: SegmentT[],
  tr: TrapT[],
  qs: QNode[],
  segnum: number,
): number {
  const tu = locateEndpoint(s.v1, s.v0, s.root1, seg, qs);
  const tl = newTrap(tr);
  tr[tl] = { ...tr[tu] };
  tr[tu].lo = s.v1; tr[tl].hi = s.v1;
  tr[tu].d0 = tl;   tr[tu].d1 = INVALID_TRAP;
  tr[tl].u0 = tu;   tr[tl].u1 = INVALID_TRAP;
  patchLowerNeighbours(tr, tl, tu);
  wireV0QNodes(tr, qs, tu, tl, segnum, s.v1);
  return tu;
}

// ─── Tribot handlers ──────────────────────────────────────────────────────────

function tribotD0(
  tr: TrapT[], seg: SegmentT[], s: SegmentT,
  segnum: number, t: number, tn: number, isSwapped: boolean,
): void {
  const tmp = isSwapped ? seg[segnum].prev : seg[segnum].next;
  if (tmp > 0 && isLeftOf(tmp, seg, s.v0)) {
    tr[tr[t].d0].u0 = t; tr[tn].d0 = TRAP_MAX; tr[tn].d1 = TRAP_MAX;
  } else {
    tr[tr[tn].d0].u1 = tn; tr[t].d0 = TRAP_MAX; tr[t].d1 = TRAP_MAX;
  }
}

function tribotD1(
  tr: TrapT[], seg: SegmentT[], s: SegmentT,
  segnum: number, t: number, tn: number, isSwapped: boolean,
): void {
  const tmp = isSwapped ? seg[segnum].prev : seg[segnum].next;
  if (tmp > 0 && isLeftOf(tmp, seg, s.v0)) {
    tr[tr[t].d1].u0 = t; tr[tn].d0 = TRAP_MAX; tr[tn].d1 = TRAP_MAX;
  } else {
    tr[tr[tn].d1].u1 = tn; tr[t].d0 = TRAP_MAX; tr[t].d1 = TRAP_MAX;
  }
}

// ─── handleD0Only / handleD1Only ─────────────────────────────────────────────

export function handleD0Only(
  s: SegmentT, seg: SegmentT[], tr: TrapT[],
  t: number, tn: number, tlast: number,
  segnum: number, isSwapped: boolean, tribot: boolean,
): void {
  updateTrapezoid(s, seg, tr, t, tn);
  if (atBottom(tr, t, tlast) && tribot) {
    tribotD0(tr, seg, s, segnum, t, tn, isSwapped);
  } else {
    patchUsave(tr, tr[t].d0, t, tn);
    tr[tr[t].d0].u0 = t; tr[tr[t].d0].u1 = tn;
  }
}

export function handleD1Only(
  s: SegmentT, seg: SegmentT[], tr: TrapT[],
  t: number, tn: number, tlast: number,
  segnum: number, isSwapped: boolean, tribot: boolean,
): void {
  updateTrapezoid(s, seg, tr, t, tn);
  if (atBottom(tr, t, tlast) && tribot) {
    tribotD1(tr, seg, s, segnum, t, tn, isSwapped);
  } else {
    patchUsave(tr, tr[t].d1, t, tn);
    tr[tr[t].d1].u0 = t; tr[tr[t].d1].u1 = tn;
  }
}

function atBottom(tr: TrapT[], t: number, tlast: number): boolean {
  return fpEqual(tr[t].lo.y, tr[tlast].lo.y) &&
         fpEqual(tr[t].lo.x, tr[tlast].lo.x);
}

function patchUsave(tr: TrapT[], d: number, t: number, tn: number): void {
  if (isValidTrap(tr[d].u0) && isValidTrap(tr[d].u1)) {
    if (tr[d].u0 === t) { tr[d].usave = tr[d].u1; tr[d].uside = S_LEFT; }
    else { tr[d].usave = tr[d].u0; tr[d].uside = S_RIGHT; }
  }
}

// ─── handleBothD ─────────────────────────────────────────────────────────────

export function handleBothD(
  s: SegmentT, seg: SegmentT[], tr: TrapT[],
  t: number, tn: number, tlast: number, tribot: boolean,
): number {
  const i_d0 = computeID0(s, tr[t].lo);
  updateTrapezoid(s, seg, tr, t, tn);
  return routeBothD(tr, t, tn, tlast, tribot, i_d0);
}

function computeID0(s: SegmentT, lo: SegPoint): boolean {
  if (fpEqual(lo.y, s.v0.y)) return lo.x > s.v0.x;
  const yt = (lo.y - s.v0.y) / (s.v1.y - s.v0.y);
  const tmppt: SegPoint = { y: lo.y, x: s.v0.x + yt * (s.v1.x - s.v0.x) };
  return lessThan(tmppt, lo);
}

function routeBothD(
  tr: TrapT[], t: number, tn: number,
  tlast: number, tribot: boolean, i_d0: boolean,
): number {
  if (atBottom(tr, t, tlast) && tribot) {
    tr[tr[t].d0].u0 = t; tr[tr[t].d0].u1 = TRAP_MAX;
    tr[tr[t].d1].u0 = tn; tr[tr[t].d1].u1 = TRAP_MAX;
    tr[tn].d0 = tr[t].d1; tr[t].d1 = TRAP_MAX; tr[tn].d1 = TRAP_MAX;
    return tr[t].d1;
  } else if (i_d0) {
    tr[tr[t].d0].u0 = t; tr[tr[t].d0].u1 = tn;
    tr[tr[t].d1].u0 = tn; tr[tr[t].d1].u1 = TRAP_MAX;
    tr[t].d1 = TRAP_MAX;
    return tr[t].d0;
  } else {
    tr[tr[t].d0].u0 = t; tr[tr[t].d0].u1 = TRAP_MAX;
    tr[tr[t].d1].u0 = t; tr[tr[t].d1].u1 = tn;
    tr[tn].d0 = tr[t].d1; tr[tn].d1 = TRAP_MAX;
    return tr[t].d1;
  }
}

// ─── swapPt ───────────────────────────────────────────────────────────────────

export function swapSegEndpoints(s: SegmentT): void {
  const tv = s.v0; s.v0 = s.v1; s.v1 = tv;
  const tr = s.root0; s.root0 = s.root1; s.root1 = tr;
}

// ─── add_segment ─────────────────────────────────────────────────────────────

/**
 * Insert one segment into the trapezoidation.
 * @returns 0 on success, -1 when threading met an invalid trapezoid (16.1)
 * @see lib/ortho/trapezoid.c:add_segment
 */
export function addSegment(
  segnum: number,
  seg: SegmentT[],
  tr: TrapT[],
  qs: QNode[],
): number {
  const s = { ...seg[segnum] };
  let isSwapped = false;
  if (greaterThanOrEq(s.v1, s.v0) && !equalTo(s.v1, s.v0)) {
    // C: if (greater_than(s.v1, s.v0)) — swap so v0 is higher
    swapSegEndpoints(s);
    isSwapped = true;
  }

  const ctx: ThreadCtx = { s, seg, tr, qs, segnum, tribot: false, isSwapped };
  const tfirst = firstTrap(ctx);
  const tlast = lastTrap(ctx);
  if (threadSegment(ctx, tfirst, tlast) !== 0) return -1;
  seg[segnum].isInserted = true;
  return 0;
}

/** add_segment locals the threading loop reads (one C stack frame). */
interface ThreadCtx {
  s: SegmentT; seg: SegmentT[]; tr: TrapT[]; qs: QNode[];
  segnum: number; tribot: boolean; isSwapped: boolean;
}

/** add_segment: insert v0 in the tree, or locate it if already present. */
function firstTrap(c: ThreadCtx): number {
  if (!inserted(c.segnum, c.seg, c.isSwapped ? LASTPT : FIRSTPT)) {
    return insertV0(c.s, c.seg, c.tr, c.qs, c.segnum);
  }
  return locateEndpoint(c.s.v0, c.s.v1, c.s.root0, c.seg, c.qs);
}

/**
 * add_segment: insert v1 in the tree, or (v1 already present) get the
 * lowermost intersecting trapezoid and mark the bottom as a triangle.
 */
function lastTrap(c: ThreadCtx): number {
  if (!inserted(c.segnum, c.seg, c.isSwapped ? FIRSTPT : LASTPT)) {
    return insertV1(c.s, c.seg, c.tr, c.qs, c.segnum);
  }
  c.tribot = true;
  return locateEndpoint(c.s.v1, c.s.v0, c.s.root1, c.seg, c.qs);
}

/**
 * Split every trapezoid s crosses, top to bottom, then merge both sides.
 * Returns -1 (after C's stderr line) when a crossed trapezoid has no valid
 * lower neighbour — graphviz 16.1 (3c01aaeb4) returns from add_segment there;
 * 15.x printed "add_segment: error" and broke out of the loop.
 * @see lib/ortho/trapezoid.c:add_segment (threading loop)
 */
function threadSegment(c: ThreadCtx, tfirst: number, tlast: number): number {
  const { s, seg, tr, qs, segnum, tribot, isSwapped } = c;
  let tfirstr = INVALID_TRAP;
  let tlastr = INVALID_TRAP;
  let t = tfirst;

  while (isValidTrap(t) && greaterThanOrEq(tr[t].lo, tr[tlast].lo)) {
    const sk = tr[t].sink;
    const i1 = newQNode(qs); const i2 = newQNode(qs);
    qs[sk].nodetype = T_X; qs[sk].segnum = segnum;
    qs[sk].left = i1; qs[sk].right = i2;
    qs[i1].nodetype = T_SINK; qs[i1].trnum = t; qs[i1].parent = sk;
    const tn = newTrap(tr);
    tr[tn] = { ...tr[t] }; tr[tn].isValid = true;
    tr[t].sink = i1; tr[tn].sink = i2;
    qs[i2].nodetype = T_SINK; qs[i2].trnum = tn; qs[i2].parent = sk;

    if (t === tfirst) tfirstr = tn;
    if (equalTo(tr[t].lo, tr[tlast].lo)) tlastr = tn;

    const tSav = t; const tnSav = tn;
    if (!isValidTrap(tr[t].d0) && !isValidTrap(tr[t].d1)) { // error
      console.error("trapezoid segment construction failed");
      return -1;
    }
    t = advanceT(s, seg, tr, t, tn, tlast, segnum, isSwapped, tribot);
    tr[tSav].rseg = segnum; tr[tnSav].lseg = segnum;
  }

  mergeTrapezoids(segnum, tfirst, tlast, S_LEFT, tr, qs);
  mergeTrapezoids(segnum, tfirstr, tlastr, S_RIGHT, tr, qs);
  return 0;
}

function advanceT(
  s: SegmentT, seg: SegmentT[], tr: TrapT[],
  t: number, tn: number, tlast: number,
  segnum: number, isSwapped: boolean, tribot: boolean,
): number {
  // The "neither below is valid" error case returns from threadSegment first.
  if (isValidTrap(tr[t].d0) && !isValidTrap(tr[t].d1)) {
    handleD0Only(s, seg, tr, t, tn, tlast, segnum, isSwapped, tribot);
    return tr[t].d0;
  } else if (!isValidTrap(tr[t].d0) && isValidTrap(tr[t].d1)) {
    handleD1Only(s, seg, tr, t, tn, tlast, segnum, isSwapped, tribot);
    return tr[t].d1;
  } else {
    return handleBothD(s, seg, tr, t, tn, tlast, tribot);
  }
}

// ─── find_new_roots ───────────────────────────────────────────────────────────

/**
 * Update root pointers for each segment endpoint after a batch of insertions.
 * @see lib/ortho/trapezoid.c:find_new_roots
 */
export function findNewRoots(
  segnum: number,
  seg: SegmentT[],
  tr: TrapT[],
  qs: QNode[],
): void {
  const s = seg[segnum];
  if (s.isInserted) return;
  s.root0 = tr[locateEndpoint(s.v0, s.v1, s.root0, seg, qs)].sink;
  s.root1 = tr[locateEndpoint(s.v1, s.v0, s.root1, seg, qs)].sink;
}
