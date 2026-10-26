// SPDX-License-Identifier: EPL-2.0
import { describe, it, expect } from 'vitest';
import { approxLen } from './svg-edge-split.js';

/** Native `DIST` (clang -O3 fp-contract=on) of the pair a-b; the other two chords are zero. */
const NATIVE_CASES = [
  { a: { x: 3.2972972972972974, y: 1776.1463414634147 }, b: { x: 2128.2790697674418, y: 590.24137931034488 }, w: 2433.4991499052617 },
  { a: { x: 525.1351351351351, y: 1737.4634146341464 }, b: { x: 2080.9302325581393, y: 821.10344827586209 }, w: 1805.6062619268939 },
  { a: { x: 1951.4324324324325, y: 393 }, b: { x: 979.67441860465112, y: 127.17241379310344 }, w: 1007.4611372291736 },
];

describe('approxLen (fused DIST2)', () => {
  it.each(NATIVE_CASES)('matches native bits for $a.x', ({ a, b, w }) => {
    expect(approxLen([a, b, b, b], 0)).toBe(w);
  });
});
