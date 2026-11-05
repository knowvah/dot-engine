# T0: baselines and native fixtures

**Context:** `$BASE` is this session's `<scratchpad>/followups10-baseline`. Tools are in `test/tools/` (`bytediff.ts`,
`bd-job.ts`). Planning's probes are in AD-1, AD-5 and AD-7; they are the starting point, not a substitute for fixtures.

**Task:**
1. **Branch and brief commit**, as in the README's "First run only".
2. **Oracle preflight:** `dot -V` is 16.1.0; a trivial graph renders with `/tmp/ghl` (dot) and the full plugin dir (neato, fdp,
   sfdp, circo, twopi, osage, patchwork). On failure run `GVBINDIR=<dir> dot -c` and journal it. If `ghl16-all` is gone, rebuild it
   and update the path in the README and `agent-common.md`.
3. **Gates on the branch base:** the four README gates plus ipsep and model probes; record counts.
4. **Base bundle:** `npm run build:js`, copy `dist/index.js` to `$BASE/T0.mjs`, record the commit in `$BASE/T0.sha`. Write the gate
   and bundle runner to `$BASE/gates.sh`.
5. **Smoke ids:** write `$BASE/smoke-ids.txt`, about 40 applicable manifest ids: the sfdp misses in
   `plans/post-16-1-followups-9/harness/T11/xdot-second-T14.json`, `graphs-fdp`, `1581`, topped up with disconnected graphs that
   finish quickly on all engines. Journal the list's size.
6. **Fixtures** (one `<case>.gv`, `.xdot`, `.dot`, `.stderr` each, plus a `regen.sh`; `GVBINDIR=<full plugin dir>`):
   - `src/layout/neato/__fixtures__/dim/`, one small connected graph unless noted: `dim=3`; `dimen=3` alone; `dim=3 dimen=3`;
     `dim=4 dimen=4`; `dim=11 dimen=11` (clamp); each of `mode=KK`, `mode=hier`, `mode=sgd`, `mode=ipsep` with `dim=3 dimen=3`;
     `model=subset` and `model=circuit` with `dim=3 dimen=3`; `overlap=false` with `dim=3 dimen=3`; pinned `pos="1,2,3!"`,
     `pos="4,5"` and `z=7` nodes; a three-component graph with `dim=3 dimen=3` and `pack=true`;
   - `src/layout/sfdp/__fixtures__/dim/`: `dim=3`, `dim=3 dimen=3`, `dim=4 dimen=4`, and `overlap=prism` with `dim=3 dimen=3`;
   - `src/layout/pack/__fixtures__/cc-reuse/`: `graph G { a -- b; subgraph _cc_0 { c } d -- e; }` on circo, twopi, sfdp, neato and
     osage, stderr included (native twopi prints `use of weight=0 creates disconnected component`).
7. **Variance:** run each case 8 times; journal any case native does not repeat exactly.
8. **Commit:** `test(T0): add part-10 native probe fixtures`.

**Write-set:** the three fixture directories; `plans/post-16-1-followups-10/harness/T0/`, the journals, this brief's README and
`plans/post-16.1-followups/README.md`.

**Acceptance criteria:**
- *Given* the 16.1.0 oracle, *when* the probe set runs, *then* each case has its xdot, dot and stderr fixture, and any native
  variance is journaled.
- *Given* the branch base, *when* T0 finishes, *then* `$BASE/T0.mjs`, `$BASE/T0.sha`, `$BASE/smoke-ids.txt` and the gate counts exist.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
