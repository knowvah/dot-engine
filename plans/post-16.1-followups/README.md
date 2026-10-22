# Post-16.1 follow-ups — resume handoff

Written 2026-10-14 at the end of the graphviz 16.1 sync session; header updated
2026-10-19. When the user says "resume", start here.

Items 1–13 are done. Items 7–13 were closed by the mission brief
[`plans/post-16-1-followups-mission/`](../post-16-1-followups-mission/README.md)
(merged via PR #94, merge commit `f54d12c6`); its decision journal records each
item's outcome. Items 14–23 are closed (14 by PR #95; 15–23 by
`plans/post-16-1-followups-2/`). Items 24 and 33 are closed by
`feature/cache-oracle-failures` (PR #97), item 32 by `chore/record-t11-walk-passes` (PR #98), item 26 by
`fix/parser-native-acceptance` (PR #99), item 27 by `fix/html-label-parse-parity` (PR #100),
item 28 by `fix/html-label-warn-parity`.
The open work is items 25, 29–31 and 34–38 under "New follow-ups
found by part 2" below, each journaled in `plans/decision-journal.md`.

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
  Items 15–23 were closed by the mission brief
  [`plans/post-16-1-followups-2/`](../post-16-1-followups-2/README.md) on branch
  `chore/post-16-1-followups-2` (task IDs in brackets; evidence in that brief's
  `decision-journal.md`).

  15. **[DONE — T4]** `src/layout/neato/splines.ts:598` keeps a string-keyed copy of
      `ortho.c:1221-1229`'s concentrate dedup (item 11's last site).
  16. **[DONE — T2, test only: the port already printed native's lines]** 2516: the
      yacc `htmlerror` (`non-space string used before <TABLE>`) is
      thrown at `htmltable-parse.ts:535` and never printed.
  17. **[PARKED — T13, irreducible: macOS libm `sin` 1 ulp off V8's at
      `shapes.c:2329`; journal row T13]** sfdp 2168_3: the multispline router builds
      a different corridor polygon than native for one edge (native `Pshortestpath`
      fails on the port's polygons too); dump native's tripoly next.
  18. **[DONE — T5: haveDir fixed (bfs on int ewgts); haveWt has no reader in `lib/`]**
      `makeGraphDataC` lacks C's `haveWt` (`eweights += ED_factor`) and `haveDir`
      branches (`neatoinit.c:798`); reachability unchecked.
  19. **[DONE — T7 fonttable, T8 attribute/value warnings, T9 comment/early-close/
      quote errors]** HTML labels: `<font><table>` (fonttable) is unported (such labels
      fail and print a bare `in label of` that native does not); lexer attribute warnings
      (`Illegal attribute … - ignored`, ALIGN values, `Unclosed comment`) and the
      unterminated-quote case are unported.
  20. **[DONE — T10 inventory, T11 shared fused `bezier()`, T12 limitBoxes]** Seven
      other `Bezier` ports (`gvc/anchor.ts`, `layout/dot/edge-route-clip.ts`,
      `compound-geom.ts`, `splines-label.ts`, `compound-clip.ts`, `common/taper.ts`)
      do not mirror clang's fused de Casteljau.
  21. **[DONE — T3: 50223 → 533]** json circo `tree-share-examples-world` still
      records 50223 diffs from before T12 (the engine track is now 533); re-walk it.
  22. **[DONE — T1: oracle preflight + caches under `~/.cache/dot-engine/oracle`]**
      The overnight `/tmp` clean removes `config8` from plugin dirs and empties the
      oracle caches, after which native fdp/sfdp re-render and drift run to run;
      walk deltas on those engines then reflect the oracle, not the port.
  23. **[DONE — T6]** DOT syntax errors print Peggy's message, not `aagerror`'s; see
      `plans/post-16-1-followups-2/README.md`.
- **New follow-ups found by part 2** (journal rows cite the task):
  24. **[DONE — `feature/cache-oracle-failures`: `recordOracleFailure` in
      `oracle-env.ts`, wired into survey + six walks]** Cache oracle **failures** (timeouts, errors) as well as SVGs, keyed by
      `ORACLE_VERSION` (`test/corpus/oracle-env.ts`), and render them again only on a
      new graphviz release (> 16.1). Today the survey's 9 native timeouts (4elt, 1864,
      2064, 2593, 2723, 2778, 2834, 2854_1, 2855) re-run to the 7,789,662 ms cap on
      every survey (~2 h); the walks' oracle caches have the same gap. (User
      direction, T14.)
  25. ipsep `MaxIter` default `100·n` (`neatoinit.c:1286-1287`) is unported; no
      observable input found (T5).
  26. **[DONE — `fix/parser-native-acceptance`: agmemread's one-graph read;
      empty input kept as an empty graph (user), documented as a non-goal]** The Peggy grammar rejects inputs native accepts: trailing junk, several graphs
      in one file, comment-only sources (T6).
  27. **[DONE — `fix/html-label-parse-parity`]** HTML grammar gaps: native rejects empty `<b></b>`, `<font></font>`, `<b/>` at the
      close tag (`... <b></b> ...` context); CDATA sections, `ctx->inCell` text
      suppression, `ctx->xb` accumulation across dropped events and `characterData`
      dropping chars < 0x20 are unported (T7, T9).
  28. **[DONE — `fix/html-label-warn-parity`]** htmllex warning bytes: doInt's three messages lack `\n` natively and run into
      the next stderr write; SIDES with non-ASCII prints raw bytes; `ALIGN="TEXT"` in
      TD has no `HtmlAlign` value; expat attribute-value normalisation is not modelled
      in warning text; dead `cellAttrs['src']` fallback in `parseImgContent` (T8).
  29. Fused non-Bezier expressions the port computes plain: `ptToLine2`
      (`anchor.ts`, `splines-geom.ts`), `arrow_type_curve` control points,
      `svg-edge-split.ts:approxLen` (`DIST`), `edge-route-clip.ts:arrowEndClip`
      (differs from arrows.c beyond fusion), `multispline-router.ts:addTriEdge`
      (`DIST`); `cdt-surface.ts` orders face vertices differently from GTS (T10, T12,
      T13).
  30. sfdp 2168_3 (item 17) needs a bit-exact model of Apple's `sin` to go further
      (T13).
  31. 1864 exhausts a 1.5 GB worker heap in the port, on the T0 bundle as well as
      T11's (pre-existing; seen in the T11 capture harness).
  32. **[DONE — `chore/record-t11-walk-passes`: 18 rows pass, 15 A9 entries
      retired]** Record T11's fail→pass rows (osage 1652, 2371, linux.i386-b29, share-b29; twopi
      graphs-b29, linux.i386-b29; also their json/plain rows) in the committed walk
      JSONLs, and retire the matching A9 entries in
      `accepted-divergences-{engines,json,plain}.json` and `docs/known-divergences.md`
      (+ locales, `sourceHash`). Re-walk on a quiet machine so the load timeouts
      (twopi/sfdp 2371, neato 2646, world, twopi 2108) are not recorded.
  33. **[DONE — `feature/cache-oracle-failures`]** Land part 2's speed-gate result, which was measured after PR #96 merged: a
      T14 journal row in `plans/post-16-1-followups-2/decision-journal.md`, and
      the README session summary's "not measured" bullet changed to PASS. The
      edits are uncommitted in the main checkout; if they are lost, the numbers
      are: 2026-10-21, load < 7.5, two alternating T0/head pairs over T0's 20
      dot + 20 neato ids (best of 3 warm runs). Per-engine median of head/T0:
      dot 1.0435 and 0.9794, neato 1.0037 and 0.9908. Against
      `timings-before.json`: dot 0.9587, neato 0.9961. T0 vs T0 noise: dot
      1.0062, neato 1.0196. The head bundle is byte-identical to T12's.
