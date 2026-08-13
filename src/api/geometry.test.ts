// SPDX-License-Identifier: EPL-2.0

/**
 * Tests for getLayout() geometry snapshot.
 *
 * Uses the real dot pipeline: parse → layout → getLayout, on a tiny
 * two-node graph `digraph { a -> b }`.
 *
 * AC1: yAxis:'up'  → node y equals native ND_coord.y (no flip)
 * AC2: yAxis:'down' (default) → node y equals bbHeight - nativeY;
 *      bounds normalised to origin top-left (x=0, y=0)
 * AC3: edge points length matches spline bz.size sum; points are flipped
 * AC4: edge label is present when the source declares one; absent otherwise
 * AC5: snapshot is JSON-serializable (JSON.stringify round-trips)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parse } from '../parser/index.js';
import { GvcContext } from '../gvc/context.js';
import { createMeasurer } from '../common/textmeasure-factory.js';
import { DOT_LAYOUT_ENGINE } from '../layout/dot/index.js';
import type { Graph } from '../model/graph.js';
import { getLayout } from './geometry.js';
import { render } from '../index.js';

// Single-child cluster with one outside peer — margins visible on all four
// sides. @see docs/graphviz-issues/06-cluster-bbox-not-in-getlayout.md
const CLUSTER_SRC = `digraph unix {
nodesep=0.486111; ranksep=0.833333; remincross=true; searchsize=500;
subgraph cluster6 {style=solid;color="#000006";label="";
sh0010 [shape=rect,label="",width=0.694444,height=0.694444];
}
sh0011 [shape=rect,label="",width=0.694444,height=0.666667];
sh0010->sh0011[arrowtail=none,arrowhead=none,minlen=1];
}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function layoutGraph(src: string): Graph {
  const graph = parse(src);
  const ctx = new GvcContext(createMeasurer());
  ctx.register(DOT_LAYOUT_ENGINE);
  ctx.layout(graph, 'dot');
  return graph;
}

function bbH(graph: Graph): number {
  return graph.info.bb.ur.y - graph.info.bb.ll.y;
}

// ---------------------------------------------------------------------------
// Shared fixture: digraph { a -> b }
// ---------------------------------------------------------------------------

let g: Graph;
let bbHeight: number;
let nativeCoords: Map<string, { x: number; y: number }>;

beforeAll(() => {
  g = layoutGraph('digraph { a -> b }');
  bbHeight = bbH(g);
  nativeCoords = new Map(
    Array.from(g.nodes.values()).map((n) => [
      n.name,
      { x: n.info.coord.x, y: n.info.coord.y },
    ]),
  );
});

// ---------------------------------------------------------------------------
// AC1: yAxis:'up' returns native coordinates unchanged
// ---------------------------------------------------------------------------

describe("getLayout with yAxis:'up'", () => {
  it('returns native y for every node (no flip)', () => {
    const snap = getLayout(g, { yAxis: 'up' });
    for (const ng of snap.nodes) {
      const native = nativeCoords.get(ng.name);
      expect(native).toBeDefined();
      expect(ng.y).toBeCloseTo(native!.y, 5);
    }
  });

  it('bounds reflect the raw lower-left corner (non-zero y)', () => {
    const snap = getLayout(g, { yAxis: 'up' });
    expect(snap.bounds.x).toBeCloseTo(g.info.bb.ll.x, 5);
    expect(snap.bounds.y).toBeCloseTo(g.info.bb.ll.y, 5);
    expect(snap.bounds.width).toBeCloseTo(g.info.bb.ur.x - g.info.bb.ll.x, 5);
    expect(snap.bounds.height).toBeCloseTo(bbHeight, 5);
  });
});

// ---------------------------------------------------------------------------
// AC2: default yAxis:'down' flips y and normalises bounds
// ---------------------------------------------------------------------------

describe("getLayout default yAxis:'down' — node y", () => {
  it('flips each node y: y_down = bbHeight - y_native', () => {
    const snap = getLayout(g);
    for (const ng of snap.nodes) {
      const native = nativeCoords.get(ng.name);
      expect(native).toBeDefined();
      expect(ng.y).toBeCloseTo(bbHeight - native!.y, 5);
    }
  });

  it('flipped y equals bbHeight minus up-y for every node', () => {
    const down = getLayout(g);
    const up = getLayout(g, { yAxis: 'up' });
    for (let i = 0; i < down.nodes.length; i++) {
      expect(down.nodes[i].y).toBeCloseTo(bbHeight - up.nodes[i].y, 5);
    }
  });
});

describe("getLayout default yAxis:'down' — bounds", () => {
  it('bounds are normalised: x=0, y=0', () => {
    const snap = getLayout(g);
    expect(snap.bounds.x).toBe(0);
    expect(snap.bounds.y).toBe(0);
  });

  it('bounds dimensions match bbWidth × bbHeight', () => {
    const snap = getLayout(g);
    const bbWidth = g.info.bb.ur.x - g.info.bb.ll.x;
    expect(snap.bounds.width).toBeCloseTo(bbWidth, 5);
    expect(snap.bounds.height).toBeCloseTo(bbHeight, 5);
  });
});

// ---------------------------------------------------------------------------
// AC3: edge spline points — count and y-flip
// ---------------------------------------------------------------------------

describe('getLayout edge spline — point count', () => {
  it('edge a->b has at least one control point after dot layout', () => {
    const snap = getLayout(g);
    const edge = snap.edges.find((e) => e.tail === 'a' && e.head === 'b');
    expect(edge).toBeDefined();
    expect(edge!.points.length).toBeGreaterThan(0);
  });

  it('point count matches sum of bz.size across the spline list', () => {
    const snap = getLayout(g);
    const edge = snap.edges.find((e) => e.tail === 'a' && e.head === 'b');
    const modelEdge = g.edges.find((e) => e.tail.name === 'a' && e.head.name === 'b');
    expect(edge).toBeDefined();
    expect(modelEdge?.info.spl).toBeDefined();
    const expected = modelEdge!.info.spl!.list.reduce((s, bz) => s + bz.size, 0);
    expect(edge!.points.length).toBe(expected);
  });
});

describe('getLayout edge spline — y-flip', () => {
  it('default y-down: every point y equals bbHeight - native_y', () => {
    const down = getLayout(g);
    const up = getLayout(g, { yAxis: 'up' });
    const edgeDown = down.edges.find((e) => e.tail === 'a' && e.head === 'b');
    const edgeUp = up.edges.find((e) => e.tail === 'a' && e.head === 'b');
    expect(edgeDown).toBeDefined();
    expect(edgeUp).toBeDefined();
    expect(edgeDown!.points.length).toBe(edgeUp!.points.length);
    for (let i = 0; i < edgeDown!.points.length; i++) {
      expect(edgeDown!.points[i].y).toBeCloseTo(bbHeight - edgeUp!.points[i].y, 5);
    }
  });
});

// ---------------------------------------------------------------------------
// AC4: edge label present/absent
// ---------------------------------------------------------------------------

describe('getLayout edge label', () => {
  it('a->b without label: label field is absent', () => {
    const snap = getLayout(g);
    const edge = snap.edges.find((e) => e.tail === 'a' && e.head === 'b');
    expect(edge).toBeDefined();
    expect(edge!.label).toBeUndefined();
  });

  it('edge with label: label field is populated and y is flipped', () => {
    const gL = layoutGraph('digraph { a -> b [label="x"] }');
    const down = getLayout(gL);
    const up = getLayout(gL, { yAxis: 'up' });
    const edgeDown = down.edges.find((e) => e.tail === 'a' && e.head === 'b');
    const edgeUp = up.edges.find((e) => e.tail === 'a' && e.head === 'b');
    expect(edgeDown?.label).toBeDefined();
    expect(edgeUp?.label).toBeDefined();
    const lbbH = bbH(gL);
    expect(edgeDown!.label!.y).toBeCloseTo(lbbH - edgeUp!.label!.y, 5);
  });
});

// ---------------------------------------------------------------------------
// AC6: edge port labels (taillabel / headlabel) present/absent
// @see docs/graphviz-issues/13-edge-tail-head-label-positions-not-in-getlayout.md
// ---------------------------------------------------------------------------

// Two fixed-size unlabelled boxes so the only <text> in the SVG are the port
// labels themselves — the repro from issue 13.
const PORT_LABEL_SRC = `digraph G {
  rankdir=TB;
  a [shape=box, width=1, height=1, fixedsize=true, label=""];
  b [shape=box, width=1, height=1, fixedsize=true, label=""];
  a -> b [taillabel="T", headlabel="H"];
}`;

/** x of the `<text>` whose content is `ch`, from a rendered SVG string. */
function svgTextX(svg: string, ch: string): number {
  const m = new RegExp(`<text[^>]*\\bx="([-\\d.]+)"[^>]*>${ch}</text>`).exec(svg);
  expect(m).not.toBeNull();
  return Number(m![1]);
}

