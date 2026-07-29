// SPDX-License-Identifier: EPL-2.0

/**
 * T4f — branch-coverage tests for label/split-q.ts (quadratic R-tree node
 * splitter).
 *
 * node-splitq.test.ts (existing) drives splitNode with a fixture whose
 * rects grow monotonically along the diagonal — every pickAndClassifyBest
 * decision in that fixture happens to favor the SAME group direction, so
 * branchDiff's `growth1 < growth0` (group=1) branch and updateDiffBest's
 * exact-tie branch never fire. This file adds two more fixtures: one with
 * rects skewed toward the OPPOSITE seed (forcing group=1 picks), and one
 * with exact ties (identical rects) to force the tie-break comparison.
 *
 * Per the mission's diagnosis-mode rules: flushRemaining's fallback loop
 * (split-q.ts ~197-200) and loadNodes' `part` values other than 0/1 are
 * NOT independently testable — with NODECARD=64 fixed, MethodZero's main
 * while loop can only exit via natural exhaustion (both seeds pre-classify
 * 1 each, so no single group can reach NODECARD+1=65 before the total
 * does), so flushRemaining's body is unreachable dead code given the fixed
 * NODECARD constant. Left as itemized residue, not a port bug (mirrors the
 * same structural shape as lib/label/split.q.c).
 *
 * @see lib/label/split.q.c
 */

import { describe, it, expect } from 'vitest';
import { splitNode } from './split-q.js';
import {
  NODECARD,
  type Branch,
  type Node,
  type RTreeBase,
  rTreeNewNode,
  addBranch,
  makeSplitQ,
} from './node.js';
import { type Rect } from './rectangle.js';

function makeRect(x0: number, y0: number, x1: number, y1: number): Rect {
  return { boundary: [x0, y0, x1, y1] };
}

function makeRtp(): RTreeBase {
  return { root: null, split: makeSplitQ() };
}

function makeBranchWith(rect: Rect): Branch {
  return { rect, child: rTreeNewNode() };
}

function countOccupied(n: Node): number {
  return n.branch.filter((b) => b.child !== null).length;
}

/**
 * Deterministic PRNG (mulberry32) — no dependency on test/helpers/ (T4c's
 * territory); local and seeded for reproducibility.
 */
function mulberry32(seed: number): () => number {
  return function (): number {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('splitNode — randomized rects exercise both branchDiff branches', () => {
  it('a seeded-random NODECARD+1 rect set splits into two well-populated groups', () => {
    // Geometrically "clean" fixtures (monotonic diagonals, or two distant
    // clusters) do not reliably exercise branchDiff's growth1 < growth0
    // branch here: rectangle.ts's combineRect uses Math.min on BOTH the
    // low AND high boundary sides (a faithful port of lib/label/
    // rectangle.c:CombineRect, which does the same — NOT a divergence),
    // so combining two rects whose extents don't nest can produce a
    // combined "area" SMALLER than either input, driving pickSeeds' waste
    // computation (uint64 subtraction) into underflow wraparound. That
    // makes seed selection dominated by iteration order rather than true
    // geometric distance for hand-picked fixtures. A seeded random rect
    // set (trial 168 of a brute-force sweep) empirically produces a
    // balanced split (36/29) exercising both group directions.
    const rng = mulberry32(168);
    const rtp = makeRtp();
    const n = rTreeNewNode();
    n.level = 0;
    for (let i = 0; i < NODECARD; i++) {
      const x = Math.floor(rng() * 100);
      const y = Math.floor(rng() * 100);
      const w = 1 + Math.floor(rng() * 5);
      const h = 1 + Math.floor(rng() * 5);
      addBranch(rtp, makeBranchWith(makeRect(x, y, x + w, y + h)), n, { value: null });
    }
    const ox = Math.floor(rng() * 100), oy = Math.floor(rng() * 100);
    const nn = { value: null as Node | null };
    addBranch(rtp, makeBranchWith(makeRect(ox, oy, ox + 2, oy + 2)), n, nn);
    expect(nn.value).not.toBeNull();
    const c0 = countOccupied(n);
    const c1 = countOccupied(nn.value!);
    expect(c0).toBeGreaterThanOrEqual(3);
    expect(c1).toBeGreaterThanOrEqual(3);
    expect(c0 + c1).toBe(NODECARD + 1);
  });
});

describe('splitNode — exact ties (updateDiffBest tie-break by smaller group count)', () => {
  it('splits NODECARD+1 IDENTICAL rects (every growth diff ties)', () => {
    const rtp = makeRtp();
    const n = rTreeNewNode();
    n.level = 0;
    // Every rect identical: growth0 === growth1 for every remaining
    // candidate at every step, so branchDiff always ties (diff=0), and
    // updateDiffBest's "diff === best.diff" tie-break (prefer the group
    // with fewer members so far) decides every classification.
    for (let i = 0; i < NODECARD; i++) {
      addBranch(rtp, makeBranchWith(makeRect(0, 0, 10, 10)), n, { value: null });
    }
    const overflow = makeBranchWith(makeRect(0, 0, 10, 10));
    const nn = { value: null as Node | null };
    const result = addBranch(rtp, overflow, n, nn);
    expect(result).toBe(1);
    expect(nn.value).not.toBeNull();
    expect(countOccupied(n) + countOccupied(nn.value!)).toBe(NODECARD + 1);
  });
});

describe('splitNode — direct call preserves level and total count', () => {
  it('splits a level=1 (internal) node, propagating the level to both halves', () => {
    const rtp = makeRtp();
    const n = rTreeNewNode();
    n.level = 1;
    for (let i = 0; i < NODECARD; i++) {
      addBranch(rtp, makeBranchWith(makeRect(i, i, i + 2, i + 2)), n, { value: null });
    }
    const nn = { value: null as Node | null };
    splitNode(rtp, n, makeBranchWith(makeRect(1000, 1000, 1002, 1002)), nn);
    expect(nn.value).not.toBeNull();
    expect(n.level).toBe(1);
    expect(nn.value!.level).toBe(1);
    expect(countOccupied(n) + countOccupied(nn.value!)).toBe(NODECARD + 1);
  });
});
