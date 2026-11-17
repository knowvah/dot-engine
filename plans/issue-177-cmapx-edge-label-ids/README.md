# Mission: issue #177: suffix edge-label area ids in cmapx

## Objective

On corpus `graphs-url` (`tests/graphs/url.gv`), native `-Tcmapx` prints the
edge-label areas as `id="edge3-headlabel"`, `edge4-taillabel`, `edge5-label`;
the port prints `edge3`, `edge4`, `edge5`. The svg of the same input already
equals native. Make the map renderer's edge-label area ids carry the suffix,
as native's do, for every engine.

**Mechanism (traced at planning, base `a7cd496e`, graphviz 16.1.1).** C's
`emit_edge_label` (`lib/common/emit.c:2851-2898`) receives the edge's
`obj->id` and the label kind, and builds `<id>-label` (center label and
xlabel, both `EMIT_ELABEL`), `<id>-headlabel` or `<id>-taillabel`
(`emit.c:2862-2877`); a NULL id stays NULL. `emit_end_edge` calls it for the
four slots (`emit.c:2979-2992`), and `map_begin_anchor`
(`plugin/core/gvrender_core_map.c:194-201`) prints that id on the label's
`<area>`. The port's svg path already builds the suffixed id
(`src/gvc/edge-labels.ts:46-51`); the map renderer's
`MapRendererBase.emitEdgeLabel` (`src/render/map.ts:749-754`) passes the bare
`obj.id` to `anchorOf`. The issue's "suspected mechanism" is confirmed by the
prototype below.

**Evidence ([harness/](harness/)).** Nine probes under dot, neato and fdp in
`cmapx`, `cmapx_np` and `svg` (81 rows; native stdout in
`harness/native/<probe>.gv.<engine>.<fmt>`). A scratch prototype (suffix
passed from `emitEdge` to `emitEdgeLabel`; reverted) gave, against native:

