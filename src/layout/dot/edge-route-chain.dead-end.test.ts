// SPDX-License-Identifier: EPL-2.0

/**
 * A chain that ends at a virtual node with no out edge (graphviz 16.1.1,
 * upstream issue 2765). `concentrate` can leave an edge's `ED_to_virt` chain
 * ending at a vnode it orphaned: no in edge, no out edge, outside its rank's
 * `v[0..n)`. 16.1.0 read `ND_out(hn).list[0]` there and crashed. 16.1.1's
 * `make_regular_edge` routes to that node, `recover_slack` resizes it and
 * stops, and the edge gets no spline (upstream 4f9ef1d9e, a79e42588,
 * f3da7c569).
 *
 * The orphan's values are native 16.1.1's, printed at `%.17g` from an
 * instrumented `dotsplines.c` at the `recover_slack` exit (issue #161,
 * `plans/issue-161-no-out-edge-guards/harness/dead-end-values.txt`).
 *
 * @see lib/dotgen/dotsplines.c:make_regular_edge, recover_slack
 * @see https://gitlab.com/graphviz/graphviz/-/issues/2765
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';
import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';
import type { Edge } from '../../model/edge.js';
import type { Box } from '../../model/geom.js';
import type { Path } from '../../common/types.js';
import { makePort } from '../../model/edgeInfo.js';
import { layoutToPosition } from '../../../test/helpers/dot-position.js';
import { NORMAL, VIRTUAL } from './fastgr.js';
import { recoverSlack, routeEntryRun, routeMultiRankEdgeFaithful } from './edge-route-chain.js';

// ---------------------------------------------------------------------------
// recover_slack's two exits at a vnode with no out edge
// ---------------------------------------------------------------------------

/** A chain vnode at height `y`, 2 wide at x = 0, with `outSize` out edges. */
function vnode(y: number, outSize: number): Node {
  return {
    info: {
      coord: { x: 0, y }, lw: 1, rw: 1, node_type: VIRTUAL, label: undefined,
      out: { list: [], size: outSize }, in: { list: [], size: 1 },
    },
  } as unknown as Node;
}

const segTo = (head: Node): Edge => ({ head, info: {} }) as unknown as Edge;

function pathOf(boxes: Box[]): Path {
  return { start: makePort(), end: makePort(), nbox: boxes.length, boxes, data: null };
}

const geometry = (n: Node) => ({ x: n.info.coord.x, lw: n.info.lw, rw: n.info.rw });
const UNTOUCHED = { x: 0, lw: 1, rw: 1 };

/** Boxes run from high y to low y, as a routed path's do. */
const BOX_AT_100: Box = { ll: { x: 0, y: 90 }, ur: { x: 20, y: 110 } };
const BOX_AT_50: Box = { ll: { x: 40, y: 40 }, ur: { x: 80, y: 60 } };
const CENTRED_IN_BOX_AT_100 = { x: 10, lw: 10, rw: 10 };
const CENTRED_IN_BOX_AT_50 = { x: 60, lw: 20, rw: 20 };

describe('recover_slack stops at a vnode with no out edge (16.1.1)', () => {
  it('after resizing it, leaving the next head as it was', () => {
    const [v0, v1] = [vnode(100, 0), vnode(50, 1)];
    recoverSlack([segTo(v0), segTo(v1)], pathOf([BOX_AT_100, BOX_AT_50]));
    expect(geometry(v0)).toEqual(CENTRED_IN_BOX_AT_100);
    expect(geometry(v1)).toEqual(UNTOUCHED);
  });

  it('at once when its box does not reach it, leaving both heads as they were', () => {
    // The only box left ends below v0 (`UR.y < ND_coord(vn).y`) and holds v1.
    const [v0, v1] = [vnode(100, 0), vnode(50, 1)];
    recoverSlack([segTo(v0), segTo(v1)], pathOf([BOX_AT_50]));
    expect(geometry(v0)).toEqual(UNTOUCHED);
    expect(geometry(v1)).toEqual(UNTOUCHED);
  });

  it('goes on past a vnode that has an out edge, in both cases', () => {
    const [a0, a1] = [vnode(100, 1), vnode(50, 1)];
    recoverSlack([segTo(a0), segTo(a1)], pathOf([BOX_AT_100, BOX_AT_50]));
    expect(geometry(a0)).toEqual(CENTRED_IN_BOX_AT_100);
    expect(geometry(a1)).toEqual(CENTRED_IN_BOX_AT_50);

    const [b0, b1] = [vnode(100, 1), vnode(50, 1)];
    recoverSlack([segTo(b0), segTo(b1)], pathOf([BOX_AT_50]));
    expect(geometry(b0)).toEqual(UNTOUCHED);
    expect(geometry(b1)).toEqual(CENTRED_IN_BOX_AT_50);
  });
});

