# Mission: issue #191: continue the HTML anchor count across renders on one layout

## Objective

C's `static int anchorId` (`lib/common/htmltable.c:initAnchor`) is never
reset in a process. The port resets its twin, `anchorSeq`, at every public
entry and every layout (the registered reset, AD-4/AD-8), and again at the
start of every `render` (`src/gvc/device.ts:507`). So two renders of one
layout on one context (`renderWithContext`, the port of `dot -Tcmapx -Tsvg`)
both start at `_0`, where native continues (`_0 _1`, then `_2 _3`).

The issue asks the maintainer to keep or drop that per-render reset.
Planning chose **drop** (AD-1): it is the C behaviour, the reset predates
and duplicates AD-4 for every public entry, and the evidence is complete:

- Native (carried 16.1.1) vs port over 2 probes x 10 scripts: base 0/20
  agree; prototype 16/20. The 4 left are across-layout scripts, which AD-8
  keeps ([harness/survey.md](harness/survey.md)).
- Smoke bytediff 1960/1960 and reach bytediff (9 ids) 360/360 identical,
  base vs prototype. `npm test` 15196 passed, no test edited.

Done means: the reset and its import are gone; a new test pins native's ids
for same-layout renders and the kept AD-8 restart; comments and the
`process-statics` row say so; gates pass. Type `fix`.

**Out of scope:** the across-layout restart (AD-8, verdict N), any other
process-statics row.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session; they win over this brief.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 70bd5faf..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree.
  Create no branch; never merge `main` into it.
- **Base sha:** `70bd5faf` (`git rev-parse 70bd5faf` for the full sha; the
  tip at planning). If the tip moved, use the tip at execution start and
  journal it.
- Per-task commits: first `docs(mission): add issue-191 brief` (this
  directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`.
- **Finish:** `git tag issue-191/pre-squash`, `git reset --soft <base>`, one
  commit:

  ```
  fix(gvc): continue the html anchor count across renders

  <two to four lines: C's anchorId is a process static never reset; the
  port also reset it per render, so a second render of one layout restarted
  ids at 0; the registered per-layout reset (AD-8) stays>

  Refs: #191
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never
  push, rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | [T1](batch-1/T1-anchor-count.md#bytediff) | 1960/1960 identical |
| 6 | Targeted survey | [T1](batch-1/T1-anchor-count.md#targeted-survey) | reach 360/360 identical; probes 16 equal, 4 diff (AD-8) |

Oracle: the carried build (ADR-0003), from `test/corpus/oracle-paths.mjs`:
`~/git/sseely/graphviz-carried/build/cmd/dot/dot`,
`GVBINDIR=/tmp/ghl1611-carried`. No `upstream-16.1.1` label. Native is
captured in `harness/native/`; rebuild the probe with `harness/build.sh`
only to re-check. Check `uptime` before gates 5-6; above 12, wait.

## Stop conditions

1. A non-test file outside [T1's write-set](batch-1/T1-anchor-count.md#write-set)
   must change. Journal why and stop.
2. Gate 5 or the reach bytediff shows any diff: a public entry changed,
   which AD-1's premise rules out. Diagnose and stop.
3. The probe run differs from `# equal 16, diff 4`, or the new test's
   expected ids disagree with `harness/native/`. Diagnose and stop.
4. The same gate check fails twice in a row after fix attempts. Diagnose to
   a mechanism, journal it, stop.
5. An architecture decision in [decisions.md](decisions.md) proves wrong.

## Push-forward (decide alone, journal it)

- Comment wording, provided every `@see` and C reference stays.
- Test names and helper layout in the new test file.
- More probes or scripts, run through `run-probes.sh` and the native probe.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-3, baseline, rollback, auto-confirmed notes |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-anchor-count.md](batch-1/T1-anchor-count.md) | test, change, docs, gates, squash |
| [harness/survey.md](harness/survey.md) | C static, port resets, native table, reach rule |
| [harness/twice.c](harness/twice.c), [harness/build.sh](harness/build.sh) | native probe and its build |
| [harness/probe.ts](harness/probe.ts), [harness/run-probes.sh](harness/run-probes.sh) | port twin and the port-vs-native runner |
| [harness/probes/](harness/probes/), [harness/native/](harness/native/) | 2 probes; native output per script |
| [harness/reach-ids.txt](harness/reach-ids.txt) | gate 6 corpus ids |
| [harness/prototype.diff](harness/prototype.diff) | the change, reverted |
| [harness/results/](harness/results/) | probes base/proto, bytediffs |
| [diagrams/data-flow.md](diagrams/data-flow.md), [diagrams/component-map.md](diagrams/component-map.md) | diagrams |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md`: mechanism, files, gates,
  accepted-row and toward-native changes (expected: none on the corpus).
- `.agent-notes/issue-191.md` (novel): native's json render consumes the
  anchor counter twice as one svg (it emits through xdot too), and xdot,
  plain, dot and imap consume it as svg does.
- The final message ends with the driver's status line.

## Summary (execution, 2026-11-21)

- **Tasks:** 1 of 1 (T1). Base `70bd5faf`; per-task history under tag
  `issue-191/pre-squash`.
- **Change:** `resetHtmlAnchorIds()` and its import are gone from
  `src/gvc/device.ts`; the registered reset stays. New
  `src/gvc/anchor-id-renders.test.ts` (7 tests; 5 red on the base). Comments
  in `htmltable-emit-rules.ts`, the `anchorSeq` row of
  `docs/process-statics.md`, and one cited line number in
  `test/architecture/module-globals.fitness.test.ts` (outside the write-set,
  journal row 4).
- **Gates:** typecheck exit 0; `npm test` 610 files, 15203 passed; goldens
  5/5; corpus + docs 27 files, 2887 passed; smoke bytediff 1960/1960
  identical; reach bytediff 360/360 identical; probes `# equal 16, diff 4`
  (the 4 are AD-8).
- **Decisions:** 10 journal rows (2-11); 3 flagged for review, all #280.
- **Needs a ruling (#280):** two probes added at execution, with HTML edge
  labels, give `# equal 6, diff 13` on the head against 0 of 19 on the base.
  Three of the 13 are AD-8. On the other 10 (`l,{cmapx,imap,plain,json0,json},svg`)
  the svg ids changed and are still short of native's by the edge label's
  cell anchors: the port emits an HTML edge label only in svg and xdot/dot
  (#252's origin). No corpus output changed.
- **Accepted-row changes:** none. **Toward-native changes:** none on the
  corpus; the 10 probe rows above move toward native but do not meet the
  per-line test (journal row 9).
- **Follow-ups:** #280; #252 (existing) carries the fix.
