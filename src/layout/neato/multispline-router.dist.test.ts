// SPDX-License-Identifier: EPL-2.0
import { describe, it, expect } from 'vitest';
import { addTriEdge, type Tgraph } from './multispline-router.js';

/** Inputs + weights from clang -O3 (fp-contract=on) `sqrt(SQR(dx)+SQR(dy))`, the oracle's DIST. */
const NATIVE_CASES = [
  { t: { x: 3.2972972972972974, y: 1776.1463414634147 }, h: { x: 2128.2790697674418, y: 590.24137931034488 }, w: 2433.4991499052617 },
  { t: { x: 525.1351351351351, y: 1737.4634146341464 }, h: { x: 2080.9302325581393, y: 821.10344827586209 }, w: 1805.6062619268939 },
  { t: { x: 1951.4324324324325, y: 393 }, h: { x: 979.67441860465112, y: 127.17241379310344 }, w: 1007.4611372291736 },
];

describe('addTriEdge weight (fused DIST2)', () => {
  it.each(NATIVE_CASES)('matches native bits for $t.x', ({ t, h, w }) => {
    const g: Tgraph = { nodes: [{ edges: [], ctr: t }, { edges: [], ctr: h }], edges: [] };
    addTriEdge(g, 0, 1, { i: 5, j: 6 });
    expect(g.edges[0]!.dist).toBe(w);
  });
});
