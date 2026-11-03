// SPDX-License-Identifier: EPL-2.0

/**
 * Sweep-line constraint generation for VPSC overlap removal.
 *
 * @see lib/vpsc/generate-constraints.h
 * @see lib/vpsc/generate-constraints.cpp
 */

import { Variable } from "./Variable.js";
import { Constraint } from "./Constraint.js";
import { Rectangle } from "./Solver.js";
import { EvType, NodeSet, SweepNode, SweepEvent } from "./sweepTypes.js";
import { libcxxSort } from "../util/libcxx-sort.js";

/**
 * `seq` is the `make_shared<Node>` order: the rectangle index of the pass.
 * @see lib/vpsc/generate-constraints.cpp: Node::Node
 */
export function makeNode(v: Variable, r: Rectangle, pos: number, seq: number): SweepNode {
  return {
    v, r, pos, seq,
    firstAbove: null, firstBelow: null,
    leftNeighbours: [], rightNeighbours: [],
  };
}

/** @see lib/vpsc/generate-constraints.cpp: compare_events */
export function compareEvents(ea: SweepEvent, eb: SweepEvent): boolean {
  if (ea.node.r === eb.node.r) {
    return ea.type === EvType.Open && eb.type !== EvType.Open;
  }
  if (ea.pos > eb.pos) return false;
  if (ea.pos < eb.pos) return true;
  return false;
}

/**
 * C++ ends with `u < v` on `Node*`. Addresses cannot be reproduced and vary run
 * to run, so a position tie goes by creation order (part-8 AD-8).
 * @see lib/vpsc/generate-constraints.cpp: CmpNodePos::operator()
 */
export function nodePosLt(a: SweepNode, b: SweepNode): boolean {
  if (a.pos < b.pos) return true;
  if (b.pos < a.pos) return false;
  return a.seq < b.seq;
}

/** @see lib/vpsc/generate-constraints.cpp: NodeSet::insert (std::set, so no duplicates) */
export function scanlineInsert(sl: NodeSet, node: SweepNode): void {
  let lo = 0;
  let hi = sl.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nodePosLt(sl[mid]!, node)) lo = mid + 1;
    else hi = mid;
  }
  if (sl[lo] !== node) sl.splice(lo, 0, node);
}

export function scanlineRemove(sl: NodeSet, node: SweepNode): void {
  const i = sl.indexOf(node);
  if (i !== -1) sl.splice(i, 1);
}

/** @see lib/vpsc/generate-constraints.cpp: getLeftNeighbours */
export function getLeftNeighbours(sl: NodeSet, v: SweepNode): NodeSet {
  const result: NodeSet = [];
  const idx = sl.indexOf(v);
  for (let i = idx - 1; i >= 0; i--) {
    const u = sl[i]!;
    if (u.r.overlapX(v.r) <= 0) { scanlineInsert(result, u); return result; }
    if (u.r.overlapX(v.r) <= u.r.overlapY(v.r)) scanlineInsert(result, u);
  }
  return result;
}

/** @see lib/vpsc/generate-constraints.cpp: getRightNeighbours */
export function getRightNeighbours(sl: NodeSet, v: SweepNode): NodeSet {
  const result: NodeSet = [];
  const idx = sl.indexOf(v);
  for (let i = idx + 1; i < sl.length; i++) {
    const u = sl[i]!;
    if (u.r.overlapX(v.r) <= 0) { scanlineInsert(result, u); return result; }
    if (u.r.overlapX(v.r) <= u.r.overlapY(v.r)) scanlineInsert(result, u);
  }
  return result;
}

/** @see lib/vpsc/generate-constraints.cpp: Node::setNeighbours */
export function xOpenNeighbour(sl: NodeSet, v: SweepNode): void {
  const left = getLeftNeighbours(sl, v);
  const right = getRightNeighbours(sl, v);
  v.leftNeighbours = left;
  v.rightNeighbours = right;
  for (const n of left) scanlineInsert(n.rightNeighbours, v);
  for (const n of right) scanlineInsert(n.leftNeighbours, v);
}

export function openLinkChain(sl: NodeSet, v: SweepNode): void {
  const idx = sl.indexOf(v);
  if (idx > 0) { const u = sl[idx - 1]!; v.firstAbove = u; u.firstBelow = v; }
  if (idx < sl.length - 1) { const u = sl[idx + 1]!; v.firstBelow = u; u.firstAbove = v; }
}

