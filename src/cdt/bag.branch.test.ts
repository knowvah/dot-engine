// SPDX-License-Identifier: EPL-2.0

/**
 * T4f — branch-coverage tests for cdt/bag.ts (DtBag, DT_OBAG).
 *
 * DtBag has no prior dedicated test file; its only exerciser is xlabels.ts,
 * which never forces empty-tree guards, delete-of-absent-key, or duplicate
 * chains longer than 2. This file drives insert/delete/first/next/last
 * directly against a plain-number bag.
 *
 * @see lib/cdt/dttree.c (DT_OBAG)
 */

import { describe, it, expect } from 'vitest';
import { DtBag } from './bag.js';

const cmp = (a: number, b: number): number => (a < b ? -1 : a > b ? 1 : 0);

function make(): DtBag<number, number> {
  return new DtBag<number, number>((n) => n, cmp);
}

describe('DtBag — insert', () => {
  it('the first insert becomes the root directly (root === null branch)', () => {
    const dt = make();
    dt.insert(5);
    expect(dt.size()).toBe(1);
    expect(dt.first()).toBe(5);
  });

  it('subsequent inserts go through splay+bagInsert (root !== null branch)', () => {
    const dt = make();
    dt.insert(5);
    dt.insert(3);
    dt.insert(8);
    expect(dt.size()).toBe(3);
    const out: number[] = [];
    let cur = dt.first();
    while (cur !== undefined) { out.push(cur); cur = dt.next(cur); }
    expect(out).toEqual([3, 5, 8]);
  });

  it('duplicate keys ARE inserted (DT_OBAG semantics, unlike DtSplay)', () => {
    const dt = make();
    dt.insert(5);
    dt.insert(5);
    dt.insert(5);
    expect(dt.size()).toBe(3);
    const out: number[] = [];
    let cur = dt.first();
    while (cur !== undefined) { out.push(cur); cur = dt.next(cur); }
    expect(out).toEqual([5, 5, 5]);
  });
});

describe('DtBag — empty-tree guards', () => {
  it('delete() on an empty bag returns false', () => {
    expect(make().delete(1)).toBe(false);
  });
  it('first() on an empty bag returns undefined', () => {
    expect(make().first()).toBeUndefined();
  });
  it('next() on an empty bag returns undefined', () => {
    expect(make().next(1)).toBeUndefined();
  });
  it('last() on an empty bag returns undefined', () => {
    expect(make().last()).toBeUndefined();
  });
});

