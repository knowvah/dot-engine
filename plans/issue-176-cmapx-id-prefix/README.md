# Mission: issue #176: prefix map area ids with the root graph's id

## Objective

With a root `id` (corpus `2258.dot`, `id = "G2"`), native `-Tcmapx` prints
`id="G2_node1"`, `G2_node2`, `G2_edge1`; the port prints `node1`, `node2`,
`edge1`. The svg of the same input already equals native. Make the port's
map area ids carry the prefix as native's do, for every engine.

**Mechanism (traced at planning, base `a0338483`, graphviz 16.1.1).** C's
`getObjId` (`lib/common/emit.c:203-244`) prefixes every non-root object id
that has no own `id` with `GD_drawing(root)->id` and `_`, for every renderer.
`graph_init` sets that field at layout start, substituted:
`GD_drawing(g)->id = strdup_and_subst_obj(p, g)` when `id` is non-empty
(`lib/common/input.c:786-788`). The port's `RenderJob.objId`
(`src/gvc/job.ts:322-326`) reads `job.drawingId`, and only `svgBeginGraph`
assigns it (`src/render/svg-graph.ts:342`), raw. Every id the map renderer
prints comes from the shared emit path in `src/gvc/device.ts` (`svgNodeId`,
`svgEdgeId`, `svgClusterId` into `obj.id` and the HTML-anchor base id), which
reads `job.drawingId`, so on cmapx it is `''` and no prefix is printed.

**Evidence ([harness/](harness/)).** Ten probes under dot, neato and fdp in
`cmapx`, `cmapx_np` and `svg` (90 rows; native stdout in
`harness/native/<probe>.<engine>.<fmt>`). A scratch prototype (set
`job.drawingId = substObjAnchor(id, g)` in `render()` for every renderer, drop
the svg-only line; reverted) gave, against native:

| Probe | What it covers | cmapx/cmapx_np on the prototype |
|---|---|---|
| `repro` | `2258.dot` | byte-equal (all engines) |
| `html` | HTML-table cell anchors `R_node1_0` | byte-equal |
| `ownid` | own `id` wins, unprefixed; `R_node2` | byte-equal |
| `glabel` | root URL and label, node area | byte-equal |
| `clust-late` | `id` declared after the cluster: `R_clust1` | byte-equal |
| `subst` | root `id="x\G"`: native `xG_node1` | byte-equal (svg: toward native) |
| `noid` | no root id | unchanged, byte-equal on both |
| `clust` | `id` before the cluster: native `id="R"` | cluster line `clust1` to `R_clust1`: **#242** |
| `elabel` | edge label areas: native `R_edge1-label` | label lines `edge1` to `R_edge1`: **#177** |
| `subst2` | node own `id="i\N"`: native `ia` | that line unchanged: **#249** |

