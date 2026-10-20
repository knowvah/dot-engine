// SPDX-License-Identifier: EPL-2.0

import type { Point } from '../model/geom.js';
import { fma } from './fma.js';

/**
 * De Casteljau evaluation of a cubic at t, optionally returning the two
 * sub-curves. The oracle compiles each `(1.0 - t) * a + t * b` to
 * `fmul v, b, t; fmla v, a, 1-t`, i.e. fma(a, 1 - t, t * b): `t * b` rounds
 * first and `(1 - t) * a` is the fused product (libgvc 16.1 `_Bezier`
 * disassembly; every inlined copy has the same shape). `left`/`right`, when
 * given, are filled (indices 0..3) like C's `Left`/`Right`.
 * @see lib/common/utils.c:Bezier
 */
export function bezier(v: Point[], t: number, left: Point[] | null, right: Point[] | null): Point {
  const degree = 3;
  const u = 1.0 - t;
  const tri: Point[][] = [[v[0], v[1], v[2], v[3]]];
  for (let i = 1; i <= degree; i++) {
    const prev = tri[i - 1];
    const row: Point[] = [];
    for (let j = 0; j <= degree - i; j++) {
      row.push({
        x: fma(prev[j].x, u, t * prev[j + 1].x),
        y: fma(prev[j].y, u, t * prev[j + 1].y),
      });
    }
    tri.push(row);
  }
  if (left !== null) for (let j = 0; j <= degree; j++) left[j] = tri[j][0];
  if (right !== null) for (let j = 0; j <= degree; j++) right[j] = tri[degree - j][j];
  return tri[degree][0];
}