describe('DtBag — delete', () => {
  it('delete() of a key not present (post-splay compare !== 0) returns false', () => {
    const dt = make();
    dt.insert(5);
    dt.insert(8);
    expect(dt.delete(99)).toBe(false);
    expect(dt.size()).toBe(2);
  });

  it('delete() of a unique key with no left child promotes the right subtree', () => {
    const dt = make();
    dt.insert(5);
    dt.insert(8);
    expect(dt.delete(5)).toBe(true);
    expect(dt.size()).toBe(1);
    expect(dt.first()).toBe(8);
  });

  it('delete() of a node with a non-null left child promotes max-of-left', () => {
    const dt = make();
    for (const k of [5, 2, 8, 1, 3]) dt.insert(k);
    expect(dt.delete(5)).toBe(true);
    const out: number[] = [];
    let cur = dt.first();
    while (cur !== undefined) { out.push(cur); cur = dt.next(cur); }
    expect(out).toEqual([1, 2, 3, 8]);
  });

  it('delete() removes whichever duplicate is currently splayed to the root', () => {
    const dt = make();
    const a = 5, b = 5, c = 5;
    dt.insert(a); dt.insert(b); dt.insert(c);
    expect(dt.delete(b)).toBe(true); // primitives: matches by value, not identity
    expect(dt.size()).toBe(2);
  });

  // BUG (found while writing this coverage suite, not fixed per task
  // boundaries — NEVER edit src behavior): bagInsert's found-branch merge
  // (splay-core.ts) threads the OLD (matched) node onto the NEW node's
  // `.right`, in every insertion path traced (both the zero-rotation
  // "match is already root" fast path, and the general path reached via an
  // intervening rotation past a distinct-key node) — contradicting this
  // module's own doc comment ("new node is inserted immediately to the LEFT
  // of the matching node") and bag.ts's findByIdentity/unlinkNode, which
  // only ever descend `.left`. Consequently delete() by object identity
  // returns false for a duplicate immediately after it is inserted, unless
  // some unrelated splay (e.g. an intervening first()/next() walk or
  // another delete) happens to reposition it. Confirmed via direct `_root`
  // inspection with 5/10/3 distinct keys + a duplicate of 10: the original
  // id=10 object ends up on the new root's `.right`, and delete(original)
  // returns false when called immediately after insert (no intervening
  // walk) — see the passing test below, which pins the *actual* (buggy)
  // behavior rather than the documented one.
  // @see src/cdt/splay-core.ts:bagInsert (found-branch merge, ~line 156)
  // @see src/cdt/bag.ts:findByIdentity (left-only walk)
  it.todo(
    'BUG: delete() of a non-root duplicate fails because bagInsert threads ' +
    'matched nodes onto `.right`, but findByIdentity/unlinkNode only walk `.left`',
  );

  it('pins the actual (buggy) behavior: delete() of a just-inserted duplicate fails', () => {
    // A fresh top-down splay-insert always makes the JUST-inserted node the
    // new root. With three prior distinct keys (5, 10, 3 — 3 last, so root
    // is 3, not 10) the id=10 duplicate must descend past root to find its
    // match — yet the original id=10 object still ends up unreachable via
    // findByIdentity's left-only walk (see the BUG note above).
    const objDt = new DtBag<{ id: number; tag: string }, number>((o) => o.id, cmp);
    const origTen = { id: 10, tag: 'ten' };
    objDt.insert({ id: 5, tag: 'five' });
    objDt.insert(origTen);
    objDt.insert({ id: 3, tag: 'three' });
    const dupTen = { id: 10, tag: 'dupTen' };
    objDt.insert(dupTen);
    expect(objDt.size()).toBe(4);
    // Deliberately do NOT iterate/search the bag before deleting — walking
    // it (first()/next()) splays nodes and would mask the bug by
    // incidentally repositioning origTen.
    expect(objDt.delete(origTen)).toBe(false); // BUG: should be true
    expect(objDt.size()).toBe(4); // nothing was removed
    // The object is still logically present (confirmed via the root-level
    // delete, which DOES work — see 'removes whichever duplicate is
    // currently splayed to the root' above — and via iteration).
    const remaining = [...objDt].map((o) => o.tag).sort();
    expect(remaining).toEqual(['dupTen', 'five', 'ten', 'three']);
  });

  it('delete() returns false when identity is not found among same-key nodes', () => {
    const dt = make();
    dt.insert(5);
    dt.insert(5);
    // A distinct number instance is impossible for primitives (deleting 5
    // finds *a* match), so verify the identity walk itself using object
    // values instead, where reference identity is meaningful.
    const objDt = new DtBag<{ id: number }, number>((o) => o.id, cmp);
    const oa = { id: 1 }, ob = { id: 1 };
    objDt.insert(oa);
    objDt.insert(ob);
    const impostor = { id: 1 };
    expect(objDt.delete(impostor)).toBe(false);
    expect(objDt.size()).toBe(2);
  });
});

describe('DtBag — next/last', () => {
  it('next() of the maximum element returns undefined (root.right === null)', () => {
    const dt = make();
    for (const k of [3, 1, 2]) dt.insert(k);
    expect(dt.next(3)).toBeUndefined();
  });

  it('next() splays min-of-right when a successor subtree exists', () => {
    const dt = make();
    for (const k of [10, 20, 30]) dt.insert(k);
    expect(dt.next(10)).toBe(20);
  });

  it('next() of a non-existent key less than root returns root directly (cmp < 0)', () => {
    const dt = make();
    for (const k of [10, 20, 30]) dt.insert(k);
    expect(dt.next(5)).toBe(10);
  });

  it('last() returns the maximum element', () => {
    const dt = make();
    for (const k of [10, 30, 20]) dt.insert(k);
    expect(dt.last()).toBe(30);
  });
});

describe('DtBag — clear', () => {
  it('clear() empties the bag and resets size', () => {
    const dt = make();
    for (const k of [1, 2, 3]) dt.insert(k);
    dt.clear();
    expect(dt.size()).toBe(0);
    expect(dt.first()).toBeUndefined();
  });
});

describe('DtBag — Symbol.iterator', () => {
  it('for-of drains all elements including duplicates in ascending order', () => {
    const dt = make();
    for (const k of [3, 1, 3, 2]) dt.insert(k);
    const out: number[] = [];
    for (const v of dt) out.push(v);
    expect(out).toEqual([1, 2, 3, 3]);
  });

  it('for-of on an empty bag yields nothing', () => {
    const dt = make();
    const out: number[] = [];
    for (const v of dt) out.push(v);
    expect(out).toEqual([]);
  });
});
