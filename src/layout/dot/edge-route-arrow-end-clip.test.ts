// SPDX-License-Identifier: EPL-2.0
import { describe, it, expect } from 'vitest';
import type { Point } from '../../model/geom.js';
import { arrowEndClip, distFused } from './edge-route-clip.js';

// Expected values: lib/common/arrows.c:arrowEndClip (with bezier_clip, Bezier
// and DIST) compiled with clang -O2 on arm64, printed with %.17g.
const CASES: { path: Point[]; elen: number; out: Point[] }[] = [
  { path: [{ x: 10.3, y: 200.7 }, { x: 25.1, y: 150.2 }, { x: 60.9, y: 120.4 }, { x: 71.37, y: 70.11 }], elen: 10.0, out: [{ x: 10.300000000000001, y: 200.69999999999999 }, { x: 24.146093750000002, y: 153.45488281249999 }, { x: 56.372394561767571, y: 124.3273983001709 }, { x: 69.042254208996894, y: 79.589712652489538 }] },
  { path: [{ x: 300.5, y: 18.2 }, { x: 280.1, y: 40.9 }, { x: 250.7, y: 41.3 }, { x: 230.19, y: 60.77 }], elen: 12.6, out: [{ x: 300.5, y: 18.199999999999999 }, { x: 283.20781250000005, y: 37.441796875000001 }, { x: 259.44893493652341, y: 40.660572814941403 }, { x: 240.11943132698534, y: 53.05309519827366 }] },
  { path: [{ x: -20.5, y: -3.3 }, { x: -15.1, y: 10.9 }, { x: 5.7, y: 31.3 }, { x: 9.13, y: 61.9 }], elen: 8.4, out: [{ x: -20.5, y: -3.2999999999999998 }, { x: -15.585156249999999, y: 9.6242187500000007 }, { x: 2.0868072509765629, y: 27.68442077636719 }, { x: 7.8086462563276307, y: 53.896443033218382 }] },
];

describe('arrowEndClip (arrows.c:285)', () => {
  CASES.forEach(({ path, elen, out }, k) => {
    it(`case ${k} matches the oracle bit for bit`, () => {
      expect(arrowEndClip(path, path[3]!, elen)).toEqual(out);
    });
  });

  it('elen <= 0 leaves the path unchanged (no bezier_clip call)', () => {
    const path = CASES[0]!.path;
    expect(arrowEndClip(path, path[3]!, 0)).toEqual(path);
  });

  it('distFused is sqrt(fma(dx, dx, dy*dy))', () => {
    expect(distFused({ x: 3, y: 4 }, { x: 0, y: 0 })).toBe(5);
  });
});
