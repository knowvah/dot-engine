// SPDX-License-Identifier: EPL-2.0
//
// T3b (coverage-90, batch-3): branch coverage for layout/neato/set-aspect.ts.
// Exercises neatoRatioKind's ratio-attr dispatch (via parseNeatoDrawing),
// scaleBB/translateG cluster recursion, neatoTranslate's xlabel/spline
// shift branches, aspectFactors' fill/expand/value arithmetic, and
// neatoSetAspectRatio's root/drawing/bb guards.
// @see lib/neatogen/neatosplines.c:1023 _neato_set_aspect
// @see lib/common/input.c:setRatio

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { makeDrawing } from '../../model/layoutParams.js';
import {
  parseNeatoDrawing, neatoTranslate, neatoSetAspectRatio,
} from './set-aspect.js';

// ---------------------------------------------------------------------------
// parseNeatoDrawing — neatoRatioKind + neatoSizePoints dispatch
// ---------------------------------------------------------------------------

describe('parseNeatoDrawing: ratio-attr dispatch', () => {
  it('no-ops when g.info.drawing is already set', () => {
    const g = new Graph('g', 'undirected');
    g.info.drawing = makeDrawing({ ratioKind: 'fill', ratio: 0, size: { x: 1, y: 1 } });
    g.attrs.set('ratio', 'compress');
    parseNeatoDrawing(g);
    expect(g.info.drawing?.ratioKind).toBe('fill');
  });

  it('no-ops when neither ratio nor size is set', () => {
    const g = new Graph('g', 'undirected');
    parseNeatoDrawing(g);
    expect(g.info.drawing).toBeUndefined();
  });

  it('ratio="auto" sets ratioKind auto', () => {
    const g = new Graph('g', 'undirected');
    g.attrs.set('ratio', 'auto');
    parseNeatoDrawing(g);
    expect(g.info.drawing?.ratioKind).toBe('auto');
  });

  it('ratio="compress" sets ratioKind compress', () => {
    const g = new Graph('g', 'undirected');
    g.attrs.set('ratio', 'compress');
    parseNeatoDrawing(g);
    expect(g.info.drawing?.ratioKind).toBe('compress');
  });

  it('ratio="expand" sets ratioKind expand', () => {
    const g = new Graph('g', 'undirected');
    g.attrs.set('ratio', 'expand');
    parseNeatoDrawing(g);
    expect(g.info.drawing?.ratioKind).toBe('expand');
  });

  it('ratio="fill" sets ratioKind fill', () => {
    const g = new Graph('g', 'undirected');
    g.attrs.set('ratio', 'fill');
    parseNeatoDrawing(g);
    expect(g.info.drawing?.ratioKind).toBe('fill');
  });

  it('ratio="1.5" (positive number) sets ratioKind value + ratio', () => {
    const g = new Graph('g', 'undirected');
    g.attrs.set('ratio', '1.5');
    parseNeatoDrawing(g);
    expect(g.info.drawing?.ratioKind).toBe('value');
    expect(g.info.drawing?.ratio).toBe(1.5);
  });

  it('ratio="-1" (non-positive number) is rejected: falls back to size-only', () => {
    const g = new Graph('g', 'undirected');
    g.attrs.set('ratio', '-1');
    g.attrs.set('size', '10,8');
    parseNeatoDrawing(g);
    expect(g.info.drawing?.ratioKind).toBe('none');
    expect(g.info.drawing?.ratio).toBe(0);
  });

  it('size="10,8" sets size in points (72 pt/in)', () => {
    const g = new Graph('g', 'undirected');
    g.attrs.set('ratio', 'fill');
    g.attrs.set('size', '10,8');
    parseNeatoDrawing(g);
    expect(g.info.drawing?.size).toEqual({ x: 720, y: 576 });
  });

  it('no size attr defaults drawing.size to {0,0}', () => {
    const g = new Graph('g', 'undirected');
    g.attrs.set('ratio', 'fill');
    parseNeatoDrawing(g);
    expect(g.info.drawing?.size).toEqual({ x: 0, y: 0 });
  });
});

// ---------------------------------------------------------------------------
// neatoTranslate — bb guard, xlabel branch, edge-spline branch, cluster recursion
// ---------------------------------------------------------------------------

