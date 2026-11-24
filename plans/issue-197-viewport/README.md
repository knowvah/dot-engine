# Mission: issue #197: port the `viewport` graph attribute

## Objective

C's `init_job_viewport` reads `viewport`, in the forms `W,H,Z,x,y` and
`W,H,Z,node` (the node quoted or bare), and sets the job's view, zoom and
focus (`lib/common/emit.c:3311-3386`). The page size and `job->clip` follow
from them, so objects outside the view are not drawn, and plain prints the
zoom. The port never reads `viewport`, and it derives view and focus from the
bb at five sites. Once the clip moves, a second gap shows: C gates all of
`emit_edge` on `edge_in_box` (`:3005`), while the port's walk tests only the
layer, so cmapx keeps out-of-view edges and their warnings still print. The
diagnosis, with what was ruled out, is in
[decisions.md](decisions.md#mechanism-plannings-diagnosis).

Planning reproduced both against the carried oracle and tried the fix
([harness/prototype.diff](harness/prototype.diff)):

- **Probe matrix.** dot, 34 probes × svg, xdot, json, cmapx and plain (stdout
  and stderr): base 66/170 equal native, prototype 170/170. Under neato, the
  three `rtest-*` probes, which port tests.txt's `viewport` cases: base 5/15,
  prototype 15/15. On 7 other engines, 8 probes: base 98/280, prototype
  280/280. No row moves away from native.
- **Gates on the prototype.** typecheck clean; `npm test` 615 files, 15604
  tests; `gates.sh` 5/5; corpus and docs 27 files, 2887 tests.
- **Bytediff.** Smoke 2352/2352 identical. The targeted survey is in
  [decision-journal.md](decision-journal.md) row 3.

Done means the issue's criterion: `viewport`'s parse, zoom and focus follow
`init_job_viewport`, and the repro (`harness/probes/focus-xy.gv`) equals
native in svg, xdot and json, and in cmapx and plain too. AD-1 to AD-3 do it;
AD-4's tests pin it. Type `fix`.

**Out of scope:** AD-5. That covers `margin=` × dpi in the SVG page, a
defect found at planning and not yet filed
([harness/follow-up-margin-dpi.md](harness/follow-up-margin-dpi.md)), plus
#198, pagination and events.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md) and
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md) and
   [batch-1/T1-viewport.md](batch-1/T1-viewport.md). Check finished work with
   `git log --oneline fa380cee..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree.
  Create no branch, and never merge `main` into it.
- **Base sha:** `fa380cee49eb9fda212752e65bb224b0ab515be1` (the tip at
  planning). If the tip has moved, use the tip at execution start as the
  base, re-run the probe matrix on it (T1 step 5), and journal it.
- Per-task commits while working: first `docs(mission): add issue-197 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** run `git tag issue-197/pre-squash`, then
  `git reset --soft <base>`, then make one commit:

  ```
  fix(render): port the viewport graph attribute

  <two to four lines: init_job_viewport's three sscanf forms set the view,
  zoom and focus that the page size, job->clip, svg dims, map coords and
  plain's scale read; the port derived them from the bb. emit_edge gates on
  edge_in_box in the walk, so the map renderer drops out-of-view edges>

  Refs: #197
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never push,
  rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; 615 files, 15604 tests |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0; 27 files, 2887 tests |
| 5 | Smoke bytediff | [T1 step 7](batch-1/T1-viewport.md#steps) | 2352/2352 identical (journal row 2) |
| 6 | Targeted survey | [T1 steps 5, 8](batch-1/T1-viewport.md#steps) | probe tallies as planning's; survey as journal row 3 |

Oracle: the carried build (ADR-0003, the newest accepted ADR), from
`test/corpus/oracle-paths.mjs`: `~/git/sseely/graphviz-carried/build/cmd/dot/dot`
with `GVBINDIR=/tmp/ghl1611-carried` (dot) and `/tmp/ghl1611-carried-all`
(the other engines). `harness/probe.ts` runs `oraclePreflight` for each
engine, and `harness/recapture.sh` regenerates a missing `config8`. Check
`uptime` before gate 5, gate 6 and each matrix, and wait if it is above 12.

Baseline at planning: [decision-journal.md](decision-journal.md) row 0.

## Stop conditions

1. A non-test file outside [T1's write-set](batch-1/T1-viewport.md#write-set)
   must change, or `device.ts` must grow past 508 lines or `map.ts` past 797.
   Journal why and stop.
2. On the base (T1 step 3), the new test's failures differ from AD-4's
   consequences. The test does not reach the defect: journal and stop.
3. A probe row (T1 step 5) differs from planning's prototype row, or gates 5
   and 6 show a diff or a one-sided cap planning did not see. Diagnose it and
   stop.
4. The recaptured fixtures (T1 step 2) differ from `harness/native/`. The
   oracle has moved: journal it and stop.
5. The same gate check fails twice in a row after fix attempts. Diagnose it
   to a stated mechanism, journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong,
   or a criterion looks as if it needs AD-5's items fixed (a brief error).

## Push-forward (decide alone, journal it)

- Comment wording, provided every `@see` and C reference stays.
- Helper names and layout inside `viewport.ts`, provided each stays within the
  hook's limits and the `sscanf` semantics of AD-2 hold (the unit cases pin
  them).
- More probes in `harness/probes/` for a path the matrix does not reach. Run
  them on base and head, and recapture their fixtures. Bump `PROBE_COUNT`.
  A new non-equal head row that is also non-equal on the base, with the same
  diff, predates this mission: file a `follow-up` issue (or record its text in
  `harness/`, as planning did) and leave it out of the test. Any other new
  non-equal row is stop 3.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | mechanism, AD-1..AD-5, baseline, rollback, auto-confirmed table |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-viewport.md](batch-1/T1-viewport.md) | fixtures, tests, fix, matrix, gates, squash |
| [harness/survey.md](harness/survey.md) | reach, probe and corpus selection |
| [harness/probe.ts](harness/probe.ts), [harness/probes/](harness/probes/) | the matrix and its inputs |
| [harness/recapture.sh](harness/recapture.sh), [harness/native/](harness/native/) | the test's native fixtures; planning's copies |
| [harness/survey-reach-ids.txt](harness/survey-reach-ids.txt), [harness/survey-reach-scan.tsv](harness/survey-reach-scan.tsv) | gate 6's ids and why each is there |
| [harness/results/](harness/results/) | planning TSVs and tallies; the test's failures on the base |
| [harness/prototype.diff](harness/prototype.diff) | the prototype with its tests, reverted |
| [harness/follow-up-margin-dpi.md](harness/follow-up-margin-dpi.md) | the unfiled follow-up (AD-5) |
| [diagrams/data-flow.md](diagrams/data-flow.md) | `viewport=` to the page and the emit gates |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): the
  mechanism, origin, fix, files, gates, matrix counts, accepted-row changes
  and toward-native changes (as journal rows 2 and 3 classify them).
- Write `.agent-notes/issue-197.md` with the novel findings:
  - `viewport`'s `sscanf` forms assign partially: `"W,H"` keeps the `size=`
    Z, and `"W,H,Z,x"` reads x as a node name.
  - The port kept `job.zoom` at 1 and Z in `job.scale`, so `JobViewport.zoom`
    is the real Z and `RenderJob.view` is C's view.
  - `edge_in_box` now gates in the walk; the `svg.ts` and `dot.ts` re-tests
    always pass, a cleanup candidate.
  - The 500-line write hook pins `device.ts` (508) and `map.ts` (797) at
    their base line counts.
  - The port has no neato `-n` mode, so tests.txt's `-n2` cases run as plain
    neato.
- On #197, comment with the matrix counts. The issue closes when the branch
  merges.
- The final message ends with the driver's status line.

## Summary (execution, 2026-11-23)

- **Tasks:** 1 of 1 (T1). Base `fa380cee` (the tip had not moved).
- **Decisions:** journal rows 5-17. For review: row 9 (a fix beyond the
  prototype: `init_job_pagination`'s page-size floor, found by added probes
  with a negative `viewport` W or H), row 11 (#307, `needs-ruling`: one
  exploratory `center=true` row changes and is not equal to native), row 16
  (`1652` and `2621` cap on both bundles, as at planning).
- **Gates:** typecheck 0; `npm test` 615 files, 15674 tests; `gates.sh` 5/5;
  corpus and docs 27 files, 2887 tests; smoke bytediff 2352/2352 identical;
  survey 995 jobs, 985 identical, 0 diffs, 10 capped on both bundles, plus 90/90
  on the added `margin=` ids.
- **Matrices:** dot 235/235 (47 probes, base 92); neato `rtest-*` 15/15
  (base 5); other engines 280/280 (base 98) and 280/280 on the added probes
  (base 94). No row moves away from native.
- **Write-set:** `src/common/emit-bb.ts` was added (exports `fmax`; row 10).
- **Follow-ups filed:** #306 (margin × dpi), #307 (`center`).
