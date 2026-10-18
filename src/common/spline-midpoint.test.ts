// SPDX-License-Identifier: EPL-2.0

/**
 * Bit-exact edge-label anchors against the native graphviz 16.1 libgvc.
 * Every expected value was produced by the oracle's own `dotneato_closest`
 * (utils.c) or `edgeMidpoint` (splines.c) on the same control points, captured
 * with lldb from `dot -Kfdp tests/2471.dot` and `dot -Ksfdp tests/2371.dot`.
 * @see lib/common/utils.c:dotneato_closest
 * @see lib/common/splines.c:polylineMidpoint
 */

import { describe, it, expect } from 'vitest';
import type { Point } from '../model/geom.js';
import { dist2, dotneatoClosest, polylineMidpoint, splEndPoints, type SplLike } from './spline-midpoint.js';

/** One bezier: control points as a flat [x0, y0, x1, y1, …] list, optional end point. */
function spl(xy: number[], ep?: Point): SplLike {
  const list: Point[] = [];
  for (let i = 0; i < xy.length; i += 2) list.push({ x: xy[i], y: xy[i + 1] });
  return {
    list: [{
      list, size: list.length, sflag: 0, eflag: ep ? 1 : 0,
      sp: { x: 0, y: 0 }, ep: ep ?? { x: 0, y: 0 },
    }],
  };
}

/** edgeMidpoint's spline branch: closest point to the chord midpoint. */
function closestToChordMid(s: SplLike): Point {
  const { p, q } = splEndPoints(s);
  return dotneatoClosest(s, { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
}

describe('dotneatoClosest matches native dotneato_closest bit for bit', () => {
  it('4-point bezier with an end point (fdp 2471)', () => {
    const s = spl([
      69483.28141635371, 657.236660587092, 69448.69254421482, 548.0422301035459,
      69386.9709762892, 353.19194903263434, 69351.4218910192, 240.96619895091698,
    ], { x: 69349.53913207249, y: 235.0224725958472 });
    expect(closestToChordMid(s)).toEqual({ x: 69416.43561129445, y: 446.2095538242585 });
  });

  it('second 4-point bezier (fdp 2471)', () => {
    const s = spl([
      69980.1116019097, 560.8152638698712, 69875.2209451644, 600.0781270227121,
      69746.85546477714, 648.128129247722, 69650.56579939435, 684.1714535271941,
    ], { x: 69644.5603874677, y: 686.4194103421141 });
    expect(closestToChordMid(s)).toEqual({ x: 69811.77795700623, y: 623.826222795538 });
  });

  it('10-point bezier (fdp 2471)', () => {
    const s = spl([
      69209.3208040802, 1867.8742696116838, 69262.61027891019, 1835.8474753943128,
      69314.00355353796, 1793.2021743630914, 69344.14462256906, 1738.2105825134267,
      69379.73343491096, 1673.2797255255505, 69378.4278798105, 1637.2401339822877,
      69344.14462256906, 1571.6105825134268, 69317.08344720585, 1519.806496664739,
      69270.65303760399, 1478.255814707534, 69222.30240858109, 1446.2887528306237,
    ], { x: 69217.01031300578, y: 1442.832516983635 });
    expect(closestToChordMid(s)).toEqual({ x: 69351.81206202877, y: 1723.493541755781 });
  });

  it('7-point bezier (fdp 2471)', () => {
    const s = spl([
      76974.4153220893, 5445.033068599187, 76708.13915796543, 5484.825797461913,
      76385.44371864226, 5535.423844817178, 76096.71809974419, 5587.268799517981,
      75367.6425787157, 5718.1850912743075, 74492.15903882153, 5909.631274942279,
      74227.82882082844, 5968.180782403555,
    ], { x: 74221.69884451001, y: 5969.539028374804 });
    expect(closestToChordMid(s)).toEqual({ x: 75592.98051894625, y: 5682.2358735869075 });
  });
});

describe('polylineMidpoint matches native edgeMidpoint bit for bit', () => {
  it('straight edge (sfdp 2371)', () => {
    const s = spl([
      144.5007915922073, 475.9627429519383, 139.26164039917376, 475.3983592412059,
      126.0521327746929, 473.97537474326555, 120.90193645254604, 473.4205736306047,
    ]);
    expect(polylineMidpoint(s)).toEqual({ x: 132.70136402237665, y: 474.6916582912715 });
  });

  it('short straight edge (sfdp 2371)', () => {
    const s = spl([
      38.29610875454904, 8.935559416719954, 38.28249496059311, 8.907628630987503,
      38.271798408199174, 8.885683013626291, 38.26450530429423, 8.870720092698178,
    ]);
    expect(polylineMidpoint(s)).toEqual({ x: 38.280307029421635, y: 8.903139754709068 });
  });
});

describe('dist2 is the fused DIST2 the oracle compiles', () => {
  // libgvc 16.1 compiles DIST2 as `fmul d_y, dy, dy; fmadd d, dx, dx, d_y`
  // (dotneato_closest, edgeMidpoint, resolvePort). This pair separates that
  // form from both the plain sum (…013) and the y-fused fma(dy, dy, dx*dx).
  it('rounds once on the x term: fmadd(dx, dx, dy*dy)', () => {
    const p = { x: 92316.823, y: 68850.144 };
    const q = { x: 64375.424, y: 57743.274 };
    expect(dist2(p, q)).toBe(904084339.2741014);
  });
});
