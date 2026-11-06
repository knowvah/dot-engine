# T9: `dotInitNode`'s list guard (116, AD-8)

**Context:** `src/layout/dot/init.ts:101` allocates `in`, `out`, `flat_in`, `flat_out` and `other` only if unset, and `init.branch.test.ts:138-150` pins that with sentinels. C's `alloc_elist`
(`lib/dotgen/dotinit.c:50-54`) is unconditional. Part 9 T11 added `clearFastGraphLists` (`init.ts:251`) for the same reason.

**Task:**
1. Change the test to C's behaviour first: fresh lists, with `lw`, `rw` and `ht` still handled as C does.
2. Make the allocation unconditional. If anything relied on the guard, name it in the hand-back, and fix the reliance only inside the write-set.

**Write-set:** `src/layout/dot/init.ts`, `src/layout/dot/init.branch.test.ts`.

**Acceptance criteria:**
- *Given* a node with existing lists, *when* `dotInitNode` runs, *then* its lists are new and empty, as `alloc_elist` leaves them.
- *Given* the smoke ids, *when* bytediffed, *then* output is byte-identical (stop 8).

**Commit:** `fix(T9): allocate a node's edge lists unconditionally as C does`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
