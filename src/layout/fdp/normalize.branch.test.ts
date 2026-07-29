// SPDX-License-Identifier: EPL-2.0

/**
 * Branch coverage for layout normalization (normalizeG / angleSet /
 * mapbool / parseAngle / wrapDegrees). normalizeG is a no-op unless the
 * "normalize" attribute is set (fdp's derived components never inherit
 * it), so every reachable branch is driven through g.attrs.
 *
 * @see lib/neatogen/adjust.c:normalize / angleSet (15.0.0)
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { normalizeG } from './normalize.js';

function makeGraph(): Graph {
  return new Graph('g', 'undirected');
}

function makeNode(g: Graph, name: string, x: number, y: number): Node {
  const n = new Node(g.nodes.size, name, g);
  n.info.pos = [x, y];
  g.nodes.set(name, n);
  return n;
}

function connect(g: Graph, tail: Node, head: Node): Edge {
  const e = new Edge(tail, head, `${tail.name}--${head.name}`);
  g.edges.push(e);
  return e;
}

describe('normalizeG — no-op paths', () => {
  it('does nothing when the "normalize" attribute is unset', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 5, 5);
    normalizeG(g);
    expect(a.info.pos).toEqual([5, 5]);
  });

  it('does nothing when "normalize" is the empty string', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 5, 5);
    g.attrs.set('normalize', '');
    normalizeG(g);
    expect(a.info.pos).toEqual([5, 5]);
  });

  it('does nothing when "normalize" is a non-numeric-regex zero value (mapbool v===0 path)', () => {
    // "+0" fails parseAngle's leading -?[\d.]+ regex (no unary plus support)
    // and falls to mapbool's parseInt fallback, which parses to exactly 0
    // -> mapbool returns false -> angleSet returns null.
    const g = makeGraph();
    const a = makeNode(g, 'a', 5, 5);
    g.attrs.set('normalize', '+0');
    normalizeG(g);
    expect(a.info.pos).toEqual([5, 5]);
  });

  it('does nothing when "normalize" parses to neither a number nor a bool', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 5, 5);
    g.attrs.set('normalize', 'frobnicate');
    normalizeG(g);
    expect(a.info.pos).toEqual([5, 5]);
  });

  it('does nothing when the graph has no nodes', () => {
    const g = makeGraph();
    g.attrs.set('normalize', '0');
    expect(() => normalizeG(g)).not.toThrow();
  });
});

describe('normalizeG — translate-only (no edges)', () => {
  it('translates the first node to the origin when no node has an out-edge', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 5, 5);
    const b = makeNode(g, 'b', 8, 5);
    g.attrs.set('normalize', '90');
    normalizeG(g);
    expect(a.info.pos).toEqual([0, 0]);
    expect(b.info.pos).toEqual([3, 0]);
  });
});

describe('normalizeG — translate + rotate (edge present)', () => {
  it('rotates so the first out-edge points at the requested angle (numeric degrees)', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 0, 0);
    const b = makeNode(g, 'b', 10, 0); // edge a->b currently at 0 degrees
    connect(g, a, b);
    g.attrs.set('normalize', '90'); // target: pointing straight up
    normalizeG(g);
    // a is the rotation origin (edge tail) and stays at the translated origin
    expect(a.info.pos![0]).toBeCloseTo(0, 9);
    expect(a.info.pos![1]).toBeCloseTo(0, 9);
    expect(b.info.pos![0]).toBeCloseTo(0, 9);
    expect(b.info.pos![1]).toBeCloseTo(10, 9);
  });

  it('skips rotation when the edge already sits at the requested angle (phi === 0)', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 0, 0);
    const b = makeNode(g, 'b', 10, 0);
    connect(g, a, b);
    g.attrs.set('normalize', '0'); // edge already points at 0 degrees
    normalizeG(g);
    expect(a.info.pos).toEqual([0, 0]);
    expect(b.info.pos).toEqual([10, 0]);
  });

  it('finds the first out-edge from a LATER node when earlier nodes have none', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 0, 0); // isolated, no out-edge
    const b = makeNode(g, 'b', 5, 5);
    const c = makeNode(g, 'c', 15, 5); // edge b->c, currently at 0 degrees
    connect(g, b, c);
    g.attrs.set('normalize', '90');
    normalizeG(g);
    // translation is a no-op (a already at origin); rotation pivots on b
    // (the edge tail), at (5,5): a rotates 90deg CCW about that pivot.
    expect(a.info.pos![0]).toBeCloseTo(10, 9);
    expect(a.info.pos![1]).toBeCloseTo(0, 9);
  });

  it('"normalize=true" (mapbool fallback) sets a zero-degree target angle', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 0, 0);
    const b = makeNode(g, 'b', 0, 10); // edge points at 90 degrees currently
    connect(g, a, b);
    g.attrs.set('normalize', 'true');
    normalizeG(g);
    // target angle 0 -> edge must end up pointing along +x
    expect(b.info.pos![0]).toBeCloseTo(10, 9);
    expect(b.info.pos![1]).toBeCloseTo(0, 9);
  });

  it('"normalize=false" (mapbool fallback) is a no-op (angleSet returns null)', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 5, 5);
    const b = makeNode(g, 'b', 15, 5);
    connect(g, a, b);
    g.attrs.set('normalize', 'false');
    normalizeG(g);
    expect(a.info.pos).toEqual([5, 5]);
    expect(b.info.pos).toEqual([15, 5]);
  });

  it('wraps an angle above 180 degrees down into (-180, 180]', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 0, 0);
    const b = makeNode(g, 'b', 10, 0);
    connect(g, a, b);
    g.attrs.set('normalize', '450'); // wraps to 90
    normalizeG(g);
    expect(b.info.pos![0]).toBeCloseTo(0, 9);
    expect(b.info.pos![1]).toBeCloseTo(10, 9);
  });

  it('wraps an angle at or below -180 degrees up into (-180, 180]', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 0, 0);
    const b = makeNode(g, 'b', 10, 0);
    connect(g, a, b);
    g.attrs.set('normalize', '-540'); // wraps to -180 -> +180
    normalizeG(g);
    expect(b.info.pos![0]).toBeCloseTo(-10, 9);
    expect(b.info.pos![1]).toBeCloseTo(0, 9);
  });

  it('parses a decimal/exponential angle string', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 0, 0);
    const b = makeNode(g, 'b', 10, 0);
    connect(g, a, b);
    g.attrs.set('normalize', '1.8e2'); // 180 degrees
    normalizeG(g);
    expect(b.info.pos![0]).toBeCloseTo(-10, 9);
    expect(b.info.pos![1]).toBeCloseTo(0, 9);
  });

  it('a self-loop counts as the node\'s own out-edge for the pivot search', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a', 0, 0);
    connect(g, a, a); // self-loop: head === tail === a
    g.attrs.set('normalize', '90');
    expect(() => normalizeG(g)).not.toThrow();
    // atan2(0,0) = 0, so phi = phi0 - 0 = pi/2; rotation about a (at origin)
    // leaves a itself unchanged.
    expect(a.info.pos![0]).toBeCloseTo(0, 9);
    expect(a.info.pos![1]).toBeCloseTo(0, 9);
  });
});
