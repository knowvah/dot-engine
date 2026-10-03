// SPDX-License-Identifier: EPL-2.0
//
// Crossing constraints in the GTS CDT port. C (gts-0.7.6 cdt.c
// remove_intersected_edge) collects a crossed constraint, removes it and
// carries on, so the later constraint wins; it aborts on its own g_asserts.
// Expected face sets were produced by graphviz's lib/neatogen/delaunay.c
// mkSurface linked against GTS 0.7.6 (plans/error-hierarchy T4b journal).
import { describe, expect, test } from 'vitest';
import { mkSurface } from './cdt-surface.js';
import { InternalError } from '../../errors.js';

/** Square boundary (CCW) plus two crossing diagonals 4–5 and 6–7. */
const X = [0, 10, 10, 0, 2, 8, 2, 8];
const Y = [0, 0, 10, 10, 2, 8, 8, 2];
const BOX = [0, 1, 1, 2, 2, 3, 3, 0];

function sortedFaces(segs: number[]): string[] {
  const s = mkSurface(X, Y, X.length, segs, segs.length / 2);
  if (s === null) throw new Error('expected a surface');
  const faces: string[] = [];
  for (let i = 0; i < s.nfaces; i++) {
    const t = [s.faces[3 * i]!, s.faces[3 * i + 1]!, s.faces[3 * i + 2]!];
    faces.push(t.sort((a, b) => a - b).join(' '));
  }
  return faces.sort();
}

const SHARED = [
  '0 1 4', '0 3 4', '1 2 5', '1 4 7', '1 5 7', '2 3 5', '3 4 6', '3 5 6',
];

describe('mkSurface — crossing constraints (C continues, later constraint wins)', () => {
  test('4–5 then 6–7: 6–7 survives', () => {
    expect(sortedFaces([...BOX, 4, 5, 6, 7])).toEqual([...SHARED, '5 6 7']);
  });

  test('6–7 then 4–5: 4–5 survives', () => {
    expect(sortedFaces([...BOX, 6, 7, 4, 5])).toEqual([...SHARED, '4 5 6']);
  });
});

describe('mkSurface — GTS g_assert sites', () => {
  test('cdt.c:887 g_assert(o2 == 0.) failure throws InternalError', () => {
    // Random case where native GTS aborts with this assertion.
    const x = [0, 100, 100, 0, 48, 72, 32, 95, 49, 11, 31, 79, 35];
    const y = [0, 0, 100, 100, 25, 56, 21, 83, 29, 55, 67, 89, 37];
    const segs = [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 6, 7];
    expect(() => mkSurface(x, y, x.length, segs, segs.length / 2))
      .toThrow(InternalError);
  });
});