// ---------------------------------------------------------------------------
// make_regular_edge's dead-end close, on corpus 2765
// ---------------------------------------------------------------------------

/** Verbatim copy of graphviz tests/2765.dot. */
const SRC_2765 = 'digraph{concentrate=true;node[shape=record]{0[0=""]}[0=""][0=""]{0[0=""]}'
  + 'subgraph cluster{0[]Ho0er0tra0eTo0top[label="|<Target>"]}Ho0erTo0light[]'
  + 'Ho0er0tra0eTo0top:0->Ho0er0est:0Ho0er0tra0eTo0top:Target->Ho0er0est:0'
  + 'Ho0er0tra0eTo0top:0->Ho0erTo0light:0Ho0er0tra0eTo0top:Target->Ho0er0est:0'
  + 'Ho0erTo0light->Ho0er0est}\n';

/** Native 16.1.1's orphan after `recover_slack` (`P161RS b`, %.17g). */
const NATIVE_ORPHAN = { x: 5.3425925925925908, lw: 3.3425925925925908, rw: 3.3425925925925908 };
/** The orphan as position leaves it, before any route reaches it. */
const POSITIONED_ORPHAN = { x: 2, lw: 19, rw: 19 };
/** Digits for toBeCloseTo: |delta| < 5e-10. */
const DIGITS = 9;

/** The last fast edge an edge's `to_virt` redirects lead to. */
function virtTip(e: Edge): Edge | undefined {
  let cur = e.info.to_virt;
  while (cur?.info.to_virt !== undefined) cur = cur.info.to_virt;
  return cur;
}

/**
 * The two `:Target` edges, in input order. The first owns the virtual chain;
 * class2 merged the second into it (`merge_chain`) and put it in `ND_other`.
 * Concentrate then cut the chain's first vnode out of the fast graph, so
 * `dot_splines_` collects only the second, and `make_regular_edge` takes the
 * hackflag branch for it. Nothing ever routes the first.
 * @see lib/dotgen/class2.c:class2 (merge_chain, other_edge)
 */
function targetEdges(g: Graph): Edge[] {
  return g.edges.filter(e => e.attrs.get('tailport') === 'Target');
}

/** True for a chain vnode with no out edge. */
function isOrphan(n: Node): boolean {
  return (n.info.node_type ?? NORMAL) === VIRTUAL && (n.info.out?.size ?? 0) === 0;
}

describe('corpus 2765: a chain that ends at a vnode with no out edge', () => {
  it('position leaves the two Target edges on a chain to one orphan vnode', () => {
    const g = layoutToPosition(SRC_2765);
    const dead = g.edges.filter(e => isOrphan(virtTip(e)!.head));
    expect(dead).toEqual(targetEdges(g));
    expect(dead.map(e => `${e.tail.name}->${e.head.name}`)).toEqual([
      'Ho0er0tra0eTo0top->Ho0er0est', 'Ho0er0tra0eTo0top->Ho0er0est',
    ]);
    const orphan = virtTip(dead[0])!.head;
    expect(virtTip(dead[1])!.head).toBe(orphan);
    expect(dead[1].info.to_virt!.info.to_orig).toBe(dead[0]);
    expect(orphan.info.in?.size ?? 0).toBe(0);
    expect(geometry(orphan)).toEqual(POSITIONED_ORPHAN);
  });

  it('routing the merged edge reaches the dead end and drops it as lost', () => {
    const g = layoutToPosition(SRC_2765);
    expect(routeMultiRankEdgeFaithful(g, targetEdges(g)[1])).toBe('lost');
  });

  it('the splines pass resizes the orphan to native\'s values and draws neither edge', () => {
    const g = parse(SRC_2765);
    render(g, 'plain', { engine: 'dot' });
    const dead = targetEdges(g);
    expect(dead).toHaveLength(2);
    const orphan = virtTip(dead[0])!.head;
    expect(orphan.info.coord.x).toBeCloseTo(NATIVE_ORPHAN.x, DIGITS);
    expect(orphan.info.lw).toBeCloseTo(NATIVE_ORPHAN.lw, DIGITS);
    expect(orphan.info.rw).toBeCloseTo(NATIVE_ORPHAN.rw, DIGITS);
    expect(dead.map(e => e.info.spl)).toEqual([undefined, undefined]);
  });
});

