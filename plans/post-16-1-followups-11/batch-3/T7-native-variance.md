# T7: subgraph/root renders vs address-free native (137)

**Context:** part 10 T15 found 6 to 10 comparator diffs on `xdot` and `svg` for fdp and osage when a subgraph is laid out
then the root, or the root without a free then a subgraph (`harness/T0/subg-*`, harness
`plans/post-16-1-followups-10/harness/T15/subg-after-free.c`). Part 10 T14 showed fdp's second layouts follow heap addresses
(`lib/fdpgen/layout.c:466,501,637` compare node pointers); `harness/T14/noaddr.patch` orders by `ND_id` behind
`GVTS_NOADDR=1` and made native repeat 8 of 8. AD-4.

**Task:** build native with `noaddr.patch` in scratch (relink per `.agent-notes/post-16-1-followups-10.md`; remove any
symlink at the `-o` path first, never write into `ghl16-all`), run each `subg-*` case 8 times stock and 8 times with
`GVTS_NOADDR=1`. For each case classify: native varies stock and settles under the patch, and the port equals the settled
output → close with evidence; the port differs from settled native → diagnose and fix within the write-set, with a test.
osage has no T14 evidence: check whether it compares pointers before assuming heap order.

**Write-set:** `plans/post-16-1-followups-11/harness/T7/`; `src/layout/fdp/`, `src/layout/osage/` and a new test only for a fix.
**Read-set:** `lib/fdpgen/layout.c`, `lib/osage/osageinit.c`; `plans/post-16-1-followups-10/harness/{T14,T15}/`.

**Acceptance criteria:**
- *Given* each `subg-*` case, *when* run 8 × stock and 8 × `GVTS_NOADDR=1`, *then* the per-run classes are recorded.
- *Given* settled native, *then* the port equals it (close) or a fix makes it equal, with a test.
- *Given* a case that varies even under the patch, *then* the cause is named or the case parks with the evidence.

**Commit:** `test(T7): archive the address-free subgraph render check`, or `fix(T7): <mechanism>`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
