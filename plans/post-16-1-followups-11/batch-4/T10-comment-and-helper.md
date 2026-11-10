# T10: stale comment and redundant helper (126, 130)

**Context:** `src/layout/sfdp/spring-electrical.ts:12-14` cites `src/common/apple-pow.ts`, which does not exist (part 10 T2
found the sfdp drift is macOS `pow`'s last bit and accepted it under PR 119). `src/layout/neato/fdp-adjust.ts:40`
`sizesByNdim` re-strides sizes that `getSizes` now strides by `ndim` itself (part 10 T13).

**Task:** rewrite the comment to state what the code does and cite what exists (PR 119, `.agent-notes/post-16-1-followups-10.md`);
remove `sizesByNdim` and pass `getSizes`'s result directly at `fdp-adjust.ts:105`, after confirming with a test or a read of
`getSizes` that the two are equal for every `ndim`. No behaviour change.

**Write-set:** `src/layout/sfdp/spring-electrical.ts`, `src/layout/neato/fdp-adjust.ts`.
**Read-set:** `getSizes` (find with `/usr/bin/grep -rn "function getSizes" src`), `src/layout/neato/fdp-adjust.ts:30-110`.

**Acceptance criteria:**
- *Given* the change, *then* no comment cites a missing file and `sizesByNdim` is gone.
- *Given* the smoke bytediff and the 49 model probes, *then* output is identical.

**Commit:** `refactor(T10): drop a stale pow comment and the sizesbyndim helper`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
