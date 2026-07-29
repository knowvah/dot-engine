// SPDX-License-Identifier: EPL-2.0

/**
 * T4f — branch-coverage tests for layout/pack/poly-place.ts (polyGraphs,
 * the graph/node/edge-aware polyomino packer used by neato/twopi component
 * packing — distinct from poly-pack.ts's rectangle-only polyRects).
 *
 * Only `computeStep` and `polyGraphs` are exported; index.branch.test.ts
 * (T3f) exercises polyGraphs through index.ts's putGraphs dispatcher with a
 * single simple scenario. This file drives it directly with PackMode.Node
 * (genPoly/coverNode/fillEdge — never reached by the T3f test, which used
 * PackMode.Graph/genBox only), spline sflag/eflag/hole edges, degenerate
 * step sizes, and the `fixed` (pinned-component) accumulation paths.
 *
 * @see lib/pack/pack.c (Freivalds et al., GD 2002 polyomino packing)
 */

import { describe, it, expect } from 'vitest';
import { computeStep, polyGraphs } from './poly-place.js';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import type { Box, Point } from '../../model/geom.js';
import { type PackInfo, PackMode } from './types.js';

function box(llx: number, lly: number, urx: number, ury: number): Box {
  return { ll: { x: llx, y: lly }, ur: { x: urx, y: ury } };
}

function pinfo(overrides: Partial<PackInfo> = {}): PackInfo {
  return {
    aspect: 1, sz: 0, margin: 0, doSplines: false,
    mode: PackMode.Node, fixed: null, vals: null, flags: 0,
    ...overrides,
  };
}

function makeGraph(name = 'G'): Graph {
  return new Graph(name, 'directed');
}

/** A graph with a single sized node at (x,y). */
function nodeGraph(name: string, x: number, y: number, w = 10, h = 10): Graph {
  const g = makeGraph(name);
  const n = new Node(0, `${name}n`, g);
  n.info.coord = { x, y };
  n.info.lw = w; n.info.rw = w; n.info.ht = h;
  g.nodes.set(n.name, n);
  return g;
}

/** A two-node graph with a straight or curved edge between them. */
function edgeGraph(
  name: string,
  opts: { spl?: 'straight-fallback' | 'curved' | 'hole' | 'flags' } = {},
): Graph {
  const g = makeGraph(name);
  const a = new Node(0, `${name}a`, g);
  a.info.coord = { x: 0, y: 0 }; a.info.lw = 2; a.info.rw = 2; a.info.ht = 2;
  const b = new Node(1, `${name}b`, g);
  b.info.coord = { x: 40, y: 0 }; b.info.lw = 2; b.info.rw = 2; b.info.ht = 2;
  g.nodes.set(a.name, a); g.nodes.set(b.name, b);
  const e = new Edge(a, b, '');
  if (opts.spl === 'curved') {
    e.info.spl = {
      list: [{
        list: [{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 30, y: -5 }, { x: 40, y: 0 }],
        size: 4, sflag: 0, eflag: 0, sp: { x: 0, y: 0 }, ep: { x: 40, y: 0 },
      }],
      size: 1, bb: box(0, -5, 40, 5),
    };
  } else if (opts.spl === 'flags') {
    // A bezier with BOTH sflag and eflag set (arrowhead stubs before/after
    // the curve control points), plus 5 control points to exercise the
    // k-loop past k=2.
    e.info.spl = {
      list: [{
        list: [
          { x: 5, y: 0 }, { x: 10, y: 4 }, { x: 20, y: -4 },
          { x: 30, y: 4 }, { x: 35, y: 0 },
        ],
        size: 5, sflag: 1, eflag: 1, sp: { x: 0, y: 0 }, ep: { x: 40, y: 0 },
      }],
      size: 1, bb: box(0, -5, 40, 5),
    };
  } else if (opts.spl === 'hole') {
    e.info.spl = {
      list: [
        undefined as unknown as NonNullable<typeof e.info.spl>['list'][number],
        {
          list: [{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 30, y: -5 }, { x: 40, y: 0 }],
          size: 4, sflag: 0, eflag: 0, sp: { x: 0, y: 0 }, ep: { x: 40, y: 0 },
        },
      ],
      size: 2, bb: box(0, -5, 40, 5),
    };
  }
  // 'straight-fallback' (default): leave e.info.spl undefined.
  g.edges.push(e);
  return g;
}

