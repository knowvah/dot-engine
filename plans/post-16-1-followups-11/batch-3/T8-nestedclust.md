# T8: `nestedclust.gv` no-free renders 2 and 3 (129)

**Context:** `~/git/graphviz/tests/graphs/nestedclust.gv`: with no free between renders, the port's render 2 differs from
native on 6 lines and render 3 on 8; native is stable over 8 runs (part 10 B3b). `harness/T0/nestedclust.*` holds native's
three renders and the engine T0 recorded. Part 9 AD-11, AD-12: a no-free layout appends its route; rendering writes
attributes back. AD-5.

**Task:** diff render 2 against native, trace the first differing record through the no-free cycle (which `ND_`/`ED_`/`GD_`
field survives, is reset, or is appended differently), state the mechanism, fix faithfully with a test pinning native's
renders 2 and 3. First renders must stay byte-identical (stop 8, no exception). Budget 2 h, then park with the evidence.

**Write-set:** `plans/post-16-1-followups-11/harness/T8/`; for a fix, the layout directory T0 records for this case under
`src/layout/` (excluding files T1 and T2 changed), `src/gvc/`, and a new test.
**Read-set:** `lib/gvc/gvlayout.c`, `lib/common/postproc.c`, the engine's layout C; part 9 and 10 journal rows on second
renders; `src/gvc/layout-reset.ts`.

**Acceptance criteria:**
- *Given* `nestedclust.gv` rendered three times without a free, *then* renders 2 and 3 equal native's, or the item parks with
  the full artifact.
- *Given* the smoke bytediff, *then* every first render is identical.

**Commit:** `fix(T8): <mechanism>`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
