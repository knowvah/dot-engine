// SPDX-License-Identifier: EPL-2.0

/**
 * T3f — branch-coverage tests for gvc/anchor.ts.
 *
 * anchor.test.ts already exercises the whole-object anchor markup (URL /
 * edgeURL / labelURL / tailURL / headURL / edgetooltip) via renderSvg, and
 * map-renderers.test.ts already unit-tests the plain-rectangle node map, the
 * graph/label map, and a single straight-line edge spline map. This file
 * targets what those leave uncovered per the T3f digest: resolveObjAnchor's
 * `target` attr, the openAnchorWith/beginAnchorIf null-coalescing gate, the
 * polygon/ellipse/n-gon node hot-spot dispatch inside nodePolyMap (never
 * reached before — every prior computeNodeUrlMap test used an unshaped
 * bbox node), and the recursive Bezier-flattening branches in
 * approxBezier/ptToLine2/bezierHalf (never reached before — the only prior
 * spline test used a perfectly straight, already-flat control polygon).
 *
 * Mode: unit, hand-built fixtures (D1/D4/D5) — mirrors rank.branch.test.ts.
 *
 * @see lib/common/emit.c (anchor + hot-spot machinery)
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../model/graph.js';
import { Node } from '../model/node.js';
import type { Point } from '../model/geom.js';
import type { PolygonT } from '../common/types.js';
import type { RendererPlugin } from './context.js';
import { RenderJob, createObjState, MapShape } from './job.js';
import type { TextMeasurer } from '../common/textmeasure.js';
import {
  resolveObjAnchor, openAnchorWith, beginAnchorIf,
  computeNodeUrlMap, computeEdgeSplineMaps, type MapCtx,
} from './anchor.js';

const measurer: TextMeasurer = { measure: () => ({ w: 0, h: 0 }) };

// ---------------------------------------------------------------------------
// Local helpers (test/helpers/ is T3c's territory — kept self-contained)
// ---------------------------------------------------------------------------

/** unitCtx: origin bb, no pad/margin, identity scale — mapTransform reduces
 *  to x unchanged, y flipped as (72 - y). */
function unitCtx(overrides: Partial<MapCtx> = {}): MapCtx {
  return {
    bb: { ll: { x: 0, y: 0 }, ur: { x: 144, y: 72 } },
    pad: { x: 0, y: 0 }, scale: 1, marginOff: { x: 0, y: 0 }, mapPolygon: true,
    ...overrides,
  };
}

/** A node with an href hot spot, default coord/lw/rw/ht, overridable. */
function hotNode(overrides: {
  coord?: Point; lw?: number; rw?: number; ht?: number;
} = {}): Node {
  const g = new Graph('G', 'directed');
  const n = new Node(0, 'n', g);
  n.attrs.set('href', 'x.html');
  n.info.coord = overrides.coord ?? { x: 0, y: 0 };
  n.info.lw = overrides.lw ?? 10;
  n.info.rw = overrides.rw ?? 10;
  n.info.ht = overrides.ht ?? 10;
  return n;
}

/** Minimal PolygonT — only the fields anchor.ts's shape dispatch reads. */
function poly(overrides: Partial<PolygonT>): PolygonT {
  return {
    regular: false, peripheries: 1, sides: 4, orientation: 0,
    distortion: 0, skew: 0, vertices: [],
    option: {} as PolygonT['option'],
    ...overrides,
  } as PolygonT;
}

/** Recording RendererPlugin — only beginAnchor is exercised here. */
class RecordingRenderer implements RendererPlugin {
  readonly type = 'test';
  readonly quality = 0;
  calls: { href: string; tooltip: string; target: string; id: string }[] = [];
  beginGraph() {}
  endGraph() {}
  beginNode() {}
  endNode() {}
  beginEdge() {}
  endEdge() {}
  textspan() {}
  ellipse() {}
  polygon() {}
  bezier() {}
  polyline() {}
  beginAnchor(href: string, tooltip: string, target: string, id: string): void {
    this.calls.push({ href, tooltip, target, id });
  }
}

