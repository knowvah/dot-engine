// SPDX-License-Identifier: EPL-2.0
/**
 * Compound-edge arrow clip distance test (AD-4): arrowEndClip's
 * `DIST(ps[endp], ps[endp + 3]) < elen` is sqrt(fma(dx, dx, dy*dy)) in the 16.1
 * oracle (libgvc `_arrowEndClip`: fsub, fmul, fmadd, fsqrt), not Math.hypot.
 * @see lib/common/arrows.c:arrowEndClip
 */
import { describe, it, expect } from 'vitest';
import type { Bezier, Box, Point } from '../../model/geom.js';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { makeNodeInfo } from '../../model/nodeInfo.js';
import { clipHeadNormal, splineIntersectf } from './compound.js';
import { arrowClipLength, distFused } from './edge-route-clip.js';

const BB: Box = { ll: { x: 0, y: 0 }, ur: { x: 100, y: 100 } };
// Second segment found by search: after splineIntersectf its endpoints are
// d1 = Math.hypot = elen exactly while distFused = elen - 1ulp.
const SEG2: Point[] = [
  { x: -11.458263644826008, y: 40.78825318546369 },
  { x: 8.541736355173992, y: 36.913364546182926 },
  { x: 48.541736355173995, y: 42.74188747019937 },
  { x: 150, y: 60 },
];
const SEG1: Point[] = [
  { x: -60, y: 40 }, { x: -40, y: 40 }, { x: -20, y: 40 }, SEG2[0] as Point,
];

function makeEdge(): Edge {
  const g = new Graph('g', 'directed');
  const tail = new Node(0, 'tail', g);
  tail.info = makeNodeInfo();
  const head = new Node(1, 'head', g);
  head.info = makeNodeInfo();
  return new Edge(tail, head, '');
}

describe('compound arrowEndClipIdx distance form', () => {
  it('uses the fused DIST (not Math.hypot) for the back-up test', () => {
    const e = makeEdge();
    const elen = arrowClipLength('normal', 1, 1);
    const probe = SEG2.map(p => ({ ...p }));
    expect(splineIntersectf(probe, BB)).toBe(true);
    const a = probe[0] as Point;
    const b = probe[3] as Point;
    expect(Math.hypot(a.x - b.x, a.y - b.y) < elen).toBe(false);
    expect(distFused(a, b) < elen).toBe(true);

    const list = [...SEG1, ...SEG2.slice(1)].map(p => ({ ...p }));
    const bez: Bezier = { list, size: 7, sflag: 0, eflag: 1, sp: { ...list[0] as Point }, ep: { ...list[6] as Point } };
    const state = { e, bez, size: 7, endi: 0, starti: 0 };
    clipHeadNormal(state, BB);
    // back-up fired: endp 3 -> 0, then endi = endp + 3
    expect(state.endi).toBe(3);
  });
});
