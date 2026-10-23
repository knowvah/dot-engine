// SPDX-License-Identifier: EPL-2.0
/**
 * Unit tests for clipAndInstall — in particular, that it expands
 * g.info.bb for every installed bezier segment, matching the C
 * clip_and_install which calls update_bb_bz(&GD_bb(g), cp).
 *
 * @see lib/common/splines.c:clip_and_install
 * @see lib/common/render.h:update_bb_bz
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Graph } from '../model/graph.js';
import { Node } from '../model/node.js';
import { Edge } from '../model/edge.js';
import { makePort } from '../model/edgeInfo.js';
import { clipAndInstall, dist } from './splines-clip.js';
import { SINFO } from '../layout/neato/splines.js';
import { renderSvg } from '../index.js';

// renderPenwidth must resolve setlinewidth(N) like the stroke does, so the
// arrowhead's penwidth-dependent miter (arrow_type_normal0) matches the drawn
// width. Regression guard for graphs-style: style="setlinewidth(3)" used to
// fall through to penwidth 1.0, drawing the arrow ~penwidth off along the edge.
describe('arrowhead penwidth resolves setlinewidth (graphs-style)', () => {
  const arrowPts = (svg: string): string | undefined =>
    /<polygon fill="black"[^>]*points="([^"]*)"/.exec(svg)?.[1];

  it('setlinewidth(3) edge draws a different arrowhead than a default edge', () => {
    const thick = renderSvg('digraph { a -> b [style="setlinewidth(3)"]; }', 'dot');
    const thin = renderSvg('digraph { a -> b; }', 'dot');
    // same layout, so the arrow base is identical; only the penwidth miter
    // differs — if setlinewidth were ignored the two would be byte-identical.
    expect(arrowPts(thick)).toBeDefined();
    expect(arrowPts(thin)).toBeDefined();
    expect(arrowPts(thick)).not.toBe(arrowPts(thin));
  });

  it('setlinewidth(1) matches a default (penwidth 1) edge arrowhead', () => {
    const one = renderSvg('digraph { a -> b [style="setlinewidth(1)"]; }', 'dot');
    const def = renderSvg('digraph { a -> b; }', 'dot');
    expect(arrowPts(one)).toBe(arrowPts(def));
  });
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeGraph(name: string): Graph {
  return new Graph(name, 'undirected');
}

function makeNode(g: Graph, name: string, x = 0, y = 0): Node {
  const n = new Node(g.nodes.size, name, g);
  n.info.coord = { x, y };
  n.info.lw = 27;
  n.info.rw = 27;
  n.info.ht = 36;
  g.nodes.set(name, n);
  return n;
}

function makeEdge(g: Graph, tail: Node, head: Node): Edge {
  const tp = makePort();
  const hp = makePort();
  tp.clip = false;
  hp.clip = false;
  const e = new Edge(tail, head, '');
  e.info.tail_port = tp;
  e.info.head_port = hp;
  g.edges.push(e);
  return e;
}

function makeTestFixture(): { g: Graph; n: Node; e: Edge } {
  const g = makeGraph('test');
  const n = makeNode(g, 'A', 27, 18);
  const e = makeEdge(g, n, n);
  g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 54, y: 36 } };
  return { g, n, e };
}

// Control-point sets used across tests — extracted to constants so
// the `it` callbacks stay under the 30-line lizard limit.

/** Self-loop stub from C golden: extends rightward to x=72. */
const SELF_LOOP_PTS = [
  { x: 54, y: 24.69 },
  { x: 63, y: 25.15 },
  { x: 72, y: 22.92 },
  { x: 72, y: 18 },
];

