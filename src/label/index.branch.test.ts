// SPDX-License-Identifier: EPL-2.0

/**
 * T4f — branch-coverage tests for label/index.ts (R-tree public API).
 *
 * rtree-index.test.ts covers a single root split (65 inserts -> height 2)
 * but never: closes a multi-level tree (rTreeClose2's n.level>0 branch),
 * closes an already-null root, forces a SECOND split (insert2Descend's
 * split-propagates branch, only reachable once the tree already has
 * height >= 2), searches an internal node where some but not all children
 * contribute hits (leafListAppend's head/tail null branches), or exercises
 * the malformed-rect validation guard.
 *
 * @see label/index.c
 */

import { describe, it, expect } from 'vitest';
import { type Rect } from './rectangle.js';
import {
  type RTree, rTreeOpen, rTreeClose, rTreeInsert, rTreeSearch, rTreeLeafListFree,
} from './index.js';

function rect(x0: number, y0: number, x1: number, y1: number): Rect {
  return { boundary: [x0, y0, x1, y1] };
}

describe('rTreeClose — already-closed / null root', () => {
  it('closing twice does not throw the second time (rtp.root === null)', () => {
    const rt = rTreeOpen();
    rTreeClose(rt);
    expect(rt.root).toBeNull();
    expect(() => rTreeClose(rt)).not.toThrow();
  });
});

describe('rTreeInsert — validateRect', () => {
  it('throws when a rect has low > high on some dimension', () => {
    const rt = rTreeOpen();
    const bad: Rect = { boundary: [10, 0, 0, 10] }; // x: 10 > 0
    expect(() => rTreeInsert(rt, bad, {})).toThrow(/low > high/);
  });
});

describe('rTreeInsert — second split (insert2Descend both branches)', () => {
  it('a second overflow (>128 total, non-overlapping cells) grows past height 2', () => {
    const rt = rTreeOpen();
    let splitCount = 0;
    // Insert 200 disjoint unit rects on a line; NODECARD=64, so the first
    // split happens at #65 (root becomes internal, height 2). Continuing
    // insertion keeps calling insert2Descend on the (now internal) root:
    // most calls hit the "child didn't split" branch (rect widened), but
    // eventually a child leaf overflows again, hitting the "child DID
    // split -> addBranch on this internal node" branch.
    for (let i = 0; i < 200; i++) {
      const r = rTreeInsert(rt, rect(i * 2, 0, i * 2 + 1, 1), { id: i });
      if (r === 1) splitCount++;
    }
    expect(splitCount).toBeGreaterThanOrEqual(2);
    // Every inserted rect must still be found by a query covering everything.
    const hits = rTreeSearch(rt, rt.root!, rect(-10, -10, 1000, 10));
    expect(hits.length).toBe(200);
    rTreeLeafListFree(hits);
  });
});

describe('rTreeClose — multi-level tree (rTreeClose2 recursion, n.level > 0)', () => {
  it('closes a tree that has been split at least once without throwing', () => {
    const rt = rTreeOpen();
    for (let i = 0; i < 70; i++) {
      rTreeInsert(rt, rect(i, 0, i + 1, 1), { id: i });
    }
    expect(rt.root!.level).toBeGreaterThan(0);
    expect(() => rTreeClose(rt)).not.toThrow();
    expect(rt.root).toBeNull();
  });
});

describe('rTreeSearch — internal-node partial overlap (leafListAppend head/tail)', () => {
  // NOTE: rectangle.ts's combineRect uses Math.min for BOTH the low and
  // high boundary sides (rectangle.ts:104), which does not compute a true
  // union on the high side (it should be Math.max there). This is NOT a
  // porting divergence — lib/label/rectangle.c:CombineRect does the exact
  // same thing (`fmin` on both `boundary[i]` and `boundary[j]`), so the
  // port is faithful to upstream Graphviz's own behavior (confirmed by
  // reading rectangle.c directly). Consequence: internal-node bounding
  // rects can be tighter than the true union of their children once a
  // node has split more than once, so a narrow query can miss entries that
  // a naive per-entry overlap check would expect to find. Not flagged as
  // a port bug per CLAUDE.md (the C source is sacred); tests below avoid
  // asserting exact narrow-query result sets and instead exercise the
  // leafListAppend merge branches via a full-coverage query, which every
  // branch (internal node) necessarily overlaps regardless of this quirk.
  it('accumulates hits across every branch of a multi-level tree (full-coverage query)', () => {
    const rt = rTreeOpen();
    // Force a split so the root is internal with multiple children —
    // leafListAppend's `!head`/`!tail` branches are exercised as results
    // from each child are appended to the accumulator in turn.
    for (let i = 0; i < 70; i++) {
      rTreeInsert(rt, rect(i * 10, 0, i * 10 + 1, 1), { id: i });
    }
    const hits = rTreeSearch(rt, rt.root!, rect(-1000, -1000, 1000, 1000));
    const ids = hits.map((h) => (h.data as { id: number }).id).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: 70 }, (_, i) => i));
  });

  it('returns an empty array when no branch in a multi-level tree overlaps', () => {
    const rt = rTreeOpen();
    for (let i = 0; i < 70; i++) {
      rTreeInsert(rt, rect(i, 0, i + 1, 1), { id: i });
    }
    const hits = rTreeSearch(rt, rt.root!, rect(10000, 10000, 10001, 10001));
    expect(hits).toEqual([]);
  });
});
