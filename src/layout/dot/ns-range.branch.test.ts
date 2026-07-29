// SPDX-License-Identifier: EPL-2.0

/**
 * T4b — branch coverage for layout/dot/ns-range.ts.
 *
 * File starts at ~90% branch coverage from the full pipeline; this targets
 * the missing outcomes: xVal's cutvalue/low/lim `?? 0` defaults, the
 * cutvalDescend/rangeDescend "no edge list at all" guard (a leaf node with
 * neither tree_out nor tree_in), and dfsRange's early-return low/lim
 * defaults.
 *
 * Residue: dfsRange's final `return (v.info.lim ?? 0) + 1` default arm
 * (L227) appears structurally unreachable. Every path that reaches that
 * statement first runs the while(sp>0) loop to completion, and the loop's
 * only exit is via rangeFrameStep finalizing and popping v's OWN frame
 * (frame 0) — which unconditionally executes `svi.lim = lim` for v.info
 * first. So v.info.lim is always freshly assigned immediately before the
 * final return runs, and the `?? 0` fallback cannot observe `undefined`.
 * Left uncovered; see report.
 *
 * @see lib/common/ns.c
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { makeNodeInfo } from '../../model/nodeInfo.js';
import { makeEdgeInfo, makePort } from '../../model/edgeInfo.js';
import { xVal, dfsCutval, dfsRange } from './ns-range.js';

let nid = 0;
function makeNode(g: Graph): Node {
  const n = new Node(nid++, `n${nid}`, g);
  n.info = makeNodeInfo();
  return n;
}
function makeEdge(tail: Node, head: Node): Edge {
  const e = new Edge(tail, head, '');
  e.info = makeEdgeInfo(makePort(), makePort());
  return e;
}

describe('xVal', () => {
  it('defaults an unset tree-edge cutvalue to 0 when inSub is true', () => {
    const g = new Graph('g', 'directed');
    const a = makeNode(g);
    const b = makeNode(g);
    const e = makeEdge(a, b);
    e.info.tree_index = 0; // isTreeEdge(e) === true
    expect(e.info.cutvalue).toBeUndefined();
    a.info.low = 0;
    a.info.lim = 10;
    b.info.lim = 5; // seq(0, 5, 10) -> inSub === true
    // f = xValDir(e, a, dir=1): e.head(b) !== a -> d=-1; f=0 (inSub branch) -> d
    // stays -1 -> returns -rv = -(cv(0) - weight(default 1)) = 1.
    expect(xVal(e, a, 1)).toBe(1);
  });

  it('defaults v.low, other.lim and v.lim to 0 when all are unset', () => {
    const g = new Graph('g', 'directed');
    const a = makeNode(g);
    const b = makeNode(g);
    const e = makeEdge(a, b);
    expect(a.info.low).toBeUndefined();
    expect(b.info.lim).toBeUndefined();
    expect(a.info.lim).toBeUndefined();
    // seq(0, 0, 0) -> true -> inSub true; e is not a tree edge -> cv=0.
    expect(xVal(e, a, 1)).toBe(1);
  });
});

describe('dfsCutval', () => {
  it('handles a leaf node with neither tree_out nor tree_in (list falsy guard)', () => {
    const g = new Graph('g', 'directed');
    const leaf = makeNode(g);
    expect(leaf.info.tree_out).toBeUndefined();
    expect(leaf.info.tree_in).toBeUndefined();
    expect(() => dfsCutval(leaf)).not.toThrow();
  });
});

describe('dfsRange', () => {
  it('re-descends a leaf with no tree edge lists (list falsy guard)', () => {
    const g = new Graph('g', 'directed');
    const leaf = makeNode(g);
    expect(leaf.info.tree_out).toBeUndefined();
    expect(leaf.info.tree_in).toBeUndefined();
    expect(dfsRange(leaf, undefined, 1)).toBe(2);
    expect(leaf.info.low).toBe(1);
    expect(leaf.info.lim).toBe(1);
  });

  it('evaluates the low default (undefined) inside the early-return guard, '
    + 'which then fails and falls through to the main loop', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g);
    expect(v.info.par).toBeUndefined();
    expect(v.info.low).toBeUndefined();
    // v.info.par === undefined === par(undefined) -> true;
    // (v.info.low ?? 0) === low(1) -> (undefined??0)=0 !== 1 -> guard false.
    expect(dfsRange(v, undefined, 1)).toBe(2);
  });

  it('takes the early return and defaults the unset lim to 0', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g);
    const par = makeEdge(makeNode(g), v);
    v.info.par = par;
    v.info.low = 1;
    expect(v.info.lim).toBeUndefined();
    // v.info.par === par -> true; (1 ?? 0) === 1 -> true -> early return
    // (undefined ?? 0) + 1 === 1.
    expect(dfsRange(v, par, 1)).toBe(1);
  });
});
