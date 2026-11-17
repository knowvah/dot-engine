// SPDX-License-Identifier: EPL-2.0

/**
 * Byte-match tests for the faithful cnt>=2 non-adjacent flat multi-edge router.
 *
 * Oracle = native graphviz `dot` (version 15.1.0~dev.20260610.0127), captured
 * fresh during execution of mission nonadjacent-flat-multi (AD-5). The expected
 * `d=` path strings below are that oracle's edge splines verbatim. C nests the
 * splines via `(i+1)*Multisep/(cnt+1)`; the port previously routed each edge
 * independently at `nodesep/2`, so cnt>=2 edges overlapped identically.
 *
 * These tests drive `routeFlatEdgeGroupFaithful` directly (the T3 dispatch is a
 * separate task): lay out the graph, reset the port-bearing flat splines, route
 * the group, then render and compare. The SVG path coordinates are raw internal
 * coords (x, -y) — bb-independent — so a stale bb does not affect the numbers.
 *
 * @see lib/dotgen/dotsplines.c:make_flat_edge, make_flat_bottom_edges
 */

import { describe, it, expect } from 'vitest';
import type { Edge } from '../../model/edge.js';
import { parse } from '../../parser/index.js';
import { GvcContext } from '../../gvc/context.js';
import { createMeasurer } from '../../common/textmeasure-factory.js';
import { DOT_LAYOUT_ENGINE } from './index.js';
import { EDGETYPE_SPLINE, EDGETYPE_LINE, EDGETYPE_PLINE } from './splines.js';
import { createSvgRenderer } from '../../render/svg.js';
import { render } from '../../gvc/device.js';
import { render as renderFormat } from '../../render/index.js';
import {
  collectNonAdjacentFlatGroup, routeFlatEdgeGroupFaithful,
} from './splines-flat-multi.js';

const NODESEP = 'nodesep=0.25; {rank=same; a;b;c} a->b->c[style=invis];';
const SRC_TOP2 = `digraph { ${NODESEP} a:ne->c:nw; a:ne->c:nw; }`;
const SRC_TOP3 = `digraph { ${NODESEP} a:ne->c:nw; a:ne->c:nw; a:ne->c:nw; }`;
const SRC_BOT2 = `digraph { ${NODESEP} a:se->c:sw; a:se->c:sw; }`;
const SRC_TOP1 = `digraph { ${NODESEP} a:ne->c:nw; }`;

const TITLE_TOP = 'a:ne&#45;&gt;c:nw';
const TITLE_BOT = 'a:se&#45;&gt;c:sw';

/** Native-dot oracle splines (see file header). */
const ORACLE_TOP2 = [
  'M42.02,-34.02C51.57,-43.57 55.88,-44.8 69,-48 103.18,-56.33 123.81,-60.75 147.72,-41.49',
  'M42.02,-34.02C55.21,-47.21 57.37,-53.89 75,-60 95.16,-66.99 102.84,-66.99 123,-60 136.5,-55.32 140.93,-50.31 148.18,-42.3',
];
const ORACLE_TOP3 = [
  'M42.02,-34.02C50.74,-42.74 55.42,-42.51 67.5,-45 102.37,-52.19 123.39,-60.21 147.62,-41.45',
  'M42.02,-34.02C75.03,-67.03 113.59,-69.61 147.48,-41.76',
  'M42.02,-34.02C56.17,-48.17 57.69,-56.14 76.5,-63 95.29,-69.85 102.71,-69.85 121.5,-63 136.2,-57.64 140.34,-51.61 148.19,-42.47',
];
const ORACLE_BOT2 = [
  'M42.02,-2.69C45.78,1.08 49.76,0.53 54,-2.69 71.9,-16.3 50.87,-38.87 70,-50.69 91.93,-64.24 106.07,-64.24 128,-50.69 146.9,-39.01 124.67,-16.59 142,-2.69 142.91,-1.96 143.81,-1.35 144.71,-0.87',
  'M42.02,-2.69C45.78,1.08 49.76,0.53 54,-2.69 67.22,-12.74 58.04,-23.19 64,-38.69 68.28,-49.82 65.86,-56.42 76,-62.69 93.39,-73.44 104.61,-73.44 122,-62.69 132.14,-56.42 130.01,-49.93 134,-38.69 139.48,-23.24 129.21,-12.94 142,-2.69 142.91,-1.96 143.81,-1.35 144.71,-0.87',
];
const ORACLE_TOP2_PLINE = [
  'M42.02,-34.02C42.02,-34.02 69,-48 69,-48 69,-48 129,-48 129,-48 129,-48 138.26,-43.2 145.94,-39.22',
  'M42.02,-34.02C42.02,-34.02 75,-60 75,-60 75,-60 123,-60 123,-60 123,-60 137.2,-48.81 146.97,-41.12',
];
const ORACLE_TOP2_LINE = [
  'M42.02,-33.02C76.59,-16.63 111.17,-15.16 145.74,-28.6',
  'M42.02,-33.02C76.59,-49.4 111.17,-50.87 145.74,-37.43',
];
const ORACLE_TOP1 = ['M42.02,-34.02C75.03,-67.03 113.59,-69.61 147.48,-41.76'];

