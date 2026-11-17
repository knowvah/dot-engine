# Mission: issue #179: a cluster's map area after its label's areas

## Objective

Take the graph from the issue:

```
digraph G { URL="x"; label=<<table href="http://t"><tr><td href="http://cell">L</td></tr></table>>; subgraph cluster_k { URL="k"; c } a -> c }
```

Native `-Tcmapx` prints the cluster's own area (`clust1`) after its label's
cell and table areas (`clust1_2`, `clust1_3`). The port prints `clust1` first.
The coords match; only the order differs. `-Timap` and the `_np` variants
differ in the same way, under dot, fdp and osage. Make the port print what
native prints.

**Mechanism (traced at planning, base `9e48acd7`, graphviz 16.1.1).** The map
device carries `EMIT_CLUSTERS_LAST` (`plugin/core/gvrender_core_map.c:237`).
C's `emit_clusters` (`lib/common/emit.c:3721-3887`) computes
`doAnchor = obj->url || obj->explicit_tooltip` (`:3742`). Without the flag it
runs `emit_map_rect(job, GD_bb(sg))` and `gvrender_begin_anchor` before the box
(`:3743-3747`). With the flag it runs them after `emit_label` (`:3859-3868`).
`map_begin_anchor` writes the `<area>` from `url_map_p`, so the cluster's area
follows every area its label wrote. The port's `drawClusterInScheme`
(`src/gvc/device.ts:270-299`) calls `beginAnchorIf` before the box (`:287`) in
every mode. The map renderer's `beginCluster` (`src/render/map.ts:681-686`)
stands in for `emit_map_rect` (C's `map_begin_cluster` is `0`). So the area is
written first. The issue's suspected mechanism is confirmed. The origin is
`device.ts:287`; `map.ts`'s write order itself is right.

**Evidence ([harness/](harness/)).** There are 8 probes under dot, fdp and osage,
in `cmapx`, `cmapx_np`, `imap`, `imap_np`, `svg` and `xdot` (144 rows). Native
stdout is in `harness/native/<probe>.gv.<engine>.<fmt>`. A scratch prototype
(AD-1 plus AD-2, then reverted; diff at `$TMPDIR/i179/proto.diff`) gave:

| Probe | What it covers | Map formats on the prototype (exact `cmp`) |
|---|---|---|
| `repro` | the issue's input (the cluster inherits the root's HTML label) | byte-equal (was not) |
| `own` | the cluster's own HTML label, a table `href` and two cells | byte-equal (was not) |
| `nested` | nested anchored clusters, each with an anchored cell | byte-equal (was not) |
| `nodes` | an anchored cluster holding an anchored node and edge | byte-equal (was not) |
| `cluster178` | #178's `cluster` probe | byte-equal (was not) |
| `text` | anchored clusters with a text label and with none | unchanged, byte-equal |
| `nourl` | an unanchored cluster whose label has cell anchors | unchanged, byte-equal |
| `tooltip` | a cluster with only `tooltip=` | cmapx: order now native's, 1 line left (cell `title`, #253); imap unchanged, byte-equal |

