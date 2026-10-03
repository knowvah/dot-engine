// SPDX-License-Identifier: EPL-2.0

/**
 * cAdjust (overlap=ortho*, portho*) against the native oracle.
 *
 * Fixtures F1/F2 are `neato -n1 -Goverlap=<mode>` inputs (positions in
 * points, `fixedsize` boxes) so only cAdjust moves nodes. Expected positions
 * are native `-Tplain` node centres, translated so the node bounding box
 * starts at (0,0) (gv_postprocess translation); the port output gets the same
 * normalisation.
 *
 * @see lib/neatogen/constraint.c:cAdjust
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import {
  AM_ORTHO, AM_ORTHO_YX, AM_ORTHOXY, AM_ORTHOYX,
  AM_PORTHO, AM_PORTHO_YX, AM_PORTHOXY, AM_PORTHOYX,
  cAdjust,
} from './constraint-adjust.js';

const PT = 72;
const TOL = 0.01;

interface Spec {
  name: string; x: number; y: number; w: number; h: number;
}

function build(specs: Spec[], edges: [string, string][], kind: 'directed' | 'undirected', sep?: string): Graph {
  const g = new Graph('g', kind);
  if (sep !== undefined) g.attrs.set('sep', sep);
  for (const s of specs) {
    const n = new Node(g.nodes.size, s.name, g);
    n.info.pos = [s.x / PT, s.y / PT];
    n.info.width = s.w;
    n.info.height = s.h;
    g.nodes.set(s.name, n);
  }
  for (const [t, h] of edges) {
    g.edges.push(new Edge(g.nodes.get(t)!, g.nodes.get(h)!, ''));
  }
  return g;
}

/** Node centres in node order, translated so the node bbox min is (0,0). */
function normalised(g: Graph): [number, number][] {
  const ns = [...g.nodes.values()];
  const mx = Math.min(...ns.map((n) => n.info.pos![0] - n.info.width! / 2));
  const my = Math.min(...ns.map((n) => n.info.pos![1] - n.info.height! / 2));
  return ns.map((n) => [n.info.pos![0] - mx, n.info.pos![1] - my]);
}

function expectClose(got: [number, number][], want: number[][]): void {
  expect(got.length).toBe(want.length);
  got.forEach(([x, y], i) => {
    expect(Math.abs(x - want[i]![0]!)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(y - want[i]![1]!)).toBeLessThanOrEqual(TOL);
  });
}

const F1: Spec[] = [
  { name: 'a', x: 100, y: 100, w: 1, h: 0.6 },
  { name: 'b', x: 130, y: 110, w: 1.4, h: 0.6 },
  { name: 'c', x: 160, y: 95, w: 1, h: 0.6 },
  { name: 'd', x: 110, y: 140, w: 1, h: 0.9 },
  { name: 'e', x: 180, y: 150, w: 1, h: 0.6 },
  { name: 'f', x: 90, y: 70, w: 1, h: 0.6 },
  { name: 'g', x: 150, y: 130, w: 0.5, h: 0.6 },
  { name: 'h', x: 200, y: 100, w: 1, h: 0.6 },
];
const F1_EDGES: [string, string][] = [
  ['a', 'b'], ['b', 'c'], ['a', 'd'], ['d', 'g'], ['c', 'h'], ['e', 'g'], ['f', 'a'],
];
const F2: Spec[] = [
  { name: 'n1', x: 50, y: 50, w: 0.8, h: 0.5 },
  { name: 'n2', x: 70, y: 60, w: 0.8, h: 0.5 },
  { name: 'n3', x: 60, y: 90, w: 0.8, h: 0.5 },
  { name: 'n4', x: 100, y: 55, w: 0.8, h: 0.5 },
  { name: 'n5', x: 95, y: 80, w: 0.8, h: 0.5 },
  { name: 'n6', x: 50, y: 50.5, w: 0.8, h: 0.5 },
  { name: 'n7', x: 120, y: 120, w: 0.8, h: 0.5 },
  { name: 'n8', x: 125, y: 118, w: 1.2, h: 0.5 },
];
const F2_EDGES: [string, string][] = [
  ['n1', 'n2'], ['n2', 'n3'], ['n3', 'n5'], ['n4', 'n5'], ['n7', 'n8'], ['n1', 'n6'],
];