// ---------------------------------------------------------------------------
// resolveObjAnchor — target attr (L183; tooltip/url/label paths are already
// covered by anchor.test.ts's graph/cluster renderSvg assertions)
// ---------------------------------------------------------------------------

describe('resolveObjAnchor — target', () => {
  it('resolves a graph-level target attr onto obj.target', () => {
    const g = new Graph('G', 'directed');
    g.attrs.set('target', '_top');
    const obj = createObjState();
    resolveObjAnchor(g, null, 'graph0', obj);
    expect(obj.target).toBe('_top');
  });

  it('leaves obj.target null when no target attr is set anywhere', () => {
    const g = new Graph('G', 'directed');
    const obj = createObjState();
    resolveObjAnchor(g, null, 'graph0', obj);
    expect(obj.target).toBeNull();
  });

  it('an explicit tooltip attr wins over the label fallback and sets explicitTooltip', () => {
    const g = new Graph('G', 'directed');
    g.attrs.set('tooltip', 'explicit tip');
    const obj = createObjState();
    resolveObjAnchor(g, 'the-label', 'graph0', obj);
    expect(obj.tooltip).toBe('explicit tip');
    expect(obj.explicitTooltip).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// openAnchorWith / beginAnchorIf — the null-coalescing gate
// @see lib/common/emit.c:2877/3653/3803 (`obj->url || obj->explicit_tooltip`)
// ---------------------------------------------------------------------------

describe('beginAnchorIf', () => {
  it('returns false and calls nothing when job.obj is null', () => {
    const job = new RenderJob('test', measurer);
    const r = new RecordingRenderer();
    expect(beginAnchorIf(r, job)).toBe(false);
    expect(r.calls).toHaveLength(0);
  });

  it('returns false when url is null and tooltip is not explicit', () => {
    const job = new RenderJob('test', measurer);
    job.pushObj(createObjState());
    const r = new RecordingRenderer();
    expect(beginAnchorIf(r, job)).toBe(false);
    expect(r.calls).toHaveLength(0);
  });

  it('opens with "" fallbacks for url/target when only tooltip is explicit', () => {
    const job = new RenderJob('test', measurer);
    const obj = createObjState();
    obj.explicitTooltip = true;
    obj.tooltip = 'hi';
    obj.id = 'x';
    job.pushObj(obj);
    const r = new RecordingRenderer();
    expect(beginAnchorIf(r, job)).toBe(true);
    expect(r.calls).toEqual([{ href: '', tooltip: 'hi', target: '', id: 'x' }]);
  });

  it('passes url/target through and "" for a null tooltip', () => {
    const job = new RenderJob('test', measurer);
    const obj = createObjState();
    obj.url = 'http://x';
    obj.target = '_blank';
    obj.id = 'y';
    job.pushObj(obj);
    const r = new RecordingRenderer();
    expect(beginAnchorIf(r, job)).toBe(true);
    expect(r.calls).toEqual([{ href: 'http://x', tooltip: '', target: '_blank', id: 'y' }]);
  });

  it('falls back to "" for a null obj.id', () => {
    const job = new RenderJob('test', measurer);
    const obj = createObjState();
    obj.url = 'http://x';
    job.pushObj(obj);
    const r = new RecordingRenderer();
    beginAnchorIf(r, job);
    expect(r.calls).toEqual([{ href: 'http://x', tooltip: '', target: '', id: '' }]);
  });

  it('openAnchorWith coalesces a null id-less call directly', () => {
    const job = new RenderJob('test', measurer);
    const r = new RecordingRenderer();
    openAnchorWith(r, job, null, null, null, 'z');
    expect(r.calls).toEqual([{ href: '', tooltip: '', target: '', id: 'z' }]);
  });
});

// ---------------------------------------------------------------------------
// computeNodeUrlMap — the polygon hot-spot dispatch (nodePolyMap /
// ellipseNodeMap / generalNodeMap / samplePoints), never reached by any
// prior test (every earlier computeNodeUrlMap test used an unshaped node).
// @see lib/common/emit.c:1691-1778
// ---------------------------------------------------------------------------

describe('computeNodeUrlMap — regular polygon (circle)', () => {
  it('regular=true maps to Circle: center + coord-relative UR corner', () => {
    const n = hotNode({ coord: { x: 50, y: 50 } });
    n.info.shape_info = poly({
      regular: true, sides: 1, peripheries: 1,
      vertices: [{ x: 0, y: 0 }, { x: 20, y: 15 }],
    });
    const obj = createObjState();
    computeNodeUrlMap(n, obj, unitCtx());
    expect(obj.urlMapShape).toBe(MapShape.Circle);
    // pts = [coord, coord+ur] = [(50,50),(70,65)] -> y flips as 72-y
    expect(obj.urlMapPts).toEqual([{ x: 50, y: 22 }, { x: 70, y: 7 }]);
  });
});

describe('computeNodeUrlMap — non-regular ellipse (pEllipse sampling)', () => {
  it('regular=false samples samplepoints points around the ellipse', () => {
    const n = hotNode({ coord: { x: 0, y: 0 } });
    n.attrs.set('samplepoints', '6');
    n.info.shape_info = poly({
      regular: false, sides: 0, peripheries: 1,
      vertices: [{ x: 0, y: 0 }, { x: 30, y: 20 }],
    });
    const obj = createObjState();
    computeNodeUrlMap(n, obj, unitCtx());
    expect(obj.urlMapShape).toBe(MapShape.Polygon);
    expect(obj.urlMapPts).toHaveLength(6);
    // theta=0 sample: (a*cos0, b*sin0) + coord = (30,0) -> y flips to 72
    expect(obj.urlMapPts[0]).toEqual({ x: 30, y: 72 });
  });
});

describe('computeNodeUrlMap — samplepoints clamping', () => {
  it('an out-of-range samplepoints (>60) falls back to the 20-point default', () => {
    const n = hotNode({ coord: { x: 0, y: 0 } });
    n.attrs.set('samplepoints', '999');
    n.info.shape_info = poly({
      regular: false, sides: 0, peripheries: 1,
      vertices: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
    });
    const obj = createObjState();
    computeNodeUrlMap(n, obj, unitCtx());
    expect(obj.urlMapPts).toHaveLength(20);
  });

  it('a non-numeric samplepoints falls back to the 20-point default', () => {
    const n = hotNode({ coord: { x: 0, y: 0 } });
    n.attrs.set('samplepoints', 'abc');
    n.info.shape_info = poly({
      regular: false, sides: 0, peripheries: 1,
      vertices: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
    });
    const obj = createObjState();
    computeNodeUrlMap(n, obj, unitCtx());
    expect(obj.urlMapPts).toHaveLength(20);
  });
});

describe('computeNodeUrlMap — no-periphery unfilled node maps to a text-bbox rectangle', () => {
  it('peripheries=0 and unfilled uses the lw/ht bbox (nodePolyMap, not computeNodeUrlMap\'s own bbox path)', () => {
    const n = hotNode({ coord: { x: 40, y: 30 }, lw: 10, ht: 8 });
    // isRectPoly(poly) is true (sides=4, axis-aligned, no distortion/skew),
    // but peripheries===0 && !filled forces isRect=false so nodePolyMap runs.
    n.info.shape_info = poly({ peripheries: 0, sides: 4 });
    const obj = createObjState();
    computeNodeUrlMap(n, obj, unitCtx());
    expect(obj.urlMapShape).toBe(MapShape.Rectangle);
    // nodePolyMap's rect uses info.lw on BOTH sides (not rw): (40-10,30-4)..(40+10,30+4)
    expect(obj.urlMapPts).toEqual([{ x: 30, y: 46 }, { x: 50, y: 38 }]);
  });
});

describe('computeNodeUrlMap — peripheries=0 but filled skips the bbox branch', () => {
  it('filled + sides>=samplepoints dispatches to the general n-gon stepping branch', () => {
    const n = hotNode({ coord: { x: 0, y: 0 } });
    n.attrs.set('style', 'filled');
    n.attrs.set('samplepoints', '4');
    const vertices: Point[] = Array.from({ length: 8 }, (_, i) => ({ x: i, y: i }));
    n.info.shape_info = poly({ peripheries: 0, sides: 8, vertices });
    const obj = createObjState();
    computeNodeUrlMap(n, obj, unitCtx());
    expect(obj.urlMapShape).toBe(MapShape.Polygon);
    // delta = trunc(8/4) = 2 -> vertices[0,2,4,6], y flips as 72-y
    expect(obj.urlMapPts).toEqual([
      { x: 0, y: 72 }, { x: 2, y: 70 }, { x: 4, y: 68 }, { x: 6, y: 66 },
    ]);
  });
});

describe('computeNodeUrlMap — general n-gon, sides < samplepoints', () => {
  it('copies every vertex when the polygon has fewer sides than the sample count', () => {
    const n = hotNode({ coord: { x: 0, y: 0 } });
    const vertices: Point[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
    n.info.shape_info = poly({ peripheries: 1, sides: 3, vertices });
    const obj = createObjState();
    computeNodeUrlMap(n, obj, unitCtx());
    expect(obj.urlMapShape).toBe(MapShape.Polygon);
    expect(obj.urlMapPts).toEqual([
      { x: 0, y: 72 }, { x: 1, y: 71 }, { x: 2, y: 70 },
    ]);
  });

  it('peripheries>=2 uses poly.peripheries directly (offset into the outer ring)', () => {
    const n = hotNode({ coord: { x: 0, y: 0 } });
    // offset = (peripheries-1)*sides = (3-1)*3 = 6 -> reads vertices[6..8]
    const vertices: Point[] = Array.from({ length: 9 }, (_, i) => ({ x: i, y: i }));
    n.info.shape_info = poly({ peripheries: 3, sides: 3, vertices });
    const obj = createObjState();
    computeNodeUrlMap(n, obj, unitCtx());
    expect(obj.urlMapPts).toEqual([
      { x: 6, y: 66 }, { x: 7, y: 65 }, { x: 8, y: 64 },
    ]);
  });
});

describe('computeNodeUrlMap — isRect true skips nodePolyMap entirely', () => {
  it('an axis-aligned rectangular polygon with peripheries!=0 uses the asymmetric lw/rw bbox', () => {
    const n = hotNode({ coord: { x: 0, y: 0 }, lw: 10, rw: 25, ht: 12 });
    n.info.shape_info = poly({
      peripheries: 1, sides: 4, orientation: 0, distortion: 0, skew: 0,
      vertices: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }],
    });
    const obj = createObjState();
    computeNodeUrlMap(n, obj, unitCtx());
    expect(obj.urlMapShape).toBe(MapShape.Rectangle);
    // Asymmetric lw(10)/rw(25) proves this is computeNodeUrlMap's own bbox
    // branch (bypassing nodePolyMap, which would use lw for both sides).
    expect(obj.urlMapPts).toEqual([{ x: -10, y: 78 }, { x: 25, y: 66 }]);
  });
});

// ---------------------------------------------------------------------------
// computeEdgeSplineMaps — recursive Bezier flattening (approxBezier /
// bezierHalf / ptToLine2), never reached before (the only prior test used a
// perfectly straight, already-flat control polygon).
// @see lib/common/emit.c:map_output_bspline / check_control_points
// ---------------------------------------------------------------------------

describe('computeEdgeSplineMaps — a curved edge requires recursive subdivision', () => {
  it('flattens a wide S-curve into an 18-point outline (not the 4-point straight-line case)', () => {
    const spl = {
      list: [{
        list: [{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 0 }],
        size: 4, sflag: 0, eflag: 0, sp: { x: 0, y: 0 }, ep: { x: 100, y: 0 },
      }],
      size: 1, bb: { ll: { x: 0, y: 0 }, ur: { x: 100, y: 100 } },
    };
    const polys = computeEdgeSplineMaps(spl, 2, unitCtx());
    expect(polys).toHaveLength(1);
    expect(polys[0]).toHaveLength(18);
    const round = (p: Point) => ({ x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 });
    // Spot-check the first offset point (near sp) and the apex-adjacent point.
    expect(round(polys[0]![0]!)).toEqual({ x: -1.983, y: 71.74 });
    expect(round(polys[0]![4]!)).toEqual({ x: 50, y: -5 });
  });
});
