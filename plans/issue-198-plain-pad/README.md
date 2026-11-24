# Mission: issue #198: plain's graph-line scale reads `pad=`

## Objective

C's `write_plain` prints `job->zoom`, which `init_job_viewport` fits from the
bb padded by `job->pad` (`pad=`, else plain's `default_pad` of 0). The port's
`writePlain` passes a literal zero pad, so with `pad=` and `size=` plain and
plain-ext print the wrong scale (`pad=1; size="1,1"`: native `0.28571`, port
`0.66667`). The diagnosis, with what was ruled out, is in
[decisions.md](decisions.md#mechanism-plannings-diagnosis).

Planning reproduced it against the carried oracle and tried the fix
([harness/prototype.diff](harness/prototype.diff)): probe matrix base
132/256 equal native, prototype 256/256; smoke bytediff 1960/1960 identical;
the one reachable corpus id, `1879` × dot, moves to native.

Done means the issue's criterion: plain's zoom uses `job.pad`, and the repro
equals native in plain and plain-ext. AD-1 does it; AD-2's test pins it. Type
`fix`.

**Out of scope:** everything outside plain's `graph` line.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md) and
   [decision-journal.md](decision-journal.md), then
   [batch-1/T1-plain-pad.md](batch-1/T1-plain-pad.md). Check finished work
   with `git log --oneline 25b341d3..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree.
  Create no branch, and never merge `main` into it.
- **Base sha:** `25b341d3d3ff87227fd78fc0c3ba53d34491bd56` (the tip at
  planning). If the tip has moved, the tip at execution start is the base:
  re-run the probe matrix on it (T1 step 5) and journal it.
- Per-task commits while working: first `docs(mission): add issue-198 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-198/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(render): fit plain's graph-line scale with the job pad

  <two or three lines: write_plain prints job->zoom, which init_job_viewport
  fits from the bb padded by job->pad (pad=, else the plain renderer's 0);
  writePlain passed a zero pad, so pad= with size= printed the wrong scale>

  Refs: #198
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never push,
  rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; 616 files, 15740 tests |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0; 27 files, 2887 tests |
| 5 | Smoke bytediff | [T1 step 6](batch-1/T1-plain-pad.md#steps) | 1960/1960 identical (journal row 2) |
| 6 | Targeted survey | [T1 steps 5, 7](batch-1/T1-plain-pad.md#steps) | probe rows as planning's; survey as journal row 3 |

Oracle: the carried build (ADR-0003, the newest accepted ADR), from
`test/corpus/oracle-paths.mjs`: `~/git/sseely/graphviz-carried/build/cmd/dot/dot`
with `GVBINDIR=/tmp/ghl1611-carried` (dot) and `/tmp/ghl1611-carried-all`
(the other engines). `harness/probe.ts` runs `oraclePreflight` per engine;
`harness/recapture.sh` regenerates a missing `config8`. Check `uptime` before
gates 5 and 6 and the matrix; wait if it is above 12.

## Stop conditions

1. A non-test file other than `src/render/map.ts` must change, or `map.ts`
   must grow past 797 lines. Journal why and stop.
2. On the base (T1 step 3), the test's failures differ from
   `harness/results/tests-on-base.txt`: journal and stop.
3. A probe row (T1 step 5) differs from planning's prototype row, or gates 5
   and 6 show a diff or a one-sided cap planning did not see. Diagnose it to a
   mechanism and stop.
4. The recaptured fixtures (T1 step 2) differ from `harness/native/`: the
   oracle has moved. Journal and stop.
5. The same gate check fails twice in a row after fix attempts. Diagnose it,
   journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Comment wording, provided every `@see` and C reference stays.
- More probes in `harness/probes/` for a path the matrix does not reach: run
  them on base and head, recapture their fixtures, bump `PROBE_COUNT`. A new
  head row not equal to native that is also unequal on the base with the
  same diff predates this mission: file a `follow-up` issue and leave it out
  of the test. Any other new non-equal row is stop 3.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | mechanism, AD-1, AD-2, rollback, auto-confirmed table |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-plain-pad.md](batch-1/T1-plain-pad.md) | fixtures, test, fix, matrix, gates, squash |
| [harness/survey.md](harness/survey.md) | reach, probe and corpus selection |
| [harness/probe.ts](harness/probe.ts), [harness/probes/](harness/probes/) | the matrix and its inputs |
| [harness/recapture.sh](harness/recapture.sh), [harness/native/](harness/native/) | the test's native fixtures |
| [harness/survey-ids.tsv](harness/survey-ids.tsv) | corpus ids with both `pad` and `size` |
| [harness/results/](harness/results/) | planning TSVs, tallies, smoke JSON; the test's failures on the base |
| [harness/prototype.diff](harness/prototype.diff) | the fix with its test, reverted |
| [diagrams/data-flow.md](diagrams/data-flow.md) | `pad=` to the graph line |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): the
  mechanism, origin, fix, files, gates, matrix counts, accepted-row changes
  (none expected) and toward-native changes (`1879` × dot, journal row 3).
- Write `.agent-notes/issue-198.md` only for a novel finding; otherwise say
  in the report that there was none.
- On #198, comment with the matrix counts. The issue closes when the branch
  merges.
- The final message ends with the driver's status line.

## Summary (execution, 2026-11-23)

- **Tasks:** 1 of 1 (T1). Base `25b341d3`, as planned; per-task history under
  the tag `issue-198/pre-squash`.
- **Decisions:** journal rows 4-11, none flagged for review. The fix and the
  test are `harness/prototype.diff` unchanged.
- **Gates:** typecheck exit 0; `npm test` 616 files, 15740 passed; `gates.sh`
  5/5; corpus + docs 27 files, 2887 passed; smoke bytediff 1960/1960
  identical; probe matrix base 132/256, head 256/256 equal native; survey as
  planning's (`1879` x dot x plain, plain-ext move to native; nothing else
  moves).
- **Accepted-row changes:** none. **Toward-native changes:** `1879` x dot x
  plain and plain-ext (1 differing line against native on base, 0 on head).
- **Known issues, follow-ups:** none.
