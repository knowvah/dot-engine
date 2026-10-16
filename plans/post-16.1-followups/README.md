# Post-16.1 follow-ups — resume handoff

Written 2026-10-14 at the end of the graphviz 16.1 sync session; header updated
2026-10-16. When the user says "resume", start here.

The open items (7–11, 13) are being closed by the mission brief
[`plans/post-16-1-followups-mission/`](../post-16-1-followups-mission/README.md)
(branch `chore/post-16-1-followups`). Its decision journal records each item's
outcome.

## State at handoff

- `main` = `2983eea8`. PRs #86–#92 are merged (items 1–6 below are done).
  PR #86 (graphviz 16.1 sync) and PR #87 (SHA remap) were the 16.1 sync.
  **@knowvah/dot-engine 2.6.2 is the latest on npm** (2026-10-16); every merge
  to `main` publishes a release.
- **plantuml-ts owns its side.** Its `.tgz` bump and the TRACKER.md updates for
  issues 31/34 (still marked "NOT YET PUBLISHED" there) are handled from the
  plantuml-ts repo. Do not edit plantuml-ts from here.
- Autonomous mode is ON while the mission above runs (`.claude/mission-active`).
- The repo allows **merge commits only** (since #92; rebase and squash are off)
  and auto-deletes head branches, so branch SHAs survive the merge. Never push
  `main`; open a PR.
- Oracle: graphviz 16.1.0 native, `~/git/graphviz/build/cmd/dot/dot`, with
  `GVBINDIR=/tmp/ghl`; for the non-dot engines use a plugin dir holding core +
  dot_layout + neato_layout. `/tmp` may have been cleared. If `/tmp/ghl` is
  gone, rebuild it per `docs/adr/0001-graphviz-16.1-oracle.md`. The 15.x
  reference is `~/git/graphviz-15` (`GVBINDIR=/tmp/ghl15`).
- Mission record: `plans/graphviz-16.1-sync/README.md` (session-end summary,
  "Follow-ups" line) and `plans/graphviz-16.1-sync/decision-journal.md`.

## Remaining follow-ups (dot-engine only)

Each is independent; one branch + PR per item.

1. **[DONE — PR #89 merged, 2026-10-14]** **Registry schema for port-error / timeout acceptances.** 2784 on
   circo/twopi/neato/fdp/sfdp throws `Map maximum size exceeded` (faithful
   pack int arithmetic needs ~2.0e9 cells; V8 Map caps at 2^24). It is accepted
   as A10 in `docs/known-divergences.md` prose only, because no
   `test/corpus/accepted-divergences-*.json` registry can express a port-error
   or timeout verdict. Extend the schema + its tests
   (`accepted-divergences*.test.ts`) and move A10 into the registry.
2. **[DONE — PR #89 merged, 2026-10-14]** **Staleness tests for the engine/json/plain/xdot/map registries.** Only some
   registries have a test that fails when an accepted entry starts passing;
   T13 retired many stale entries by hand (journal rows T12/T13). Add the
   missing staleness checks.
3. **[DONE — PR #91 merged, 2026-10-15]** **Regenerate `test/corpus/attribution-{fdp,neato,sfdp,twopi}.json(l)`**
   against 16.1.0. The roster grew 910 → 929, and the 19 additions are not
   attributed (`docs/known-divergences.md` A1 says so; update that sentence and
   its locale copies after, re-stamping `sourceHash` with
   `node scripts/i18n-hash.mjs docs/known-divergences.md`).
4. **[DONE — PR #90 merged, 2026-10-14]** **Oracle version line in `test/corpus/parity-report.ts` pages.** The
   generated `PARITY-*.md` dashboards don't state which graphviz build they
   were measured against. Add it and regenerate.
5. **[DONE — PR #88 merged, 2026-10-14]** **`src/layout/pack/poly-pack.ts`: second polyomino copy still uses double
   arithmetic.** The roster-addition fix (main `97fcccd8`, "mirror the
   oracle's int step and placement in polyGraphs") converted one copy to C's
   int arithmetic. The other path was left as is. Port it per
   `lib/pack/pack.c`, with a test first.
6. **[DONE — PR #92 merged, 2026-10-16]** **Perf: 2371 on twopi/sfdp ≈ 7× native** (twopi port 8,094,866 ms vs native
   1,130,977 ms, measured under contention). Profile before changing anything,
   and keep the algorithms faithful (no C-behaviour changes).
7. **Unlanded circo positioning FMA/association patch**:
   `plans/graphviz-16.1-sync/followups/circpos-fma-assoc.patch` (+
   `position-arith.test.ts.saved`). It matches C's contraction but flips 1855
   via libm sin/cos amplification. Diagnose 1855 before landing.
8. **HTML lexer gaps (pre-existing).** Error paths for an unknown entity and
   for a mismatched tag, and the missing native warning
   `table size too small for content` (printed for nearly every
   empty-FIXEDSIZE table; journal row T4 2026-10-12).
9. **Edge-label candidate flips after injection: fdp `2471`, sfdp `2371`.**
   With oracle positions injected, one or more edges keep an `lp.y` one label
   line off (xlabel placer picked another candidate). fdp 2471's native
   layout is non-deterministic run to run, so reproduce several runs
   (`.agent-notes/attribution-16-1.md`). Dump the placer's inputs (node and
   label boxes, R-tree load) on both sides before hypothesizing.
10. **Port `genroute`/pathplan emit none of C's routing warnings**
    (`Could not create control points for multiple spline`,
    `shortest.c ... not in any triangle`). stderr-only gap.
11. **Use the shared `PointSet` (`src/common/pointset.ts`) wherever the oracle
    uses `lib/common/pointset.c`.** Item 6 ported `PointSet` (numeric keys:
    no per-lookup string build or parse, less memory) and moved
    `polyGraphs` (`pack.c:858`, `src/layout/pack/poly-place.ts`) onto it. Remaining C
    call sites and their port counterparts:
    - `lib/pack/pack.c:polyRects` (`newPS` at :741, via `genBox` +
      `placeGraph`) → `src/layout/pack/poly-pack.ts` still has its own
      `Set<string>` with `psKey` (`` `${cround(x)},${cround(y)}` ``). C
      compares exact doubles, so the `cround` is a port-only rounding; the
      comment argues it is unobservable. Replace `psKey`/`inPS`/`insertPS`
      and their tests. Caller: osage `putRects` with `packmode=graph`
      (osage defaults to array mode).
    - `lib/common/htmltable.c:findCol`/`processTbl` (`newPS` at :1198, cell
      span occupancy) → `src/common/htmltable.ts` `used: Set<string>` keyed
      `` `${c},${r}` `` (:48, :59, :311).
    - `lib/ortho/ortho.c:orthoEdges` (`newPS` at :1166 when `concentrate`,
      `isInPS`/`addPS` at :1224-1229 on (tail, head) ids) →
      `src/layout/dot/ortho-adapter.ts:73` `seen: Set<string>`. C checks both
      orders as two separate points; the port builds one ordered key, so
      check the two are equivalent while porting.
    - `PointMap` (`newPM`/`insertPM`, also `pointset.c`):
      `lib/neatogen/neatoinit.c:checkEdge` (:665, used by
      `makeGraphData` :757/:810) → `src/layout/neato/init.ts`
      `makeGraphDataC` uses a per-node `Map<number, number>` (:372), already
      numeric; port `PointMap` only if the shape differs observably.
    Test first; byte-identical output on the affected engines is the gate.
    No speed data outside 2371's `polyGraphs` yet; measure before and after.

12. **[DONE — closed 2026-10-16, no code change]** **neato 2371 ~7 pt drift**
    (journal T13 land row, unclassified). Closed by item 3's re-attribution:
    `test/corpus/attribution-neato.jsonl` records 2371 as `drift-exonerated`,
    405,690 base diffs → 0 with the oracle's positions injected, so the drift
    is upstream of the port's spline/label stages and fully explained by
    position drift.
13. **[DONE — mission T1, 2026-10-16]** **Stale `GVBINDIR` defaults in the corpus scripts.** `test/corpus/bench.mjs`,
    `capture-native.mjs` and `survey.ts` default `GVBINDIR` to `/tmp/gvplugins`
    (deleted; its plugin set added ~55 ms per native render and inflated the
    August `PERF.md` baseline, `.agent-notes/perf-2371-pointset.md`). Default
    them to the oracle dir `/tmp/ghl`, with a fitness test. Mission task T1.

## Local leftovers (not committed, safe to delete)

- `test/corpus/parity-baseline.json`, `test/corpus/parity-probe.json`: survey
  scratch from T2/T12.
- `feature/graphviz-16.1-sync` local branch: the only copy of the pre-rebase
  SHAs (mapping in the PR #86 journal's post-merge row).
- Old agent worktrees under `.claude/worktrees/` (t2-parser, t3-flat-et,
  t4-ortho-loop, t5-findmaxdev, t6-flat-adj, t7-solve3): from earlier
  missions, not this one. Check that each is merged before removing it.
- This file is untracked. Commit it via PR only if the user wants it kept in
  `plans/`.