describe('neatoTranslate', () => {
  it('no-ops when bb is falsy', () => {
    const g = new Graph('g', 'undirected');
    (g.info as unknown as { bb: undefined }).bb = undefined;
    const n = new Node(0, 'n', g);
    n.info.pos = [1, 2];
    g.nodes.set('n', n);
    neatoTranslate(g);
    expect(n.info.pos).toEqual([1, 2]);
  });

  it('shifts node pos, xlabel (set:true), and edge spline points by -ll', () => {
    const g = new Graph('g', 'undirected');
    g.info.bb = { ll: { x: 10, y: 20 }, ur: { x: 100, y: 100 } };
    const a = new Node(0, 'A', g);
    a.info.pos = [5, 6];
    a.info.xlabel = { set: true, pos: { x: 50, y: 60 } };
    const b = new Node(1, 'B', g);
    // b has no pos: exercises the `!n.info.pos` seed-to-[0,0] branch.
    g.nodes.set('A', a);
    g.nodes.set('B', b);
    const e = new Edge(a, b, 'AB');
    e.info.spl = {
      list: [{
        list: [{ x: 15, y: 25 }, { x: 20, y: 30 }],
        size: 2, sflag: 0, eflag: 0, sp: { x: 0, y: 0 }, ep: { x: 0, y: 0 },
      }],
      size: 1,
      bb: { ll: { x: 0, y: 0 }, ur: { x: 0, y: 0 } },
    };
    g.edges.push(e);

    neatoTranslate(g);

    const ox = 10 / 72;
    const oy = 20 / 72;
    expect(a.info.pos).toEqual([5 - ox, 6 - oy]);
    expect(b.info.pos).toEqual([0 - ox, 0 - oy]);
    expect(a.info.xlabel).toEqual({ set: true, pos: { x: 40, y: 40 } });
    expect(e.info.spl.list[0]!.list).toEqual([{ x: 5, y: 5 }, { x: 10, y: 10 }]);
  });

  it('skips xlabel shift when set is false, and skips edges with no spl', () => {
    const g = new Graph('g', 'undirected');
    g.info.bb = { ll: { x: 1, y: 1 }, ur: { x: 5, y: 5 } };
    const a = new Node(0, 'A', g);
    a.info.pos = [0, 0];
    a.info.xlabel = { set: false, pos: { x: 9, y: 9 } };
    const b = new Node(1, 'B', g);
    b.info.pos = [0, 0];
    g.nodes.set('A', a);
    g.nodes.set('B', b);
    const e = new Edge(a, b, 'AB'); // no info.spl
    g.edges.push(e);

    neatoTranslate(g);

    expect(a.info.xlabel).toEqual({ set: false, pos: { x: 9, y: 9 } });
    expect(e.info.spl).toBeUndefined();
  });

  it('falls back to 0 for missing pos[0]/pos[1] elements (pos = [])', () => {
    const g = new Graph('g', 'undirected');
    g.info.bb = { ll: { x: 8, y: 16 }, ur: { x: 50, y: 50 } };
    const n = new Node(0, 'n', g);
    n.info.pos = []; // truthy array, but pos[0]/pos[1] are undefined
    g.nodes.set('n', n);
    neatoTranslate(g);
    expect(n.info.pos).toEqual([-8 / 72, -16 / 72]);
  });

  it('translateG recurses into clusters, scaling their bb too', () => {
    const g = new Graph('g', 'undirected');
    g.info.bb = { ll: { x: 2, y: 4 }, ur: { x: 50, y: 50 } };
    const clusterWithBb = new Graph('clusterWithBb', 'undirected');
    clusterWithBb.info.bb = { ll: { x: 2, y: 4 }, ur: { x: 20, y: 20 } };
    const clusterNoBb = new Graph('clusterNoBb', 'undirected');
    (clusterNoBb.info as unknown as { bb: undefined }).bb = undefined;
    g.info.clust = [clusterWithBb, clusterNoBb];

    neatoTranslate(g);

    expect(clusterWithBb.info.bb).toEqual({ ll: { x: 0, y: 0 }, ur: { x: 18, y: 16 } });
  });
});

// ---------------------------------------------------------------------------
// neatoSetAspectRatio — root/drawing/bb guards, aspectFactors branches
// ---------------------------------------------------------------------------

