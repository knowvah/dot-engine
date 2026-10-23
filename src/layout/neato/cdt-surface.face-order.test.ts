// SPDX-License-Identifier: EPL-2.0
//
// Face vertex order of the GTS CDT port. Native mkSurface (delaunay.c) reads
// each face with gts_triangle_vertices, which yields (e1-only, e1∩e2,
// e2-only) of the face's stored edges (t->e1, t->e2). swap_if_in_circle
// (gts-0.7.6 cdt.c:509/511) builds gts_face_new(en, e5, e2) and
// gts_face_new(en, e3, e4), so a swapped face starts at the new diagonal's
// far vertex. multispline.c:triCenter sums the vertices in that order.
//
// Expected data: native graphviz 16.1.0 sfdp on tests/2168_3.dot, mkSurface
// inputs and output dumped with lldb (part-3 T9). Native face ids are a
// pointer-hash artifact, so faces are matched by vertex set.
import { describe, expect, test } from 'vitest';
import { mkSurface } from './cdt-surface.js';

const X = [
  -38.61471252916545, 340.7456507295494, 340.7456507295494, -38.61471252916545,
  55.75130085257338, 19.229491147919557, -6.614712529165452, -6.614712529165445,
  19.229491147919568, 55.75130085257338, 81.5955045296584, 81.5955045296584,
  282.90144705246445, 246.37963734781061, 220.5354336707256, 220.5354336707256,
  246.37963734781061, 282.90144705246445, 308.7456507295494, 308.7456507295494,
];
const Y = [
  -38.04853469434987, -38.04853469434987, 74.04853469434987, 74.04853469434987,
  -6.048534694349868, -6.048534694349861, 7.608210632553227, 28.391789367446783,
  42.04853469434987, 42.04853469434987, 28.391789367446776, 7.60821063255322,
  -6.048534694349868, -6.048534694349861, 7.608210632553227, 28.391789367446783,
  42.04853469434987, 42.04853469434987, 28.391789367446776, 7.60821063255322,
];
/** bbox ring 0–3, then the two octagon obstacles 4–11 and 12–19. */
const SEGS = [
  0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 4,
  12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 12,
];
/** Native sf->faces as ordered triples. */
const NATIVE_FACES = [
  [19, 1, 18], [7, 3, 6], [1, 13, 4], [15, 9, 10], [18, 1, 2], [16, 9, 15],
  [1, 4, 0], [6, 3, 0], [11, 14, 10], [17, 18, 2], [9, 3, 8], [13, 11, 4],
  [14, 11, 13], [7, 8, 3], [15, 10, 14], [3, 9, 2], [16, 2, 9], [13, 1, 12],
  [17, 2, 16], [5, 0, 4], [19, 12, 1], [6, 0, 5],
];

const setKey = (t: number[]): string => [...t].sort((a, b) => a - b).join(' ');

function portFaces(): number[][] {
  const s = mkSurface(X, Y, X.length, SEGS, SEGS.length / 2);
  if (s === null) throw new Error('expected a surface');
  const out: number[][] = [];
  for (let i = 0; i < s.nfaces; i++) out.push(s.faces.slice(3 * i, 3 * i + 3));
  return out;
}

/** @see lib/neatogen/multispline.c:triCenter (sums in face order) */
function triCenter(t: number[]): [number, number] {
  return [
    (X[t[0]!]! + X[t[1]!]! + X[t[2]!]!) / 3.0,
    (Y[t[0]!]! + Y[t[1]!]! + Y[t[2]!]!) / 3.0,
  ];
}

describe('mkSurface — face vertex order follows gts_triangle_vertices', () => {
  test('2168_3 (sfdp): every face lists its vertices in native order', () => {
    const byKey = new Map(portFaces().map((t) => [setKey(t), t]));
    expect(byKey.size).toBe(NATIVE_FACES.length);
    for (const nat of NATIVE_FACES) expect(byKey.get(setKey(nat))).toEqual(nat);
  });

  test('2168_3 (sfdp): swapped face {11,13,14} gives native triCenter bits', () => {
    const f = portFaces().find((t) => setKey(t) === '11 13 14');
    expect(f).toEqual([14, 11, 13]);
    // native ctr; the rotation (11, 13, 14) sums to 182.8368585160649
    expect(triCenter(f!)).toEqual([182.83685851606484, 3.0559621902521954]);
  });
});