describe('getLayout edge port labels', () => {
  it('edge without taillabel/headlabel: both fields are absent', () => {
    const edge = getLayout(g).edges.find((e) => e.tail === 'a' && e.head === 'b');
    expect(edge!.tailLabel).toBeUndefined();
    expect(edge!.headLabel).toBeUndefined();
  });

  it('taillabel/headlabel are published and y is flipped', () => {
    const gP = layoutGraph(PORT_LABEL_SRC);
    const down = getLayout(gP).edges[0];
    const up = getLayout(gP, { yAxis: 'up' }).edges[0];
    expect(down.tailLabel).toBeDefined();
    expect(down.headLabel).toBeDefined();
    const h = bbH(gP);
    expect(down.tailLabel!.y).toBeCloseTo(h - up.tailLabel!.y, 5);
    expect(down.headLabel!.y).toBeCloseTo(h - up.headLabel!.y, 5);
    // 'up' is the native frame, so it must equal the model's own label pos.
    const e0 = gP.edges[0];
    expect(up.tailLabel).toEqual({ x: e0.info.tail_label!.pos.x, y: e0.info.tail_label!.pos.y });
    expect(up.headLabel).toEqual({ x: e0.info.head_label!.pos.x, y: e0.info.head_label!.pos.y });
  });

  // The point of the API: a consumer reading the snapshot lands where the
  // scraped <text> did, so the SVG regex scraping can be deleted.
  it('positions agree with the <text> render() emits', () => {
    const edge = getLayout(layoutGraph(PORT_LABEL_SRC)).edges[0];
    const svg = render(parse(PORT_LABEL_SRC), 'svg');
    expect(edge.tailLabel!.x).toBeCloseTo(svgTextX(svg, 'T'), 1);
    expect(edge.headLabel!.x).toBeCloseTo(svgTextX(svg, 'H'), 1);
  });

  it('a declared but unplaced port label is absent, as in render()', () => {
    const gP = layoutGraph(PORT_LABEL_SRC);
    // place_portlabel never ran (no spline / IGNORED edge): pos is calloc-zero
    // and emit_edge_label skips it, so the snapshot must skip it too.
    gP.edges[0].info.head_label!.set = false;
    expect(getLayout(gP).edges[0].headLabel).toBeUndefined();
    expect(getLayout(gP).edges[0].tailLabel).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AC7: spline arrow attachment points (sp / ep)
// @see docs/graphviz-issues/10-edge-spline-sp-ep-not-exposed.md
// ---------------------------------------------------------------------------

describe('getLayout edge arrow attachment points', () => {
  it('head arrow: ep is published and the spline stops short of it', () => {
    const gA = layoutGraph('digraph { a -> b }');
    const edge = getLayout(gA, { yAxis: 'up' }).edges[0];
    expect(edge.ep).toBeDefined();
    // The gap ep leaves for the arrow is the whole point of the field.
    const last = edge.points[edge.points.length - 1];
    expect(edge.ep!.y).toBeLessThan(last.y);
    expect(edge.ep).toEqual({
      x: gA.edges[0].info.spl!.list[0].ep.x,
      y: gA.edges[0].info.spl!.list[0].ep.y,
    });
  });

  it('no arrow at an end: that field is absent, not (0, 0)', () => {
    // arrowhead=none clears eflag, leaving ep at its calloc-zero value.
    const noHead = getLayout(layoutGraph('digraph { a -> b [arrowhead=none] }')).edges[0];
    expect(noHead.ep).toBeUndefined();
    expect(noHead.sp).toBeUndefined();
    // A plain digraph edge has no tail arrow either.
    expect(getLayout(layoutGraph('digraph { a -> b }')).edges[0].sp).toBeUndefined();
  });

  it('dir=both: both ends are published', () => {
    const edge = getLayout(layoutGraph('digraph { a -> b [dir=both] }')).edges[0];
    expect(edge.sp).toBeDefined();
    expect(edge.ep).toBeDefined();
  });

  it('arrowsize is honoured: a smaller arrow leaves a smaller gap', () => {
    const gap = (src: string): number => {
      const e = getLayout(layoutGraph(src), { yAxis: 'up' }).edges[0];
      return e.points[e.points.length - 1].y - e.ep!.y;
    };
    // ep is the node boundary either way; only the spline's end moves.
    expect(gap('digraph { a -> b [arrowsize="0.75"] }'))
      .toBeLessThan(gap('digraph { a -> b }'));
  });

  it('y is flipped like every other coordinate', () => {
    const gA = layoutGraph('digraph { a -> b }');
    const down = getLayout(gA).edges[0];
    const up = getLayout(gA, { yAxis: 'up' }).edges[0];
    expect(down.ep!.y).toBeCloseTo(bbH(gA) - up.ep!.y, 5);
    expect(down.ep!.x).toBe(up.ep!.x);
  });
});

// ---------------------------------------------------------------------------
// AC5: JSON round-trip
// ---------------------------------------------------------------------------

describe('getLayout JSON serialization', () => {
  it('snapshot survives JSON.stringify + JSON.parse without loss', () => {
    const snap = getLayout(g);
    const round = JSON.parse(JSON.stringify(snap)) as typeof snap;
    expect(round).toEqual(snap);
  });
});

// ---------------------------------------------------------------------------
// Unit: width/height in points (model stores inches)
// ---------------------------------------------------------------------------

describe('NodeGeometry width/height units', () => {
  it('node width and height equal model inches * 72', () => {
    const snap = getLayout(g, { yAxis: 'up' });
    for (const ng of snap.nodes) {
      const model = g.nodes.get(ng.name);
      expect(model).toBeDefined();
      expect(ng.width).toBeCloseTo(model!.info.width * 72, 5);
      expect(ng.height).toBeCloseTo(model!.info.height * 72, 5);
    }
  });
});

// ---------------------------------------------------------------------------
// clusters — issue 06: getLayout must expose per-cluster geometry
// ---------------------------------------------------------------------------

describe('getLayout clusters', () => {
  it('graph without clusters returns an empty clusters array', () => {
    const snap = getLayout(g);
    expect(Array.isArray(snap.clusters)).toBe(true);
    expect(snap.clusters).toEqual([]);
  });

  it('single cluster: name and bbox are exposed', () => {
    const gc = layoutGraph(CLUSTER_SRC);
    const snap = getLayout(gc);
    expect(snap.clusters).toHaveLength(1);
    const c = snap.clusters[0];
    expect(c.name).toBe('cluster6');
    expect(c.width).toBeGreaterThan(0);
    expect(c.height).toBeGreaterThan(0);
  });

  it("yAxis:'up' matches the cluster subgraph's native bb corners", () => {
    const gc = layoutGraph(CLUSTER_SRC);
    const snap = getLayout(gc, { yAxis: 'up' });
    const c = snap.clusters[0];
    const bb = gc.info.clust![0].info.bb;
    expect(c.x).toBeCloseTo(bb.ll.x, 5);
    expect(c.y).toBeCloseTo(bb.ll.y, 5);
    expect(c.width).toBeCloseTo(bb.ur.x - bb.ll.x, 5);
    expect(c.height).toBeCloseTo(bb.ur.y - bb.ll.y, 5);
  });

  it("yAxis:'down' flips ur.y to the top-left corner", () => {
    const gc = layoutGraph(CLUSTER_SRC);
    const down = getLayout(gc);
    const up = getLayout(gc, { yAxis: 'up' });
    const cbbH = bbH(gc);
    const cd = down.clusters[0];
    const cu = up.clusters[0];
    expect(cd.x).toBeCloseTo(cu.x, 5);
    expect(cd.width).toBeCloseTo(cu.width, 5);
    expect(cd.height).toBeCloseTo(cu.height, 5);
    // top-left y in down-frame = bbHeight - upper-right y = bbHeight - (ll.y + h)
    expect(cd.y).toBeCloseTo(cbbH - (cu.y + cu.height), 5);
  });

  it("yAxis:'down' bbox rounds to the render() class=\"cluster\" polygon", () => {
    const gc = layoutGraph(CLUSTER_SRC);
    const snap = getLayout(gc);
    const c = snap.clusters[0];
    // render() emits the polygon in the y-negated pre-translate frame; the
    // absolute corner spans (rounded) are what byte-conformance compares.
    const svg = render(parse(CLUSTER_SRC), 'svg', { engine: 'dot' });
    const pts = /class="cluster"[\s\S]*?points="([^"]+)"/.exec(svg);
    expect(pts).not.toBeNull();
    const xs = pts![1].trim().split(/\s+/).map((p) => Number(p.split(',')[0]));
    const ysNeg = pts![1].trim().split(/\s+/).map((p) => Number(p.split(',')[1]));
    const polyMinX = Math.min(...xs);
    const polyMaxX = Math.max(...xs);
    // polygon y is negated (native y-up drawn as -y); take absolute extents.
    const polyMinY = Math.min(...ysNeg.map((y) => -y));
    const polyMaxY = Math.max(...ysNeg.map((y) => -y));
    // down-frame top-left origin: x spans [x, x+w]; y (flipped) spans the
    // same absolute band as the negated polygon, top = bbHeight - polyMaxY.
    expect(Math.round(c.x)).toBe(Math.round(polyMinX));
    expect(Math.round(c.x + c.width)).toBe(Math.round(polyMaxX));
    // height matches the polygon's vertical extent regardless of frame origin.
    expect(Math.round(c.height)).toBe(Math.round(polyMaxY - polyMinY));
  });

  it('nested clusters each get their own entry', () => {
    const gc = layoutGraph(
      'digraph { subgraph cluster_outer { subgraph cluster_inner { a } b } c; a->c; }',
    );
    const snap = getLayout(gc);
    const names = snap.clusters.map((c) => c.name).sort();
    expect(names).toEqual(['cluster_inner', 'cluster_outer']);
    // inner cluster is contained within the outer one (up-frame)
    const up = getLayout(gc, { yAxis: 'up' });
    const outer = up.clusters.find((c) => c.name === 'cluster_outer')!;
    const inner = up.clusters.find((c) => c.name === 'cluster_inner')!;
    expect(inner.x).toBeGreaterThanOrEqual(outer.x);
    expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width);
  });

  it('cluster snapshot is JSON-serializable', () => {
    const gc = layoutGraph(CLUSTER_SRC);
    const snap = getLayout(gc);
    const round = JSON.parse(JSON.stringify(snap)) as typeof snap;
    expect(round.clusters).toEqual(snap.clusters);
  });
});