/** Lay out the graph, reset the port-bearing flats, route the group, render. */
function renderGroupSplines(
  src: string, encTitle: string, et: number = EDGETYPE_SPLINE,
): string[] {
  const g = parse(src);
  const ctx = new GvcContext(createMeasurer());
  ctx.register(DOT_LAYOUT_ENGINE);
  ctx.register(createSvgRenderer());
  ctx.layout(g, 'dot');
  const flats = g.edges.filter((e: Edge) =>
    e.tail.info.rank === e.head.info.rank
    && (e.info.tail_port.defined || e.info.head_port.defined));
  flats.forEach((e: Edge) => { e.info.spl = undefined; });
  const group = collectNonAdjacentFlatGroup(flats[0], g);
  expect(routeFlatEdgeGroupFaithful(g, group, group.length, et)).toBe(true);
  return edgePaths(render(ctx, g, 'svg'), encTitle);
}

/** Extract the spline `d=` of every edge whose SVG title equals encTitle. */
function edgePaths(svg: string, encTitle: string): string[] {
  return svg.split('<g id="')
    .filter(b => b.includes(`<title>${encTitle}</title>`))
    .map(b => b.match(/ d="(M[^"]+)"/)?.[1] ?? '')
    .filter(Boolean);
}

describe('routeFlatEdgeGroupFaithful — cnt>=2 non-adjacent flats (conformant with native dot)', () => {
  it('top cnt=2: two DISTINCT nested splines conformant with the oracle', () => {
    const paths = renderGroupSplines(SRC_TOP2, TITLE_TOP);
    expect(paths).toEqual(ORACLE_TOP2);
    expect(paths[0]).not.toEqual(paths[1]); // not overlapping (the bug)
  });

  it('top cnt=3: three nested splines conformant with the oracle', () => {
    expect(renderGroupSplines(SRC_TOP3, TITLE_TOP)).toEqual(ORACLE_TOP3);
  });

  it('bottom cnt=2 (:se->:sw): both splines conformant with the oracle', () => {
    const paths = renderGroupSplines(SRC_BOT2, TITLE_BOT);
    expect(paths).toEqual(ORACLE_BOT2);
    expect(paths[0]).not.toEqual(paths[1]);
  });

  it('cnt=1 reduces to the single-route spline (AD-1, conformant)', () => {
    expect(renderGroupSplines(SRC_TOP1, TITLE_TOP)).toEqual(ORACLE_TOP1);
  });

  // Native (15.x) `splines=polyline|line` with two identical-port flats:
  // et != SPLINE routes the corridor with routepolylines; et == LINE fans the
  // group with makeSimpleFlat. @see dotsplines.c:make_flat_edge 1535-1537, 1603-1607
  it('et=PLINE top cnt=2: routepolylines, conformant with the oracle', () => {
    expect(renderGroupSplines(SRC_TOP2, TITLE_TOP, EDGETYPE_PLINE)).toEqual(ORACLE_TOP2_PLINE);
  });

  it('et=LINE cnt=2: makeSimpleFlat fan, conformant with the oracle', () => {
    expect(renderGroupSplines(SRC_TOP2, TITLE_TOP, EDGETYPE_LINE)).toEqual(ORACLE_TOP2_LINE);
  });
});

