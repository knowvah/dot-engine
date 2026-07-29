// SPDX-License-Identifier: EPL-2.0

/**
 * T4b — branch coverage for layout/dot/edge-route-routing.ts.
 *
 * Direct unit tests against buildRankCorridor / normalArrowLen /
 * nodeInsideFn / clipToNodes / routeWithRank / routeSimple, using a minimal
 * hand-built tail/head NodeBox pair and RankEdgeInfo (mirroring the
 * makeRankBox doc-comment's own worked example: tailCy=162, headCy=90,
 * ht1=ht2=18). The rank-corridor / spline-fit outputs pass through
 * computeSpline + bezierClipNode, which are pinned via toBeCloseTo against
 * values captured from a scratch run of the actual (unmodified)
 * implementation rather than hand-derived, since the arithmetic chain
 * (polygon routing + De Casteljau clipping) is not hand-tractable; the
 * pure-geometry inputs (corridor boxes, arrow length, inside-predicates)
 * are hand-verified.
 *
 * @see lib/dotgen/dotsplines.c:make_regular_edge
 * @see lib/common/splines.c:clip_and_install
 */

import { describe, it, expect } from 'vitest';
import type { NodeBox } from './edge-route-geom.js';
import { computeSpline } from './edge-route-poly.js';
import type { RankEdgeInfo, PortRoute } from './edge-route-routing.js';
import {
  buildRankCorridor, normalArrowLen, nodeInsideFn, clipToNodes, routeWithRank,
  routeSimple,
} from './edge-route-routing.js';

const tailBox: NodeBox = { center: { x: 50, y: 162 }, lw: 18, rw: 18, ht: 36 };
const headBox: NodeBox = { center: { x: 50, y: 90 }, lw: 18, rw: 18, ht: 36 };
const rank: RankEdgeInfo = {
  leftBound: 0, rightBound: 100, tailHt1: 18, tailHt2: 18, headHt1: 18, headHt2: 18,
};
const expectedBoxes = [
  { ll: { x: 30, y: 144 }, ur: { x: 70, y: 162 } },
  { ll: { x: 0, y: 108 }, ur: { x: 100, y: 144 } },
  { ll: { x: 30, y: 90 }, ur: { x: 70, y: 108 } },
];

describe('buildRankCorridor', () => {
  it('defaults both endpoints to the node-center offset when ports is omitted', () => {
    const r = buildRankCorridor(tailBox, headBox, rank);
    expect(r.startPt).toEqual({ x: 50, y: 161 });
    expect(r.endPt).toEqual({ x: 50, y: 91 });
    expect(r.boxes).toEqual(expectedBoxes);
  });
  it('uses ports.tailP when present and defaults headP when null', () => {
    const r = buildRankCorridor(tailBox, headBox, rank,
      { tailP: { x: 10, y: 150 }, headP: null });
    expect(r.startPt).toEqual({ x: 10, y: 150 });
    expect(r.endPt).toEqual({ x: 50, y: 91 });
  });
  it('uses ports.headP when present and defaults tailP when null', () => {
    const r = buildRankCorridor(tailBox, headBox, rank,
      { tailP: null, headP: { x: 60, y: 95 } });
    expect(r.startPt).toEqual({ x: 50, y: 161 });
    expect(r.endPt).toEqual({ x: 60, y: 95 });
  });
});

describe('normalArrowLen', () => {
  it('uses DEFAULT_NODEPENWIDTH (1.0) when no penwidth is given', () => {
    expect(normalArrowLen()).toBeCloseTo(11.513544292886936, 9);
  });
  it('scales with an explicit penwidth', () => {
    expect(normalArrowLen(2)).toBeCloseTo(13.027088585773871, 9);
  });
});

describe('nodeInsideFn', () => {
  it('box shape: inside/outside the half-width+penwidth boundary', () => {
    const inside = nodeInsideFn({ ...tailBox, isEllipse: false });
    expect(inside(5, 0)).toBe(true);
    expect(inside(50, 0)).toBe(false);
  });
  it('ellipse shape: inside/outside the ellipse boundary', () => {
    const inside = nodeInsideFn({ ...tailBox, isEllipse: true });
    expect(inside(5, 0)).toBe(true);
    expect(inside(50, 0)).toBe(false);
  });
  it('honors an explicit penwidth over the default (box.penwidth ?? DEFAULT)', () => {
    // halfW=18, penwidth=3 -> boundary at 19.5; 18.7 is only inside with
    // the wider (explicit) penwidth, not the 18.5 default boundary.
    const withPenwidth = nodeInsideFn({ ...tailBox, penwidth: 3 });
    const withDefault = nodeInsideFn({ ...tailBox });
    expect(withPenwidth(18.7, 0)).toBe(true);
    expect(withDefault(18.7, 0)).toBe(false);
  });
});

describe('clipToNodes', () => {
  const corridor = buildRankCorridor(tailBox, headBox, rank);
  const bezier = computeSpline(corridor.boxes, corridor.startPt, corridor.endPt);

  it('clips both ends by default', () => {
    const r = clipToNodes(bezier, tailBox, headBox);
    expect(r.clipped[0]).toEqual({ x: 50, y: 143.69662499427795 });
    expect(r.arrowTip).toEqual({ x: 50, y: 108.10433368267388 });
    expect(r.arrowDir).toEqual({ x: 0, y: 1 });
  });
  it('skips the tail clip when clip.tail is false', () => {
    const r = clipToNodes(bezier, tailBox, headBox, undefined, { tail: false, head: true });
    expect(r.clipped[0]).toEqual({ x: 50, y: 161 });
  });
  it('skips the head clip when clip.head is false', () => {
    const r = clipToNodes(bezier, tailBox, headBox, undefined, { tail: true, head: false });
    expect(r.arrowTip).toEqual({ x: 50, y: 91 });
  });
});

describe('routeWithRank', () => {
  it('routes without a port using the default penwidth and CLIP_BOTH', () => {
    const r = routeWithRank(tailBox, headBox, rank);
    expect(r.bezierPts[0]).toEqual({ x: 50, y: 143.69662499427795 });
    expect(r.arrowTip).toEqual({ x: 50, y: 108.10433368267388 });
  });
  it('routes through explicit port points and clip flags', () => {
    const port: PortRoute = {
      tailP: { x: 45, y: 155 }, headP: { x: 55, y: 95 },
      clipTail: false, clipHead: true,
    };
    const r = routeWithRank(tailBox, headBox, rank, undefined, port);
    expect(r.bezierPts[0]).toEqual({ x: 45, y: 155 });
    expect(r.arrowTip.x).toBeCloseTo(52.78067588806152, 6);
    expect(r.arrowTip.y).toBeCloseTo(108.31594467163086, 6);
  });
});

describe('routeSimple', () => {
  it('clips both node boxes along the straight tail-head direction', () => {
    const r = routeSimple(tailBox, headBox, (a, b) => [a, a, b, b]);
    expect(r.bezierPts).toEqual([
      { x: 50, y: 144 }, { x: 50, y: 144 }, { x: 50, y: 118 }, { x: 50, y: 118 },
    ]);
    expect(r.arrowTip).toEqual({ x: 50, y: 108 });
    expect(r.arrowDir.x).toBeCloseTo(0, 10);
    expect(r.arrowDir.y).toBe(1);
  });
});
