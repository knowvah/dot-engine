# T5: remove `getGlobalImageSizer` (item 113, AD-4)

**Context:** `src/gvc/usershape.ts:40` has no production caller; only `image-ft-null.test.ts` calls it. It
is not exported from `.`, `./api` or `./render`. The sizer fallback lives in `findImageSize`, used by
`imageIsSupplied` and `usershapeSizePts`. `getGlobalImageResolver` has real callers and stays.

**Task:**
1. Rewrite the two assertions in `image-ft-null.test.ts` (lines 39 and 45) to test behaviour through
   `setImageSizer`, with `usershapeSizePts` or `findImageSize`: after `setImageSizer(null)` a name resolves to
   nothing, and after `setImageSizer(sizer)` it resolves to the sizer's size.
2. Delete `getGlobalImageSizer` and fix the AD-6 comment in the file if one refers to it.

**Write-set:** `src/gvc/usershape.ts`, `src/gvc/image-ft-null.test.ts`.
**Read-set:** `src/gvc/usershape.ts:25-65`, `src/gvc/image-ft-null.test.ts:30-50`,
`plans/post-16-1-followups-8/decisions.md` (AD-6).

**Acceptance criteria:**
- *Given* the removal, *when* typecheck and tests run, *then* both pass, and no reference to the name remains
  in `src/`.
- *Given* `setImageSizer`, *when* a sizer is set then cleared, *then* the tests assert the resolved size each way.
- *Given* the smoke ids, *when* bytediffed, *then* output is identical.

**Commit:** `refactor(T5): remove the unused global image sizer accessor`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