`clust`: a subgraph opened after the root's `id` inherits it in cgraph, so C's
`getObjId` returns the cluster's own (inherited) `id`, `R`; the port does not
inherit root graph attributes into subgraphs (#242). `clust-late` proves the
prefix half is right. `elabel`'s remaining difference is the missing suffix
(#177). `subst2`'s is the unsubstituted own id (#249, filed at planning).
The svg rows change only on `subst`/`subst2`, each changed line equal to
native's.

Done means: `repro`, `html`, `ownid`, `glabel`, `clust-late` and `subst` cmapx
and cmapx_np rows byte-equal to native under dot, neato and fdp; `clust`,
`elabel` and `subst2` differ only in the #242/#177/#249 lines named above;
no svg row changes except `subst`/`subst2` toward native. Type `fix`, a
patch release.

**Out of scope:** cluster `id` inheritance (#242); edge-label id suffixes
(#177); substitution of an object's own `id` (#249); the layer and page
prefix of `layerPagePrefix` (svg layers are #180; the map device has neither
layers nor pages); moving the read to layout time (AD-1).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline a0338483..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `a0338483cb75e39ab2c5e7bfc5e676898e73fc5e` (the tip at
  planning). If the tip has moved, use the tip at execution start as the base
  and journal it.
- Per-task commits while working: first `docs(mission): add issue-176 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-176/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(render): prefix map area ids with the root graph's id

  <two to four lines: C's getObjId prefixes non-root ids with
  GD_drawing(root)->id, which graph_init sets (substituted) for every
  renderer; the port set job.drawingId only in the svg writer, raw>

  Refs: #176
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never push,
  rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-prefix.md#bytediff) | every changed output equals native (queue rules) |
| 6 | Targeted survey | see [T1](batch-1/T1-prefix.md#targeted-survey) | see T1 |

Oracle (ADR-0002, the newest accepted ADR): `~/git/graphviz-16.1.1/build/cmd/dot/dot`
with `GVBINDIR=/tmp/ghl1611` (dot) or `/tmp/ghl1611-all` (other engines), as
`test/corpus/oracle-paths.mjs` says; `harness/rowcheck.mjs` imports it. Run
`oraclePreflight` (`test/corpus/oracle-env.ts`) for `dot` and for `neato`
before trusting native output. `config8` was present in both dirs at planning;
a missing one is fixed with `GVBINDIR=<dir> <dot> -c`. The issue has no
`upstream-16.1.1` label. Check `uptime` before gates 5 and 6; above 12, wait.

Baseline at planning: typecheck and `npm test` green on `a0338483`
([decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside [T1's write-set](batch-1/T1-prefix.md#write-set) must
   change. Journal why and stop.
2. `src/gvc/device.ts` (510 lines at base) would end longer than at base. The
   complexity hook blocks growth of a file over 500 lines. Keep it at most 510
   by shortening comments inside `render()` without dropping a `@see`; if
   that is not enough, stop: a split is a refactor this mission does not own.
3. A corpus row (gate 5 or 6) that was byte-equal to native on the base
   differs on the head, or a changed corpus line does not equal native's
   line. Write the diagnosis artifact and stop. (The `clust`/`elabel` probe
   lines are planned, see AD-3; a corpus row of the same kind is not.)
4. After the fix, a probe row that Done names as byte-equal still differs.
   Diagnose it to a mechanism, then stop.
5. The same gate check fails twice in a row after fix attempts. Diagnose it to
   a stated mechanism, journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong,
   for example an svg row other than `subst`/`subst2` changing.

## Push-forward (decide alone, journal it)

- Helper and test names, comment wording, where in `render()` the assignment
  sits (before `renderGraph`), within the write-set and the line limits.
- More probes in `harness/extra/` for a path the ten do not reach (a record
  node with `URL`, an `xlabel` area, `-Tcmapx` under circo/twopi/osage).
- A row that differs for a reason older than this change (base and head differ
  from native in the same lines): note it and link or open a `follow-up`
  issue (queue rules).

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback, auto-confirmed notes |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-prefix.md](batch-1/T1-prefix.md) | red tests, fix, gates, squash |
| [harness/probes/](harness/probes/) | the ten inputs |
| [harness/native/](harness/native/) | native 16.1.1 stdout per probe, engine and format |
| [harness/rowcheck.mjs](harness/rowcheck.mjs) | native, base and head per input, engine and format, with the queue verdict |
| [harness/survey-rootid.txt](harness/survey-rootid.txt), [harness/survey-anchor.txt](harness/survey-anchor.txt) | gate-6 selections |
| [harness/planning-survey.md](harness/planning-survey.md) | planning-time prototype results |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where an area id is built |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  files, gates.
- Write `.agent-notes/issue-176.md` only for something novel. Otherwise, say in
  the journal row that nothing was novel.
- The final message ends with the driver's status line.

## Summary (2026-11-17)

- **Tasks:** 1 of 1 (T1) done.
- **Change:** `drawingIdOf(g)` (`src/render/svg-id.ts`) is C's
  `GD_drawing(root)->id`, substituted; `render()` (`src/gvc/device.ts`) assigns
  it to `job.drawingId` for every renderer; `svgBeginGraph` no longer does.
  New tests: `src/render/map-id-prefix.test.ts` (61 cases).
- **Decisions:** 14 journal rows. Flagged for review: rows 5 and 14, the 12
  probe rows AD-3 accepts (`clust` under #242, `elabel` under #177) change to
  lines that are not native's; filed as #251 (`needs-ruling`). No corpus row
  does.
- **Gates:** 1 typecheck exit 0; 2 `npm test` 593 files, 14035 tests; 3 golden
  gates 5/5; 4 corpus + docs 25 files, 2863 tests; 5 smoke bytediff 1960 of
  1960 identical; 6 survey: part 1 `native` 6, `unchanged` 81, `timeout` 3
  (equal to the prototype), part 2 `unchanged` 39, `native` 1, `timeout` 1
  (`2621.dot`, native cap, no `id` in the file).
- **Probes:** 90 rows equal to the prototype (`native` 36, `unchanged` 30,
  `toward` 12, `AWAY` 12). Extra probes (`harness/extra/`): record, xlabel,
  nested clusters, and circo, twopi, osage: no `AWAY`.
- **Open:** #251 (`needs-ruling`, the 12 probe rows above).
- **Follow-ups:** #250 (a record node with `URL` gets no anchor and no map
  area; older than this change). Still open and untouched: #242, #177, #249.
- **Result tables:** [harness/results/](harness/results/).

