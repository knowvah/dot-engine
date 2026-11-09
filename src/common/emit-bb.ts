// SPDX-License-Identifier: EPL-2.0

/**
 * The bounding boxes gvRenderJobs computes before every render: each node's
 * `ND_bb` and each out-edge's `spl->bb`, which `edge_in_box` tests against the
 * page clip. The node half is not stored: `nodeInBox` derives `ND_bb` from the
 * same fields at the test, and nothing between here and that test moves a node.
 *
 * @see lib/common/emit.c:4076 bezier_bb, :4101 init_splines_bb, :4157 init_bb
 * @see lib/common/arrows.c:1107 arrow_bb
 */

import type { Bezier, Box, Point, Spline } from '../model/geom.js';
import type { Graph } from '../model/graph.js';
import { buildOutEdgeIndex } from '../model/node.js';
import { ARROW_LENGTH, EPSILON } from './arrows-constants.js';
import { libmHypot } from './libm-hypot.js';

/** C `fmax`: a NaN operand yields the other operand. */
function fmax(a: number, b: number): number {
  if (Number.isNaN(a)) return b;
  if (Number.isNaN(b)) return a;
  return a > b ? a : b;
}

/** C `fmin`: a NaN operand yields the other operand. */
function fmin(a: number, b: number): number {
  if (Number.isNaN(a)) return b;
  if (Number.isNaN(b)) return a;
  return a < b ? a : b;
}

/**
 * The box of an arrowhead of length `ARROW_LENGTH * arrowsize` at `p`, aimed
 * along `u - p`: the four corners of the rotated head's bounding square.
 * @see lib/common/arrows.c:1107 arrow_bb
 */
export function arrowBb(p: Point, u0: Point, arrowsize: number): Box {
  const u = { x: u0.x - p.x, y: u0.y - p.y };
  // the EPSILONs are to keep this stable as length of u approaches 0.0
  const s = (ARROW_LENGTH * arrowsize) / (libmHypot(u.x, u.y) + EPSILON);
  u.x += u.x >= 0.0 ? EPSILON : -EPSILON;
  u.y += u.y >= 0.0 ? EPSILON : -EPSILON;
  u.x *= s;
  u.y *= s;
  const ux2 = u.x / 2;
  const uy2 = u.y / 2;
  const ax = p.x - uy2;
  const ay = p.y - ux2;
  const bx = p.x + uy2;
  const by = p.y + ux2;
  const cx = ax + u.x;
  const cy = ay + u.y;
  const dx = bx + u.x;
  const dy = by + u.y;
  return {
    ur: { x: fmax(ax, fmax(bx, fmax(cx, dx))), y: fmax(ay, fmax(by, fmax(cy, dy))) },
    ll: { x: fmin(ax, fmin(bx, fmin(cx, dx))), y: fmin(ay, fmin(by, fmin(cy, dy))) },
  };
}

/** expandbp: grow `bb` to hold `p`. @see lib/common/geom.h:expandbp */
function expandbp(bb: Box, p: Point): void {
  bb.ll.x = fmin(bb.ll.x, p.x);
  bb.ll.y = fmin(bb.ll.y, p.y);
  bb.ur.x = fmax(bb.ur.x, p.x);
  bb.ur.y = fmax(bb.ur.y, p.y);
}

/** EXPANDBB: grow `bb` to hold `b`. @see lib/common/geom.h:EXPANDBB */
function expandBb(bb: Box, b: Box): void {
  bb.ll.x = fmin(bb.ll.x, b.ll.x);
  bb.ll.y = fmin(bb.ll.y, b.ll.y);
  bb.ur.x = fmax(bb.ur.x, b.ur.x);
  bb.ur.y = fmax(bb.ur.y, b.ur.y);
}

/**
 * A bezier's box: its first point, then per segment the midpoint of the two
 * control points and the segment's end point.
 * @see lib/common/emit.c:4076 bezier_bb
 */
export function bezierBb(bz: Bezier): Box {
  const p0 = bz.list[0]!;
  const bb: Box = { ll: { x: p0.x, y: p0.y }, ur: { x: p0.x, y: p0.y } };
  for (let i = 1; i < bz.size;) {
    // take mid-point between two control points for bb calculation
    const p1 = bz.list[i++]!;
    const p2 = bz.list[i++]!;
    expandbp(bb, { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
    expandbp(bb, bz.list[i++]!);
  }
  return bb;
}

/**
 * `spl->bb`: the union of every bezier's box and, for each flagged end, the
 * box of a unit-size arrowhead there.
 * @see lib/common/emit.c:4101 init_splines_bb
 */
export function initSplinesBb(spl: Spline): void {
  let bz = spl.list[0]!;
  const bb = bezierBb(bz);
  for (let i = 0; i < spl.size; i++) {
    if (i > 0) {
      bz = spl.list[i]!;
      expandBb(bb, bezierBb(bz));
    }
    if (bz.sflag) expandBb(bb, arrowBb(bz.sp, bz.list[0]!, 1));
    if (bz.eflag) expandBb(bb, arrowBb(bz.ep, bz.list[bz.size - 1]!, 1));
  }
  spl.bb = bb;
}

/**
 * Before each render: `spl->bb` of every out-edge of every node of `g`, the
 * graph being rendered (a subgraph render leaves other edges' boxes alone).
 * @see lib/common/emit.c:4127 init_bb_edge, :4136 init_bb_node, :4157 init_bb
 */
export function initBb(g: Graph): void {
  const out = buildOutEdgeIndex(g);
  for (const n of g.nodes.values()) {
    for (const e of out.get(n) ?? []) {
      const spl = e.info.spl;
      if (spl) initSplinesBb(spl);
    }
  }
}
