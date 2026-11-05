# T15: the reset's edge cases (123, AD-9)

**Context:** two edges of `ctx.layout`'s reset are unpinned (`src/gvc/context.ts:325-340`, `src/gvc/layout-reset.ts:32`): a layout that throws after a reset leaves `laidOut` unset, and a subgraph laid out after its root was freed is not reset. `gvLayout` binds the root's record for a subgraph (`lib/gvc/gvlayout.c:61-64`).

**Task:**
1. Run a native harness for the subgraph case: layout root, free it, layout a subgraph, render. Port what differs.
2. For the throw: C aborts, so there is nothing to match. Pin the port's current behaviour in a test, and say so in a comment.

**Write-set:** `src/gvc/layout-reset.ts`, `src/gvc/context.ts`, a new `src/gvc/layout-reset.edges.test.ts`, `plans/post-16-1-followups-10/harness/T15/`.

**Acceptance criteria:**
- *Given* a subgraph laid out after its root was freed, *when* rendered, *then* output matches the harness.
- *Given* an engine that throws after a reset, *then* the test asserts the exact `laidOut` and `cleanup` values left behind.
- *Given* the smoke ids, *when* bytediffed, *then* output is byte-identical (stop 8).

**Commit:** `fix(T15): pin the layout reset's edge cases against native`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