describe('neatoSetAspectRatio: guards', () => {
  it('returns false for a non-root graph', () => {
    const root = new Graph('root', 'undirected');
    const sub = new Graph('sub', 'undirected');
    sub.root = root;
    sub.parent = root;
    expect(neatoSetAspectRatio(sub)).toBe(false);
  });

  it('returns false when drawing is undefined', () => {
    const g = new Graph('g', 'undirected');
    expect(neatoSetAspectRatio(g)).toBe(false);
  });

  it('returns false when drawing.ratioKind is "none"', () => {
    const g = new Graph('g', 'undirected');
    g.info.drawing = makeDrawing({ ratioKind: 'none', ratio: 0, size: { x: 0, y: 0 } });
    expect(neatoSetAspectRatio(g)).toBe(false);
  });

  it('returns false when bb is falsy', () => {
    const g = new Graph('g', 'undirected');
    g.info.drawing = makeDrawing({ ratioKind: 'fill', ratio: 0, size: { x: 100, y: 100 } });
    (g.info as unknown as { bb: undefined }).bb = undefined;
    expect(neatoSetAspectRatio(g)).toBe(false);
  });

  it('translates when bb.ll is off-origin, even with no scale factors (compress)', () => {
    const g = new Graph('g', 'undirected');
    g.info.drawing = makeDrawing({ ratioKind: 'compress', ratio: 0, size: { x: 0, y: 0 } });
    g.info.bb = { ll: { x: 10, y: 20 }, ur: { x: 100, y: 100 } };
    const n = new Node(0, 'n', g);
    n.info.pos = [5, 6];
    g.nodes.set('n', n);
    const result = neatoSetAspectRatio(g);
    expect(result).toBe(true);
    // Only translated (inches): ll.x/72, ll.y/72 subtracted.
    expect(n.info.pos).toEqual([5 - 10 / 72, 6 - 20 / 72]);
  });

  it('does not translate when bb.ll is already at the origin', () => {
    const g = new Graph('g', 'undirected');
    g.info.drawing = makeDrawing({ ratioKind: 'compress', ratio: 0, size: { x: 0, y: 0 } });
    g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 100, y: 100 } };
    const n = new Node(0, 'n', g);
    n.info.pos = [5, 6];
    g.nodes.set('n', n);
    expect(neatoSetAspectRatio(g)).toBe(false);
    expect(n.info.pos).toEqual([5, 6]);
  });

  it('skips nodes with no pos when scaling', () => {
    const g = new Graph('g', 'undirected');
    g.info.drawing = makeDrawing({ ratioKind: 'value', ratio: 2, size: { x: 0, y: 0 } });
    g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 10, y: 5 } };
    const n = new Node(0, 'n', g);
    // n.info.pos left undefined
    g.nodes.set('n', n);
    expect(neatoSetAspectRatio(g)).toBe(true);
    expect(n.info.pos).toBeUndefined();
  });

  it('falls back to 0 for missing pos[0]/pos[1] elements when scaling', () => {
    const g = new Graph('g', 'undirected');
    g.info.drawing = makeDrawing({ ratioKind: 'value', ratio: 2, size: { x: 0, y: 0 } });
    g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 10, y: 5 } };
    const n = new Node(0, 'n', g);
    n.info.pos = []; // truthy array, elements undefined
    g.nodes.set('n', n);
    neatoSetAspectRatio(g);
    // actual = 5/10 = 0.5 < desired(2) => yf = 2/0.5 = 4, xf = 1
    expect(n.info.pos).toEqual([0, 0]);
  });

  it('scaleBB skips a cluster with no bb during an actual scale', () => {
    const g = new Graph('g', 'undirected');
    g.info.drawing = makeDrawing({ ratioKind: 'value', ratio: 2, size: { x: 0, y: 0 } });
    g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 10, y: 5 } };
    const clusterNoBb = new Graph('clusterNoBb', 'undirected');
    (clusterNoBb.info as unknown as { bb: undefined }).bb = undefined;
    const clusterWithBb = new Graph('clusterWithBb', 'undirected');
    clusterWithBb.info.bb = { ll: { x: 1, y: 1 }, ur: { x: 5, y: 3 } };
    g.info.clust = [clusterNoBb, clusterWithBb];
    neatoSetAspectRatio(g);
    expect(clusterNoBb.info.bb).toBeUndefined();
    // yf=4, xf=1 (see above)
    expect(clusterWithBb.info.bb).toEqual({ ll: { x: 1, y: 4 }, ur: { x: 5, y: 12 } });
  });
});

