// SPDX-License-Identifier: EPL-2.0

/**
 * T4f — branch-coverage tests for cdt/hash-core.ts (rehash/migrateChain/
 * targetSlotCount). Baseline was 0% — hash.branch.test.ts exercises this
 * module indirectly via DtHash's resize path, but migrateChain's internal
 * branches (stay-vs-move, head-vs-non-head relink, none-stayed) need
 * hand-built HashNode chains to hit deterministically.
 *
 * @see lib/cdt/dthash.c
 */

import { describe, it, expect } from 'vitest';
import {
  HSLOT, hload, hindex, migrateChain, targetSlotCount, rehash,
  type HashNode,
} from './hash-core.js';

function node<T>(hash: number, obj: T, right: HashNode<T> | null = null): HashNode<T> {
  return { right, hash, obj };
}

describe('hload / hindex', () => {
  it('hload doubles the slot count', () => {
    expect(hload(256)).toBe(512);
  });
  it('hindex masks the hash to the slot range', () => {
    expect(hindex(256, 257)).toBe(1);
    expect(hindex(256, 255)).toBe(255);
  });
});

describe('targetSlotCount', () => {
  it('starts from HSLOT when current is 0', () => {
    expect(targetSlotCount(0, 1)).toBe(HSLOT);
  });
  it('keeps current size when it already fits the load', () => {
    expect(targetSlotCount(256, 100)).toBe(256);
  });
  it('doubles repeatedly until size fits within hload(n)', () => {
    // hload(256)=512, hload(512)=1024; size=600 needs one doubling.
    expect(targetSlotCount(256, 600)).toBe(512);
    // size=1200 needs two doublings from 256.
    expect(targetSlotCount(256, 1200)).toBe(1024);
  });
});

describe('migrateChain', () => {
  it('a node whose new-slot index matches si stays in place (dest === si)', () => {
    // n=4 slots after resize; hash=0 maps to slot 0 both before and after.
    const oldSlots: Array<HashNode<string> | null> = [node(0, 'a'), null];
    const newSlots: Array<HashNode<string> | null> = [null, null, null, null];
    migrateChain(oldSlots, newSlots, 0, 4);
    expect(newSlots[0]?.obj).toBe('a');
  });

  it('a node whose new-slot index differs is unlinked from the head and moved', () => {
    // hash=2 with old n=2 maps to slot 0 (2 & 1 = 0); with new n=4 maps to
    // slot 2 (2 & 3 = 2) -> must move. It is the chain HEAD (prev===null).
    const oldSlots: Array<HashNode<string> | null> = [node(2, 'head'), null];
    const newSlots: Array<HashNode<string> | null> = [null, null, null, null];
    migrateChain(oldSlots, newSlots, 0, 4);
    expect(newSlots[2]?.obj).toBe('head');
    expect(oldSlots[0]).toBeNull(); // head relinked to `next` (null)
  });

  it('a non-head node that moves is unlinked via prev.right, not oldSlots[si]', () => {
    // Chain in old slot 0 (n=2): stay(hash=0) -> move(hash=2).
    // stay stays at slot 0 in the new table (n=4); move goes to slot 2.
    const moving = node(2, 'move');
    const staying = node(0, 'stay', moving);
    const oldSlots: Array<HashNode<string> | null> = [staying, null];
    const newSlots: Array<HashNode<string> | null> = [null, null, null, null];
    migrateChain(oldSlots, newSlots, 0, 4);
    expect(newSlots[2]?.obj).toBe('move');
    // The staying node's `.right` was relinked past the moved node.
    expect(staying.right).toBeNull();
    expect(oldSlots[0]?.obj).toBe('stay');
    expect(newSlots[0]?.obj).toBe('stay');
  });

  it('when every node in the chain moves out, the destination slot stays null', () => {
    const oldSlots: Array<HashNode<string> | null> = [node(2, 'only'), null];
    const newSlots: Array<HashNode<string> | null> = [null, null, null, null];
    migrateChain(oldSlots, newSlots, 0, 4);
    expect(newSlots[0]).toBeNull();
  });

  it('an empty chain (oldSlots[si] === null) leaves the new slot untouched', () => {
    const oldSlots: Array<HashNode<string> | null> = [null, null];
    const newSlots: Array<HashNode<string> | null> = [null, null, null, null];
    migrateChain(oldSlots, newSlots, 0, 4);
    expect(newSlots[0]).toBeNull();
  });
});

describe('rehash', () => {
  it('returns the same array unchanged when no resize is needed', () => {
    const oldSlots: Array<HashNode<number> | null> = new Array(HSLOT).fill(null);
    const result = rehash(oldSlots, 10);
    expect(result).toBe(oldSlots);
  });

  it('grows the table and migrates every chain when over load', () => {
    const oldSlots: Array<HashNode<number> | null> = new Array(HSLOT).fill(null);
    for (let i = 0; i < 600; i++) {
      const h = i; // simple identity hash for a deterministic layout
      const si = hindex(HSLOT, h);
      oldSlots[si] = node(h, i, oldSlots[si]);
    }
    const result = rehash(oldSlots, 600);
    expect(result.length).toBeGreaterThan(HSLOT);
    // Every original value must still be reachable in the new table.
    const found = new Set<number>();
    for (const head of result) {
      let t = head;
      while (t !== null) { found.add(t.obj); t = t.right; }
    }
    expect(found.size).toBe(600);
  });
});