export function xCloseLeft(v: SweepNode, cs: Constraint[]): void {
  for (const u of v.leftNeighbours) {
    cs.push(new Constraint(u.v, v.v, (v.r.width() + u.r.width()) / 2.0));
    scanlineRemove(u.rightNeighbours, v);
  }
}

export function xCloseRight(v: SweepNode, cs: Constraint[]): void {
  for (const u of v.rightNeighbours) {
    cs.push(new Constraint(v.v, u.v, (v.r.width() + u.r.width()) / 2.0));
    scanlineRemove(u.leftNeighbours, v);
  }
}

export function xCloseNeighbour(v: SweepNode, cs: Constraint[]): void {
  xCloseLeft(v, cs);
  xCloseRight(v, cs);
}

export function xCloseSimple(v: SweepNode, cs: Constraint[]): void {
  const l = v.firstAbove;
  const r = v.firstBelow;
  if (l !== null) {
    cs.push(new Constraint(l.v, v.v, (v.r.width() + l.r.width()) / 2.0));
    l.firstBelow = v.firstBelow;
  }
  if (r !== null) {
    cs.push(new Constraint(v.v, r.v, (v.r.width() + r.r.width()) / 2.0));
    r.firstAbove = v.firstAbove;
  }
}

export function yClose(v: SweepNode, cs: Constraint[]): void {
  const l = v.firstAbove;
  const r = v.firstBelow;
  if (l !== null) {
    cs.push(new Constraint(l.v, v.v, (v.r.height() + l.r.height()) / 2.0));
    l.firstBelow = v.firstBelow;
  }
  if (r !== null) {
    cs.push(new Constraint(v.v, r.v, (v.r.height() + r.r.height()) / 2.0));
    r.firstAbove = v.firstAbove;
  }
}

export function buildXEvents(rects: Rectangle[], vs: Variable[]): SweepEvent[] {
  const events: SweepEvent[] = [];
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]!;
    vs[i]!.desiredPosition = r.getCentreX();
    const node = makeNode(vs[i]!, r, r.getCentreX(), i);
    events.push({ type: EvType.Open, node, pos: r.getMinY() });
    events.push({ type: EvType.Close, node, pos: r.getMaxY() });
  }
  return events;
}

export function buildYEvents(rects: Rectangle[], vs: Variable[]): SweepEvent[] {
  const events: SweepEvent[] = [];
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]!;
    vs[i]!.desiredPosition = r.getCentreY();
    const node = makeNode(vs[i]!, r, r.getCentreY(), i);
    events.push({ type: EvType.Open, node, pos: r.getMinX() });
    events.push({ type: EvType.Close, node, pos: r.getMaxX() });
  }
  return events;
}

/**
 * Prepares constraints to apply VPSC horizontally (X axis).
 * @see lib/vpsc/generate-constraints.cpp: generateXConstraints
 */
export function generateXConstraints(
  rects: Rectangle[],
  vs: Variable[],
  useNeighbourLists: boolean
): Constraint[] {
  const events = buildXEvents(rects, vs);
  libcxxSort(events, compareEvents);
  const sl: NodeSet = [];
  const cs: Constraint[] = [];
  for (const e of events) {
    const v = e.node;
    if (e.type === EvType.Open) {
      scanlineInsert(sl, v);
      if (useNeighbourLists) xOpenNeighbour(sl, v);
      else openLinkChain(sl, v);
    } else {
      if (useNeighbourLists) xCloseNeighbour(v, cs);
      else xCloseSimple(v, cs);
      scanlineRemove(sl, v);
    }
  }
  return cs;
}

/**
 * Prepares constraints to apply VPSC vertically (Y axis).
 * @see lib/vpsc/generate-constraints.cpp: generateYConstraints
 */
export function generateYConstraints(
  rects: Rectangle[],
  vs: Variable[]
): Constraint[] {
  const events = buildYEvents(rects, vs);
  libcxxSort(events, compareEvents);
  const sl: NodeSet = [];
  const cs: Constraint[] = [];
  for (const e of events) {
    const v = e.node;
    if (e.type === EvType.Open) {
      scanlineInsert(sl, v);
      openLinkChain(sl, v);
    } else {
      yClose(v, cs);
      scanlineRemove(sl, v);
    }
  }
  return cs;
}
