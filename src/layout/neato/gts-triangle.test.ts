// SPDX-License-Identifier: EPL-2.0
//
// gts_triangle_enclosing (gts-0.7.6 src/triangle.c) as compiled in the
// oracle's libgts-0.7.5.dylib (arm64): SQRT3 = 1.73205080757 (0x3ffbb67ae858606b),
// r = scale * sqrt(fma(dx, dx, dy*dy)), vertices fused as fma(r, SQRT3, xo),
// fma(r, 2, yo), fma(-r, SQRT3, xo). Expected bit patterns come from a C
// harness calling gts_triangle_enclosing in the installed libgts (part-4 T13).
import { describe, expect, test } from 'vitest';
import { gtsTriangleEnclosing } from './gts-triangle.js';

function bits(d: number): string {
  const b = new DataView(new ArrayBuffer(8));
  b.setFloat64(0, d);
  return b.getBigUint64(0).toString(16).padStart(16, '0');
}

interface Case { pts: number[]; out: string }
const CASES: Case[] = [
  { pts: [-38.61471252916545, -38.04853469434987, 340.7456507295494, -38.04853469434987,
    340.7456507295494, 74.04853469434987, -38.61471252916545, 74.04853469434987],
  out: '40e0cd1d4b7cf1dc c0d34c31d9c63c87 4062e21852a78724 40e352f1d9c63c87 c0e0a7591ad7a2cd c0d34c31d9c63c87' },
  { pts: [0.1, 0.2, 13.7, 5.3, 7.77, -91.3],
    out: '40c0839a901b90e2 c0b338a1f38c32a7 401b999999999999 40c2f821f38c32a7 c0c07cb429b52a7c c0b338a1f38c32a7' },
  { pts: [123.456789, 987.654321, -321.123, 456.789, 77.7777, -88.8888],
    out: '40f89a1c152fd56d c0ec3763f673f20e c058b55199bb2788 40fc8ba655d05e1f c0f8a676bdfcb301 c0ec3763f673f20e' },
  { pts: [1e3, 1e-3, 17.17, 23.23, -4.4, 9.9, 1234.5678, -765.4321, 0.333, 0.777],
    out: '40ff33ebe720ceba c0f204d3d7e1e467 408338abd3c36113 4101e2096b07fc29 c0fee70937d1c136 c0f204d3d7e1e467' },
  { pts: [5, 5],
    out: '4066469005850b54 c057c00000000000 4014000000000000 4069a00000000000 c065069005850b54 c057c00000000000' },
  { pts: [0.7, 0.7, 0.7, 0.7],
    out: '4065bcf66beb71ba c058d33333333333 3fe6666666666666 4069166666666666 c06590299f1ea4ed c058d33333333333' },
  { pts: [1e6, 3e6, -2e6, 7.1e5, 3.3e5, -9.9e5],
    out: '41b9bd0da1d68ffe c1ada285d893a8b2 c11e848000000000 41bdd0873093a8b2 c1b9cc4fe1d68ffe c1ada285d893a8b2' },
];

describe('gtsTriangleEnclosing', () => {
  test.each(CASES)('matches libgts bit for bit (%#)', ({ pts, out }) => {
    const n = pts.length / 2;
    const x = pts.filter((_, i) => i % 2 === 0);
    const y = pts.filter((_, i) => i % 2 === 1);
    const [a, b, c] = gtsTriangleEnclosing(x, y, n, 100);
    const got = [a, b, c].map((v) => `${bits(v[0])} ${bits(v[1])}`).join(' ');
    expect(got).toBe(out);
  });
});