describe('computeStep', () => {
  it('returns 1 when the computed root is exactly 0 (empty bbs list)', () => {
    expect(computeStep([], 0)).toBe(1);
  });

  it('returns a positive step for a normal bbox list', () => {
    expect(computeStep([box(0, 0, 100, 100)], 0)).toBeGreaterThan(0);
  });

  it('can return a negative root (NOT clamped, unlike poly-pack.ts): drives polyGraphs null', () => {
    // W = 1001 + 2*(-500) = 1, H = 0 + 2*(-500) = -1000 (opposite-sign
    // dimensions from a large negative margin) yields a real, negative
    // root: a=99, b=999, c=1000, d=602001, root=trunc((-999+sqrt(d))/198)=-1.
    const bb = box(0, 0, 1001, 0);
    expect(computeStep([bb], -500)).toBeLessThan(0);
  });
});

describe('polyGraphs — PackMode.Graph (genBox, bbox-only polyomino)', () => {
  it('packs two simple bbox-only graphs', () => {
    const root = makeGraph();
    const g1 = nodeGraph('a', 0, 0, 10, 10);
    const g2 = nodeGraph('b', 100, 0, 10, 10);
    const bbs = [box(-10, -10, 10, 10), box(90, -10, 110, 10)];
    const places = polyGraphs([g1, g2], root, pinfo({ mode: PackMode.Graph }), bbs);
    expect(places).not.toBeNull();
    expect(places!.length).toBe(2);
  });
});

describe('polyGraphs — degenerate inputs', () => {
  it('returns null for an empty graph list', () => {
    const root = makeGraph();
    expect(polyGraphs([], root, pinfo(), [])).toBeNull();
  });

  it('returns null when computeStep yields a non-positive step', () => {
    const root = makeGraph();
    const g = nodeGraph('a', 0, 0);
    const bb = box(0, 0, 1001, 0);
    expect(polyGraphs([g], root, pinfo({ margin: -500 }), [bb])).toBeNull();
  });
});

describe('polyGraphs — PackMode.Node (genPoly/coverNode/fillEdge)', () => {
  it('a straight edge (doSplines=false) covers the tail-to-head chord', () => {
    const g = edgeGraph('s', { spl: 'straight-fallback' });
    const root = g;
    const bb = box(-2, -2, 42, 2);
    const places = polyGraphs([g], root, pinfo({ mode: PackMode.Node, doSplines: false }), [bb]);
    expect(places).not.toBeNull();
    expect(places!.length).toBe(1);
  });

  it('doSplines=true but e.info.spl is undefined falls back to the straight chord', () => {
    const g = edgeGraph('u', { spl: 'straight-fallback' });
    const root = g;
    const bb = box(-2, -2, 42, 2);
    const places = polyGraphs([g], root, pinfo({ mode: PackMode.Node, doSplines: true }), [bb]);
    expect(places).not.toBeNull();
  });

  it('doSplines=true with a real curved spline follows the control points', () => {
    const g = edgeGraph('c', { spl: 'curved' });
    const root = g;
    const bb = box(-2, -6, 42, 6);
    const places = polyGraphs([g], root, pinfo({ mode: PackMode.Node, doSplines: true }), [bb]);
    expect(places).not.toBeNull();
  });

  it('sflag/eflag stub segments and a >2-point k-loop are all covered', () => {
    const g = edgeGraph('f', { spl: 'flags' });
    const root = g;
    const bb = box(-2, -6, 42, 6);
    const places = polyGraphs([g], root, pinfo({ mode: PackMode.Node, doSplines: true }), [bb]);
    expect(places).not.toBeNull();
  });

  it('a hole in spl.list (undefined bezier) is skipped without throwing', () => {
    const g = edgeGraph('h', { spl: 'hole' });
    const root = g;
    const bb = box(-2, -6, 42, 6);
    const places = polyGraphs([g], root, pinfo({ mode: PackMode.Node, doSplines: true }), [bb]);
    expect(places).not.toBeNull();
  });
});