// ---------------------------------------------------------------------------
// The same dead end on a back edge
// ---------------------------------------------------------------------------

/**
 * 2765_1 with its port edges turned round and a weighted `Top -> Light -> Est`
 * spine, so the two `:Target` edges are back edges across two ranks. Their
 * chain runs from `Top` to one orphan vnode: a one-segment chain that never
 * reaches the edge's tail. Hand-built for issue #161; no corpus input reaches
 * the dead end on a back edge.
 */
const SRC_BACK = `digraph {
  concentrate=true;
  node [shape=record]
  subgraph cluster{
    Top [label="|<Target>"]
  }
  Light
  Top -> Light [weight=10]
  Light -> Est [weight=10]
  Est:n -> Top:n
  Est:n -> Top:Target
  Light:n -> Top:n
  Est:n -> Top:Target
}
`;

/**
 * Native 16.1.1 `dot -Tplain` stdout for SRC_BACK (`GVBINDIR=/tmp/ghl1611`,
 * exit 0, empty stderr), captured by issue #161. An instrumented 16.1.1 takes
 * the dead-end close once on it, for the second `:Target` edge.
 */
const NATIVE_BACK_PLAIN = `graph 1 1.1944 2.7639
node Top 0.59722 2.2847 0.75 0.51389 "|<Target>" solid record black lightgrey
node Light 0.59722 1.2708 0.75 0.51389 "\\N" solid record black lightgrey
node Est 0.59722 0.25694 0.75 0.51389 "\\N" solid record black lightgrey
edge Top Light 4 0.59722 2.0321 0.59722 1.9267 0.59722 1.8 0.59722 1.6811 solid black
edge Light Top 10 0.59722 1.5278 0.59722 1.8056 0.88438 1.7643 0.97222 2.0278 1.0435 2.2415 1.1286 2.3725 0.97222 2.5347 0.90893 2.6004 0.80271 2.6483 0.71945 2.6509 solid black
edge Light Est 4 0.59722 1.0182 0.59722 0.91285 0.59722 0.78613 0.59722 0.66721 solid black
edge Est Top 13 0.59722 0.51389 0.59722 0.82816 0.97696 0.72354 1.0972 1.0139 1.1846 1.2249 1.1113 1.2998 1.0972 1.5278 1.0694 1.9779 1.3046 2.2299 0.97222 2.5347 0.90596 2.5955 0.80217 2.6432 0.72056 2.6482 solid black
 solid black
 solid black
stop
`;

/** The `Est:n -> Top:Target` edges, in input order. */
function backTargetEdges(g: Graph): Edge[] {
  return g.edges.filter(e => e.attrs.get('headport') === 'Target');
}

describe('a back edge whose chain ends at a vnode with no out edge', () => {
  it('is routed to the dead end and lost, and the drawing equals native', () => {
    const g = parse(SRC_BACK);
    expect(render(g, 'plain', { engine: 'dot' })).toBe(NATIVE_BACK_PLAIN);
    const dead = backTargetEdges(g);
    expect(dead.map(e => e.info.spl)).toEqual([undefined, undefined]);
  });
});

// ---------------------------------------------------------------------------
// An entry run that stops at a dead end
// ---------------------------------------------------------------------------

/**
 * `p -> z` and `q -> z` across four ranks: concentrate merges the two chains
 * into `u1 -> u2 -> u3 -> z`, where `u1` has both in edges (a merge node), so
 * `u1 -> u2` is collected as its own entry and routed as a run.
 */
const SRC_MERGED = 'digraph { concentrate=true; p -> z [minlen=4]; q -> z [minlen=4]; }';

describe('an entry run whose chain ends at a vnode with no out edge', () => {
  it('is routed to the dead end: no spline, and the vnodes past it keep their size', () => {
    const g = layoutToPosition(SRC_MERGED);
    const u1 = g.edges[0].tail.info.out!.list[0].head;
    expect(u1.info.in!.size).toBe(2);
    const entry = u1.info.out!.list[0];
    const u2 = entry.head;
    const u3 = u2.info.out!.list[0].head;
    expect(u3.info.node_type).toBe(VIRTUAL);
    const before = geometry(u3);
    // No input is known where concentrate orphans a vnode below a merge node,
    // so cut the chain here: empty u2's out list by size, as C's lists are.
    u2.info.out!.size = 0;
    expect(routeEntryRun(g, entry)).toBe(g.edges[0]);
    expect(g.edges[0].info.spl).toBeUndefined();
    expect(geometry(u3)).toEqual(before);
  });
});
