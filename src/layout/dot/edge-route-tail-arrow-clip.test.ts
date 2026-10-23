// SPDX-License-Identifier: EPL-2.0
import { describe, it, expect } from 'vitest';
import type { Point } from '../../model/geom.js';
import { tailArrowEndClip } from './edge-route-clip.js';

// Expected values: lib/common/arrows.c:arrowStartClip (with bezier_clip, Bezier
// and DIST) compiled with clang -O2 on arm64, printed with %.17g.
const P = (x: number, y: number): Point => ({ x, y });
const CASES: { path: Point[]; slen: number; out: Point[] }[] = [
  { path: [P(71.37, 70.11), P(60.9, 120.4), P(25.1, 150.2), P(10.3, 200.7)], slen: 10.0, out: [P(69.04225420899688, 79.589712652489538), P(56.372394561767578, 124.3273983001709), P(24.146093750000002, 153.45488281249999), P(10.300000000000001, 200.69999999999999)] },
  { path: [P(230.19, 60.77), P(250.7, 41.3), P(280.1, 40.9), P(300.5, 18.2)], slen: 12.6, out: [P(240.11943132698534, 53.05309519827366), P(259.44893493652341, 40.660572814941403), P(283.20781250000005, 37.441796874999994), P(300.5, 18.199999999999999)] },
  { path: [P(9.13, 61.9), P(5.7, 31.3), P(-15.1, 10.9), P(-20.5, -3.3)], slen: 8.4, out: [P(7.8086462563276298, 53.896443033218382), P(2.0868072509765634, 27.684420776367187), P(-15.585156249999999, 9.6242187500000007), P(-20.5, -3.2999999999999998)] },
];

describe('tailArrowEndClip (arrows.c:arrowStartClip)', () => {
  CASES.forEach(({ path, slen, out }, k) => {
    it(`case ${k} matches the oracle bit for bit`, () => {
      expect(tailArrowEndClip(path, path[0]!, slen)).toEqual(out);
    });
  });

  it('slen <= 0 leaves the path unchanged (no bezier_clip call)', () => {
    const path = [P(100, 100), P(90.5, 140.2), P(40.3, 160.9), P(20.7, 230.4)];
    expect(tailArrowEndClip(path, path[0]!, 0)).toEqual(path);
  });
});
