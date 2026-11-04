# T8: `dir1 n40` cause (item 110, AD-3)

**Context:** native gives many variants of `dir1 n40` across runs, and none of 29 sampled equals the port. The case does
not call `SweepLine`. `IncVPSC::satisfy` iterates `Blocks : std::set<Block*>` by address. Follow-up 106's ledger bullet
assumes heap-address order; this case is unproven. The port's `Blocks` is a `Set<Block>` in insertion order
(`src/vpsc/Blocks.ts`). See the comment at `quad-prog-vpsc.test.ts:182-187`.

**Task:**
1. Copy `~/git/graphviz/lib/vpsc` to your scratch dir. Give `Block` a creation index and order `Blocks` by it with a
   custom comparator. Change nothing else. Archive the patch under `harness/T8/`.
2. Build part 8's harness (`plans/post-16-1-followups-8/harness/T3/`) against the patched copy and run `dir1 n40`. Confirm
   it repeats across ≥8 runs and environment variations (the set in T0 of part 8: `X=1`, env pads, `MallocNanoZone`).
3. **If it matches the port at 0.01:** the heap-address cause is proven. Commit that output as the fixture, add the test,
   and replace the comment at `quad-prog-vpsc.test.ts:182-187` with the proof.
4. **If it doesn't:** there is another difference. Dump a per-step trace from both sides and find the first divergence. If
   it is fixable inside a named file, stop and report (stop 1). After about 2 h, park with the full artifact.

**Write-set:** `src/layout/neato/quad-prog-vpsc.test.ts`, a fixture beside its existing ones,
`plans/post-16-1-followups-9/harness/T8/`.
**Read-set:** `~/git/graphviz/lib/vpsc/blocks.h`, `blocks.cpp`, `solve_VPSC.cpp` (`IncVPSC::satisfy`), `src/vpsc/Blocks.ts`,
`plans/post-16-1-followups-8/decision-journal.md` (T0 and T3 rows).

**Acceptance criteria:**
- *Given* a native build ordering `Blocks` by creation index, *when* it runs `dir1 n40` across environments, *then* the output
  repeats exactly.
- *Given* that output, *when* compared with the port at 0.01, *then* it matches and a test asserts it, or the task parks with
  the mechanism, origin, causal chain and what was ruled out.

**Commit:** `test(T8): prove dir1 n40 differs only by block address order`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
