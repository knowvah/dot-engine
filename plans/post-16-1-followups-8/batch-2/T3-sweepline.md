# T3: VPSC sweep-line order and tie-break (item 105, AD-8)

**Context:** part 7 T5 found two orderings in `src/vpsc/SweepLine.ts` that differ from
C++ `lib/vpsc/generate-constraints.cpp`:
- `Node::leftNeighbours` / `rightNeighbours` are `std::set<Node*, CmpNodePos>` (position
  order, 43-84); the port's `getLeftNeighbours`/`getRightNeighbours` return insertion-ordered
  `Set`s filled walking outward (descending / ascending position), so `xCloseLeft` emits
  `[0→10]` before `[7→10]` where native emits `[7→10]` first;
- `nodePosLt` (35-39) ends `return a < b` on objects (always false); C++ `CmpNodePos` breaks
  an exact position tie by `Node*` address.

Native itself is nondeterministic on ties (C++ address order; follow-up 106): part 7 saw 3–4
variants in 8 harness runs. `src/vpsc` is imported only by `quad-prog-vpsc*.ts`, so only
`mode=ipsep` and `overlap=vpsc|ipsep` reach it; no corpus id does.

**Task:**
1. Tests first: `quad-prog-vpsc.test.ts`'s `it.fails` cases "cluster dir0" and
   "noverlap1 dir2 n10" become passing tests that accept any of T0's 8 native runs
   (`plans/post-16-1-followups-8/harness/T0/runs/`). Add `SweepLine` unit tests for the
   neighbour order and the tie rule against the C++ semantics.
2. Order the neighbour sets by `CmpNodePos` and break position ties by creation order (a
   per-node sequence number assigned where C++ allocates the `Node`; `sweepTypes.ts` if the
   type lives there). Keep every other behaviour.
3. Run the 22 ipsep probes after each change: any move is stop 7 — diagnose, do not adjust
   the probes.
4. If a case lands on a valid non-majority native variant, refresh its fixture entry to that
   variant and report the per-run evidence for the journal.

**Write-set:** `src/vpsc/SweepLine.ts`, `src/vpsc/sweepTypes.ts` (if needed), their tests,
`src/layout/neato/quad-prog-vpsc.test.ts`, `src/layout/neato/__fixtures__/quad-prog-vpsc.ts`.
**Read-set:** `~/git/graphviz/lib/vpsc/generate-constraints.cpp`, `blocks.cpp`,
`src/vpsc/*.ts`, `plans/post-16-1-followups-7/decision-journal.md` (T5 rows).

**Acceptance criteria:**
- *Given* "cluster dir0" and "noverlap1 dir2 n10", *when* the harness case runs, *then*
  the constraint list and coordinates equal at least one of the 8 native runs, and both
  `it.fails` are gone.
- *Given* the 22 ipsep probes, *then* all still pass (stop 7).
- *Given* the corpus, *then* bytediff is identical (no corpus id reaches `src/vpsc`).

**Commit:** `fix(T3): order vpsc sweep-line neighbours as the c++ sets do`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