| Probe | What it covers | cmapx/cmapx_np on the prototype |
|---|---|---|
| `repro` | label, headlabel, taillabel with their own URL | byte-equal (all engines) |
| `graphs-url` | the issue's corpus input | byte-equal |
| `xlabel` | `xlabel` with `labelURL`: `-label`, twice on one edge | byte-equal |
| `tooltip` | explicit `labeltooltip`/`headtooltip`/`tailtooltip`, no URL | byte-equal |
| `ownid` | edge `id="E1"`: `E1-label`, polygon `E1` | byte-equal |
| `rootid` | root `id="R"`: `R_edge1-label` (with #176) | byte-equal |
| `edgeurl` | edge URL plus per-label URLs | byte-equal |
| `decorate` | `decorate=true` label | byte-equal |
| `nolabel` | URL with no label; label with no URL | unchanged, byte-equal on both |

Every svg row is unchanged (3 lines from native on base and prototype: the
header lines the port wraps). #176's `elabel` probe, the 6 rows of #251
part 2, goes to byte-equal native; its `clust` probe (#242) is unchanged.
Planning survey (41 corpus inputs with an anchor attribute, dot, cmapx and
cmapx_np): `native` 2 (`graphs/url.gv`), `unchanged` 78, `timeout` 2
(`2621.dot`, native cap) ([harness/prototype-survey.tsv](harness/prototype-survey.tsv)).

Done means: all nine probes' `cmapx` and `cmapx_np` rows byte-equal to native
under dot, neato and fdp; no svg row changes; the #176 `elabel` probe
byte-equal to native. Type `fix`, a patch release.

**Out of scope:** cluster `id` inheritance (#242, the `clust` half of #251);
`imap`/`imap_np` (C prints no ids there); the svg path
(`src/gvc/edge-labels.ts`, already native); closing or relabelling #251 (the
maintainer rules on it; T1 only comments).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline a7cd496e..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `a7cd496eade46759fffe68791a965e5f5c2f535d` (the tip at
  planning). If the tip has moved, use the tip at execution start as the base
  and journal it.
- Per-task commits while working: first `docs(mission): add issue-177 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-177/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(map): suffix edge label area ids as emit_edge_label does

  <two to four lines: C's emit_edge_label appends -label, -headlabel or
  -taillabel to the edge's id for each label anchor; the port's svg path
  did, the map renderer passed the bare id>

  Refs: #177
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
| 5 | Smoke bytediff | see [T1](batch-1/T1-suffix.md#bytediff) | every changed output equals native (queue rules) |
| 6 | Targeted survey | see [T1](batch-1/T1-suffix.md#targeted-survey) | see T1 |

Oracle (ADR-0002, the newest accepted ADR): `~/git/graphviz-16.1.1/build/cmd/dot/dot`
with `GVBINDIR=/tmp/ghl1611` (dot) or `/tmp/ghl1611-all` (other engines), as
`test/corpus/oracle-paths.mjs` says; `harness/rowcheck.mjs` imports it. Run
`oraclePreflight(ORACLE_DOT_BIN, <gvbindir>, <engine>)`
(`test/corpus/oracle-env.ts`) for `dot` and for `neato` before trusting
native output; both passed at planning. A missing `config8` is fixed with
`GVBINDIR=<dir> <dot> -c`. The issue has no `upstream-16.1.1` label. Check
`uptime` before gates 5 and 6; above 12, wait.

Baseline at planning: see [decision-journal.md](decision-journal.md) row 0.

## Stop conditions

1. A file outside [T1's write-set](batch-1/T1-suffix.md#write-set) must
   change. Journal why and stop.
2. `src/render/map.ts` (805 lines at base) would end longer than at base. The
   complexity hook blocks growth of a file over 500 lines (AD-2). Keep it at
   most 805 by inlining or shortening a comment in the touched functions
   without dropping a `@see`; if that is not enough, stop: a split is a
   refactor this mission does not own.
3. A corpus row (gate 5 or 6) that was byte-equal to native on the base
   differs on the head, or a changed corpus line does not equal native's
   line. Write the diagnosis artifact and stop.
4. After the fix, a probe row that Done names as byte-equal still differs.
   Diagnose it to a mechanism, then stop.
5. The same gate check fails twice in a row after fix attempts. Diagnose it to
   a stated mechanism, journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong,
   for example an svg row or an `imap` output changing.

## Push-forward (decide alone, journal it)

- Test names, comment wording, how the id expression is laid out, within the
  write-set and the line limit.
- More probes in `harness/extra/` for a path the nine do not reach (an HTML
  label on an edge with `labelURL`, `-Tcmapx` under circo/twopi/osage,
  `headhref`/`tailhref` spellings).
- A row that differs for a reason older than this change (base and head differ
  from native in the same lines): note it and link or open a `follow-up`
  issue (queue rules).

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback, auto-confirmed notes |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-suffix.md](batch-1/T1-suffix.md) | red tests, fix, gates, close-out, squash |
| [harness/probes/](harness/probes/) | the nine inputs |
| [harness/native/](harness/native/) | native 16.1.1 stdout per probe, engine and format |
| [harness/rowcheck.mjs](harness/rowcheck.mjs) | native, base and head per input, engine and format, with the queue verdict (#176's tool) |
| [harness/prototype-probes.tsv](harness/prototype-probes.tsv) | planning-time verdicts, probes |
| [harness/survey-anchor.txt](harness/survey-anchor.txt), [harness/prototype-survey.tsv](harness/prototype-survey.tsv) | gate-6 selection and its planning-time verdicts |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where an edge-label area id is built |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  files, gates.
- Write `.agent-notes/issue-177.md` only for something novel. Otherwise, say in
  the journal row that nothing was novel.
- The final message ends with the driver's status line.

## Summary (2026-11-17)

- **Tasks:** 1 of 1 (T1). Base `a7cd496e`; per-task history under tag
  `issue-177/pre-squash`.
- **Change:** `EdgeLabelAnchor.suffix` in `src/render/map.ts` (804 lines, 805
  on the base); `emitEdgeLabel` passes `<obj.id>-<suffix>`. New
  `src/render/map-edge-label-id.test.ts`; `elabel` is a byte-equal probe in
  `src/render/map-id-prefix.test.ts`.
- **Done criteria:** all nine probes byte-equal to native in `cmapx` and
  `cmapx_np` under dot, neato and fdp (48 rows `native`, `nolabel` unchanged
  and equal); all 27 svg rows unchanged; #176's `elabel` probe byte-equal.
- **Gates:** 1 typecheck exit 0; 2 `npm test` 594 files, 14098 tests; 3
  goldens 5/5; 4 corpus and docs 25 files, 2863 tests; 5 smoke bytediff 1960
  jobs, 7 changed, 6 byte-equal to native and 1 accepted-row change
  (`graphs-url`/sfdp/cmapx, journal row 10); 6 survey `native` 2,
  `unchanged` 78, `timeout` 2.
- **Decisions:** 15 journal rows; none flagged for review. The brief's four
  ADs held.
- **Follow-up:** #252 (an HTML edge label's cell anchors are missing from the
  map output; older than this change). #251 has a comment; the maintainer
  rules on it.
