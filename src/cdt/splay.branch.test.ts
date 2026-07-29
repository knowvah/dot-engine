// SPDX-License-Identifier: EPL-2.0

/**
 * T4f — branch-coverage tests for cdt/splay.ts (DtSplay).
 *
 * cdt-order.test.ts exhaustively tests iteration order on populated trees
 * but never exercises the empty-tree guards on delete/search/first/next/
 * last/prev, delete/next/prev misses, or the Symbol.iterator done branch.
 *
 * @see lib/cdt/dttree.c
 */

import { describe, it, expect } from 'vitest';
import { DtSplay } from './splay.js';

const cmp = (a: number, b: number): number => (a < b ? -1 : a > b ? 1 : 0);

function make(): DtSplay<number, number> {
  return new DtSplay<number, number>((n) => n, cmp);
}

describe('DtSplay — empty-tree guards', () => {
  it('delete() on an empty tree returns false', () => {
    expect(make().delete(1)).toBe(false);
  });

  it('search() on an empty tree returns undefined', () => {
    expect(make().search(1)).toBeUndefined();
  });

  it('first() on an empty tree returns undefined', () => {
    expect(make().first()).toBeUndefined();
  });

  it('next() on an empty tree returns undefined', () => {
    expect(make().next(1)).toBeUndefined();
  });

  it('last() on an empty tree returns undefined', () => {
    expect(make().last()).toBeUndefined();
  });

  it('prev() on an empty tree returns undefined', () => {
    expect(make().prev(1)).toBeUndefined();
  });
});

describe('DtSplay — insert', () => {
  it('inserting a duplicate key returns the existing object and leaves size unchanged', () => {
    const dt = make();
    dt.insert(5);
    dt.insert(2);
    expect(dt.insert(5)).toBe(5);
    expect(dt.size()).toBe(2);
  });
});

describe('DtSplay — delete', () => {
  it('delete() of a key not present returns false and leaves size unchanged', () => {
    const dt = make();
    for (const k of [5, 2, 8]) dt.insert(k);
    expect(dt.delete(99)).toBe(false);
    expect(dt.size()).toBe(3);
  });

  it('delete() of the root with no left child promotes the right subtree', () => {
    const dt = make();
    dt.insert(5);
    dt.insert(10);
    expect(dt.delete(5)).toBe(true);
    expect(dt.first()).toBe(10);
    expect(dt.size()).toBe(1);
  });

  it('delete() of a node with a left child promotes max-of-left', () => {
    const dt = make();
    for (const k of [5, 2, 8, 1, 3]) dt.insert(k);
    expect(dt.delete(5)).toBe(true);
    const out: number[] = [];
    let cur = dt.first();
    while (cur !== undefined) { out.push(cur); cur = dt.next(cur); }
    expect(out).toEqual([1, 2, 3, 8]);
  });
});

describe('DtSplay — search', () => {
  it('search() finds an existing key', () => {
    const dt = make();
    for (const k of [5, 2, 8]) dt.insert(k);
    expect(dt.search(8)).toBe(8);
  });

  it('search() returns undefined for a key not present', () => {
    const dt = make();
    for (const k of [5, 2, 8]) dt.insert(k);
    expect(dt.search(99)).toBeUndefined();
  });
});

describe('DtSplay — next/prev on non-existent keys', () => {
  it('next() of a non-existent key less than root returns root (cmp < 0)', () => {
    const dt = make();
    for (const k of [10, 20, 30]) dt.insert(k);
    // Splay 5 (not present): root becomes 10 (nearest), cmp(5,10) < 0.
    expect(dt.next(5)).toBe(10);
  });

  it('next() at the maximum element returns undefined (right === null)', () => {
    const dt = make();
    for (const k of [10, 20, 30]) dt.insert(k);
    expect(dt.next(30)).toBeUndefined();
  });

  it('prev() of a non-existent key greater than root returns root (cmp > 0)', () => {
    const dt = make();
    for (const k of [10, 20, 30]) dt.insert(k);
    // Splay 25 (not present): root becomes 30 or 20 depending on splay path;
    // whichever it is, cmp(25, root) > 0 must hold for a value < 25's nearest-above.
    expect(dt.prev(25)).toBe(20);
  });

  it('prev() at the minimum element returns undefined (left === null)', () => {
    const dt = make();
    for (const k of [10, 20, 30]) dt.insert(k);
    expect(dt.prev(10)).toBeUndefined();
  });

  it('next() of an exact-match key with a non-empty right subtree splays min-of-right', () => {
    const dt = make();
    for (const k of [10, 20, 30]) dt.insert(k);
    expect(dt.next(10)).toBe(20);
  });

  it('prev() of an exact-match key with a non-empty left subtree splays max-of-left', () => {
    const dt = make();
    for (const k of [10, 20, 30]) dt.insert(k);
    expect(dt.prev(20)).toBe(10);
  });
});

describe('DtSplay — last()', () => {
  it('returns the maximum element and splays it to root', () => {
    const dt = make();
    for (const k of [10, 30, 20]) dt.insert(k);
    expect(dt.last()).toBe(30);
  });
});

describe('DtSplay — Symbol.iterator', () => {
  it('for-of drains all elements in ascending order and terminates (done branch)', () => {
    const dt = make();
    for (const k of [3, 1, 2]) dt.insert(k);
    const out: number[] = [];
    for (const v of dt) out.push(v);
    expect(out).toEqual([1, 2, 3]);
  });

  it('for-of on an empty tree yields nothing (done immediately)', () => {
    const dt = make();
    const out: number[] = [];
    for (const v of dt) out.push(v);
    expect(out).toEqual([]);
  });
});

describe('DtSplay — clear', () => {
  it('clear() empties the tree and resets size', () => {
    const dt = make();
    for (const k of [1, 2, 3]) dt.insert(k);
    dt.clear();
    expect(dt.size()).toBe(0);
    expect(dt.first()).toBeUndefined();
  });
});
