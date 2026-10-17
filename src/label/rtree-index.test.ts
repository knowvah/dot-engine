// SPDX-License-Identifier: EPL-2.0

/**
 * Tests for the R-tree public API: RTree, rTreeOpen, rTreeInsert, rTreeSearch.
 * @see label/index.c
 * @see label/index.h
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { type Rect } from './rectangle.js';
import {
  type RTree,
  type Leaf,
  rTreeOpen,
  rTreeClose,
  rTreeNewIndex,
  rTreeInsert,
  rTreeSearch,
} from './index.js';
import { type Node } from './node.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Build a rect from [x0,y0,x1,y1] (boundary[0..3]). */
function rect(x0: number, y0: number, x1: number, y1: number): Rect {
  return { boundary: [x0, y0, x1, y1] };
}

// ---------------------------------------------------------------------------
// rTreeOpen / rTreeClose
// ---------------------------------------------------------------------------

describe('rTreeOpen', () => {
  it('returns an RTree with a non-null root at level 0', () => {
    const rt = rTreeOpen();
    expect(rt.root).not.toBeNull();
    expect(rt.root!.level).toBe(0);
  });
});

describe('rTreeClose', () => {
  it('does not throw when closing an empty tree', () => {
    const rt = rTreeOpen();
    expect(() => rTreeClose(rt)).not.toThrow();
  });

  it('does not throw when closing a tree with inserted data', () => {
    const rt = rTreeOpen();
    rTreeInsert(rt, rect(0, 0, 1, 1), { id: 1 });
    expect(() => rTreeClose(rt)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// rTreeNewIndex
// ---------------------------------------------------------------------------

describe('rTreeNewIndex', () => {
  it('returns a leaf node (level 0)', () => {
    const n = rTreeNewIndex();
    expect(n.level).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// rTreeInsert — basic insertion, no split
// ---------------------------------------------------------------------------

describe('rTreeInsert — single entry', () => {
  let rt: RTree;

  beforeEach(() => {
    rt = rTreeOpen();
  });

  it('returns 0 (no root split) for a single insert', () => {
    const r = rect(0, 0, 10, 10);
    const result = rTreeInsert(rt, r, { id: 1 });
    expect(result).toBe(0);
  });

  it('root is searchable after one insert', () => {
    const r = rect(0, 0, 10, 10);
    const data = { id: 42 };
    rTreeInsert(rt, r, data);
    const hits = rTreeSearch(rt, rt.root!, rect(0, 0, 10, 10));
    expect(hits.length).toBe(1);
    expect(hits[0].data).toBe(data);
  });
});

// ---------------------------------------------------------------------------
// rTreeSearch — overlap semantics
// ---------------------------------------------------------------------------

function checkNoOverlap(rt: RTree): void {
  rTreeInsert(rt, rect(10, 10, 20, 20), { id: 1 });
  const hits = rTreeSearch(rt, rt.root!, rect(30, 30, 40, 40));
  expect(hits).toHaveLength(0);
}

function checkTouchingEdge(rt: RTree): void {
  rTreeInsert(rt, rect(0, 0, 10, 10), { id: 1 });
  const hits = rTreeSearch(rt, rt.root!, rect(10, 10, 20, 20));
  expect(hits).toHaveLength(1);
}

function checkMultiOverlap(rt: RTree): void {
  rTreeInsert(rt, rect(0, 0, 5, 5), { id: 1 });
  rTreeInsert(rt, rect(4, 4, 9, 9), { id: 2 });
  rTreeInsert(rt, rect(20, 20, 30, 30), { id: 3 });
  const hits = rTreeSearch(rt, rt.root!, rect(3, 3, 6, 6));
  const ids = hits.map(l => (l.data as { id: number }).id).sort();
  expect(ids).toEqual([1, 2]);
}

describe('rTreeSearch — overlap', () => {
  let rt: RTree;

  beforeEach(() => { rt = rTreeOpen(); });

  it('returns empty array when no rects overlap query', () => { checkNoOverlap(rt); });
  it('returns touching-edge rects (overlap is non-strict <=)', () => { checkTouchingEdge(rt); });
  it('returns all overlapping rects', () => { checkMultiOverlap(rt); });
});

// ---------------------------------------------------------------------------
// Leaf-list order: C list-cons order is REVERSE within a leaf node
// (RTreeLeafListAdd prepends each new hit, so last scanned = first in list).
// ---------------------------------------------------------------------------

describe('rTreeSearch — leaf-list cons order', () => {
  /**
   * Within a single leaf node (<=64 entries), branch slots are scanned
   * i=0..63.  Each matching slot is prepended to the result list.
   * Therefore iteration order of the returned array is REVERSE of the
   * branch-slot insertion order.
   *
   * We insert rects A then B (same bounding area, both overlap query).
   * A goes into slot 0, B into slot 1.  Search scans slot 0 first → prepend A,
   * then slot 1 → prepend B.  Final list head = B, tail = A.
   * Expected returned array: [B, A].
   */
  it('returns hits in reverse branch-slot order within a leaf', () => {
    const rt = rTreeOpen();
    const dataA = { id: 'A' };
    const dataB = { id: 'B' };
    rTreeInsert(rt, rect(0, 0, 5, 5), dataA);  // slot 0
    rTreeInsert(rt, rect(0, 0, 5, 5), dataB);  // slot 1
    const hits = rTreeSearch(rt, rt.root!, rect(0, 0, 5, 5));
    expect(hits).toHaveLength(2);
    // B was inserted last (slot 1) → prepended last → head of list → index 0
    expect((hits[0].data as { id: string }).id).toBe('B');
    // A was inserted first (slot 0) → prepended first → tail of list → index 1
    expect((hits[1].data as { id: string }).id).toBe('A');
  });
});

// ---------------------------------------------------------------------------
// Root split — inserting >NODECARD entries forces a root split
// ---------------------------------------------------------------------------

const SPLIT_NODECARD = 64;

/** Insert NODECARD+1 non-overlapping 1×1 rects; return the tree. */
function buildOverflowTree(): RTree {
  const rt = rTreeOpen();
  for (let i = 0; i <= SPLIT_NODECARD; i++) {
    rTreeInsert(rt, rect(i * 2, 0, i * 2 + 1, 1), { id: i });
  }
  return rt;
}

function checkRootSplitOccurred(): void {
  const rt = rTreeOpen();
  let splitResult = 0;
  for (let i = 0; i <= SPLIT_NODECARD; i++) {
    if (rTreeInsert(rt, rect(i * 2, 0, i * 2 + 1, 1), { id: i }) === 1) {
      splitResult = 1;
    }
  }
  expect(splitResult).toBe(1);
  expect(rt.root!.level).toBeGreaterThan(0);
}

function checkSearchAllAfterSplit(): void {
  const rt = buildOverflowTree();
  const hits = rTreeSearch(rt, rt.root!, rect(0, 0, (SPLIT_NODECARD + 1) * 2, 2));
  expect(hits).toHaveLength(SPLIT_NODECARD + 1);
}

function checkSubsetAfterSplit(): void {
  const rt = buildOverflowTree();
  const hits = rTreeSearch(rt, rt.root!, rect(0, 0, 9, 1));
  const ids = hits.map(l => (l.data as { id: number }).id).sort((a, b) => a - b);
  expect(ids).toEqual([0, 1, 2, 3, 4]);
}

describe('rTreeInsert — root split (> NODECARD entries)', () => {
  it('returns 1 and grows tree height after root overflow', checkRootSplitOccurred);
  it('can still search all entries after a root split', checkSearchAllAfterSplit);
  it('searches a subset correctly after root split', checkSubsetAfterSplit);
});

// ---------------------------------------------------------------------------
// Leaf type
// ---------------------------------------------------------------------------

describe('Leaf shape', () => {
  it('each hit has a rect and data field', () => {
    const rt = rTreeOpen();
    const r = rect(1, 2, 3, 4);
    const obj = { x: 7 };
    rTreeInsert(rt, r, obj);
    const hits = rTreeSearch(rt, rt.root!, r);
    expect(hits).toHaveLength(1);
    const leaf: Leaf = hits[0];
    expect(leaf.rect).toBeDefined();
    expect(leaf.data).toBe(obj);
  });
});

// ---------------------------------------------------------------------------
// Rect_t value semantics (T13): C copies Rect_t on every assignment, so no two
// branches ever share one rect. Expected hits below come from the native
// graphviz 16.1 libgvc (RTreeOpen/RTreeInsert/RTreeSearch) fed the same stream.
// ---------------------------------------------------------------------------

/** Deterministic integer rect stream (LCG, BigInt to keep it exact). */
function lcgRects(seed: number, n: number, span: number): Rect[] {
  let s = BigInt(seed);
  const next = (m: number): number => {
    s = (s * 1103515245n + 12345n) % 2147483648n;
    return Number(s % BigInt(m));
  };
  const out: Rect[] = [];
  for (let i = 0; i < n; i++) {
    const x = next(span); const y = next(span); const w = next(8); const h = next(8);
    out.push(rect(x, y, x + w, y + h));
  }
  return out;
}

/** Insert the first `k` rects with data `{ id }`. */
function loadStream(rects: Rect[], k: number): RTree {
  const rt = rTreeOpen();
  for (let i = 0; i < k; i++) rTreeInsert(rt, rects[i], { id: i });
  return rt;
}

/** Every leaf rect, keyed by data id. */
function leafRects(n: Node, out: Map<number, number[]>): Map<number, number[]> {
  for (const b of n.branch) {
    if (b.child === null) continue;
    if (n.level > 0) leafRects(b.child, out);
    else out.set((b.child as unknown as { id: number }).id, [...b.rect.boundary]);
  }
  return out;
}

function hitIds(rt: RTree, q: Rect): number[] {
  return rTreeSearch(rt, rt.root!, q).map((l) => (l.data as { id: number }).id);
}

describe('rTreeInsert keeps C Rect_t value semantics', () => {
  // 1015 is the shortest prefix of this stream on which the port once zeroed
  // a leaf rect (leaf 3) through a shared rect object.
  const rects = lcgRects(3, 1015, 40);

  it('never changes a leaf rect after insertion (no shared rect objects)', () => {
    const leaves = leafRects(loadStream(rects, 1015).root!, new Map());
    expect(leaves.size).toBe(1015);
    for (const [id, b] of leaves) expect(b).toEqual(rects[id].boundary);
  });

  it('matches native RTreeSearch after 1015 inserts', () => {
    const rt = loadStream(rects, 1015);
    expect(hitIds(rt, rect(4, 29, 6, 32))).toEqual([803]);
    expect(hitIds(rt, rect(10, 10, 14, 14))).toEqual([849]);
    expect(hitIds(rt, rect(30, 0, 34, 6))).toEqual([]);
    expect(hitIds(rt, rect(20, 20, 21, 21))).toEqual([859, 871]);
    expect(hitIds(rt, rect(0, 0, 1, 1))).toEqual([
      984, 966, 870, 812, 778, 714, 694, 642, 624, 610, 608, 580, 562, 492,
      464, 424, 384, 356, 346, 342, 258, 216, 208, 196, 182, 144, 134, 36,
    ]);
  });
});
