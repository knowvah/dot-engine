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
item 28 by `fix/html-label-warn-parity`, item 39 by `fix/html-entity-port`.
The open work is items 25, 29–31, 35–37 and 40–42 under "New follow-ups
found by part 2" below, each journaled in `plans/decision-journal.md`.
Being closed by `plans/post-16-1-followups-3/`.
The open work is items 43–71 under "New follow-ups found by part 3" below.
Being closed by `plans/post-16-1-followups-4/`.
Being closed by `plans/post-16-1-followups-5/`.
Being closed by `plans/post-16-1-followups-6/`.
Items 95–102 closed by `plans/post-16-1-followups-7/` (101's layout-time FT_NULL line → 104);
the open work is items 103–108 under "New follow-ups found by part 7".
Items 103–108 closed by `plans/post-16-1-followups-8/`; the open work is items 109–113 under
"New follow-ups found by part 8".
Items 109–113 closed by `plans/post-16-1-followups-9/`; the open work is items 114–124 under
"New follow-ups found by part 9".
Items 114–124 closed by `plans/post-16-1-followups-10/`; the open work is items 126–138 under
"New follow-ups found by part 10".
Items 126–138 closed by `plans/post-16-1-followups-11/`; the open work is items 139–147 and 151–159
under "New follow-ups found by part 11" (148–150 were found and fixed by part 11 T7b).
From 2026-11-09 open work is tracked in GitHub issues (knowvah/dot-engine). Follow-up → issue:
139 → #129, 140 → #130, 141 → #131, 142 → #132, 143 and 144 → #133, 145 → #134, 146 → #135,
147 → #136, 151 → #137, 152 → #138, 153 → #139, 154 → #140, 155 → #141, 156 → #142, 157 → #143,
158 → #144, 159 → #167; corpus `2475_1` out of memory → #145. Issue numbers and follow-up numbers overlap: cite
issues as `#N`, follow-ups as "item N".
Items 90–93 are done by part 6; 94 landed with 95 (part 7 T1).

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
  25. **[DONE — part 3 T2: `neatoMaxIter` ports `neatoinit.c:1280-1287`; no corpus
      input reaches it]** ipsep `MaxIter` default `100·n` (`neatoinit.c:1286-1287`) is unported; no
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
  29. **[DONE — part 3 T6-T9: 29a-d fused per disassembly; CDT face order per GTS]** Fused non-Bezier expressions the port computes plain: `ptToLine2`
      (`anchor.ts`, `splines-geom.ts`), `arrow_type_curve` control points,
      `svg-edge-split.ts:approxLen` (`DIST`), `edge-route-clip.ts:arrowEndClip`
      (differs from arrows.c beyond fusion), `multispline-router.ts:addTriEdge`
      (`DIST`); `cdt-surface.ts` orders face vertices differently from GTS (T10, T12,
      T13).
  30. **[CLOSED — part 3 T4: documented irreducible in A9 + 23 locales (AD-9)]**
      sfdp 2168_3 (item 17) needs a bit-exact model of Apple's `sin` to go further
      (T13).
  31. **[PARKED — part 3 T13: C's class2 needs ≈6.6 GB (native 6.35 GiB RSS measured); port-only overhead is follow-up 68]** 1864 exhausts a 1.5 GB worker heap in the port, on the T0 bundle as well as
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
  35. **[DONE — part 3 T12: parked patch from `plans/post-16-1-followups-3/parked/` applied after the mission on the user's decision]** `<BR/>` lines inside a font-style element: `<k<u><br/><br/></u>>` places
      the lines differently from native (y off by 6.76 pt); `k<br/><br/>`
      without the `<u>` matches. Pre-existing on `main`.
- **New follow-ups found by item 28** (journal row 2026-10-22, item 28; all
  three reproduce on `main`):
  36. **[DONE — part 3 T5]** agerr's default writer (`lib/cgraph/agerror.c:default_usererrf`) prints
      each control character that is not white space as `\ooo`. The port
      prints messages as they are, so a raw `\x01` in an HTML label's error
      context shows as the byte, not `\001`. Any warning or error the port
      prints that contains such a character differs the same way.
  37. **[DONE — part 3 T10]** `Warning: %s is not a known color.` (`lib/gvc/gvrender.c:206`, after
      `colorxlate` returns `COLOR_UNKNOWN`) is never printed by the port, for
      plain attributes (`a[color=foo]`) as for HTML `COLOR`/`BGCOLOR`. stderr
      only; the SVG matches. Found by item 28's attribute fuzz (most of its
      stderr-only mismatches).
  38. **[DONE — `fix/html-rounded-dashed`]** `STYLE="rounded,dashed"` on an HTML table or cell: native draws a rounded,
      dashed `<path>`, the port a dashed square `<polygon>`; `rounded` alone
      matches.
- **New follow-up found by item 34** (journal row 2026-10-22, item 34;
  reproduces on `main`):
  39. **[DONE — `fix/html-entity-port`; invalid-UTF-8 encodings documented
      under A5]** Label entity decoding: the port's `htmlEntityUTF8`
      (`src/common/html-entities.ts`) is a regex, not a port of `htmlEntity`
      (`lib/common/utils.c`). `&#X41;` (upper-case X) stays literal (native
      `A`); `&#;` natively consumes `#;` and keeps the `&` (n = 0 with a `;`
      still advances `str`), so `"p&#;q"` renders `p&q`. C's digit caps (7
      decimal, 6 hex) and its byte encoding of `v >= 0x7F` are unmodelled.
      Plain labels and, since item 34, tooltips (`preprocessTooltip`) take
      this path; widths follow the text.
- **New follow-ups found by item 39** (journal row 2026-10-22, item 39;
  both reproduce on `main`):
  40. **[DONE — part 3 T3: expat content-tokenizer reference scan + partial hold]** HTML text with a malformed reference is an expat `not well-formed
      (invalid token)` error natively; the port accepts it and writes the
      text. A bare `&` (`<p&q>`, `<p & q>`: scanEntity finds no `;` and
      leaves it), `&#;`, `&#x;`, `&#X41;` (expat takes only a lower-case
      `x`), `&#65q` and `&#xG;`. `textRefError`
      (`src/common/htmltable-lex-expat.ts`) checks only undefined entities
      and disallowed character numbers.
  41. **[DONE — part 3 T11]** `estimate_character_width_canonical` (`lib/common/textspan_lut.c:806`)
      warns `Warning: no value for width of non-ASCII character %u. Falling
      back to width of space character` (agwarningf adds its own `Warning: `
      prefix) for the first byte >= 128 it measures, and the ASCII
      `width == -1` variant falls back to 0. The port never prints either.
      Both are once per process (`static bool`), which a library needs a
      decision on. stderr only.
  42. **[DONE — part 3 T1: emit_once font-warning set carried over; AD-4 per-render reset]** Output depends on render history in a long-lived process. Item 39's
      byte diff (17 corpus files with `&`, 8 engines x 5 formats, both
      bundles, resident worker pools) ran twice. Of the 590 jobs that finish
      within 120 s, run 1 found 8 differing (2470 dot plain, neato svg/cmapx,
      fdp svg; Symbol neato xdot, fdp svg/json, sfdp json), run 2 found 5
      (2470 neato svg, fdp cmapx; Symbol neato svg, fdp cmapx, sfdp json).
      All 13 are byte-identical main vs branch when each runs in its own
      process, so the branch is not the cause; the pools only ran jobs in a
      different order. 2470 neato cmapx differs in stderr
      (one bundle prints a warning the other does not). Ruled out: Symbol
      fdp rendered before and after neato/fdp/sfdp of clust4, crazy and unix
      in one process is unchanged. Next: replay one worker's actual job order
      to find the state that carries over.
- **New follow-ups found by part 3** (`plans/post-16-1-followups-3/`):
  43. **[DONE — part 4 T15–T17, T22, T22b, T26: mode=hier ported (AD-6 + amendments); probe and 1554 match native; subset/circuit stay loud]** neato `mode=hier` throws `hierarchical stress majorization is not supported
      yet` (`assertSupported`, `src/layout/neato/init.ts`) where native lays out
      (`digraph{mode=hier;a->b->c->d->e->f;a->d;b->e;c->f}`: native 6 nodes, port
      throws). Corpus 1554 (`mode="hier"`) is quarantined `engine-deferred` for
      it; not in `docs/known-divergences.md` (part 3 T2).
  44. **[DONE — part 4 T4: expat BT_NONXML in content]** A raw control character in HTML label text (`label=<a\001b>`) is an expat
      invalid token natively (`Error: not well-formed (invalid token) in line 1` /
      `... <HTML>a\001b ...` / `in label of node a`, label dropped); the port keeps
      the text (`ab`) and prints nothing. `&#1;` already matches. expat
      `contentTok` BT_NONXML is unmodelled in `htmltable-lex-expat.ts` (part 3 T3).
  45. **[DONE — part 4 T2: reasons restated]** `test/architecture/module-globals.fitness.test.ts` allowlist reasons are
      stale after part 3 T1: the listed statics now reset through
      `resetRenderState` (`src/common/render-state.ts`), and `clType` is set in
      `graph-init.ts:330`. Reasons only; the allowlist itself still holds.
  46. **[DONE — part 4 T7: dedupe sets reset per render (AD-7); label persistence split out as 72]** Rendering the same parsed `Graph` object twice suppresses the HTML
      "cell size too small" and "No or improper image" warnings on the second
      render: per-graph-object state survives `freeLayout` (not a module
      static, so AD-4's reset does not reach it). Native re-parses per run.
  47. **[DONE — part 4 T8: GvcContext.layout resets render state (AD-8)]** The low-level pipeline `GvcContext.layout` + `renderWithContext` has no
      per-render reset (AD-4 covers `renderSvg`, `render`, `getDrawOps`,
      `renderAsync`); a caller driving it directly carries C process state
      between graphs. Needs a documented contract or an entry-point reset
      (part 3 T1).
  48. **[DONE — part 4 T10: fused DIST at all six splines-clip sites; bezier_clip already matched]** `src/common/splines-clip.ts` `SplineClipHelper.arrowEndClip`/`arrowStartClip`
      (used by the non-dot engines and the main dot routing path) computes DIST with
      `Math.hypot`, also in `sphereCtx`; native is `sqrt(fma(dx,dx,dy*dy))`
      (`_arrowEndClip`). Its `bezierClip` should be checked against `_bezier_clip`
      (part 3 T7).
  49. **[DONE — part 4 T11: clipToNodes back-up + fused compound DIST]** `src/layout/dot/compound.ts` `arrowEndClipIdx`/`arrowStartClipIdx` test
      `dist < elen` with unfused `Math.hypot`, and `edge-route-routing.ts`
      `clipToNodes` lacks `arrows.c:291-293`'s `endp -= 3` back-up (part 3 T7).
  50. **[DONE — part 4 T12: arrowStartClip in C's reversed absolute form]** `edge-route-clip.ts` `tailArrowEndClip` ports `arrowStartClip` forward in
      tip-local coordinates with `Math.hypot`; C reverses to
      `sp[0]=ps[start+3] … sp[3]=tip` with `left_inside=false` on absolute
      coordinates. Equal in exact arithmetic, not bit-equal (part 3 T7).
  51. **[DONE — part 4 T13: GTS SQRT3 literal + fused enclosing triangle]** `cdt-surface.ts`'s enclosing triangle uses `SQRT3 = 1.73205080756887729` and
      `Math.hypot`; GTS uses `#define SQRT3 1.73205080757` (`triangle.c`) and
      `sqrt(dx*dx+dy*dy)`. Latent difference in the enclosing vertices; output
      effect unchecked (part 3 T9).
  52. **[DONE — part 4 T9: documented irreducible, known-divergences A11]** Port CDT face numbering and `neigh` order follow creation order; native
      follows GHashTable (address) order, which is nondeterministic. This can
      change tgraph edge order and shortest-path tie-breaks in multispline
      routing (part 3 T9).
  53. **[DONE — part 4 T28: (a) drift parked irreducible (host libm pow, A1); (b) injection artifact + fixed V8 sin(9π/8) ulp in the obstacle 8-gon]** 241_0 sfdp: the layout drifts from native (node 3 y 0.41621 vs 0.4162), and
      with native positions injected edge 3→4 is a 7-point spline in the port vs
      4 in native; the port also reports an extra routing failure on (1,2).
      Pre-existing, independent of the CDT face order (part 3 T9).
  54. **[DONE — part 4 T5: agwarningf/agerrorf prefixes]** About 17 agerr-family sites print without the prefix `out` adds natively:
      `bad edge len`, `Max. iterations`, `Illegal value … mode`,
      `Unrecognized overlap value`, `Orthogonal edges …` (no `Warning: `), and
      `lost <t> <h> edge`, `in routesplines, Pshortestpath failed` (no
      `Error: `). T5 routes them through `agerrLineOn` with the text unchanged
      (part 3 T5).
  55. **[DONE — part 4 T5: agerr warnings on console.warn]** Console channel is mixed: six agerr warnings go to `console.error`
      (`cluster.ts`, `conc.ts:295`, `graph-init.ts`, `poly-init.ts`, the parser's
      number-ambiguity and macro warnings) because tests spy on it; all agerr
      warnings should use `console.warn` (part 3 T5).
  56. **[DONE — part 4 T9: documented, known-divergences A12 (AD-10)]** The lexer's syntax errors lack native's `<stdin>: ` file prefix (part 3 T5).
  57. **[DONE — part 4 T6: parseSegs warning + caller context]** `parseSegs`' `Warning: Total size > 1 in "<spec>" color spec in edge a -> b`
      is never printed by the port (part 3 T10).
  58. **[DONE — part 4 T18: shared gvrenderSetStyle warning port (user-approved scope)]** Native prints `gvrender_set_style: unsupported style rounded - ignoring` for an
      ortho `style=rounded` edge; the port does not (part 3 T10).
  59. **[DONE — part 4 T19: firstlayer warning]** Native prints `layers not supported in <fmt> output` for xdot, cmapx and plain;
      the port does not (part 3 T10).
  60. **[DONE — part 4 T23: missing-image messages (no failure caching, as C)]** A missing `image=` file: native prints `No such file or directory while opening
      x.png` and `No or improper image="…" for node "a"`; for HTML `<IMG>` native also
      prints a `Warning: No such file…` line before the Error the port prints
      (part 3 T10).
  61. **[DONE — part 4 T20: doubled prefix]** Native's font fallback line is `Warning: Warning: no hard-coded metrics …`
      (doubled prefix); the port prints one `Warning: ` (part 3 T5/T10).
  62. **[DONE — part 4 T14: striped clusters drawn]** Cluster `style=striped` is not drawn; T10 added only its colour warnings
      (part 3 T10).
  63. **[DONE — part 4 T24: transparent pen under a colorscheme (+ striped stripe scheme window)]** Under a colorscheme, the `transparent` pen of `peripheries=0` filled nodes and of
      clusters is not reported as an unknown color for non-svg renderers; only the
      root-background case is (part 3 T10).
  64. **[DONE — part 4 T25: findStopColor over parseSegs for HTML BGCOLOR]** `parseGradientSpec` (HTML) trims and splits at the first `:` where C's
      `findStopColor` uses `parseSegs`; names with spaces or `;fraction` in HTML
      `BGCOLOR` may differ (part 3 T10).
  65. **[DONE — part 4 T1: dup-baseline-shift class]** Fuzz `classify.mjs` files native's duplicate-`baseline-shift` outputs (nested
      `<sup>`/`<sub>`, invalid XML) under class 35 or svg-other; give them their own
      class (part 3 T12).
  66. **[DONE — part 4 T1: probe compares text x/y and ellipse rx/ry]** `probe.mjs` compares only text content and ellipse `cx`; it should also compare
      text x/y and ellipse rx/ry (it reported item 35 as SAME) (part 3 T12).
  67. **[DONE — part 4 T27: one HTML line builder]** HTML line splitting and the simple test exist twice (sizing:
      `htmltable.ts` `splitSizedLines`/`htmlTextIsSimple`; placement:
      `htmltable-pos-runs.ts` `buildLineRuns`/`runsAreSimple`); share one builder
      so they cannot diverge again (refactor, output unchanged) (part 3 T12).
  68. **[DONE — part 4 T21: shared empty attrs on virtual objects, 2,217 → 1,850 B/pair]** Dot virtual nodes/edges cost 2,490 B per pair in the port vs ≈1,056 B in C
      (`class2` chains): each allocates an empty `attrs` Map (~372 B/pair, C virtual
      nodes have no attribute record), separate `Port`/point objects (~250 B; C embeds
      them in `Agedgeinfo_t`) and ~15 boxed numbers. Lazy `attrs` on virtual
      Node/Edge would save ~15% of class2 bytes for every dot render with long edges;
      needs corpus byte-identity (part 3 T13; does not rescue 1864, which needs
      ≥ 6.6 GB even at C's sizes).
  69. **[DONE — part 4 T3: oracle-nondeterministic walk status (AD-13)]** Native 16.1.0 is nondeterministic on some fdp/sfdp/neato corpus ids (graphs-fdp,
      linux.x86-neatosplines_neato sfdp, ngk10_4 neato, directed-table fdp: 2-3
      distinct xdots in 5-6 runs; linux.i386-b102 fdp differs between sessions), so
      their walk verdicts flip with no port change. The walks should mark such ids
      (e.g. run the oracle N times and record `oracle-nondeterministic`) instead of
      caching one draw (part 3 T14). Seen on twopi too (nshare-arrows_dot).
  70. **[DONE — part 4 T29: `attribute-divergence.ts fdp --fresh`, 16 diverged ids, all drift-exonerated]** `test/corpus/attribution-fdp.json(l)` still lists fdp `241_0` as
      `not-cleared`, though the id passes since part 3 T9. Rerun
      `attribute-divergence.ts fdp` (or drop the row) so attribution covers only
      diverged ids (part 3 T14; outside T14's write-set).
  71. **[DONE — part 4 T29: all seven engine walks re-run on d42aafd1 (signed: 23a0cfc7) and committed]** Committed walk rows for still-diverged ids are stale where pre-mission src
      changes moved output without a re-walk (twopi graphs-arrowsize: 23 diffs
      committed, 72 on today's head and on part 3's base). A full re-walk of all
      engines would refresh `nDiffs`/`firstDiff` (part 3 T14).

- **New follow-ups found by part 4** (`plans/post-16-1-followups-4/`):
  72. **[DONE — part 5 T13 (AD-12): every engine's cleanup frees node/edge (and dot/fdp/osage cluster) labels where its C does]** Node/edge/graph labels survive `freeLayout`: `poly-init.ts` `buildNodeLabel`
      returns early when `n.info.label` is set, so laying out the same `Graph` twice
      never re-sizes its labels (no HTML size/image warnings on the second render; a
      changed measurer is ignored). C frees them in `dot_cleanup_node`
      (`dotgen/dotinit.c:110`, `common/utils.c:1517-1531`) and rebuilds them in
      `common_init_node` (`utils.c:441`) each layout (part 4 T7).
  73. **[DONE — part 5 T10: `setEdgeLen` on every major/hier/ipsep layout, `ED_dist`, sscanf-style `lenattr`; fdp already matched]** Default neato (stress/major) never calls `setEdgeLen`: C's `scan_graph_mode`
      does for every mode (`neatogen/stuff.c:245-261`), so `len=x` prints
      `Warning: bad edge len "x" in %1 - setting to 1.00` natively and nothing in the
      port, which reads `len` via `makeGraphDataC` `lateDouble` (`init.ts`). Check
      whether `lenattr`'s fallback also changes major-mode distances (part 4 T5).
  74. **[DONE — part 5 T4: `agNameOf` returns `%1` for the anonymous root]** Anonymous graphs: native `agnameof` returns `%<id>` (`cgraph/id.c:163`,
      LOCALNAMEPREFIX), so neato messages print `graph %1`; the port prints an empty
      name (part 4 T5).
  75. **[DONE — part 5 T1 (agerr partial lines, AD-7) + T11 (`findStopColor`)]** A filled node with `fillcolor="red;0.6:blue;0.6"` prints natively
      `Warning: Total size > 1 in "…" color spec Warning: red;0.6 is not a known
      color.` as one line (`findStopColor`, no AGPREV, agerr partial line); the port
      prints only the first half on its own line and never the unknown-colour half
      (part 4 T6).
  76. **[DONE — part 5 T8: native probed (AD-14); U+FFFE/U+FFFF/lone surrogates rejected in attribute values]** `htmltable-lex-attvalue.ts` `NON_XML` rejects C0 controls in attribute values
      but not U+FFFE/U+FFFF or lone surrogates, which expat rejects in content (T4
      ported those for content); probe native attribute values first (part 4 T4).

  77. **[DONE — part 5 T11: `findStopColor`/`parseSegs` diagnostics, native order]** Filled clusters with weighted/multi-colour fills: native prints `Warning: red;0.7
      is not a known color.` (after a `findStopColor` Total-size line with no `in
      cluster` tail) and `Warning: More than 2 colors specified for a gradient -
      ignoring remaining`; the port prints neither (part 4 T14; pairs with 75).
  78. **[DONE — part 5 T7: nested xdot render in `beginGraph` (AD-18)]** Port `-Tjson` prints the layers warning `json` then `xdot`; native `xdot` then
      `json`: the port's nested xdot render runs in `JsonRenderer.endGraph`
      (`src/render/json.ts:252`), C's in `json_begin_graph` (part 4 T19).
  79. **[DONE — part 5 T12 (`feat`): `parse_layerselect` + firstlayer/nextlayer walk (AD-9)]** `layerselect`/`layerlist` are unported (`emit.c` `firstlayer` branch) (part 4 T19).
  80. **[DONE — part 5 T5: `style_token`/`parse_style` ported file for file (AD-8)]** Style parsing: C `parse_style` keeps whitespace inside tokens (`"dashed , bogus"`
      → token `"dashed "`), the port trims; unmatched/nested parentheses get no
      `agerrorf`; per-bezier style warnings print after `reportEdgeColors` instead of
      interleaved with per-segment colour warnings (part 4 T18).
  81. **[DONE — part 5 T16: window spans box and label (AD-16); tapered pen probed, native]** The cluster label sits inside C's cluster colorscheme window (`emit.c:3921`,
      restored at 3943) but outside the port's; `svg-tapered-edge.ts:49` assigns a
      literal `transparent` pen (unprobed) (part 4 T24).
  82. **[DONE — part 5 T11; the node/cluster `:red` sibling is 92]** HTML `BGCOLOR` stderr: `red;0.7:blue;0.6` needs agerr partial-line join (as 75);
      `red;x:blue` prints the colour warning before the Error (pre-pass order); `:red`
      warns `Warning:  is not a known color.` and fills solid natively, the port
      renders no fill (`resolveRenderColor('')`); `style-resolve.ts` `findStopColor`
      (nodes/clusters/graph bgcolor) treats rv 3 as a gradient and omits "More than 2
      colors" (part 4 T25).
  83. **[DONE — part 5 T14 (AD-10); drawing is 91, docs 93]** Images: HTML `<IMG>` consults only the global `setImageResolver`, not a per-context
      `ctx.imageResolver` (`HtmlSizeEnv` lacks it; `make-label.ts`); node `image=` may
      not size the node at all (`poly-sizing`) — unverified; corpus ids with a real
      `.png` next to them now warn in port-only corpus runs (no resolver) (part 4 T23).
  84. **[DONE — part 5 T3 (AD-15 refinement: `c` when only the addend is non-finite)]** `src/common/fma.ts` (Dekker split) returns NaN for infinite operands where arm64
      `fmadd` returns inf; `matrix-ops.ts` carries a local guard, other callers are
      unchecked (part 4 T17).
  85. **[DONE — part 5 T15 under the AD-4 amendment (neato stress p50 1.85× accepted); cola's right-multiply is 94]** `stress-kernel.ts` conjugate gradient and right-multiply are unfused vs the oracle
      (production neato kD path ~1 ulp per step; `cgStep` returns true on `p_Ap == 0`
      instead of breaking); `OPT_SMART_INIT` is 1 there vs C's 0x4; `stresswt`
      (`checkExp`) unported. Swap in `conjgrad-mkernel.ts` under AD-4 (part 4 T22/T26).
  86. **[DONE — part 5 T6 (AD-17)]** Docs: the errors-table row for `mode=hier` says "after … `maxiter` is not
      negative"; C returns before the model check when `maxiter` is 0, so "positive"
      is exact (README and 24 docs-site pages) (part 4 T26b).

  87. **[DONE — part 5 T2: `State == GVSPLINES` render state (AD-5); osage sets it too]** Patchwork (and any engine that never routes splines) prints `Error: lost <t> <h>
      edge` for every edge in the port; native prints nothing, because C
      `translate_drawing` calls `map_edge` only when `State == GVSPLINES`
      (`lib/common/postproc.c`); `src/common/postproc.ts:224` assumes the state always
      holds (part 4 T29 bytediff).
  88. Heavy-tail budgets misfire on the iterative engines. `engine-walk.ts` scales its
      port budget by perf.json's SVG `dot` cost, so sfdp 2371 (213 s recorded, 0.75–2.9 h
      real) times out at the 1 h floor. `attribute-divergence.ts` caps the oracle at 300 s,
      so neato 2371/2646 (native ~1000 s) come back harness-error under `--fresh`. Scale
      both by the engine's own recorded cost (the previous walk row's `portMs`/`oracleMs`)
      (part 4 T29; worked around with env overrides and single-id resumes). The
      refreshed `attribution-neato.json(l)` (84 rows, all drift-exonerated, without the
      now-passing inet/ngk10_4 rows) landed separately on 2026-10-26. DONE
      2026-10-26: both tools add `mult × previous walk row` (`walkCosts`), with
      timeout/oracle-error rows excluded as consumed caps.
  89. **[DONE — part 5 T9: every key probed, all read the parse-time snapshot (AD-6)]** Cluster border/fill attributes resolve through a live parent walk.
      `clusterAttr` (`src/gvc/device-cluster.ts:46`) reads the cluster's own
      `attrs`, then each ancestor's live `attrs`, so a root `graph [color=…]`
      declared *after* the cluster opens applies to it; C's `agget` sees the
      subgraph's parse-time default snapshot (`agsubg` copies `defval`), so native
      draws the default black. Repro: `digraph { subgraph cluster_x { a }; graph
      [color=white] }` — port white border, native black. Route through
      `graphAttrInherited` (`src/common/attr-get.ts`, the snapshot read the HTML
      pen-color fix for 894589 uses) and confirm `pencolor`/`fillcolor`/`bgcolor`
      follow the same rule (found while fixing 894589, 2026-10-26; no corpus id
      hits it).
- **New follow-ups found by part 5** (`plans/post-16-1-followups-5/`):
  90. **[DONE — part 6 T1: both `poly_init` warnings emitted once per layout from `initNodeFromLabel`]** `-Tjson` prints the missing-image warning pair (`No such file or directory while
      opening nope.png`, `No or improper image="nope.png" for node "a"`) twice in the
      port, once per render pass (the nested xdot pass and the json pass); native
      prints the pair once for `digraph{a[image="nope.png"]}` -Tjson. Not caused by
      the T7 order fix; the once-per-process behaviour lives in the usershape /
      image-size path (part 5 T7, 2026-10-27).
  91. **[DONE — part 6 T4: `gvrender_usershape` port, node `usershape_p` branch, xdot `I` op; svg `rotate=90` → item 100]** Node `image=` is sized (part 5 T14) but never drawn: the svg `usershape` emitter
      (`src/render/svg.ts:240`) has no caller for nodes, whereas C `poly_gencode` emits
      the image through `gvrender_usershape` (found by part 5 T14, 2026-10-27).
  92. **[DONE — part 6 T2: node/cluster solid fills via `resolveFillColorName`; point/edge variants → items 98, 99]** Node/cluster `fillcolor=":red"`: the port resolves the empty cut name through
      `resolveRenderColor` (no fill, no warning); native warns `Warning:  is not a known
      color.` and fills opaque black. Sites `poly-gencode.ts`, `device-cluster.ts`; the
      HTML path was fixed by part 5 T11 (`resolveFillColorName`). Not yet probed natively
      for node/cluster (found by part 5 T11, 2026-10-27).
  93. **[DONE — part 6 T5: English + 23 locales state the pixel unit and dpi conversion]** Docs: `docs-site/guide/browser.md` says a node's `image=` attribute is not sized,
      and `api.md`/`images.md` never state the sizer's unit; after part 5 T14 `ImageSizer`
      returns intrinsic pixels converted at the graph `dpi` (default 96) and `image=` nodes
      are sized. English pages, 23 locales and their `sourceHash` (2026-10-27).
  94. **[DONE — part 7 T1: landed with item 95 (fused cola right-multiply)]** `mode=ipsep`: `stress_majorization_cola`'s inlined `right_mult_with_vector_ff`
      copy (neato_layout 0x3904c+, the `fmul.4s`×4 / `fmla.4s`×4 blocks at 0x3b19c and
      0x3b570) has not been read instruction by instruction, so the port's `COLA_OPS`
      keeps that right-multiply unfused while its CG is the shared fused body and its
      square-add is unfused by source (`constrained_majorization_ipsep.c:313-316`).
      Six ipsep probes sit 0.010 pt from native either way; no corpus id sets
      `mode=ipsep` (part 5 T15, 2026-10-28).

- **New follow-ups found by part 6** (`plans/post-16-1-followups-6/`):
  95. **[DONE — part 7 T1: patch applied; 7 unconstrained probes byte-identical]** `mode=ipsep`: port `stress_majorization_cola`'s layout prologue
      (`constrained_majorization_ipsep.c:166-191`: `d_coords *= 10/max` with `max` from
      1, `orthog1` per axis, y translated so y[0]=0) and land it together with item
      94's fused right-multiply (`COLA_OPS.rightMult = rightMultWithVectorFFFused`).
      Without the prologue the float trajectory differs from iteration 0 and fused alone
      moves `ipsep-tree` 0.010 → 0.120 pt; with both, all 7 ipsep probes are
      byte-identical to native xdot. Ready patch:
      `plans/post-16-1-followups-6/patches/item94-95-fused-plus-cola-prologue.patch`
      (neato suite 919/919; full gates not run) (part 6 T3, 2026-10-29).
  96. **[DONE — part 7 T5, T7, T8, T10: `stress_majorization_cola` on `quad_prog_vpsc`; 22/22 ipsep probes]** `mode=ipsep` runs kD-only logic C's `stress_majorization_cola` lacks, and lacks
      cola's own: the kD convergence test instead of `:363-367`; `havePinned`/`solveAxis`
      pinned handling (cola ignores `initLayout`'s return); `maxi < 0` return order; no
      `nsizeScale` loop, noverlap constraint generation / `constrained_majorization_vpsc`,
      cluster `clap` extension or `removeoverlaps`. None moved the 7 probes (part 6 T3).
  97. **[DONE — part 7 T2: `bind_shape`/`user_shape` ported; native runs the image branch for unknown shapes (this text was wrong)]** `poly_init` warnings are keyed on `shapefile non-empty && shape != epsf`; C keys on
      `ND_shape(n)->usershape && name == "custom"` (`shapes.c:2021-2046`, `bind_shape`
      3970). Differs for `shape=custom` without `shapefile` (C warns
      `shapefile="<nil>"`) and for an unknown shape name (C `user_shape`: image branch
      skipped) (part 6 T1).
  98. **[DONE — part 7 T3]** Point node `fillcolor=":red"`: the port warns `:red is not a known color.`, native
      ` is not a known color.` (fill `#000000` on both); `applyFillState`'s point path
      resolves `findFillDflt` without `gvrender_set_fillcolor`'s cut at ':' (part 6 T2,
      native-probed).
  99. **[DONE — part 7 T3: `emit_edge_graphics` fill selection; arrowheads fill with it]** Edge `fillcolor=":red"` (arrowheads): native warns ` is not a known color.` and fills
      `#000000`; the port fills `black` silently (part 6 T2, native-probed).
  100. **[DONE — part 7 T4]** svg `usershape` (`src/render/svg.ts`) lacks `core_loadimage_svg`'s `job->rotation`
      branch (`gvloadimage_core.c:74-82`: width/height swapped, `xMidYMid meet`,
      `transform="rotate(%d %g %g)"`); reference `digraph{rotate=90;a[image="r.png"]}`
      (part 6 T4).
  101. **[DONE — part 7 T6 (json warning, magic sniff); layout-time FT_NULL warning → item 104]** Native `-Tjson` prints `Warning: No loadimage plugin for "png:json"` once per image
      op; the port prints nothing (the image type is not known from a sizer) (part 6 T4).
  102. **[DONE — part 7 T9: `safefile` + `Gvimagepath` mirror; `unsafe` warning as native]** With `imagepath` set and a relative `image=`, native `gvusershape_file_access`
      prints `Filename "<name>" is unsafe` when `safefile`'s `findPath` finds no readable
      `<dir>/<name>` (`gvusershape.c:695`, `utils.c:253-311`); the port, with nothing
      supplied, prints the `No such file or directory while opening` line instead.
      Reference `graphs-val_val` (pre-existing at T0; part 6 T6 bytediff).

- **New follow-ups found by part 7** (`plans/post-16-1-followups-7/`):
  103. **[DONE — part 8 T2, T6, T7: all modes lay out subset, circuit and mds; native KK circuit always falls back]** (reserved by part 7 AD-3) Wire `model=subset|circuit` into the major, kk and hier
      paths (`start.ts:207-216`, `constrained-majorization.ts:96`), which stay loud; the
      models are ported in `stress-models.ts` (part 7 T7).
  104. **[DONE — part 8 T4: FT_NULL warning at layout, and the custom-shape branch of `poly_init`]** Layout-time FT_NULL warning: resolver bytes with unrecognized magic must warn
      `"<name>" was not found as a file or as a shape library member` and size to
      nothing at layout (`common_init_node` → `poly_init` → `gvusershape_size` →
      `gvusershape_open`). `poly-init.ts` (`warnPolyInitImages`, `nodeImageSize`) and
      `htmltable.ts:145,153` must call `imageOpenFailure` / pass the resolver to
      `usershapeSizePts`; a global-resolver read is needed for callers without a
      context (part 7 T6).
  105. **[DONE — part 8 T3: neighbour sets in `CmpNodePos` order, ties by creation order]** `src/vpsc/SweepLine.ts`: C++ `Node::leftNeighbours`/`rightNeighbours` are
      `set<Node*,CmpNodePos>` (position order, `generate-constraints.cpp:43-84`); TS uses
      an insertion-ordered Set filled in descending position, and `nodePosLt` compares
      objects with `<` (always false) where C++ breaks ties by address. Two
      `quad-prog-vpsc.test.ts` cases are `it.fails` on it; the tie case's native result
      itself varies run to run, so its fixture may need a refresh (part 7 T5).
  106. **[DONE — part 8 T8: ledger bullet in `docs/known-divergences.md`]** Known divergence: C++ `IncVPSC::splitBlocks` iterates `std::set<Block*>` in heap
      address order (`blocks.h:37`); native output varies with the allocator (3 results
      for one input under default / `X=1` / `MallocNanoZone=0`). Not reproducible; ledger
      entry needed (part 7 T5).
  107. **[DONE — part 8 T5: `safefile` sees the layout's own hooks]** `safefile`'s "host supplies the name" check reads the global sizer/resolver, not
      the per-context hooks; matters for `bindShape`'s `shapefile` under `imagepath`
      with a per-context-only sizer (part 7 T9).
  108. **[DONE — part 8 T1: `neatoModel` ported]** `index.ts:parseModel` lacks `neatoinit.c:neatoModel`'s warnings: `edges in graph
      %s have no len attribute. Hence, the mds model / is inappropriate. Reverting to the
      shortest path model.` (native prints a literal `%1`) with the shortpath fallback,
      and `Unknown value %s for attribute "model"` (part 7 T8).

- **New follow-ups found by part 8** (`plans/post-16-1-followups-8/`):
  109. **[DONE — part 9 T1: saturates as arm64 does]** `src/layout/neato/dijkstra.ts:toDistType` wraps a float weight at or above 2^31 into
      int32, where native arm64 saturates to INT_MAX (`dijkstra.c:166`). Only duplicate
      neighbours yield such a weight, and `makeGraphData` merges them, so no graph reaches
      it today (part 8 T2).
  110. **[DONE — part 9 T7: libc++ `std::sort` ported; T8: block address order proven the whole `dir1 n40` difference]** `dir1 n40` (`IncVPSC`, no `SweepLine`) matches none of 29 sampled native variants.
      Likely the heap-address order of follow-up 106, unproven for this case. Also unchecked:
      `compareEvents` under libc++'s unstable `std::sort` against JS's stable sort, on equal
      event positions (part 8 T3).
  111. **[DONE — part 9 T2: components copy the parent's attributes]** `maxiter` is ignored on multi-component neato graphs: `g.attrs.get('maxiter')` on a
      component misses the root's value, where C `agget` inherits it. `graph G {maxiter=3;
      a--b--c--a; d--e--f--d}` keeps the no-`maxiter` layout while native differs (129 xdot
      diffs). `epsilon` is read the same way, unchecked (part 8 T6).
  112. **[DONE — part 9 T3: sfdp `start` warning; T6: `setPrefix` and `isLegal`, callers as C; reuse of a user `_cc_N` → 115]** `ccomps` callers pass prefixes C does not (`_twopi`, `_sfdp_cc`, `_cc`; C passes none,
      giving `_cc_0`), and `ccomps` puts `_` before the index where C appends it directly. Fix
      the form and the three callers together. Nothing native prints reads these names today.
      Also check sfdp's `start=self` warning order against native (part 8 T7).
  113. **[DONE — part 9 T5: removed]** `getGlobalImageSizer` (`src/gvc/usershape.ts:40`) has no production caller: AD-6 named it,
      but the sizer fallback still lives in `imageIsSupplied` and `usershapeSizePts`, and only
      `image-ft-null.test.ts` calls it. Route those through it or remove it (part 8 T4, T9).

- **New follow-ups found by part 9** (`plans/post-16-1-followups-9/`):
  114. **[DONE — part 10 T1, T6, T7, T8, T13: neato and sfdp honour `dim` and `dimen`; T16 documents it]** `neato dim=3` is silently 2-D: 211–302 diffs on planning's probes, and absent from
      `docs/known-divergences.md`.
  115. **[DONE — part 10 T3: `ccomps` reuses it; twopi prints the `weight=0` error]** `ccomps` does not reuse a user `_cc_N` subgraph. On `graph G { a -- b; subgraph _cc_0 { c }
      d -- e; }`, C's `agsubg(g, name, 1)` reuses it, so `c` joins it; `buildSubgraph` always makes
      a fresh graph. circo matches native; twopi and sfdp do not, and native twopi also prints `use
      of weight=0 creates disconnected component` (part 9 T6).
  116. **[DONE — part 10 T9: `alloc_elist` unconditional]** `init.branch.test.ts` pins `dotInitNode`'s list guard, where C's `alloc_elist` is
      unconditional (part 9 T11).
  117. **[DONE — part 10 T14: proxies undone as `attach_attrs` does; the rest is native's heap-address order]** Second renders still missing native's on fdp: `graphs-fdp` (T14 did not clear it; likely native's
      first cycle changing cluster membership, no counterfactual run) and, in `dot` format, `1581`.
  118. **[DONE — part 10 T10: abomination rank as C]** Port-only `g.info.abomShift` survives a no-free layout, so a scratch graph's no-free render 3 on
      dot differs (part 9 T13).
  119. **[DONE — part 10 T11: weight kept in the attribute; the fallback appends]** `installEdgeSpline`'s fitter fallback overwrites a stale route where `new_spline` appends, and
      aux-edge weights are stamped outside the `weight` attribute (part 9 T13).
  120. **[DONE — part 10 T12: aux bezier ops kept]** No-free arrows on the flat aux route on dot: 21 of 211 svg lines on `multi-edge` render 2
      (`splines-flat.ts:276-283`). The one known miss left in the no-free gap AD-12 closed (part 9 T14).
  121. **[DONE — part 10 T2: the last bit of macOS `pow`, accepted under PR 119; no change]** sfdp first-render parity on the 15 ids in `harness/T11/xdot-second-T14.json`. Not diagnosed; these
      first renders did not change in part 9.
  122. **[DONE — part 10 T4: four `draw-replay-*` golden inputs; 125 found by them]** No corpus input carries a graph `_draw_` or `_background`, so the survey and bytediff never reach
      `init_xdot`'s replay. Only `src/gvc/emit-xdot.test.ts` covers it. Add such an input (part 9 T14, T10).
  123. **[DONE — part 10 T15: both edges pinned against native]** `ctx.layout`'s reset has two unpinned edges: a layout that throws after a reset leaves `laidOut`
      unset, and a subgraph laid out after its root was freed is not reset (part 9 T11).
  124. **[DONE — part 10 T5: native's `canon` prints freed memory for non-ASCII labels]** `graphs-b56`'s second `plain` render on native varies per process: over 8 runs, `SAME` on fdp 2, circo 1,
      twopi 1, osage 5, sfdp 0. Cause not traced. It moved the matrix's native-same count from 255 to 253 between
      T0 and T10 with no native change. T14 also counted this id's `xdot` on all 8 engines as first-render misses
      (part 9 T10).

- **New follow-ups found by part 10** (`plans/post-16-1-followups-10/`):
  125. **[DONE — part 10 `fix(T4)`, by user decision]** The xdot replay's `setStyle` rebuilt pen and width
      from each `S` op, and drew under an invis pen (`gvrender.c:480,524,543,583,600`) (part 10 T4).
  126. **[DONE — part 11 T10: the header cites `arm-pow.ts`]** `spring-electrical.ts:12-14` cites a nonexistent `src/common/apple-pow.ts` (part 10 T2).
  127. **[DONE — part 11 T3: `_write_canonstr` wrap at `Max_outputline`, honouring `linelength`]** The port's xdot omits native's backslash-newline wrap of long `_draw_` strings (`write.c`,
      `MAX_OUTPUTLINE` 128). `compareXdot` parses, so surveys miss it (part 10 T2).
  128. **[DONE — part 11 T1, T2: the aux layout unbinds `constraint`, `minlen`, `group`]** First renders throw in the port where native succeeds, on the T0 bundle too:
      `plans/post-16-1-followups-10/harness/B3b/w4.gv` (`Maximum call stack size exceeded`) and `w5.gv`
      (`Cannot read properties of undefined (reading 'll')`). Not diagnosed (part 10 B3b).
  129. **[DONE — part 11 T8: decompose `Cmark` carried with the record; backstop removed]** `graphs/nestedclust.gv` no-free render 2 differs on 6 lines and render 3 on 8; native is stable over
      8 runs. Not diagnosed (part 10 B3b).
  130. **[DONE — part 11 T10: removed]** `fdp-adjust.ts:sizesByNdim` is redundant now that `getSizes` strides by `ndim` (part 10 T13).
  131. **[DONE — part 11 T5: dropped at both sites; the third is 139]** `conjgrad.ts:209,326` pass a trailing `\n` to `agerrorf`, reported to print a blank second line
      (part 10 T3).
  132. **[DONE — part 11 T6: libm `hypot`/`exp` last bits, closed under PR 119; no change]** 2-D `mode=sgd` differs from native, before this mission too: 58 nodes, max delta 1.59 on 133 of 256
      `dot` lines; native repeats 8 of 8. Not diagnosed (part 10 T7 check).
  133. **[DONE — part 11 T4: json undoes cluster edges and skips stand-ins]** A first `json` render on a graph with an edge to a cluster prints `__0:` proxies and edges with no
      `pos` (`src/render/json.ts`). Agent-reported (part 10 T14).
  134. **[DONE — PR #128: printed with native's prefix]** `CLUSTER_EDGE_WARNING` lacks native's `Warning: ` prefix (`src/layout/fdp/index.ts:41`); first-render
      stderr. Agent-reported (part 10 T14).
  135. **[DONE — part 11 T3: same mechanism as 127]** A second `xdot` does not fold a replayed long `_draw_`; may be 127 (part 10 T14).
  136. **[DONE — part 11 T9: `"graph" + AGSEQ` on the top group and gradient]** svg `id="graph<seq>"` on a subgraph render: native `graph1`, the port `graph0` (part 10 T15).
  137. **[DONE — part 11 T7, T7b: heap order natively; stored draws, `Spline.bb`, `inf`/`nan` fixed]** Subgraph then root, and root with no free then subgraph, on fdp and osage: 6 to 10 comparator diffs
      on `xdot` and `svg`; heap addresses suspected, untested (part 10 T15).
  138. **[DONE — part 11 T11]** `docs/known-divergences.md` A1's neato and fdp rows and "99.8/96.6" lag `PARITY.md`, and the
      non-goals line "`-Tplain` text output. Deferred" may be stale (part 10 T16).

  Accepted, not open (user decision, PR 119): layouts that vary with the runtime's `pow`, `hypot`
  or similar. Last-bit libm differences change the decisions an algorithm encodes, as they
  already do between OSes and chipsets on one implementation; the algorithm is still correct.
  The oracle fixtures are macOS's, so a probe this sensitive replays macOS's values
  (`kk-large.pow.json`). No library change is wanted.

- **New follow-ups found by part 11** (`plans/post-16-1-followups-11/`):
  139. **[DONE — issue #129: dropped the `\n`]** `conjgrad-mkernel.ts:28` (C `conjgrad.c:65`) still ends its `agerrorf` text with `\n`, the
      defect 131 fixed at the other two sites; its test pins the `\n` (part 11 T5).
  140. **[DONE — issue #130: built the subgraph; native aux ranks equal]** `make_flat_adj_edges` builds a `rank=source` subgraph `xxx` (`dotsplines.c:1177-1185`) the port
      omits; no output difference on w4 and six variants (part 11 T1).
  141. **[DONE — issue #131: unbound the four label symbols (stderr now equal); the other six probed equal]** `setState` also unbinds `E_fontcolor`, `E_labelfontcolor`, `E_xlabel`, `N_style`, `N_fontcolor`,
      `N_xlabel`, `N_showboxes`, `N_nojustify` (`dotsplines.c:731-771`) for the aux layout; head and
      tail labels probed equal, the rest unprobed (part 11 T1, T2).
  142. **[DONE — issue #132: svgGraphId carries the seq; graphObjId deleted]** `svgGraphId` (`src/render/svg-id.ts:54`) still hardcodes `graph0` for the graph anchor and map id
      (`device.ts:235,391`) and duplicates T9's `graphObjId`; the comment in
      `layout-reset.edges.test.ts` before the svg graph-id test is stale (part 11 T9).
  143. For the user (AD-3, PR 119): sgd's `hypot` (`sgd.ts:346`) could use the existing macOS model
      `libm-hypot.ts`, taking sgd58 to 6 of 255 lines (max 0.01); not adopted (part 11 T6).
  144. There is no macOS `exp` model; `Math.exp` misses 4 of 30 sgd eta values (`sgd.c:216`), the rest
      of 132's drift. Same user decision as 143 (part 11 T6).
  145. **[DONE — issue #134: echoAttr/echoGraphAttr use agstrcanon; labels already wrapped]** `echoAttr`/`echoGraphAttr` (`src/render/dot/attrs.ts:362,397`) print cluster and graph
      attributes through `agcanonEscape`, so long labels there never wrap at `Max_outputline`; no
      native ref covers it (part 11 T3).
  146. **[DONE — issue #135: json's label_subgs/insert/lookup ported, warning included]** json's `insert()` warns `Duplicate cluster name` (`gvrender_core_json.c:617`); the port's json
      has no such warning (part 11 T4).
  147. **[DONE — issue #136: json0 node pos/width/height via write-back's formatting]** json0 prints `.5`/`125.354` where native prints `0.5`/`125.35` (the `printNum` fallback for
      json0 nodes); pre-existing, `compareJson` passes (part 11 T4).
  148–150. **[DONE — part 11 T7b]** The three render causes behind 137: (A) stored draw strings,
      (B) `Spline.bb` and `edge_in_box`, (C) `inf`/`nan` text and the page clip (part 11 T7).
  151. **[DONE — issue #137: comments name the live readers; aux label re-place removed]** Comments still name the removed `routeDotEdges` backstop or `edge-order.ts`:
      `splines-flat-labeled.ts:153`, `splines-flat.ts:377`, `svg.ts:119`, `edgeInfo.ts:177`,
      `bsd-qsort.ts:11` (part 11 T8).
  152. **[DONE — issue #138: all 24 registered resets audited in `docs/process-statics.md`; `Cmark` is the only one compared with stale records]** Other process statics that `ctx.layout` resets per layout (AD-4) may meet stale records on a
      no-free relayout, as decompose's `Cmark` did; only `Cmark` was audited (part 11 T8).
  153. **[DONE — issue #139: writeHdr/isAnonymous read the anonymous flag; parser anon id and createGraph default fixed]** The port prints `digraph {` for an input named `digraph "" {` (`1896`); pre-existing (part 11 T3).
  154. **[DONE — issue #140: no defect as written; json prints stored draw strings through emitAttrs's base and the xdot overlay; pinned by json-stored-draws.test.ts. Left open in #196 (needs-ruling): a labelled cluster's or root's `_ldraw_` that xdot_end_cluster/xdot_end_graph clear and the port keeps]** `-Tjson` prints only this render's draw strings (`drawStringsByObject`); C prints the stored
      `_draw_` of an object this render does not draw, as T7b made `-Tdot`/`-Txdot` do (part 11 T7b).
  155. **[DONE — issue #141: `init_job_pad` ported; each renderer states `defaultPad` (svg and map 4; dot, xdot, plain, json 0), `render` resolves `job.pad` from `pad=` or that, `deviceClip` uses `job.pad` and `nodeInBox` reads `job.clip`. A native case exists: corpus 2825 with `margin=1` on its clusters leaves node G 2 pt above the `0,0,0,0` bb, drawn in svg and cmapx and not in xdot or json (`plans/issue-141-nodeinbox-pad/harness`, `node-in-box-pad.test.ts`). Left open: #198 (plain's `graph` scale ignores `pad=`)]** `nodeInBox` applies the svg pad 4 on xdot renders (`emit-gates.ts:49`); C's xdot pad is 0. No
      case found needs it (part 11 T7b).
  156. fdp root-mode render 3 of `subg-fdp.cluster_k` has a cluster `bb` x0 of 1.6e-11 where native has
      -3.3e-11: fdp force drift (A1 class), in `src/layout/fdp` (part 11 T7, T7b).
  157. **[DONE — issue #143: the clause names the ±0.5 tolerance as the difference, and the scope note's "no per-id triage yet" (`:91`) now reads "per-id attribution"; 23 locales re-translated and re-hashed, and given the pass-% clause on nondeterministic inputs that part 11 T11 added to the English only. Left open: #200 (fi's word for per-id, an sv typo)]** `docs/known-divergences.md`'s A1 intro says neato/fdp/sfdp are "not yet triaged per-id", which
      the paragraph after it contradicts; no figure is wrong (part 11 T11).
  158. **[DONE — issue #144: the port's xdot `parseReal` took only decimal digits, so the frame `p 4 inf inf inf nan ...` failed to parse and json dropped it; it now scans what C's `strtod` accepts (`src/xdot/strtod.ts`), json prints a non-finite number as `%.03f` does (`inf`, `-inf`, `nan`), and `compare-json` reads those tokens and compares non-finite values exactly. The three osage json rows are conformant and their `[parse]/oracle` acceptances retired. Left open: #201 (`compare-xdot.ts` and `compare.ts` let a NaN delta pass), #202 (`parseString` skips only whitespace before the `-`)]** On osage `1221`, `1332` and `2721`, native's json `_draw_` for a cluster with an infinite `bb`
      holds a `p` op with `inf`/`nan` points; the port's json omits that op (the `bb` text equals
      native). Pre-existing at the T0 bundle (part 11 T12 bytediff).
  159. Node, edge-endpoint and graph names print through `xdotId` (`src/render/dot/xdot-ops.ts:318`,
      from `agwrite.ts:158,162,302,339-341`), not `_agstrcanon`, so a name over `Max_outputline` never
      wraps where C's `write_nodename`/`write_hdr` → `write_canonstr` does. With 145 (which the T12
      bytediff also shows on patchwork's echoed `rects` and edge `pos`), these are the 22 xdot diffs
      equal to native only modulo wrapping. Pre-existing at the T0 bundle (part 11 T12 bytediff).

## Local leftovers (not committed, safe to delete)

- `test/corpus/parity-baseline.json`, `test/corpus/parity-probe.json`: survey
  scratch from T2/T12.
- `feature/graphviz-16.1-sync` local branch: the only copy of the pre-rebase
  SHAs (mapping in the PR #86 journal's post-merge row).
- Old agent worktrees under `.claude/worktrees/` (t2-parser, t3-flat-et,
  t4-ortho-loop, t5-findmaxdev, t6-flat-adj, t7-solve3): from earlier
  missions, not this one. Check that each is merged before removing it.
- This file is committed (since the part-2 brief's `docs(mission)` commit).