// ---------------------------------------------------------------------------
// Issue #158: the group is routed in C's edgecmp order, which inside one
// make_flat_edge run reduces to AGSEQ, whichever node is on the left.
//
// tests/700813.dot with its comments dropped. Under rankdir=LR, 16.1.1's
// flat_reorder (valid_rank) leaves `C` at order 0 and `B` at order 2, so the
// lower-seq edge `B -> C` has its tail on the right. C still routes it first
// (the inner route); "left tail first" gave that route to `C -> B`.
// NATIVE_700813_PLAIN is native graphviz 16.1.1 `dot -Tplain` (exit 0, empty
// stderr, `GVBINDIR=/tmp/ghl1611`), captured by issue #158; it is the same
// for the file with its comments.
// @see lib/dotgen/dotsplines.c:edgecmp, make_flat_edge
// ---------------------------------------------------------------------------

const SRC_700813 = `digraph g {
	rankdir="LR"
	B -> C
	C -> B
	B -> E
	E -> F
	A -> D
	subgraph {rank="same"; B; C}
	subgraph {rank="same"; A -> C}
	subgraph {rank="same"; F -> D}
}
`;

const NATIVE_700813_PLAIN = `graph 1 3.6449 2
node B 0.76987 1.75 0.75 0.5 B solid ellipse black lightgrey
node C 0.76987 0.25 0.75 0.5 C solid ellipse black lightgrey
node E 2.0199 1.75 0.75 0.5 E solid ellipse black lightgrey
node F 3.2699 1.75 0.75 0.5 F solid ellipse black lightgrey
node A 0.76987 1 0.75 0.5 A solid ellipse black lightgrey
node D 3.2699 1 0.75 0.5 D solid ellipse black lightgrey
edge B C 10 0.48648 1.5843 0.38545 1.5091 0.28314 1.4101 0.2282 1.2917 0.11912 1.0565 0.11912 0.94353 0.2282 0.70833 0.26082 0.638 0.31014 0.57455 0.36598 0.51884 solid black
edge B E 4 1.1505 1.75 1.2544 1.75 1.3696 1.75 1.481 1.75 solid black
edge C B 10 0.46327 0.39846 0.31271 0.48924 0.14589 0.62096 0.061532 0.79167 -0.020511 0.95769 -0.020511 1.0423 0.061532 1.2083 0.12151 1.3297 0.22316 1.4314 0.33101 1.5126 solid black
edge E F 4 2.4005 1.75 2.5044 1.75 2.6196 1.75 2.731 1.75 solid black
edge F D 4 3.2699 1.4932 3.2699 1.4656 3.2699 1.4379 3.2699 1.4103 solid black
edge A C 4 0.76987 0.74319 0.76987 0.71555 0.76987 0.68791 0.76987 0.66027 solid black
edge A D 4 1.1485 1 1.5667 1 2.2554 1 2.7311 1 solid black
stop
`;

/** The lines of a plain output that draw an edge `tail -> head`. */
function plainEdgeLines(plain: string, tail: string, head: string): string[] {
  return plain.split('\n').filter(l => l.startsWith(`edge ${tail} ${head} `));
}

describe('non-adjacent flat group order: edgecmp (seq), not left tail first (#158)', () => {
  const plain = renderFormat(parse(SRC_700813), 'plain', { engine: 'dot' });

  it('gives the lower-seq edge B -> C the inner route though its tail is the right node', () => {
    expect(plainEdgeLines(plain, 'B', 'C')).toEqual(plainEdgeLines(NATIVE_700813_PLAIN, 'B', 'C'));
    expect(plainEdgeLines(plain, 'C', 'B')).toEqual(plainEdgeLines(NATIVE_700813_PLAIN, 'C', 'B'));
    expect(plainEdgeLines(NATIVE_700813_PLAIN, 'B', 'C')).toHaveLength(1);
    expect(plainEdgeLines(NATIVE_700813_PLAIN, 'C', 'B')).toHaveLength(1);
  });

  it('700813 -Tplain equals native 16.1.1', () => {
    expect(plain).toBe(NATIVE_700813_PLAIN);
  });
});
