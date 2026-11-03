# T0: baselines and native fixtures

**Context:** `$BASE` is this session's `<scratchpad>/followups9-baseline`. Tools are in
`test/tools/` (`bytediff.ts`, `bd-job.ts`). Planning's probes are recorded in AD-1, AD-7 and
AD-8; they are the starting point, not a substitute for fixtures.

**Task:**
1. **Branch and brief commit**, as in the README's "First run only".
2. **Oracle preflight:** `dot -V` is 16.1.0; a trivial graph renders with `/tmp/ghl` (dot) and the
   full plugin dir (neato, fdp, sfdp, circo, twopi, osage, patchwork). On failure run
   `GVBINDIR=<dir> dot -c` and journal it. If `ghl16-all` is gone, rebuild it and update the path
   in the README and `agent-common.md`.
3. **Gates on the branch base:** the four README gates plus ipsep and model probes; record counts.
4. **Base bundle:** `npm run build:js`, copy `dist/index.js` to `$BASE/T0.mjs`, record the commit in
   `$BASE/T0.sha`. Write the gate and bundle runner to `$BASE/gates.sh`.
5. **Smoke ids:** write `$BASE/smoke-ids.txt`, about 40 applicable manifest ids from
   `test/corpus/corpus-manifest.json`: every id that sets `root`, `start`, `pack` or `overlap=vpsc`,
   topped up with disconnected graphs that finish quickly on all engines. Journal the list's size.
6. **Fixtures** (one `<case>.gv`, `.xdot`, `.xdot.stderr` each, plus a `regen.sh`; `-Txdot`,
   `GVBINDIR=<full plugin dir>`):
   - `src/layout/neato/__fixtures__/multi-component-attrs/`: a three-component graph × `maxiter=3`,
     `epsilon=0.5`, `stresswt=1` × major, `mode=hier`, `mode=sgd`, `mode=KK` with `pack=true`; plus
     `maxiter=-1`; plus `maxiter=3` with a cluster;
   - `src/layout/circo/__fixtures__/root/`: no root; graph `root=` in the first and a later component;
     graph `root=` naming no node; node `root=true` on a connected graph and in a later component;
     both graph and node root set;
   - `src/layout/sfdp/__fixtures__/start-warning/`: `start=self`, `start=regular`, `start=5`,
     `start=random5`, unset, on a connected graph.
7. **Variance:** run each case 8 times; journal any case native does not repeat exactly.
8. **Commit:** `test(T0): add part-9 native probe fixtures`.

**Write-set:** the three fixture directories; `plans/post-16-1-followups-9/harness/T0/`, the journals,
this brief's README and `plans/post-16.1-followups/README.md`.

**Acceptance criteria:**
- *Given* the 16.1.0 oracle, *when* the probe set runs, *then* each case has its xdot and stderr
  fixture, and any native variance is journaled.
- *Given* the branch base, *when* T0 finishes, *then* `$BASE/T0.mjs`, `$BASE/T0.sha`,
  `$BASE/smoke-ids.txt` and the gate counts exist.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