const F1_EXPECTED: [number, number[][]][] = [
  [AM_ORTHO, [[0.514, 1.036], [1.431, 1.758], [1.625, 0.314], [0.667, 3.342], [2.389, 3.356], [0.5, 0.3], [1.528, 2.481], [2.736, 1.036]]],
  [AM_ORTHO_YX, [[1.611, 1.022], [2.931, 1.744], [4.0, 1.008], [1.625, 2.606], [4.847, 3.189], [0.5, 0.3], [3.986, 2.467], [5.111, 1.022]]],
  [AM_ORTHOXY, [[1.611, 1.022], [4.028, 1.036], [5.944, 1.008], [2.722, 1.897], [5.958, 1.911], [0.5, 0.3], [5.083, 1.758], [7.069, 1.022]]],
  [AM_ORTHOYX, [[0.514, 1.744], [1.819, 2.467], [2.889, 1.022], [1.806, 4.05], [2.917, 4.911], [0.5, 0.3], [2.875, 3.189], [4.0, 1.744]]],
  [AM_PORTHO, [[0.5, 1.744], [1.417, 2.467], [1.611, 1.022], [0.75, 4.05], [2.472, 3.911], [0.5, 0.3], [1.611, 3.189], [2.722, 1.744]]],
  [AM_PORTHO_YX, [[1.611, 1.022], [2.917, 1.744], [4.222, 1.022], [1.611, 2.606], [4.833, 3.189], [0.5, 0.3], [3.972, 2.467], [5.944, 2.467]]],
  [AM_PORTHOXY, [[1.611, 1.022], [4.028, 1.022], [5.944, 1.022], [2.722, 1.883], [5.944, 2.467], [0.5, 0.3], [5.083, 1.744], [7.056, 1.744]]],
  [AM_PORTHOYX, [[0.5, 1.744], [1.806, 2.467], [2.0, 1.022], [2.0, 4.05], [3.111, 4.911], [0.889, 0.3], [2.861, 3.189], [3.111, 1.744]]],
];
const F2_EXPECTED: [number, number[][]][] = [
  [AM_ORTHO, [[0.4, 0.25], [0.886, 2.083], [0.414, 3.306], [1.372, 1.472], [1.129, 2.694], [0.4, 0.861], [1.386, 4.528], [1.4, 3.917]]],
  [AM_ORTHO_YX, [[0.4, 0.25], [0.428, 1.486], [0.414, 2.708], [1.414, 0.875], [1.4, 2.097], [0.4, 0.861], [1.428, 3.931], [2.594, 3.319]]],
  [AM_ORTHOXY, [[0.4, 0.25], [2.344, 0.889], [1.372, 1.514], [4.289, 0.875], [3.317, 1.5], [0.4, 0.861], [4.303, 2.139], [5.469, 1.528]]],
  [AM_ORTHOYX, [[0.4, 0.25], [0.428, 2.083], [0.414, 3.306], [1.414, 1.472], [1.4, 2.694], [0.4, 0.861], [1.428, 4.528], [2.594, 3.917]]],
  [AM_PORTHO, [[0.6, 0.25], [0.6, 2.083], [0.6, 3.306], [1.572, 1.472], [0.6, 2.694], [0.6, 0.861], [1.572, 4.528], [0.6, 3.917]]],
  [AM_PORTHO_YX, [[1.372, 0.25], [1.372, 1.472], [1.372, 2.694], [2.344, 0.861], [2.344, 2.083], [0.4, 0.861], [1.372, 3.917], [2.539, 3.306]]],
  [AM_PORTHOXY, [[1.372, 0.25], [3.317, 0.25], [2.344, 0.861], [5.261, 0.25], [4.289, 0.861], [0.4, 0.861], [5.261, 1.472], [6.428, 0.861]]],
  [AM_PORTHOYX, [[1.372, 0.25], [0.4, 2.083], [0.4, 3.306], [1.372, 1.472], [1.372, 2.694], [0.4, 0.861], [0.4, 4.528], [1.567, 3.917]]],
];