describe('neatoSetAspectRatio: aspectFactors — fill', () => {
  it('fill with size.x <= 0 returns null (translate-only)', () => {
    const g = new Graph('g', 'undirected');
    g.info.drawing = makeDrawing({ ratioKind: 'fill', ratio: 0, size: { x: 0, y: 100 } });
    g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 10, y: 5 } };
    expect(neatoSetAspectRatio(g)).toBe(false);
  });

  it('fill with xf < yf clamps xf to 1.0 and scales yf/xf', () => {
    const g = new Graph('g', 'undirected');
    // bb ur = (10,10); size = (5, 8) => xf=0.5, yf=0.8; xf<yf => yf/=xf(->1.6), xf=1.0
    g.info.drawing = makeDrawing({ ratioKind: 'fill', ratio: 0, size: { x: 5, y: 8 } });
    g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 10, y: 10 } };
    const n = new Node(0, 'n', g);
    n.info.pos = [2, 3];
    g.nodes.set('n', n);
    expect(neatoSetAspectRatio(g)).toBe(true);
    expect(n.info.pos![0]).toBeCloseTo(2 * 1.0, 10);
    expect(n.info.pos![1]).toBeCloseTo(3 * 1.6, 10);
  });

  it('fill with yf <= xf clamps yf to 1.0 and scales xf/yf', () => {
    // bb ur = (10,10); size = (8, 5) => xf=0.8, yf=0.5; xf>=yf => xf/=yf(->1.6), yf=1.0
    const g = new Graph('g', 'undirected');
    g.info.drawing = makeDrawing({ ratioKind: 'fill', ratio: 0, size: { x: 8, y: 5 } });
    g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 10, y: 10 } };
    const n = new Node(0, 'n', g);
    n.info.pos = [2, 3];
    g.nodes.set('n', n);
    neatoSetAspectRatio(g);
    expect(n.info.pos![0]).toBeCloseTo(2 * 1.6, 10);
    expect(n.info.pos![1]).toBeCloseTo(3 * 1.0, 10);
  });

  it('fill with both xf,yf >= 1 leaves them unclamped', () => {
    // bb ur=(10,10); size=(30,40) => xf=3, yf=4; both >=1, no clamp branch taken
    const g = new Graph('g', 'undirected');
    g.info.drawing = makeDrawing({ ratioKind: 'fill', ratio: 0, size: { x: 30, y: 40 } });
    g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 10, y: 10 } };
    const n = new Node(0, 'n', g);
    n.info.pos = [2, 3];
    g.nodes.set('n', n);
    neatoSetAspectRatio(g);
    expect(n.info.pos![0]).toBeCloseTo(6, 10);
    expect(n.info.pos![1]).toBeCloseTo(12, 10);
  });
});

describe('neatoSetAspectRatio: aspectFactors — expand', () => {
  it('expand with size.x <= 0 returns null', () => {
    const g = new Graph('g', 'undirected');
    g.info.drawing = makeDrawing({ ratioKind: 'expand', ratio: 0, size: { x: -1, y: 100 } });
    g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 10, y: 5 } };
    expect(neatoSetAspectRatio(g)).toBe(false);
  });

  it('expand with xf>1 && yf>1 scales uniformly by min(xf,yf)', () => {
    const g = new Graph('g', 'undirected');
    // bb ur=(10,10); size=(30,40) => xf=3, yf=4 -> scale=min=3
    g.info.drawing = makeDrawing({ ratioKind: 'expand', ratio: 0, size: { x: 30, y: 40 } });
    g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 10, y: 10 } };
    const n = new Node(0, 'n', g);
    n.info.pos = [2, 3];
    g.nodes.set('n', n);
    expect(neatoSetAspectRatio(g)).toBe(true);
    expect(n.info.pos).toEqual([6, 9]);
  });

  it('expand with xf<=1 (not both >1) returns null (translate-only)', () => {
    const g = new Graph('g', 'undirected');
    // bb ur=(10,10); size=(5,40) => xf=0.5 (not >1)
    g.info.drawing = makeDrawing({ ratioKind: 'expand', ratio: 0, size: { x: 5, y: 40 } });
    g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 10, y: 10 } };
    const n = new Node(0, 'n', g);
    n.info.pos = [2, 3];
    g.nodes.set('n', n);
    expect(neatoSetAspectRatio(g)).toBe(false);
    expect(n.info.pos).toEqual([2, 3]);
  });
});

describe('neatoSetAspectRatio: aspectFactors — value', () => {
  it('value ratio with actual < desired stretches y (xf=1, yf=desired/actual)', () => {
    // bb ur=(10,2) => actual = 2/10 = 0.2; desired = 1 => actual<desired
    const g = new Graph('g', 'undirected');
    g.info.drawing = makeDrawing({ ratioKind: 'value', ratio: 1, size: { x: 0, y: 0 } });
    g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 10, y: 2 } };
    const n = new Node(0, 'n', g);
    n.info.pos = [4, 5];
    g.nodes.set('n', n);
    neatoSetAspectRatio(g);
    expect(n.info.pos![0]).toBeCloseTo(4, 10);
    expect(n.info.pos![1]).toBeCloseTo(5 * 5, 10); // desired/actual = 1/0.2 = 5
  });

  it('value ratio with actual >= desired stretches x (yf=1, xf=actual/desired)', () => {
    // bb ur=(10,10) => actual=1; desired=0.5 => actual>=desired
    const g = new Graph('g', 'undirected');
    g.info.drawing = makeDrawing({ ratioKind: 'value', ratio: 0.5, size: { x: 0, y: 0 } });
    g.info.bb = { ll: { x: 0, y: 0 }, ur: { x: 10, y: 10 } };
    const n = new Node(0, 'n', g);
    n.info.pos = [4, 5];
    g.nodes.set('n', n);
    neatoSetAspectRatio(g);
    expect(n.info.pos![0]).toBeCloseTo(4 * 2, 10); // actual/desired = 1/0.5 = 2
    expect(n.info.pos![1]).toBeCloseTo(5, 10);
  });
});
