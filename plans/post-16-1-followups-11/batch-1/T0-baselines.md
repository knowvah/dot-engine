# T0: baselines and native refs

**Context:** `$BASE` is this session's `<scratchpad>/followups11-baseline`. Tools are in `test/tools/` (`bytediff.ts`,
`bd-job.ts`). Planning reproduced 127, 128 and 133 on `main` `1e55cf7f` (decisions.md); those probes are the starting
point, not a substitute for refs.

**Task:**
1. **Branch and brief commit**, as in the README's "First run only".
2. **Oracle preflight:** `dot -V` is 16.1.0; a trivial graph renders with `/tmp/ghl` (dot) and the full plugin dir (neato, fdp,
   sfdp, circo, twopi, osage, patchwork). On failure run `GVBINDIR=<dir> dot -c` and journal it. If `ghl16-all` is gone, rebuild it
   and update the path in the README and `agent-common.md`.
3. **Gates on the branch base:** the four README gates plus ipsep and model probes; record counts.
4. **Base bundle:** `npm run build:js`, copy `dist/index.js` to `$BASE/T0.mjs`, record the commit in `$BASE/T0.sha`. Write the gate
   and bundle runner to `$BASE/gates.sh`.
5. **Smoke ids:** write `$BASE/smoke-ids.txt`, about 40 manifest ids that finish quickly on all engines: `graphs-nestedclust`,
   `graphs-fdp`, `1581`, ids with an edge to a cluster (for T4), ids with long `_draw_` strings (for T3: polygons with many
   sides, long splines), any `mode=sgd` ids (for T6), topped up with small disconnected graphs. Journal the list's size.
6. **Native refs** under `plans/post-16-1-followups-11/harness/T0/` (one `<case>.gv` plus `.dot`, `.xdot`, `.stderr` per case
   and format named below, and a `regen.sh`):
   - `w4`, `w5` (copied from `plans/post-16-1-followups-10/harness/B3b/`), dot;
   - `poly40` (`digraph{a[shape=polygon,sides=40]; a->b}`), dot and xdot; the same with `linelength=0` and `linelength=80`;
   - `cluster-edge` (`src/gvc/__fixtures__/rerender/cluster-edge-splines.gv`), fdp `json` and `json0`;
   - `nestedclust` (`~/git/graphviz/tests/graphs/nestedclust.gv`): renders 1, 2 and 3 on one graph with no free, through
     `plans/post-16-1-followups-10/harness/T15/subg-after-free.c` or a sibling harness; record the engine part 10 used;
   - `sgd58`: the 58-node `mode=sgd dim=2` graph from `plans/post-16-1-followups-10/harness/T7/t7check.mjs`'s generator; if
     it cannot be regenerated, the smallest generated or corpus `mode=sgd` graph that differs, journaled;
   - `subg-*`: part 10 T15's subgraph-then-root and root-no-free-then-subgraph cases on fdp and osage, `xdot` and `svg`.
7. **Variance:** run each case 8 times; journal any case native does not repeat exactly. Those refs are not pinned in tests.
8. **Commit:** `test(T0): add part-11 native probe refs`.

**Write-set:** `plans/post-16-1-followups-11/harness/T0/`, the journals, this brief's README and
`plans/post-16.1-followups/README.md`.

**Acceptance criteria:**
- *Given* the 16.1.0 oracle, *when* the probe set runs, *then* each case has its refs, and any native variance is journaled.
- *Given* the branch base, *when* T0 finishes, *then* `$BASE/T0.mjs`, `$BASE/T0.sha`, `$BASE/smoke-ids.txt` and the gate counts exist.
- *Given* w4 and w5, *when* rendered by `$BASE/T0.mjs`, *then* both still throw (the repro holds at the base).

**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