/** Spline that fits within [0,100]x[0,100] — should not expand bb. */
const INNER_PTS = [
  { x: 10, y: 10 },
  { x: 20, y: 20 },
  { x: 30, y: 20 },
  { x: 40, y: 10 },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('clipAndInstall — bb expansion', () => {
  let g: Graph;
  let n: Node;
  let e: Edge;

  beforeEach(() => { ({ g, n, e } = makeTestFixture()); });

  it('expands g.info.bb to include spline points beyond the node bb', () => {
    expect(g.info.bb.ur.x).toBe(54); // precondition: node-only bb

    clipAndInstall(e, n, SELF_LOOP_PTS, SELF_LOOP_PTS.length, SINFO);

    // After install, ur.x must reach x=72 (the rightmost spline control point).
    expect(g.info.bb.ur.x).toBeGreaterThanOrEqual(72);
  });

  it('does not shrink g.info.bb when spline is within existing bounds', () => {
    g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 100, y: 100 } };

    clipAndInstall(e, n, INNER_PTS, INNER_PTS.length, SINFO);

    expect(g.info.bb.ur.x).toBe(100);
    expect(g.info.bb.ur.y).toBe(100);
  });
});

// DIST(p, q) = sqrt(SQR(dx) + SQR(dy)): the oracle (libgvc 16.1 _arrowEndClip,
// _arrowStartClip incl. the inlined sphere_ctx inside(), _arrowOrthoClip)
// compiles it to fsub/fsub/fmul dy*dy/fmadd dx,dx/fsqrt, i.e.
// sqrt(fma(dx, dx, dy*dy)). Vectors: clang -O2 (arm64) harness over random
// full-precision inputs, [px, py, qx, qy, fused, hypot] as C hex floats, kept
// only where fused differs from both Math.hypot and plain sqrt(dx*dx+dy*dy).
const hexf = (s: string): number => {
  const m = /^(-?)0x1\.([0-9a-f]+)p([+-]\d+)$/.exec(s)!;
  const v = parseInt('1' + m[2], 16) * 2 ** (parseInt(m[3]!, 10) - 4 * m[2]!.length);
  return m[1] ? -v : v;
};
const DIST_VECTORS: string[][] = [
    ["0x1.860e3ee9ec1c8p+7","-0x1.4ebb9073bd772p+7","-0x1.f8113d37b0227p+6","0x1.186bd9e6b0d7cp+5","0x1.7b87b6f675fcap+8","0x1.7b87b6f675fcbp+8"],
    ["-0x1.d60dcb6e2c1b9p+5","0x1.2e2ca8f71c594p+6","0x1.ec11eecc5823ep+5","0x1.63552a6ba6aa6p+7","0x1.3b8c9eba0fd09p+7","0x1.3b8c9eba0fd0ap+7"],
    ["0x1.5bacd7991759bp+7","0x1.60fd079801fa1p+6","-0x1.f009cd58e0138p+4","0x1.1d8eef441b1dep+7","0x1.a7f2e97cfa499p+7","0x1.a7f2e97cfa49ap+7"],
    ["-0x1.555af6636ab5fp+6","0x1.b91a070d32342p+6","0x1.8de279ad7bc5p+7","0x1.7d1364c5fa26fp+4","0x1.29233eb3639aap+8","0x1.29233eb3639a9p+8"],
    ["-0x1.01e86da223d0dp+7","-0x1.0275afdd64eb6p+7","0x1.0e4c3fcd9c989p+5","-0x1.1403cb0708079p+7","0x1.45f4994b1d1bap+7","0x1.45f4994b1d1b9p+7"],
    ["0x1.33c9310747927p+7","0x1.3b63a9d7b6c75p+6","-0x1.9ee376f93dc6ap+3","0x1.730d03572619fp+6","0x1.4edffac2a6246p+7","0x1.4edffac2a6245p+7"],
];

describe('dist matches the fused native DIST', () => {
  it.each(DIST_VECTORS)('vector %#', (...v) => {
    const [px, py, qx, qy, fused, hypot] = v.map(hexf) as [number, number, number, number, number, number];
    const d = dist({ x: px, y: py }, { x: qx, y: qy });
    expect(d).toBe(fused);
    expect(d).not.toBe(hypot);
  });
});
