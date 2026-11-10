# T6: 2-D `mode=sgd` drift (132)

**Context:** `harness/T0/sgd58` (58 nodes, `mode=sgd dim=2`): max delta 1.59 on 133 of 256 `dot` lines; native repeats 8
of 8; predates part 10. Part 10 T2 traced sfdp's drift to macOS `pow`'s last bit with an env-gated instrumented native and
a Node-API `libmpow` addon (`plans/post-16-1-followups-10/harness/T2/`, `.agent-notes/post-16-1-followups-10.md`). AD-3.

**Task:** instrument native `lib/neatogen/sgd.c` (rsync to scratch, env-gated `fprintf`, build `gvplugin_neato_layout`
per `.agent-notes`/memory technique) and the port's `sgd.ts` the same way; diff to the first differing value. Classify the
origin: libm (`pow`, `exp`, `sqrt`, `hypot`), the RNG or shuffle, operation order or fused multiply-add, or a port logic
difference. Libm: archive the trace under `harness/T6/`, no `src/` change, close under PR 119. Order, fusion or logic: fix
faithfully with a test pinning `harness/T0/sgd58.dot` (replay macOS libm values in the test if needed, as `kk-large` does),
then the orchestrator re-walks neato `mode=sgd` ids. Budget 3 h, then park with the evidence.

**Write-set:** `plans/post-16-1-followups-11/harness/T6/`; `src/layout/neato/sgd.ts` (488 lines), `src/layout/neato/sgd-*.ts`,
`src/layout/neato/sgd*.test.ts` only for a fix.
**Read-set:** `lib/neatogen/sgd.c`; `src/layout/neato/sgd.ts`; `plans/post-16-1-followups-10/harness/T2/` (trace and addon tooling).

**Acceptance criteria:**
- *Given* `sgd58`, *when* traced, *then* the first differing value, its operation and its origin class are named with evidence.
- *Given* a port-side origin, *then* the fix makes `sgd58` equal native, and the orchestrator's re-walk shows no id further from native.
- *Given* a libm origin, *then* 132 closes under PR 119 with the trace archived and no `src/` change.

**Commit:** `fix(T6): <mechanism>` for a fix, or `test(T6): archive the sgd drift trace` for a trace only.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
