# Mission: issue #178: no stray graph area from an HTML graph label

## Objective

Take the graph below, whose only anchors are the cells of an HTML table root
label:

```
digraph G { label=<<table><tr><td href="http://cell" id="cellid">L</td><td title="t">M</td><td href="http://c2">N</td></tr></table>>; a -> b }
```

Native `-Tcmapx` prints 3 areas. The port prints those 3 plus
`<area shape="rect" id="graph0" title="&lt;TABLE&gt;" ... coords=<last cell>/>`,
under dot, neato and fdp alike. Make the port print what native prints.

**Mechanism (traced at planning, base `e865cfb1`, graphviz 16.1.1).** C's
`emit_html_label` (`lib/common/htmltable.c:724-768`) wraps the whole label in
`allocObj`/`freeObj` (`:665-703`, called at `:728` and `:767`). That is a
temporary obj state pushed over the label's owner. Each anchored cell's
`initAnchor` runs `emit_map_rect` (`:399`), which writes `url_map_p` on that
temporary obj, and the pop throws it away. The root obj's `url_map_p` is set
only in `emit_page` when the root has a URL or an explicit tooltip
(`emit.c:3570-3591`). `map_end_page` (`plugin/core/gvrender_core_map.c:173-192`)
prints whatever the root holds, so here it prints nothing. The port's
`emitHtmlLabel` (`src/common/htmltable-emit.ts:286`) pushes no obj.
`initHtmlAnchor` → `MapRendererBase.emitMapRect` (`src/render/map.ts:694`)
therefore stores the cell rect in the root obj's `urlMapPts`, and `endGraph`
(`map.ts:664-674`, `writeCmapxGraphShape`) prints it with the root's id and
its default tooltip, the label text. The issue's suspected mechanism (the
graph-shape write firing on points left by the last cell) is confirmed. Its
origin is the missing `allocObj`, not `map.ts`. The port already worked
around the same leak for nodes, with a save and restore in `polyGencode`
(`src/common/poly-gencode.ts:536-557`).

**Evidence ([harness/](harness/)).** 10 probes under dot, neato and fdp in
`cmapx`, `cmapx_np`, `imap`, `imap_np`, `svg` and `xdot` give 180 rows.
Native stdout is in `harness/native/<probe>.gv.<engine>.<fmt>`. A scratch
prototype (AD-1 plus AD-2, then reverted; diff at `$TMPDIR/i178/proto.diff`)
gave these results against native:

