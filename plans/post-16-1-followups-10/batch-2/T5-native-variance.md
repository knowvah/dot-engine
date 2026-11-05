# T5: why native's `graphs-b56` varies per process (124, AD-10)

**Context:** `graphs-b56`'s native second `plain` render varies between processes: over 8 runs, `SAME` on fdp 2, circo 1, twopi 1, osage 5, sfdp 0. That moved the
matrix's native-same count from 255 to 253 with no native change, and part 9 T14 counted this id's `xdot` on all 8 engines as first-render misses. Part 9 T11's notes
place it in corrupted label bytes between processes, untraced.

**Task:**
1. Compile a harness against the build tree (start from `plans/post-16-1-followups-9/harness/T11/twice.c`), and dump label bytes and addresses on the first and second
   render, over several processes. `graphs/b56.gv` is the input.
2. Name the mechanism: which C read or write produces the bytes, `file:line`, and why it varies (uninitialized or freed memory, an encoding path, ASLR).
3. Copy `twice-matrix.mjs` into `harness/T5/` with an exclude list that holds this id, and rerun it to show the native-same count steadies.
4. No `src/` change, unless the trace finds behaviour that is not memory corruption. Then report it, and stop for a follow-up.

**Write-set:** `plans/post-16-1-followups-10/harness/T5/`.

**Acceptance criteria:**
- *Given* the harness, *when* run over ≥8 processes, *then* the varying bytes and their origin are named.
- *Given* the excluded matrix, *when* run twice, *then* the native-same count is equal on both runs, or each remaining variance is listed with its id.

**Commit:** `docs(T5): trace native's per-process variance on graphs-b56`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
