// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Graph } from './graph.js';
import { Node } from './node.js';
import { Edge } from './edge.js';
import { EMPTY_ATTRS, ownAttrs } from './lazy-attrs.js';
import { virtualEdge, virtualNode } from '../layout/dot/fastgr.js';

describe('lazy virtual attrs (AD-12)', () => {
  const g = new Graph('g', 'directed');
  it('virtual node/edge share the empty map and read undefined', () => {
    const a = virtualNode(g);
    const b = virtualNode(g);
    const e = virtualEdge(a, b, new Edge(a, b, ''));
    expect(a.attrs).toBe(EMPTY_ATTRS);
    expect(e.attrs).toBe(EMPTY_ATTRS);
    expect(a.attrs.get('x')).toBeUndefined();
    expect(a.attrs.size).toBe(0);
  });
  it('first write materialises a private map only for that object', () => {
    const a = virtualNode(g);
    const b = virtualNode(g);
    ownAttrs(a).set('k', 'v');
    expect(a.attrs.get('k')).toBe('v');
    expect(b.attrs.get('k')).toBeUndefined();
    expect(EMPTY_ATTRS.size).toBe(0);
    expect(ownAttrs(a)).toBe(a.attrs);
  });
  it('direct mutation of the shared map throws', () => {
    const a = virtualNode(g);
    expect(() => a.attrs.set('k', 'v')).toThrow(/ownAttrs/);
    expect(() => a.attrs.delete('k')).toThrow(/ownAttrs/);
    expect(() => a.attrs.clear()).toThrow(/ownAttrs/);
  });
  it('real nodes/edges keep a private mutable map', () => {
    const n = new Node(1, 'n', g);
    const m = new Node(2, 'm', g);
    n.attrs.set('a', '1');
    expect(n.attrs).not.toBe(EMPTY_ATTRS);
    expect(m.attrs.size).toBe(0);
    expect(new Edge(n, m, '').attrs).not.toBe(EMPTY_ATTRS);
  });
});
