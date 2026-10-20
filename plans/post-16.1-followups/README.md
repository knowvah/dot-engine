# Post-16.1 follow-ups — resume handoff

Written 2026-10-14 at the end of the graphviz 16.1 sync session; header updated
2026-10-19. When the user says "resume", start here.

Items 1–13 are done. Items 7–13 were closed by the mission brief
[`plans/post-16-1-followups-mission/`](../post-16-1-followups-mission/README.md)
(merged via PR #94, merge commit `f54d12c6`); its decision journal records each
item's outcome. The open work is items 14–22 under "New follow-ups found by the
mission" below: one branch + PR per item, each journaled in
`plans/decision-journal.md`.

## State at handoff

- `main` = `f54d12c6`. PRs #86–#94 are merged (items 1–13 below are done).
  PR #86 (graphviz 16.1 sync) and PR #87 (SHA remap) were the 16.1 sync.
  Every merge to `main` publishes a release to npm.
- **plantuml-ts owns its side.** Its `.tgz` bump and the TRACKER.md updates for
  issues 31/34 (still marked "NOT YET PUBLISHED" there) are handled from the
  plantuml-ts repo. Do not edit plantuml-ts from here.
- Autonomous mode is OFF; no mission brief is active.
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
7. **[DONE — mission T12, 2026-10-16]** **Unlanded circo positioning FMA/association patch**:
   `plans/graphviz-16.1-sync/followups/circpos-fma-assoc.patch` (+
   `position-arith.test.ts.saved`). It matches C's contraction but flips 1855
   via libm sin/cos amplification. Diagnose 1855 before landing.
8. **[DONE — mission T6/T7, 2026-10-18]** **HTML lexer gaps (pre-existing).** Error paths for an unknown entity and
   for a mismatched tag, and the missing native warning
   `table size too small for content` (printed for nearly every
   empty-FIXEDSIZE table; journal row T4 2026-10-12).
9. **[DONE — mission T13, 2026-10-18 (2371: R-tree cover copy; 2471: fused Bezier/DIST2)]** **Edge-label candidate flips after injection: fdp `2471`, sfdp `2371`.**
   With oracle positions injected, one or more edges keep an `lp.y` one label
   line off (xlabel placer picked another candidate). fdp 2471's native
   layout is non-deterministic run to run, so reproduce several runs
   (`.agent-notes/attribution-16-1.md`). Dump the placer's inputs (node and
   label boxes, R-tree load) on both sides before hypothesizing.
10. **[DONE — mission T4/T5, 2026-10-16]** **Port `genroute`/pathplan emit none of C's routing warnings**
    (`Could not create control points for multiple spline`,
    `shortest.c ... not in any triangle`). stderr-only gap.
11. **[DONE — mission T8/T9/T10; T11 `PointMap` equivalent (no change); neato ortho site left as follow-up 15]** **Use the shared `PointSet` (`src/common/pointset.ts`) wherever the oracle
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

### Outcomes of the post-16.1 follow-ups mission (2026-10-16/17)

Details and evidence: `plans/post-16-1-followups-mission/decision-journal.md`.

- **The held items landed** after the user approved the write-set extensions
  (2026-10-18): T7 (with the `pt-issue-29` allow-list), T9, T6 (with the
  `make_label` `in label of` print path and the HTML grammar's strictness), and the
  fdp 2471 fix in `src/common/spline-midpoint.ts`.
- **New follow-ups found by the mission:**
  14. **Done** (`fix/dot-failed-edge-double-route`): the routing was doubled
      by `makeFlatLabeledEdge`'s degenerate (pn == 0) branch, which returned
      "handled" without marking the edge lost; see `plans/decision-journal.md`.
      Original note: dot routes a failed edge twice (`splines-groups.ts:121` then
      `edge-route.ts:512`), so routing-failure stderr lines print 2x native
      (2470, 2796, 2471).
  15. `src/layout/neato/splines.ts:598` keeps a string-keyed copy of
      `ortho.c:1221-1229`'s concentrate dedup (item 11's last site).
  16. 2516: the yacc `htmlerror` (`non-space string used before <TABLE>`) is
      thrown at `htmltable-parse.ts:535` and never printed.
  17. sfdp 2168_3: the multispline router builds a different corridor polygon
      than native for one edge (native `Pshortestpath` fails on the port's
      polygons too); dump native's tripoly next.
  18. `makeGraphDataC` lacks C's `haveWt` (`eweights += ED_factor`) and `haveDir`
      branches (`neatoinit.c:798`); reachability unchecked.
  19. HTML labels: `<font><table>` (fonttable) is unported (such labels fail and print
      a bare `in label of` that native does not); lexer attribute warnings
      (`Illegal attribute … - ignored`, ALIGN values, `Unclosed comment`) and the
      unterminated-quote case are unported.
  20. Seven other `Bezier` ports (`gvc/anchor.ts`, `layout/dot/edge-route-clip.ts`,
      `compound-geom.ts`, `splines-label.ts`, `compound-clip.ts`, `common/taper.ts`)
      do not mirror clang's fused de Casteljau.
  21. json circo `tree-share-examples-world` still records 50223 diffs from before
      T12 (the engine track is now 533); re-walk it.
  22. The overnight `/tmp` clean removes `config8` from plugin dirs and empties the
      oracle caches, after which native fdp/sfdp re-render and drift run to run;
      walk deltas on those engines then reflect the oracle, not the port.

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
