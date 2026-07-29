// SPDX-License-Identifier: EPL-2.0

/**
 * T4f — branch-coverage tests for cdt/hash.ts (DtHash) and cdt/hash-core.ts
 * (rehash/migrateChain/targetSlotCount).
 *
 * cdt-order.test.ts exercises DtHash's completeness/walk-safety at 200/50
 * keys, well below the HSLOT(256)*2=512 resize threshold, and never forces
 * a collision. This file drives collisions, delete/search move-to-front,
 * and the resize path (which also exercises hash-core.ts's rehash helpers,
 * otherwise completely untested — 0% baseline).
 *
 * @see lib/cdt/dthash.c
 */

import { describe, it, expect } from 'vitest';
import { DtHash } from './hash.js';

// A hash function that always collides (constant hash), to exercise the
// chain-walk / compare-mismatch branches in DtHash's private _find().
function makeCollidingHash(): DtHash<number, number> {
  return new DtHash<number, number>(
    (n) => n,
    () => 42,
    (a, b) => (a < b ? -1 : a > b ? 1 : 0),
  );
}

function intHash(n: number): number {
  return Math.imul(n >>> 0, 0x9e3779b9) >>> 0;
}

function makeHash(): DtHash<number, number> {
  return new DtHash<number, number>((n) => n, intHash, (a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

describe('DtHash — collision handling (constant hash)', () => {
  it('two colliding keys both round-trip via search', () => {
    const dt = makeCollidingHash();
    dt.insert(1);
    dt.insert(2);
    expect(dt.search(1)).toBe(1);
    expect(dt.search(2)).toBe(2);
    expect(dt.size()).toBe(2);
  });

  it('inserting an existing key (same hash, compare===0) returns the existing object', () => {
    const dt = makeCollidingHash();
    dt.insert(1);
    dt.insert(2);
    expect(dt.insert(1)).toBe(1);
    expect(dt.size()).toBe(2);
  });

  it('search on a colliding-but-absent key returns undefined after walking the whole chain', () => {
    const dt = makeCollidingHash();
    dt.insert(1);
    dt.insert(2);
    dt.insert(3);
    expect(dt.search(99)).toBeUndefined();
  });

  it('delete on a colliding-but-absent key returns false', () => {
    const dt = makeCollidingHash();
    dt.insert(1);
    dt.insert(2);
    expect(dt.delete(99)).toBe(false);
  });

  it('delete of a non-head chain member relinks the predecessor', () => {
    const dt = makeCollidingHash();
    dt.insert(1); // chain: 1
    dt.insert(2); // chain: 2 -> 1 (new nodes prepend)
    dt.insert(3); // chain: 3 -> 2 -> 1
    expect(dt.delete(2)).toBe(true);
    expect(dt.search(1)).toBe(1);
    expect(dt.search(3)).toBe(3);
    expect(dt.search(2)).toBeUndefined();
    expect(dt.size()).toBe(2);
  });

  it('delete of the chain head relinks the slot to the next node', () => {
    const dt = makeCollidingHash();
    dt.insert(1);
    dt.insert(2); // head of chain is 2 (most recently inserted)
    expect(dt.delete(2)).toBe(true);
    expect(dt.search(1)).toBe(1);
    expect(dt.size()).toBe(1);
  });

  it('search move-to-front reorders a non-head match to the front of the chain', () => {
    const dt = makeCollidingHash();
    dt.insert(1);
    dt.insert(2);
    dt.insert(3); // chain: 3 -> 2 -> 1
    expect(dt.search(1)).toBe(1); // moves 1 to front: 1 -> 3 -> 2
    // Draining now should still find all three regardless of order.
    const seen = new Set<number>();
    let cur = dt.first();
    while (cur !== undefined) { seen.add(cur); cur = dt.next(cur); }
    expect(seen).toEqual(new Set([1, 2, 3]));
  });
});

describe('DtHash — delete/search on empty table', () => {
  it('delete on a fresh (never-inserted) table returns false', () => {
    expect(makeHash().delete(1)).toBe(false);
  });

  it('search on a fresh (never-inserted) table returns undefined', () => {
    expect(makeHash().search(1)).toBeUndefined();
  });

  it('first on a fresh (never-inserted) table returns undefined', () => {
    expect(makeHash().first()).toBeUndefined();
  });

  it('next() called before any first() (this._here === null) returns undefined', () => {
    const dt = makeHash();
    dt.insert(1);
    // first() was never called: _here is still null, hitting next()'s
    // top guard directly rather than the chain/slot-scan path.
    expect(dt.next(1)).toBeUndefined();
  });
});

describe('DtHash — first()/next() slot-skipping', () => {
  it('first() skips leading empty slots to find the first occupied one', () => {
    // With a real dispersive hash, a single key almost certainly lands past
    // slot 0; first() must skip nulls until it finds the occupied slot.
    const dt = makeHash();
    dt.insert(5);
    expect(dt.first()).toBe(5);
  });

  it('next() skips empty slots between chains to find the next occupied one', () => {
    const dt = makeHash();
    for (let i = 0; i < 20; i++) dt.insert(i);
    const out: number[] = [];
    let cur = dt.first();
    while (cur !== undefined) { out.push(cur); cur = dt.next(cur); }
    expect(out.length).toBe(20);
    expect(new Set(out)).toEqual(new Set(Array.from({ length: 20 }, (_, i) => i)));
  });
});

describe('DtHash — resize on overflow (exercises hash-core.ts rehash/migrateChain)', () => {
  it('inserting past the 2*HSLOT(256)=512 threshold triggers an in-place resize', () => {
    const dt = makeHash();
    for (let i = 0; i < 600; i++) dt.insert(i);
    expect(dt.size()).toBe(600);
    const out: number[] = [];
    let cur = dt.first();
    while (cur !== undefined) { out.push(cur); cur = dt.next(cur); }
    expect(out.length).toBe(600);
    expect(new Set(out).size).toBe(600);
  });

  it('deferred resize triggers when a walk (loop>0) suppressed it during insert', () => {
    const dt = makeHash();
    for (let i = 0; i < 10; i++) dt.insert(i);
    // Start a nested walk (loop=2) so _maybeResize no-ops during the bulk
    // insert below, forcing size well past the 512 threshold while resize
    // is suppressed.
    dt.first(); // loop=1
    dt.first(); // loop=2
    for (let i = 10; i < 600; i++) dt.insert(i);
    // First full drain: decrements loop 2->1; deferred-resize condition
    // (size>hload && loop<=0) is false because loop is still 1 afterward.
    let cur = dt.next(0);
    while (cur !== undefined) cur = dt.next(0);
    // Second call after exhaustion: _here is null -> _endWalk() directly;
    // loop 1->0, and now (size>hload && loop<=0) is true -> deferred resize.
    expect(dt.next(0)).toBeUndefined();
    // The table must still contain everything after the deferred resize.
    const out = new Set<number>();
    let d = dt.first();
    while (d !== undefined) { out.add(d); d = dt.next(d); }
    expect(out.size).toBe(600);
  });
});

describe('DtHash — clear', () => {
  it('clear() empties the table and resets loop/size', () => {
    const dt = makeHash();
    for (let i = 0; i < 5; i++) dt.insert(i);
    dt.first();
    dt.clear();
    expect(dt.size()).toBe(0);
    expect(dt.first()).toBeUndefined();
  });
});