describe('polyGraphs — ring search (fits(0,0) collision) and ring shape', () => {
  it('places a second, colliding graph via the wide ring search (W >= H)', () => {
    const root = makeGraph();
    const g1 = nodeGraph('a', 0, 0, 50, 5); // wide bbox
    const g2 = nodeGraph('b', 0, 0, 50, 5); // identical footprint -> collision
    const bb = box(-50, -5, 50, 5);
    const places = polyGraphs(
      [g1, g2], root, pinfo({ mode: PackMode.Node }), [bb, bb],
    );
    expect(places).not.toBeNull();
    expect(places!.length).toBe(2);
    // The two placements must differ (the second could not land at (0,0)).
    expect(places![0]).not.toEqual(places![1]);
  });

  it('places a second, colliding graph via the tall ring search (W < H)', () => {
    const root = makeGraph();
    const g1 = nodeGraph('a', 0, 0, 5, 50); // tall bbox
    const g2 = nodeGraph('b', 0, 0, 5, 50);
    const bb = box(-5, -50, 5, 50);
    const places = polyGraphs(
      [g1, g2], root, pinfo({ mode: PackMode.Node }), [bb, bb],
    );
    expect(places).not.toBeNull();
    expect(places![0]).not.toEqual(places![1]);
  });
});

describe('polyGraphs — fixed (pinned) components', () => {
  it('accumulates a fixedBB from a single fixed component and centers it', () => {
    const root = makeGraph();
    const g1 = nodeGraph('a', 0, 0, 10, 10);
    const g2 = nodeGraph('b', 100, 0, 10, 10);
    const bbs = [box(-10, -10, 10, 10), box(90, -10, 110, 10)];
    const places = polyGraphs(
      [g1, g2], root,
      pinfo({ mode: PackMode.Node, fixed: [true, false] }),
      bbs,
    );
    expect(places).not.toBeNull();
    expect(places!.length).toBe(2);
  });

  it('accumulates a fixedBB across TWO fixed components (min/max merge both directions)', () => {
    const root = makeGraph();
    const g1 = nodeGraph('a', -100, -100, 10, 10);
    const g2 = nodeGraph('b', 100, 100, 10, 10);
    const g3 = nodeGraph('c', 0, 0, 10, 10);
    const bbs = [
      box(-110, -110, -90, -90),
      box(90, 90, 110, 110),
      box(-10, -10, 10, 10),
    ];
    const places = polyGraphs(
      [g1, g2, g3], root,
      pinfo({ mode: PackMode.Node, fixed: [true, true, false] }),
      bbs,
    );
    expect(places).not.toBeNull();
    expect(places!.length).toBe(3);
  });

  it('fixed=[false, false] (no component actually pinned) leaves center at (0,0)', () => {
    const root = makeGraph();
    const g1 = nodeGraph('a', 0, 0, 10, 10);
    const g2 = nodeGraph('b', 50, 0, 10, 10);
    const bbs = [box(-10, -10, 10, 10), box(40, -10, 60, 10)];
    const places = polyGraphs(
      [g1, g2], root,
      pinfo({ mode: PackMode.Node, fixed: [false, false] }),
      bbs,
    );
    expect(places).not.toBeNull();
    expect(places!.length).toBe(2);
  });
});