| Probe | What it covers | cmapx/cmapx_np on the prototype |
|---|---|---|
| `repro` | the issue's input | byte-equal (was +1 line) |
| `tblhref` | table-level `href` plus a cell `href` | byte-equal (was +1) |
| `nested` | an anchored cell inside a nested table | byte-equal (was +1) |
| `paint` | root/cluster/edge HTML labels with colors (paint copy) | byte-equal (was +1); svg, xdot unchanged |
| `rooturl` | root `URL`: graph area still printed, page-box coords | unchanged, byte-equal |
| `roottip` | root `tooltip`: graph area with `title` | unchanged, byte-equal |
| `node` | node `URL` plus an anchored cell (AD-2) | unchanged, byte-equal |
| `edge` | edge HTML labels with cell `href` | unchanged, byte-equal |
| `text` | HTML text (non-table) labels | unchanged, byte-equal |
| `cluster` | cluster HTML labels, with and without `URL` | unchanged, 1 line off on both (#179's order) |

Tally: `native` 24, `unchanged` 156, none away. Every svg, xdot and imap row
is unchanged ([harness/prototype-probes.tsv](harness/prototype-probes.tsv)).
Planning survey (every corpus input with an HTML label, see
[T1](batch-1/T1-alloc-obj.md#targeted-survey)): set A (70 inputs, dot, svg/xdot/cmapx, 210 rows): `unchanged` 198, `timeout` 6 (`1864.dot`, `2475_1.dot`, native's 120 s cap), 6 port failures identical on base and prototype (`1494.dot` and `imagepath_test/base.gv`, ParseError; listed as `AWAY` only because the stack trace names the bundle). Set B (11 anchor inputs, dot/neato/fdp, cmapx_np/imap, 66 rows): `unchanged` 64, 2 identical port failures (`1879.dot` fdp, `splines=compound` RenderError). No corpus row changes: no corpus input has an anchored cell in a root HTML label on a root without URL or tooltip.

Done means:
- `repro`, `tblhref`, `nested` and `paint` are byte-equal to native in
  `cmapx` and `cmapx_np` under dot, neato and fdp.
- No other probe row changes.
- The survey verdicts equal the prototype's.

Type `fix`, a patch release.

**Out of scope:**
- #179: a cluster's area is written before its HTML label's cell areas. The
  `cluster` probe keeps that one line.
- #252: an HTML edge label's cell anchors are missing in some inputs.
- `map.ts` (AD-3).
- The `imap` path (an empty url prints nothing there).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, then [decisions.md](decisions.md), then
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline e865cfb1..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `e865cfb16152771801c54e1f804f7ba8478fe0b2` (the tip at
  planning). If the tip has moved, use the tip at execution start as the base
  and journal it.
- Per-task commits while working: first `docs(mission): add issue-178 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** run `git tag issue-178/pre-squash`, then
  `git reset --soft <base>`, then make one commit:

  ```
  fix(html): emit an html label in its own obj state as allocObj does

  <two to four lines: C's emit_html_label pushes a temporary obj
  (allocObj/freeObj), so cell map rects never reach the label's owner; the
  port wrote them into the root obj and -Tcmapx printed a stray graph area>

  Refs: #178
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
| 5 | Smoke bytediff | see [T1](batch-1/T1-alloc-obj.md#bytediff) | every changed output equals native (queue rules) |
| 6 | Targeted survey | see [T1](batch-1/T1-alloc-obj.md#targeted-survey) | see T1 |

The oracle comes from ADR-0002, the newest accepted ADR:
`~/git/graphviz-16.1.1/build/cmd/dot/dot` with `GVBINDIR=/tmp/ghl1611` for
dot or `/tmp/ghl1611-all` for the other engines, as
`test/corpus/oracle-paths.mjs` says. `harness/rowcheck.mjs` (copied from #177)
imports it. Before trusting native output, run
`oraclePreflight(ORACLE_DOT_BIN, <gvbindir>, <engine>)`
(`test/corpus/oracle-env.ts`) for `dot` and for `neato`; `$TMPDIR/i178/pf.ts`
does both, and both passed at planning. Fix a missing `config8` with
`GVBINDIR=<dir> <dot> -c`. The issue has no `upstream-16.1.1` label. Check
`uptime` before gates 5 and 6, and wait while it is above 12.

Baseline at planning: see [decision-journal.md](decision-journal.md), row 0.

## Stop conditions

1. A file outside [T1's write-set](batch-1/T1-alloc-obj.md#write-set) must
   change, for example `map.ts` or a caller of `emitHtmlLabel`. Journal why
   and stop.
2. `src/common/poly-gencode.ts` (559 lines at base) does not end shorter, or
   any touched file over 500 lines grows. The complexity hook blocks that.
3. A corpus row (gate 5 or 6) that was byte-equal to native on the base
   differs on the head, or a changed line does not equal native's line, or
   an svg or xdot output changes in a way native does not share. Write the
   diagnosis artifact and stop.
4. After the fix, a probe row that Done names as byte-equal still differs.
   Diagnose it to a mechanism, then stop.
5. The same gate check fails twice in a row after fix attempts. Diagnose it to
   a stated mechanism, journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong,
   for example AD-2's removal changing a node row, or a renderer reading an
   obj field that `allocObj` does not copy.

## Push-forward (decide alone, journal it)

- Test names, comment wording, and the layout of `allocObj`, within the
  write-set and the line limits.
- The `job.obj === null` choice in T1 step 2 (throw, or no push quoting the
  caller).
- More probes in `harness/extra/` for paths the 10 probes do not reach:
  circo, twopi or osage; an `<IMG>` cell; a `-Tjson` HTML label.
- A row that differs for a reason older than this change (base and head
  differ from native in the same lines): note it and link or open a
  `follow-up` issue (queue rules).

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback, auto-confirmed notes |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-alloc-obj.md](batch-1/T1-alloc-obj.md) | red tests, fix, gates, close-out, squash |
| [harness/probes/](harness/probes/) | the 10 inputs |
| [harness/native/](harness/native/) | native 16.1.1 stdout per probe, engine and format |
| [harness/rowcheck.mjs](harness/rowcheck.mjs) | native, base and head per input, engine and format, with the queue verdict |
| [harness/prototype-probes.tsv](harness/prototype-probes.tsv) | planning-time verdicts for the probes |
| [harness/survey-html.txt](harness/survey-html.txt), [harness/survey-html-anchor.txt](harness/survey-html-anchor.txt) | the gate-6 selection |
| [harness/prototype-survey.tsv](harness/prototype-survey.tsv), [harness/prototype-survey-anchor.tsv](harness/prototype-survey-anchor.tsv) | planning-time verdicts for the survey |
| [diagrams/data-flow.md](diagrams/data-flow.md) | how a cell's map rect flows after T1 |
| [diagrams/component-map.md](diagrams/component-map.md) | the modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): the
  mechanism, the files, the gates.
- Write `.agent-notes/issue-178.md` only for something novel. Otherwise say
  in the journal row that nothing was novel.
- End the final message with the driver's status line.

## Summary (2026-11-17, execution)

- **Tasks:** 1 of 1 (T1). Base `e865cfb1`, unchanged since planning.
- **Result:** `repro`, `tblhref`, `nested` and `paint` are byte-equal to
  native in `cmapx` and `cmapx_np` under dot, neato and fdp (24 rows), and
  under circo, twopi and osage in `cmapx` (12 extra rows). The other 156 probe
  rows are unchanged. No corpus row changes (smoke bytediff 1960/1960
  identical; survey verdicts equal the prototype's).
- **Decisions:** 13 journal rows. Two differ from the brief, for review:
  - Row 3: the `edge` probe is not byte-equal on the base (#252's missing
    cell areas), so the test checks it as a partial probe.
  - Row 4: with no enclosing obj (unit harnesses only), `emitHtmlLabel` emits
    without a push rather than throwing.
- **Gates:** 1 typecheck exit 0; 2 `npm test` 595 files, 14166 tests; 3
  goldens 5/5; 4 corpus + docs 25 files, 2863 tests; 5 smoke bytediff 0
  diffs; 6 survey 276 rows, none changed.
- **Follow-ups:** #253 (cell anchors do not inherit the owner's url, target
  and tooltip for nodes and clusters), found by `harness/extra/mixed.gv`.
  Still open and untouched: #179, #250, #252.
