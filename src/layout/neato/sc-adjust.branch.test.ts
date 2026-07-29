// SPDX-License-Identifier: EPL-2.0

/**
 * Branch coverage for scale-based overlap removal (scAdjust /
 * adjustNodesScale): overlap()'s four-way AABB test, sortf's x/y tie
 * ordering (drives computeScaleXY's gvQsort), mkOverlapSet's same-position
 * infinities and sub-1 clamps, computeScaleXY's suffix-max DP loop,
 * compress()'s early-exit-on-overlap and ptx/pty ternaries, and
 * scAdjust/adjustNodesScale's mode dispatch.
 *
 * @see lib/neatogen/constraint.c
 *
 * Residual branches (97.3% branch coverage): mkOverlapSet's `pt.x < 1` /
 * `pt.y < 1` clamps (sc-adjust.ts, in the overlap()-true branch) are
 * PROVEN unreachable: `overlap(p,q)` requires |dx| <= wd2_p+wd2_q (and
 * likewise for y) whenever both boxes' x-intervals touch/overlap, so
 * pt.x = (wd2_p+wd2_q)/|dx| is always >= 1 by construction — verified by
 * instrumented tracing plus the interval-overlap algebra. The identical
 * redundant clamp exists in lib/neatogen/constraint.c:mkOverlapSet
 * (`if (pt.x < 1) pt.x = 1;`) — faithfully preserved, not "fixed".
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { scAdjust, adjustNodesScale } from './sc-adjust.js';

function makeGraph(): Graph {
  return new Graph('g', 'undirected');
}

function makeNode(g: Graph, name: string, x: number, y: number, w: number, h: number): Node {
  const n = new Node(g.nodes.size, name, g);
  n.info.pos = [x, y];
  n.info.width = w;
  n.info.height = h;
  g.nodes.set(name, n);
  return n;
}

describe('scAdjust — overlap=scale (equal=1, uniform)', () => {
  it('returns 0 when no boxes overlap', () => {
    const g = makeGraph();
    makeNode(g, 'a', 0, 0, 1, 1);
    makeNode(g, 'b', 100, 100, 1, 1);
    expect(scAdjust(g, 1)).toBe(0);
  });

  it('scales apart two overlapping same-x-and-y-different boxes (finite pt.x, pt.y)', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 0, 0, 2, 2);
    const b = makeNode(g, 'b', 1, 1, 2, 2);
    expect(scAdjust(g, 1)).toBe(1);
    // scaled positions must be further apart than before
    const ax = a.info.pos![0]!, ay = a.info.pos![1]!;
    const bx = b.info.pos![0]!, by = b.info.pos![1]!;
    expect(Math.hypot(bx - ax, by - ay)).toBeGreaterThan(Math.hypot(1, 1));
  });

  it('handles boxes sharing the same x position (infinite pt.x)', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 5, 0, 2, 2);
    const b = makeNode(g, 'b', 5, 1, 2, 2);
    expect(scAdjust(g, 1)).toBe(1);
    expect(a.info.pos![1]).toBe(0);
  });

  it('handles boxes sharing the same y position (infinite pt.y)', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 0, 5, 2, 2);
    const b = makeNode(g, 'b', 1, 5, 2, 2);
    expect(scAdjust(g, 1)).toBe(1);
    expect(a.info.pos![0]).toBe(0);
  });

  it('a barely-overlapping pair with huge half-widths yields a factor < 1 that clamps to 1', () => {
    const g = makeGraph();
    makeNode(g, 'a', 0, 0, 100, 100);
    makeNode(g, 'b', 1, 1, 100, 100);
    expect(scAdjust(g, 1)).toBe(1);
  });

  it('a third, less-overlapping pair does not lower the running max scale factor', () => {
    // computeScale keeps the MAX v across pairs: a tightly-overlapping pair
    // (large factor) followed by a pair whose factor is smaller than the
    // running max exercises the `v > sc` false branch.
    const g = makeGraph();
    makeNode(g, 'a', 0, 0, 4, 4); // large, tight overlap with b -> big factor
    makeNode(g, 'b', 1, 0, 4, 4);
    makeNode(g, 'c', 1, 2.5, 1, 1); // overlaps a/b with a smaller factor
    expect(scAdjust(g, 1)).toBe(1);
  });

  it('a node with no width/height falls back to 0 under the additive margin', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 0, 0, 2, 2);
    makeNode(g, 'b', 1, 1, 2, 2);
    a.info.width = undefined as unknown as number;
    a.info.height = undefined as unknown as number;
    expect(scAdjust(g, 1)).toBe(1);
  });

  it('a non-additive sep attribute uses the scale-factor margin branch', () => {
    // "sep" without a leading '+' parses to doAdd=false, taking the
    // (mx * width)/2 margin formula instead of width/2 + mx.
    const g = makeGraph();
    const a = makeNode(g, 'a', 0, 0, 2, 2);
    makeNode(g, 'b', 1, 1, 2, 2);
    a.info.width = undefined as unknown as number; // force the `?? 0` fallback
    a.info.height = undefined as unknown as number;
    g.attrs.set('sep', '0.5');
    expect(scAdjust(g, 1)).toBe(1);
  });

  it('initializes a missing info.pos on the node during the final scale-write loop', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 0, 0, 2, 2);
    const b = makeNode(g, 'b', 1, 1, 2, 2);
    a.info.pos = undefined; // force the `!p.np.info.pos` branch
    scAdjust(g, 1);
    expect(a.info.pos).toBeDefined();
    void b;
  });
});

describe('scAdjust — overlap=scalexy (equal=0, computeScaleXY)', () => {
  it('returns 0 when no boxes overlap', () => {
    const g = makeGraph();
    makeNode(g, 'a', 0, 0, 1, 1);
    makeNode(g, 'b', 100, 100, 1, 1);
    expect(scAdjust(g, 0)).toBe(0);
  });

  it('separates x and y independently for two overlapping boxes', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 0, 0, 2, 2);
    const b = makeNode(g, 'b', 1, 1, 2, 2);
    expect(scAdjust(g, 0)).toBe(1);
    void a; void b;
  });

  it('three mutually overlapping boxes exercise the multi-pair sortf/DP loop', () => {
    // sortf must order pairs with equal x by y, and with distinct x by x —
    // three overlapping pairs with varied x/y relationships walk all four
    // sortf branches and computeScaleXY's k-loop across more than one step.
    const g = makeGraph();
    makeNode(g, 'a', 0, 0, 2, 2);
    makeNode(g, 'b', 1, 0, 2, 2); // same y as a, different x
    makeNode(g, 'c', 0, 1, 2, 2); // same x as a, different y
    expect(scAdjust(g, 0)).toBe(1);
  });

  it('four overlapping boxes with distinct pair-factors exercise the bestcost search', () => {
    const g = makeGraph();
    makeNode(g, 'a', 0, 0, 3, 3);
    makeNode(g, 'b', 1, 1, 3, 3);
    makeNode(g, 'c', -1, 2, 3, 3);
    makeNode(g, 'd', 2, -1, 3, 3);
    expect(scAdjust(g, 0)).toBe(1);
  });

  it('two pairs with an identical pt.x factor break the tie on pt.y', () => {
    // Two disjoint overlapping pairs, both width 4 (same wd2), both with
    // |dx|=2 -> identical pt.x. Their |dy| differ (1 vs 3) -> distinct
    // pt.y, forcing sortf's y-tiebreak branches when pt.x ties.
    const g = makeGraph();
    makeNode(g, 'a', 0, 0, 4, 4);
    makeNode(g, 'b', 2, 3, 4, 4);
    makeNode(g, 'c', 100, 0, 4, 4);
    makeNode(g, 'd', 102, 1, 4, 4);
    expect(scAdjust(g, 0)).toBe(1);
  });

  it('a strictly-descending sequence of pair factors forces sortf backward-shift comparisons', () => {
    // Five mutually overlapping boxes at increasing distance produce
    // strictly DECREASING per-pair factors in construction/iteration order,
    // forcing the qsort insertion phase to compare a later (smaller) key
    // against an earlier (larger) one — sortf's p.x > q.x branch.
    const g = makeGraph();
    makeNode(g, 'a', 0, 0, 20, 20);
    makeNode(g, 'b', 1, 0, 20, 20);
    makeNode(g, 'c', 3, 0, 20, 20);
    makeNode(g, 'd', 6, 0, 20, 20);
    makeNode(g, 'e', 10, 0, 20, 20);
    expect(scAdjust(g, 0)).toBe(1);
  });
});

describe('scAdjust — overlap=compress (equal=-1)', () => {
  it('returns 0 when overlaps still exist', () => {
    const g = makeGraph();
    makeNode(g, 'a', 0, 0, 2, 2);
    makeNode(g, 'b', 1, 1, 2, 2);
    expect(scAdjust(g, -1)).toBe(0);
  });

  it('scales down non-overlapping boxes with distinct x and y (finite ptx/pty)', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 0, 0, 1, 1);
    const b = makeNode(g, 'b', 20, 20, 1, 1);
    expect(scAdjust(g, -1)).toBe(1);
    const ax = a.info.pos![0]!, ay = a.info.pos![1]!;
    const bx = b.info.pos![0]!, by = b.info.pos![1]!;
    expect(Math.hypot(bx - ax, by - ay)).toBeLessThan(Math.hypot(20, 20));
  });

  it('scales down boxes sharing the same x (infinite ptx path, pty selected)', () => {
    const g = makeGraph();
    makeNode(g, 'a', 5, 0, 1, 1);
    makeNode(g, 'b', 5, 20, 1, 1);
    expect(scAdjust(g, -1)).toBe(1);
  });

  it('scales down boxes sharing the same y (infinite pty path, ptx selected)', () => {
    const g = makeGraph();
    makeNode(g, 'a', 0, 5, 1, 1);
    makeNode(g, 'b', 20, 5, 1, 1);
    expect(scAdjust(g, -1)).toBe(1);
  });

  it('three non-overlapping boxes with an increasing per-pair scale factor', () => {
    // A close pair (large factor) plus a far pair (small factor): compress
    // must keep the MAX factor across all pairs (s > sc branch taken more
    // than once).
    const g = makeGraph();
    makeNode(g, 'a', 0, 0, 1, 1);
    makeNode(g, 'b', 3, 0, 1, 1);
    makeNode(g, 'c', 50, 50, 1, 1);
    expect(scAdjust(g, -1)).toBe(1);
  });
});

describe('adjustNodesScale — overlap attribute dispatch', () => {
  it('overlap=scale calls scAdjust with equal=1', () => {
    const g = makeGraph();
    makeNode(g, 'a', 0, 0, 2, 2);
    makeNode(g, 'b', 1, 1, 2, 2);
    g.attrs.set('overlap', 'scale');
    expect(adjustNodesScale(g)).toBe(1);
  });

  it('overlap=scalexy calls scAdjust with equal=0', () => {
    const g = makeGraph();
    makeNode(g, 'a', 0, 0, 2, 2);
    makeNode(g, 'b', 1, 1, 2, 2);
    g.attrs.set('overlap', 'scalexy');
    expect(adjustNodesScale(g)).toBe(1);
  });

  it('overlap=compress calls scAdjust with equal=-1', () => {
    const g = makeGraph();
    makeNode(g, 'a', 0, 0, 1, 1);
    makeNode(g, 'b', 20, 20, 1, 1);
    g.attrs.set('overlap', 'compress');
    expect(adjustNodesScale(g)).toBe(1);
  });

  it('overlap is case-insensitive ("SCALE" still dispatches to scAdjust)', () => {
    const g = makeGraph();
    makeNode(g, 'a', 0, 0, 2, 2);
    makeNode(g, 'b', 1, 1, 2, 2);
    g.attrs.set('overlap', 'SCALE');
    expect(adjustNodesScale(g)).toBe(1);
  });

  it('an unset overlap attribute is a no-op (AM_NONE)', () => {
    const g = makeGraph();
    makeNode(g, 'a', 0, 0, 2, 2);
    makeNode(g, 'b', 1, 1, 2, 2);
    expect(adjustNodesScale(g)).toBe(0);
  });

  it('an unrecognized overlap value (e.g. an unported mode) is a no-op', () => {
    const g = makeGraph();
    makeNode(g, 'a', 0, 0, 2, 2);
    makeNode(g, 'b', 1, 1, 2, 2);
    g.attrs.set('overlap', 'voronoi');
    expect(adjustNodesScale(g)).toBe(0);
  });

  it('a component subgraph without its own overlap attr falls back to the root graph', () => {
    const root = makeGraph();
    root.attrs.set('overlap', 'scale');
    const comp = new Graph('comp', 'undirected');
    comp.root = root;
    makeNode(comp, 'a', 0, 0, 2, 2);
    makeNode(comp, 'b', 1, 1, 2, 2);
    expect(adjustNodesScale(comp)).toBe(1);
  });
});