describe('adjust.h mode constants', () => {
  it('match the adjust_mode enum values', () => {
    expect([AM_ORTHO, AM_ORTHO_YX, AM_ORTHOXY, AM_ORTHOYX]).toEqual([5, 6, 7, 8]);
    expect([AM_PORTHO, AM_PORTHO_YX, AM_PORTHOXY, AM_PORTHOYX]).toEqual([9, 10, 11, 12]);
  });
});

describe('cAdjust vs native neato -n1', () => {
  it.each(F1_EXPECTED)('F1 (directed, edges) mode %i', (mode, want) => {
    const g = build(F1, F1_EDGES, 'directed');
    expect(cAdjust(g, mode)).toBe(1);
    expectClose(normalised(g), want);
  });

  it.each(F2_EXPECTED)('F2 (undirected, sep=+6,4) mode %i', (mode, want) => {
    const g = build(F2, F2_EDGES, 'undirected', '+6,4');
    expect(cAdjust(g, mode)).toBe(1);
    expectClose(normalised(g), want);
  });

  it('treats an unknown mode like AM_PORTHO (C default branch)', () => {
    const g = build(F1, F1_EDGES, 'directed');
    expect(cAdjust(g, 99)).toBe(1);
    expectClose(normalised(g), F1_EXPECTED[4]![1]);
  });
});

describe('cAdjust short-circuit and sep inflation', () => {
  it('returns 0 and moves nothing when no boxes overlap', () => {
    const specs: Spec[] = [
      { name: 'a', x: 0, y: 0, w: 1, h: 1 },
      { name: 'b', x: 200, y: 0, w: 1, h: 1 },
    ];
    const g = build(specs, [], 'undirected');
    expect(cAdjust(g, AM_ORTHO)).toBe(0);
    expect(g.nodes.get('b')!.info.pos).toEqual([200 / PT, 0]);
  });

  it('inflates boxes by the additive sep margin (touching boxes overlap)', () => {
    const specs: Spec[] = [
      { name: 'a', x: 0, y: 0, w: 1, h: 1 },
      { name: 'b', x: 90, y: 0, w: 1, h: 1 },
    ];
    const plain = build(specs, [], 'undirected');
    expect(cAdjust(plain, AM_PORTHO)).toBe(0);
    const padded = build(specs, [], 'undirected', '+10,10');
    expect(cAdjust(padded, AM_PORTHO)).toBe(1);
  });

  it('uses the multiplicative sep factor when sep has no plus sign', () => {
    const specs: Spec[] = [
      { name: 'a', x: 0, y: 0, w: 1, h: 1 },
      { name: 'b', x: 90, y: 0, w: 1, h: 1 },
    ];
    const g = build(specs, [], 'undirected', '0.5');
    expect(cAdjust(g, AM_PORTHO)).toBe(1);
  });
});

describe('cAdjust edge cases', () => {
  it('creates ND_pos for nodes that had none, treating missing size/pos as 0', () => {
    const g = new Graph('g', 'undirected');
    for (const name of ['a', 'b']) {
      g.nodes.set(name, new Node(g.nodes.size, name, g));
    }
    expect(cAdjust(g, AM_ORTHO)).toBe(1);
    expect(g.nodes.get('a')!.info.pos).toEqual([0, 0]);
    expect(g.nodes.get('b')!.info.pos).toEqual([0, 0]);
  });

  it('separates stacked equal-x nodes (shared val, ortho chain)', () => {
    const specs: Spec[] = [
      { name: 'a', x: 50, y: 50, w: 1, h: 1 },
      { name: 'b', x: 50, y: 60, w: 1, h: 1 },
      { name: 'c', x: 50, y: 70, w: 1, h: 1 },
    ];
    const g = build(specs, [], 'undirected');
    expect(cAdjust(g, AM_ORTHOXY)).toBe(1);
    const ys = [...g.nodes.values()].map((n) => n.info.pos![1]! * PT);
    expect(ys[1]! - ys[0]!).toBeGreaterThanOrEqual(72);
    expect(ys[2]! - ys[1]!).toBeGreaterThanOrEqual(72);
  });
});