Tally ([harness/prototype-probes.tsv](harness/prototype-probes.tsv)): `native`
60, `toward` 6, `unchanged` 78, none away. Every svg and xdot row is
unchanged; svg differs from native on the base only in the header (and in
`tooltip.gv`'s cell `title`, #253). The exact-equality table is
[harness/prototype-equal.tsv](harness/prototype-equal.tsv). #178's `cluster`
probe also becomes byte-equal under neato. Unit tests on the prototype
(`src/render src/gvc src/common`): 200 files, 4371 tests, all pass. For the
planning survey, see [decision-journal.md](decision-journal.md), row 1.

Done means:
- `repro`, `own`, `nested`, `nodes` and `cluster178` are byte-equal to native
  in `cmapx`, `cmapx_np`, `imap` and `imap_np` under dot, fdp and osage.
- `tooltip` cmapx/cmapx_np has native's area order.
- No other probe row changes.
- The survey passes as [T1](batch-1/T1-cluster-anchor.md#targeted-survey)
  says.

Type `fix`, a patch release.

**Out of scope:**
- #253: a cell does not inherit its cluster's or node's url, target or
  tooltip (the `tooltip` probe keeps that line).
- #252: an HTML edge label's cell anchors are missing in some inputs.
- The edge anchor's `EMIT_CLUSTERS_LAST` branch (`emit.c:2882-2893`). The map
  renderer writes edge areas at `endEdge`, and no probe shows a difference.
- `svg`/`xdot` output: they do not set `EMIT_CLUSTERS_LAST`.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, then [decisions.md](decisions.md), then
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 9e48acd7..`.
4. Read `.agent-notes/issue-178.md`. In `rowcheck.mjs`, only the verdict
   `native` means byte equality. `cmp` before calling an `unchanged` row equal.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `9e48acd712f1ef3c414c1f475c508c5ee0156ee8` (the tip at
  planning). If the tip has moved, use the tip at execution start as the base
  and journal it.
- Per-task commits while working: first `docs(mission): add issue-179 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** run `git tag issue-179/pre-squash`, then
  `git reset --soft <base>`, then make one commit:

  ```
  fix(map): write a cluster's area after its label as emit_clusters does

  <two to four lines: the map device sets EMIT_CLUSTERS_LAST, so C's
  emit_clusters runs emit_map_rect and begin_anchor for a cluster after its
  label; the port opened the anchor before the box, so cmapx and imap wrote
  the cluster's area before its HTML label's cell areas>

  Refs: #179
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
| 5 | Smoke bytediff | see [T1](batch-1/T1-cluster-anchor.md#bytediff) | every changed output equals native (queue rules) |
| 6 | Targeted survey | see [T1](batch-1/T1-cluster-anchor.md#targeted-survey) | see T1 |

The oracle comes from ADR-0002, the newest accepted ADR:
`~/git/graphviz-16.1.1/build/cmd/dot/dot` with `GVBINDIR=/tmp/ghl1611` for
dot or `/tmp/ghl1611-all` for the other engines, as
`test/corpus/oracle-paths.mjs` says. `harness/rowcheck.mjs` (copied from #178)
imports it. Before trusting native output, run
`oraclePreflight(ORACLE_DOT_BIN, <gvbindir>, <engine>)`
(`test/corpus/oracle-env.ts`) for `dot` and for `neato`. `$TMPDIR/i179/pf.ts`
does both, and both passed at planning. Fix a missing `config8` with
`GVBINDIR=<dir> <dot> -c`. The issue has no `upstream-16.1.1` label. Check
`uptime` before gates 5 and 6, and wait while it is above 12.

Baseline at planning: see [decision-journal.md](decision-journal.md), row 0.

## Stop conditions

1. A file outside [T1's write-set](batch-1/T1-cluster-anchor.md#write-set)
   must change, for example `anchor.ts`, `device-labels.ts` or
   `htmltable-emit.ts`. Journal why and stop.
2. `src/gvc/device.ts` ends longer than 510 lines, or `src/render/map.ts` does
   not end shorter than 804. The complexity hook blocks growth of a file over
   500 lines.
3. A corpus row (gate 5 or 6) that was byte-equal to native on the base
   differs on the head, or a changed line does not equal native's line, or
   an svg or xdot output changes. Write the diagnosis artifact and stop.
4. After the fix, a probe row that Done names as byte-equal still differs.
   Diagnose it to a mechanism, then stop.
5. The same gate check fails twice in a row after fix attempts. Diagnose it to
   a stated mechanism, journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.
   Examples: a renderer other than the map renderers implements
   `emitMapRect`; something reads a cluster's `urlMapPts` without an anchor;
   a set B survey row outside set A changes.

## Push-forward (decide alone, journal it)

- Test names, comment wording, and the shape of `beginClusterAnchor`, within
  the write-set and the line limits.
- More probes in `harness/extra/` for paths the 8 probes do not reach:
  neato, circo or twopi with clusters; `style=invis` or `peripheries=0` on
  an anchored cluster; a cluster `href` with `target`; layers.
- A row that differs for a reason older than this change (base and head
  differ from native in the same lines): note it, and link or open a
  `follow-up` issue (queue rules).

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback, auto-confirmed notes |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-cluster-anchor.md](batch-1/T1-cluster-anchor.md) | red tests, fix, gates, close-out, squash |
| [harness/probes/](harness/probes/) | the 8 inputs |
| [harness/native/](harness/native/) | native 16.1.1 stdout per probe, engine and format |
| [harness/rowcheck.mjs](harness/rowcheck.mjs) | native, base and head per input, engine and format, with the queue verdict |
| [harness/prototype-probes.tsv](harness/prototype-probes.tsv) | planning-time verdicts for the probes |
| [harness/prototype-equal.tsv](harness/prototype-equal.tsv) | planning-time exact equality with native, base and prototype |
| [harness/survey-cluster-anchor.txt](harness/survey-cluster-anchor.txt), [harness/survey-cluster.txt](harness/survey-cluster.txt) | the gate-6 selection (sets A and B) |
| [harness/prototype-survey-anchor.tsv](harness/prototype-survey-anchor.tsv) | planning-time verdicts for set A |
| [diagrams/data-flow.md](diagrams/data-flow.md) | the emit order of one anchored cluster after T1 |
| [diagrams/component-map.md](diagrams/component-map.md) | the modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): the
  mechanism, the files, the gates.
- Write `.agent-notes/issue-179.md` only for something novel. Otherwise say
  in the journal row that nothing was novel.
- End the final message with the driver's status line.

## Summary (2026-11-17, execution)

- **Tasks:** 1 of 1 (T1). Base `9e48acd7`; no stop condition hit.
- **Result:** `repro`, `own`, `nested`, `nodes` and `cluster178` are
  byte-equal to native in cmapx, cmapx_np, imap and imap_np under dot, fdp and
  osage (60 rows, none equal on the base), and under neato as well. `tooltip`
  cmapx/cmapx_np has native's order; its one remaining line is #253's. No
  other probe row, and no svg or xdot row, changed.
- **Decisions:** AD-1 to AD-4 held as planned. Journal rows 3 (six more test
  cases), 6-8 (extra probes; 20 `AWAY` verdicts explained: 14 are #253's
  lines, 6 are native fdp differing run to run), 9 (`PORT_TIMEOUT_MS` in
  `harness/rowcheck.mjs`, outside the planned write-set), 12 (`2621.dot`
  checked with `bytediff.ts`). For review: row 12's handling of `2621.dot`
  under dot (native timeouts, the port not run to the end).
- **Gates:** typecheck exit 0; `npm test` 596 files, 14268 tests; golden
  gates 5/5; corpus + docs 25 files, 2863 tests; smoke bytediff 1960 jobs,
  1960 identical; survey set A 75 rows equal to planning plus `2621.dot`
  (5 native timeouts, 10 identical), set B 282 `unchanged`, 3 `timeout`.
- **Follow-ups:** none new. #253 (cell inherits the owner's url, target,
  tooltip) owns the remaining lines of `tooltip`, `deep` and `target`.
- **Notes:** `.agent-notes/issue-179.md`.
