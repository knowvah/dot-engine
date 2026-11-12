// SPDX-License-Identifier: EPL-2.0
//
// Pins what an auxiliary edge allocates. separate_subclust makes one per pair
// of sibling clusters (16.3 M on tests/2475_1.dot), so every object an aux edge
// owns is multiplied by that count (issue #145).
// @see lib/dotgen/position.c:make_aux_edge

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { AUX_EDGE_PORT, makePort } from '../../model/edgeInfo.js';
import { EMPTY_ATTRS, ownAttrs } from '../../model/lazy-attrs.js';
import { makeNodeInfo } from '../../model/nodeInfo.js';
import { makeAuxEdge } from './position-aux.js';

function mkNode(g: Graph, id: number): Node {
  const n = new Node(id, `n${id}`, g);
  n.info = makeNodeInfo();
  return n;
}

describe('makeAuxEdge — ports (make_aux_edge zeroes them inline)', () => {
  const g = new Graph('t', 'directed');
  const u = mkNode(g, 0);
  const v = mkNode(g, 1);

  it('gives both ends of every aux edge the one shared default port', () => {
    const e1 = makeAuxEdge(u, v, 3, 7);
    const e2 = makeAuxEdge(v, u, 1, 0);
    expect(e1.info.tail_port).toBe(AUX_EDGE_PORT);
    expect(e1.info.head_port).toBe(AUX_EDGE_PORT);
    expect(e2.info.tail_port).toBe(AUX_EDGE_PORT);
    expect(e2.info.head_port).toBe(AUX_EDGE_PORT);
  });

  it('the shared port reads exactly as a fresh makePort() does', () => {
    expect(AUX_EDGE_PORT).toEqual(makePort());
    expect(AUX_EDGE_PORT).toEqual({
      p: { x: 0, y: 0 }, theta: 0, bp: null, defined: false, constrained: false,
      clip: true, dyna: false, order: 0, side: 0, name: null,
    });
  });

  it('a write to the shared port or its point throws instead of leaking', () => {
    const e = makeAuxEdge(u, v, 1, 0);
    expect(() => { e.info.tail_port.p.x = 4; }).toThrow(TypeError);
    expect(() => { e.info.head_port.clip = false; }).toThrow(TypeError);
    expect(AUX_EDGE_PORT.p.x).toBe(0);
    expect(AUX_EDGE_PORT.clip).toBe(true);
  });

  it('keeps the edge data make_aux_edge sets, and the fast-graph links', () => {
    const a = mkNode(g, 2);
    const b = mkNode(g, 3);
    const e = makeAuxEdge(a, b, 2.5, 9);
    expect(e.tail).toBe(a);
    expect(e.head).toBe(b);
    expect(e.info.minlen).toBe(3); // C ROUND(2.5), half away from zero
    expect(e.info.weight).toBe(9);
    expect(a.info.out!.list[0]).toBe(e);
    expect(b.info.in!.list[0]).toBe(e);
  });

  it('a real edge keeps two private, writable ports', () => {
    const e = new Edge(u, v, '');
    expect(e.info.tail_port).not.toBe(AUX_EDGE_PORT);
    expect(e.info.head_port).not.toBe(e.info.tail_port);
    e.info.tail_port.p.x = 5;
    e.info.head_port.clip = false;
    expect(e.info.tail_port.p.x).toBe(5);
    expect(e.info.head_port.p.x).toBe(0);
    expect(AUX_EDGE_PORT.p.x).toBe(0);
  });
});

describe('makeAuxEdge — attributes (an aux edge has no attribute record)', () => {
  const g = new Graph('t', 'directed');
  const u = mkNode(g, 0);
  const v = mkNode(g, 1);

  it('starts every aux edge on the shared empty attribute map', () => {
    const e1 = makeAuxEdge(u, v, 1, 0);
    const e2 = makeAuxEdge(v, u, 1, 0);
    expect(e1.attrs).toBe(EMPTY_ATTRS);
    expect(e2.attrs).toBe(EMPTY_ATTRS);
    expect(e1.attrs.size).toBe(0);
    expect(e1.attrs.get('weight')).toBeUndefined();
    expect(e1.attrs.has('constraint')).toBe(false);
  });

  it('a write goes to a private map of that edge only', () => {
    const e1 = makeAuxEdge(u, v, 1, 0);
    const e2 = makeAuxEdge(u, v, 1, 0);
    expect(() => e1.attrs.set('k', 'v')).toThrow(/ownAttrs/);
    ownAttrs(e1).set('k', 'v');
    expect(e1.attrs.get('k')).toBe('v');
    expect(e2.attrs).toBe(EMPTY_ATTRS);
    expect(EMPTY_ATTRS.size).toBe(0);
  });
});
