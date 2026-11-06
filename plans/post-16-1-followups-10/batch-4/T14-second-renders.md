# T14: second renders on `graphs-fdp` and `1581` (117, AD-8)

**Budget:** 2 h. Then park with the artifact (AD-8).

**Context:** second renders still miss native's on fdp `graphs-fdp` (part 9 T14 did not clear it) and on `1581` in `dot` format. Part 9's notes, medium confidence: both carry subgraph membership changes from native's first cycle. No counterfactual run has tested that.

**Task:**
1. Run the counterfactual: dump subgraph membership after native's first cycle with a harness (`plans/post-16-1-followups-9/harness/T11/twice.c`), feed it to the port's second layout, and see whether the miss clears.
2. Name the C write that changes membership, `file:line`. Check `lib/fdpgen/` and `lib/common/` first; `fdp_init_graph`, cluster handling and `mkClusters` are leads.
3. Port that write if it is in ported code and does not touch a first render. Otherwise park.

**Write-set:** `src/gvc/layout-reset.ts`, `src/gvc/context.ts`, `src/layout/fdp/`, `src/gvc/rerender.test.ts`, `src/gvc/__fixtures__/rerender/`.

**Acceptance criteria:**
- *Given* `graphs-fdp` on fdp and `1581` in `dot` format, *when* rendered twice, *then* the second render matches native's, or the item parks with a stated mechanism.
- *Given* the smoke ids, *when* bytediffed, *then* output is byte-identical (stop 8).

**Commit:** `fix(T14): carry the first cycle's subgraph membership as native does`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