- **New follow-ups found by item 27** (journal row 2026-10-21, item 27):
  34. **[DONE — `fix/svg-raw-escaping`]** SVG text-span escaping: `svg_textspan` escapes with `raw = 1`
      (`plugin/core/gvrender_core_svg.c`), so every `&` in a span becomes
      `&amp;`. The port keeps entity-looking sequences, so text that decodes to
      `&amp;`, `&#38;` or `&foo;` diverges: plain `label="x&amp;amp;y"` and
      `"x&foo;y"`, and HTML `<x&amp;amp;y>` (all on `main` before item 27).
      Item 28 adds a case: `xlink:title` also uses `raw = 1`
      (`svg_begin_anchor`), and the port's `escapeXmlText` keeps entities there
      too. A node `tooltip="c&#38;d"` already diverged; since item 28 decodes
      HTML attribute values as expat does, an HTML `title="a&amp;amp;b"`
      (decoded `a&amp;b`) now does as well.
  35. `<BR/>` lines inside a font-style element: `<k<u><br/><br/></u>>` places
      the lines differently from native (y off by 6.76 pt); `k<br/><br/>`
      without the `<u>` matches. Pre-existing on `main`.
- **New follow-ups found by item 28** (journal row 2026-10-22, item 28; all
  three reproduce on `main`):
  36. agerr's default writer (`lib/cgraph/agerror.c:default_usererrf`) prints
      each control character that is not white space as `\ooo`. The port
      prints messages as they are, so a raw `\x01` in an HTML label's error
      context shows as the byte, not `\001`. Any warning or error the port
      prints that contains such a character differs the same way.
  37. `Warning: %s is not a known color.` (`lib/gvc/gvrender.c:206`, after
      `colorxlate` returns `COLOR_UNKNOWN`) is never printed by the port, for
      plain attributes (`a[color=foo]`) as for HTML `COLOR`/`BGCOLOR`. stderr
      only; the SVG matches. Found by item 28's attribute fuzz (most of its
      stderr-only mismatches).
  38. **[DONE — `fix/html-rounded-dashed`]** `STYLE="rounded,dashed"` on an HTML table or cell: native draws a rounded,
      dashed `<path>`, the port a dashed square `<polygon>`; `rounded` alone
      matches.
- **New follow-up found by item 34** (journal row 2026-10-22, item 34;
  reproduces on `main`):
  39. Label entity decoding: the port's `htmlEntityUTF8`
      (`src/common/html-entities.ts`) is a regex, not a port of `htmlEntity`
      (`lib/common/utils.c`). `&#X41;` (upper-case X) stays literal (native
      `A`); `&#;` natively consumes `#;` and keeps the `&` (n = 0 with a `;`
      still advances `str`), so `"p&#;q"` renders `p&q`. C's digit caps (7
      decimal, 6 hex) and its byte encoding of `v >= 0x7F` are unmodelled.
      Plain labels and, since item 34, tooltips (`preprocessTooltip`) take
      this path; widths follow the text.

## Local leftovers (not committed, safe to delete)

- `test/corpus/parity-baseline.json`, `test/corpus/parity-probe.json`: survey
  scratch from T2/T12.
- `feature/graphviz-16.1-sync` local branch: the only copy of the pre-rebase
  SHAs (mapping in the PR #86 journal's post-merge row).
- Old agent worktrees under `.claude/worktrees/` (t2-parser, t3-flat-et,
  t4-ortho-loop, t5-findmaxdev, t6-flat-adj, t7-solve3): from earlier
  missions, not this one. Check that each is merged before removing it.
- This file is committed (since the part-2 brief's `docs(mission)` commit).
