# T2: trace sfdp's solver drift (121, AD-5)

**Budget:** 3 h. Then park with the evidence so far (push-forward).

**Context:** sfdp sits at 632 of 929 within ±0.5 pt on `xdot`; 293 of 295 diverged ids are `drift-exonerated`
(`test/corpus/attribution-sfdp.jsonl`), so the gap is in the solver. Native repeats exactly on these ids. Planning saw `graphs-flatedge` give
`usmStats` y 3.7811 in on native and 3.8562 on the port. `plain` parity reads 99.1% only because its tolerance is in inches: do not use it here.
`src/layout/sfdp/spring-electrical.ts:421-422` uses `Math.pow` for `KP` and `CRK`, while the repulsive force uses `armPow`; `spring-driver` and
`multilevel` have not had the disassembly pass that gave neato its fused kernels. These are leads, not findings.

**Task:**
1. Rsync `~/git/graphviz` to scratch; add env-gated `fprintf("%a")` traces to `lib/sfdpgen/spring_electrical.c` and `multilevel`, starting with `KP`,
   `CRK`, `K`, the first iteration's forces and positions. Build the plugin there (`.agent-notes/post-16-1-followups-3.md`; the
   `native-oracle-libm` technique). Add the same trace to the port behind a scratch patch, never committed.
2. On `graphs-flatedge`, then `graphs-p` (which matches) and `1767`, find the **first value** that differs, by bits.
3. Name the origin: `file:line`, the operation, and the two values. Disassemble the C function if the source does not explain it
   (`otool -tv`, as part 5 T15 did).
4. **If it is libm** (`pow`, `hypot`, `sin`): prove it with a controlled run, feeding native's bits at that one call. Close under PR 119; no `src/` change.
5. **If it is operation order or fusion:** fix it faithfully with tests first, and repeat from step 2 until the next difference is libm or a small id matches.
6. Report the artifact either way.

**Write-set:** `plans/post-16-1-followups-10/harness/T2/`; only for a fix: `src/layout/sfdp/spring-electrical.ts`, `spring-driver.ts`, `multilevel.ts`,
`quadtree.ts`, `sparse-matrix.ts`, `sparse-matrix-multiply.ts`, `sparse-solve.ts`, their tests. Not `sfdp/init.ts` or `index.ts`, which T13 owns.

**Landing (orchestrator):** if `src/` changed, run the README's sfdp re-walk. Stop 8's exception needs every moved id closer to native and sfdp stderr
unchanged; otherwise revert and park. Record old and new counts for T16.

**Acceptance criteria:**
- *Given* the traces, *when* compared, *then* the first differing value on `graphs-flatedge` is named with its origin and bits.
- *Given* a libm origin, *then* a run with native's bits at that call clears it, and no `src/` file changes.
- *Given* a fix, *then* the sfdp re-walk shows 0 ids further from native and the 22 and 49 probes do not move.

**Commit:** `fix(T2): <the operation> in sfdp as the oracle runs it` if `src/` changes; otherwise `test(T2): archive the sfdp drift trace`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
