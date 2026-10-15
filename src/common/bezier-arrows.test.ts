// SPDX-License-Identifier: EPL-2.0
/**
 * Per-bezier arrowheads. C draws an arrowhead for every bezier whose s/eflag
 * is set (emit_edge_graphics' per-bezier arrow_gen loop). The port computes
 * arrows at layout time, so an edge whose spline holds two beziers flagged at
 * the same end — C's neato fallback when makeMultiSpline fails partway and
 * makeSpline appends a second bezier (fdp 2471 `n138 -> n40`) — must keep one
 * arrow per bezier, not one per edge end.
 *
 * @see lib/common/emit.c:emit_edge_graphics (2669-2675)
 * @see lib/neatogen/neatosplines.c:683-701 (multispline fallback)
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../model/graph.js';
import { Node } from '../model/node.js';
import { Edge } from '../model/edge.js';
import { makePort } from '../model/edgeInfo.js';
import type { Bezier, Point } from '../model/geom.js';
import type { ArrowDrawOp } from './arrows-types.js';
import { clipAndInstall } from './splines-clip.js';
import { endArrowOps } from './bezier-arrows.js';
import { SINFO } from '../layout/neato/splines.js';
import { XdotRenderer } from '../render/dot.js';
import { svgEdgePath } from '../render/svg-helpers.js';
import { RenderJob, createObjState, ObjType } from '../gvc/job.js';
import { PenType } from '../gvc/context.js';
import type { TextMeasurer } from './textmeasure.js';

const measurer: TextMeasurer = { measure: () => ({ w: 0, h: 0 }) };

const ABOVE: Point[] = [{ x: 0, y: 0 }, { x: 60, y: 40 }, { x: 140, y: 40 }, { x: 200, y: 0 }];
const BELOW: Point[] = [{ x: 0, y: 0 }, { x: 60, y: -40 }, { x: 140, y: -40 }, { x: 200, y: 0 }];

function directedEdge(): Edge {
  const g = new Graph('G', 'directed');
  const mk = (name: string, x: number): Node => {
    const n = new Node(g.nodes.size, name, g);
    n.info.coord = { x, y: 0 };
    n.info.lw = 27; n.info.rw = 27; n.info.ht = 36;
    g.nodes.set(name, n);
    return n;
  };
  const e = new Edge(mk('a', 0), mk('b', 200), '');
  e.info.tail_port = makePort(); e.info.tail_port.clip = false;
  e.info.head_port = makePort(); e.info.head_port.clip = false;
  g.edges.push(e);
  g.info.bb = { ll: { x: -27, y: -40 }, ur: { x: 227, y: 40 } };
  return e;
}

const poly = (x: number): ArrowDrawOp[] =>
  [{ kind: 'polygon', points: [{ x, y: 0 }, { x: x + 1, y: 1 }, { x: x + 2, y: 0 }], filled: true }];

function bez(pts: Point[], sflag: number, eflag: number, extra: Partial<Bezier> = {}): Bezier {
  return { list: pts, size: pts.length, sflag, eflag, sp: pts[0]!, ep: pts[pts.length - 1]!, ...extra };
}

function withSpline(list: Bezier[]): Edge {
  const e = directedEdge();
  e.info.spl = { size: list.length, list, bb: { ll: { x: 0, y: -40 }, ur: { x: 200, y: 40 } } };
  return e;
}

describe('clipAndInstall stashes each bezier its own arrow', () => {
  it('a second install keeps the first bezier\'s head arrow', () => {
    const e = directedEdge();
    clipAndInstall(e, e.head, ABOVE.map((p) => ({ ...p })), 4, SINFO);
    clipAndInstall(e, e.head, BELOW.map((p) => ({ ...p })), 4, SINFO);
    const [b1, b2] = e.info.spl!.list;
    expect(b1!.eflag).not.toBe(0);
    expect(b2!.eflag).not.toBe(0);
    expect(b2!.eArrowOps).toEqual(e.info.headArrowOps);
    expect(b1!.eArrowOps).toHaveLength(1);
    expect(b1!.eArrowOps).not.toEqual(b2!.eArrowOps);
  });
});

describe('endArrowOps', () => {
  it('returns one list per flagged bezier when two beziers share the end', () => {
    const e = withSpline([bez(ABOVE, 0, 1, { eArrowOps: poly(1) }), bez(BELOW, 0, 1, { eArrowOps: poly(2) })]);
    e.info.headArrowOps = poly(2);
    expect(endArrowOps(e, 'head')).toEqual([poly(1), poly(2)]);
  });

  it('keeps the edge-level ops when at most one bezier carries the flag', () => {
    const e = withSpline([bez(ABOVE, 0, 0), bez(BELOW, 0, 1, { eArrowOps: poly(7) })]);
    e.info.headArrowOps = poly(3);
    expect(endArrowOps(e, 'head')).toEqual([poly(3)]);
    expect(endArrowOps(e, 'tail')).toEqual([]);
  });

  it('falls back to the edge-level ops for a flagged bezier without its own', () => {
    const e = withSpline([bez(ABOVE, 1, 0), bez(BELOW, 1, 0, { sArrowOps: poly(5) })]);
    e.info.tailArrowOps = poly(4);
    expect(endArrowOps(e, 'tail')).toEqual([poly(4), poly(5)]);
  });
});

function edgeObj(): ReturnType<typeof createObjState> {
  const obj = createObjState(ObjType.Edge);
  obj.penColor = { type: 'string', s: 'black' };
  obj.pen = PenType.Solid;
  obj.penWidth = 1;
  return obj;
}

describe('emitters draw one arrowhead per flagged bezier', () => {
  const twoHeads = (): Edge => {
    const e = withSpline([bez(ABOVE, 0, 1, { eArrowOps: poly(10) }), bez(BELOW, 0, 1, { eArrowOps: poly(20) })]);
    e.info.headArrowOps = poly(20);
    return e;
  };

  it('xdot _hdraw_ carries both polygons in bezier order', () => {
    const job = new RenderJob('xdot', measurer);
    job.bb = { ll: { x: -50, y: -50 }, ur: { x: 250, y: 50 } };
    job.pushObj(edgeObj());
    const r = new XdotRenderer();
    const e = twoHeads();
    r.beginGraph(e.tail.root, job);
    r.beginEdge(e, job);
    r.endEdge(e, job);
    const hdraw = r.drawStringsByObject().get(e)?.hdraw ?? '';
    expect(hdraw.match(/P 3 /g)).toHaveLength(2);
    expect(hdraw.indexOf('P 3 10 ')).toBeLessThan(hdraw.indexOf('P 3 20 '));
  });

  it('svg interleaves each arrow after its own bezier', () => {
    const job = new RenderJob('svg', measurer);
    job.devscale = { x: 1, y: -1 };
    job.translation = { x: 0, y: 0 };
    job.rotation = 0;
    job.zoom = 1;
    job.pushObj(edgeObj());
    svgEdgePath(twoHeads(), job);
    const tags = job.output.join('').match(/<(path|polygon)/g);
    expect(tags).toEqual(['<path', '<polygon', '<path', '<polygon']);
  });
});
