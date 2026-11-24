# Mission: issue #190: a no-free relayout makes the node label again

## Objective

On a layout with no `freeLayout` before it, the port keeps each node's label
from the previous layout. C's `common_init_node` makes `ND_label` on every
layout (`lib/common/utils.c:400-401`). The cause is `buildNodeLabel`'s early
return (`src/common/poly-init.ts:94`). The guard was written for the
render-time `polyInit` call (`src/gvc/device.ts:508`), but `initNodeFromLabel`
(`src/common/nodeinit.ts:261`) calls it at layout time too. The full diagnosis
is in [decisions.md](decisions.md#mechanism-planning-s-diagnosis).

Planning reproduced it against the carried oracle with a one-process native
harness ([harness/relabel.c](harness/relabel.c)) and tried the fix
([harness/prototype.diff](harness/prototype.diff)):

- **Relabel** (`digraph { a [label="short"]; a -> b }`, set `a`'s label,
  relayout): stdout now equals native on all 8 engines. On the base all 8
  differ, and so do patchwork's record variant and all 8 xlabel variants.
- **HTML warnings** (fixedsize cell too small, missing `<IMG>`): three no-free
  layouts warn 3 times, as native does. The base warns once.
- **46-case matrix:** base 18/46 identical, prototype 41/46
  ([harness/survey.md](harness/survey.md)). The 5 left are stderr only and
  out of scope: fdp's `non-comparable clusters` error line (#256) and the
  accepted N-class `nonascii` repeat (AD-3).
- **Single layouts cannot change:** the marker over 40 corpus ids on 8 engines
  saw 0 remakes. `npm test` passes unchanged on the prototype.

Done means: `makeNodeLabel` (new, unguarded) is called on every layout, and
`buildNodeLabel` keeps its guard for the render path only (AD-1). The new
`src/gvc/rerender-relabel.test.ts` pins relabel and warning counts against
carried-oracle fixtures (AD-2). The two `docs/process-statics.md` rows that
cite #190 are updated (AD-3). Smoke and reach bytediffs show 0 diffs. Type
`fix`.

**Out of scope:** #279 (xlabel cleared before a relayout, filed at planning),
#256, #193 (AD-4).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md) and
   [batch-1/T1-relabel.md](batch-1/T1-relabel.md). Check finished work with
   `git log --oneline 67f46a36..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `67f46a360d54336e8a250ed316dfd8508728be30` (the tip at
  planning). If the tip has moved, use the tip at execution start as the
  base, re-run the matrix on it before the change (T1 step 1), and journal it.
- Per-task commits while working: first `docs(mission): add issue-190 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-190/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(common): make the node label again on every layout

  <two to four lines: buildNodeLabel's guard, meant for the render-time
  polyInit call, also skipped common_init_node's make_label, so a no-free
  relayout kept the stale label and its warnings printed once; layout now
  always makes it, as utils.c does>

  Refs: #190
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never push,
  rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; the new test's 3 cases pass |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | [T1 step 9](batch-1/T1-relabel.md#steps) | 0 diffs, 0 capped |
| 6 | Targeted survey | [T1 steps 6, 7, 10](batch-1/T1-relabel.md#steps) | matrix = planning prototype (41/46, the 5 named rows); marker 0 remakes; reach 0 diffs |

Oracle: the carried build (ADR-0003, the newest accepted ADR), from
`test/corpus/oracle-paths.mjs`: `~/git/sseely/graphviz-carried/build/cmd/dot/dot`
with `GVBINDIR=/tmp/ghl1611-carried` (dot) or `/tmp/ghl1611-carried-all`
(others). [harness/build.sh](harness/build.sh) links `relabel-native` against
that build's libraries. Run `npx tsx plans/issue-190-node-relabel/harness/preflight.ts`
before trusting native output. A missing `config8` is fixed with
`GVBINDIR=<dir> <dot> -c` or `test/corpus/build-carried-oracle.sh`. The issue
has no `upstream-16.1.1` label. Check `uptime` before gates 5 and 6, and the
matrix; above 12, wait.

Baseline at planning: typecheck and `npm test` green on `67f46a36`
([decision-journal.md](decision-journal.md) row 0).

## Stop conditions

1. A non-test file outside [T1's write-set](batch-1/T1-relabel.md#write-set)
   must change. Journal why and stop.
2. The marker (T1 step 7) prints `ISSUE190_REMAKE` on a single-layout run.
   AD-1's premise is then false. Journal the input, comment it on #190, and stop.
3. The matrix (T1 step 6) differs from the planning prototype's in any row, or
   gate 5 or the reach bytediff shows a diff or a job capped twice. Diagnose it
   and stop.
4. The recaptured fixtures (T1 step 2) differ from `harness/native/`. The
   oracle has moved: journal it and stop.
5. The same gate check fails twice in a row after fix attempts. Diagnose it
   to a stated mechanism, journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong,
   or a criterion looks as if it needs #279, #256 or #193 fixed (a brief error).

## Push-forward (decide alone, journal it)

- Comment wording, provided every `@see` and C reference stays.
- Test names, and whether the three cases share a `describe`.
- Where the orphan `poly_init` doc block goes (T1 step 4), within `poly-init.ts`.
- More probes in `harness/probes/` and lines in `harness/cases.txt` for a path
  the matrix does not reach. Run them on base and head. A new non-identical
  row on the head that is also non-identical on the base, with the same
  diff, is pre-existing: file a `follow-up` issue. Any other new row is stop 3.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | mechanism, AD-1..AD-4, baseline, rollback, auto-confirmed table |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-relabel.md](batch-1/T1-relabel.md) | fixtures, test, fix, docs, matrix, marker, gates, squash |
| [harness/survey.md](harness/survey.md) | what can change, reach selection, planning results |
| [harness/relabel.c](harness/relabel.c), [harness/build.sh](harness/build.sh) | native one-process harness and its build |
| [harness/probe.ts](harness/probe.ts) | port probe, same protocol |
| [harness/cases.txt](harness/cases.txt), [harness/native-compare.sh](harness/native-compare.sh) | the 46-case matrix and its runner |
| [harness/recapture.sh](harness/recapture.sh) | writes the test fixtures from the carried oracle |
| [harness/marker.patch](harness/marker.patch), [harness/marker-run.sh](harness/marker-run.sh), [harness/reach-ids.txt](harness/reach-ids.txt) | single-layout remake marker, runner, 40 ids |
| [harness/probes/](harness/probes/), [harness/native/](harness/native/) | probe inputs; native renders and stderr |
| [harness/results/](harness/results/) | planning TSVs (matrix base and prototype, marker) |
| [harness/prototype.diff](harness/prototype.diff) | the prototype, reverted |
| [harness/preflight.ts](harness/preflight.ts) | oracle preflight |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where the label is made, base and head |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  origin, fix, files, gates, matrix counts, accepted-row and toward-native
  changes (expected: none in single-layout output; the no-free matrix moves
  toward native).
- Write `.agent-notes/issue-190.md` (novel): `relabel.c` is the one-process
  native harness that can set an attribute between layouts (`twice.c` cannot),
  and fdp prints the `non-comparable clusters` error on every no-free relayout
  natively (#256). Update the `.agent-notes/issue-138.md` observation "a node
  label is not made again on a no-free relayout" to say #190 fixed it, and that
  node labels are now usable for label-time warning probes.
- The final message ends with the driver's status line.

## Summary (execution, 2026-11-21)

- **Tasks:** 1 of 1 (T1).
- **Decisions:** journal rows 4-15; for review: row 10 (the reach list holds 4 quarantined ids),
  rows 13-14 (gate 6's command could not run as written; one heap-limit cap on `2782.dot`, no
  diff), and planning's row 3 (AD-3).
- **Gates:** typecheck 0; `npm test` 609 files / 15196; goldens 5/5; corpus + docs 2887; smoke
  bytediff 1960/1960 identical, 0 capped; matrix 41/46, equal to planning's prototype; marker 0
  remakes; reach bytediff 640 jobs, 639 identical, 0 diffs, 1 capped.
- **Known issues:** none new. #279, #256 and #193 stay open and out of scope.
