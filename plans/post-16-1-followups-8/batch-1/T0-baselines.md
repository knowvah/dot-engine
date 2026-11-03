# T0: baselines and native fixtures

**Context:** `$BASE` is this session's `<scratchpad>/followups8-baseline`. Tools are in
`test/tools/` (`bytediff.ts`, `bd-job.ts`). Part 7's T5 harness is archived in
`plans/post-16-1-followups-7/harness/T5/` (`build.sh`, `harness.c`, `dump.cpp`, `gen.mjs`).

**Task:**
1. **Branch and brief commit**, as in the README's "First run only".
2. **Oracle preflight:** `dot -V` is 16.1.0; a trivial graph renders with `/tmp/ghl` (dot)
   and the full plugin dir (neato, fdp, sfdp, circo, twopi, osage, patchwork). On failure run
   `GVBINDIR=<dir> dot -c` and journal it.
3. **Gates on the branch base:** the four README gates plus the ipsep probes; record counts.
4. **Base bundle:** `npm run build:js`, copy `dist/index.js` to `$BASE/T0.mjs`, record the
   commit in `$BASE/T0.sha`. Write the gate/bundle runner script to `$BASE/gates.sh` (part-7
   pattern: typecheck, test, golden, corpus, ipsep, models probes, bundle).
5. **Model fixtures** in `src/layout/neato/__fixtures__/models/` (one `<case>.gv`, `.xdot`,
   `.xdot.stderr` each; `-Kneato -Txdot`, `GVBINDIR=<full plugin dir>`), plus a `regen.sh`:
   - a small undirected graph (≈10 nodes, a cycle and a pendant) under `mode=major` (unset),
     `mode=KK`, `mode=hier` (digraph) × `model=` unset, `shortpath`, `subset`, `circuit`,
     `mds`;
   - the same graph with mixed edge `len` for each mode × {subset, circuit, mds};
   - a disconnected graph × `model=circuit` for each mode; KK also with `pack=true`;
   - `model=mds` without any `len` (the `%1` warning); `model=foo` and `model=Subset`;
   - one ≥150-node `model=circuit` graph for T9's timing row.
   Record which cases native rejects or warns on.
6. **Image fixtures** in `src/gvc/__fixtures__/p8/` (run from the dir; copy part 7's
   `bad.png` and `r.png`): an HTML `<IMG SRC="bad.png">` label (-Tsvg, -Txdot) and
   `imagepath="d"` with `shape=custom shapefile="r.png"` where `d/r.png` exists (the
   per-context-sizer case for T5).
7. **VPSC native runs:** rebuild the part-7 T5 harness (archive it in
   `plans/post-16-1-followups-8/harness/T0/` if it changes) and run the three tie cases
   ("cluster dir0", "noverlap1 dir2 n10", "dir1 n40") 8 times each, varying environment
   size and `MallocNanoZone`. Commit the per-run outputs under `harness/T0/runs/` and journal
   the distinct-variant counts. This is T3's acceptance set.
8. **Model probe test:** `src/layout/neato/models-probes.test.ts` runs every `models/` case
   through the port (`render(parse(src), 'xdot', {engine: 'neato'})` plus the context API for
   stderr) and compares with native at 0.01 (`compareXdot`, with `XDOT_TOLERANCE + 1e-9` per
   part 7's strict-`>` note). Cases the port cannot lay out today are `it.todo`, grouped by
   mode so T6 and T7 can flip their own.
9. Commit `test(T0): add part-8 native probe fixtures`.

**Write-set:** the brief commit (`plans/post-16-1-followups-8/**`, the header line in
`plans/post-16.1-followups/README.md`); `src/layout/neato/__fixtures__/models/**`,
`src/gvc/__fixtures__/p8/**`; `src/layout/neato/models-probes.test.ts`; the scratchpad.
**Read-set:** `plans/post-16-1-followups-7/batch-1/T0-baselines.md`,
`src/layout/neato/ipsep-probes.test.ts` (test pattern), `src/gvc/__fixtures__/p7/regen.sh`.

**Interface output:** `$BASE/T0.mjs`, `$BASE/T0.sha`, `$BASE/gates.sh`, the two fixture
dirs, `harness/T0/runs/`, `models-probes.test.ts`; journal rows for the model-case table and
the VPSC variant counts.

**Acceptance criteria:**
- *Given* the branch base, *when* the gates run, *then* all are green and the oracle
  preflight passes for all 8 engines.
- *Given* every case in steps 5–6, *then* its native output and stderr are committed.
- *Given* the three VPSC tie cases, *then* 8 native runs each are committed and the
  distinct-variant counts journaled.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
