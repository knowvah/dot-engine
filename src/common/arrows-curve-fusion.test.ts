// SPDX-License-Identifier: EPL-2.0
import { describe, it, expect } from 'vitest';
import type { Point } from '../model/geom.js';
import { genCurve } from './arrows-shapes-poly.js';
import { ARR_MOD_INV } from './arrows-constants.js';

// Expected values: the arrow_type_curve control-point expressions compiled
// with clang -O2 on arm64 (as the 16.1 oracle: fmadd on `p.x +/- 0.95 * v.x`),
// printed with %.17g. @see lib/common/arrows.c:arrow_type_curve
const INPUTS: { p: Point; u: Point; pw: number }[] = [
  { p: { x: 37.3, y: 91.21 }, u: { x: -3.7, y: 9.31 }, pw: 1 },
  { p: { x: 101.77, y: 18.9 }, u: { x: 0.3, y: -8.8 }, pw: 2.3 },
  { p: { x: -12.123, y: 55.55 }, u: { x: 7.1, y: -1.7 }, pw: 6.1 },
];
const EXPECTED: { inv: boolean; af: Point[] }[] = [
  { inv: false, af: [{ x: 30.610337715500044, y: 94.479650234782312 }, { x: 33.309754382166716, y: 88.272983568115649 }, { x: 42.154254382166712, y: 91.972983568115637 }, { x: 39.920337715500047, y: 98.179650234782301 }] },
  { inv: true, af: [{ x: 30.794999999999995, y: 94.015000000000001 }, { x: 28.561083333333329, y: 100.22166666666666 }, { x: 37.405583333333325, y: 103.92166666666665 }, { x: 40.104999999999997, y: 97.714999999999989 }] },
  { inv: false, af: [{ x: 106.35918178372576, y: 13.500667677377828 }, { x: 105.93918178372576, y: 19.367334344044494 }, { x: 97.579181783725744, y: 19.067334344044497 }, { x: 97.559181783725748, y: 13.200667677377831 }] },
  { inv: true, af: [{ x: 106.32000000000001, y: 14.649999999999997 }, { x: 106.30000000000001, y: 8.7833333333333297 }, { x: 97.939999999999998, y: 8.4833333333333325 }, { x: 97.519999999999996, y: 14.35 }] },
  { inv: false, af: [{ x: -2.4468399344085974, y: 58.957292660351349 }, { x: -9.7299857677419297, y: 60.685625993684681 }, { x: -12.19286076774193, y: 49.858125993684681 }, { x: -5.0393399344085976, y: 48.129792660351349 }] },
  { inv: true, af: [{ x: -5.4129999999999994, y: 59.667499999999997 }, { x: 1.7405208333333331, y: 57.939166666666665 }, { x: -0.7223541666666673, y: 47.111666666666665 }, { x: -8.0055000000000014, y: 48.839999999999996 }] },
];

describe('genCurve control points match the oracle fusion', () => {
  EXPECTED.forEach(({ inv, af }, k) => {
    it(`input ${k >> 1} ${inv ? 'inv' : 'normal'}`, () => {
      const { p, u, pw } = INPUTS[k >> 1]!;
      const res = genCurve(p, u, 1, pw, inv ? ARR_MOD_INV : 0);
      const bez = res.ops[1];
      if (bez?.kind !== 'bezier') throw new Error('bezier op expected');
      expect(bez.points).toEqual(af);
    });
  });
});
