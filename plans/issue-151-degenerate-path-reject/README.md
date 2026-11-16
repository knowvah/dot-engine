# Mission: issue #151: reject a path whose boxes are all degenerate

## Objective

Graphviz 16.1.1 (upstream `94719107c`, issues 2773, 2774, 2776, 2778) adds a
`boxn == 0` branch to `checkpath` (`~/git/graphviz-16.1.1/lib/common/routespl.c:648-652`).
When every box of a path is degenerate, native prints
`Error: in checkpath, all bounding boxes are below threshold` and `printpath`'s
lines, then fails the path, so the edge is lost. On the same inputs the port
throws `InternalError: Cannot read properties of undefined (reading 'll')`.

It throws before `checkPath` is reached. `adjustregularpath`
(`dotsplines.c:1988-2006`) widens boxes `fb-1..lb` without checking `nbox`.
`add_box` dropped every box, so `nbox` is 0 and C indexes past it, into the
array `dot_splines_` preallocates (`dotsplines.c:338`). The port's
`widenPathBoxes` (`src/layout/dot/edge-route-faithful.ts:289`) reads a JS array
of length 0. So the port needs two parts:

1. `widenPathBoxes` skips slots at or past `P.nbox`. These slots are dead in C:
   C writes them, and nothing reads them
   ([AD-1](decisions.md#ad-1-widenpathboxes-skips-slots-at-or-past-pnbox)).
2. `checkPath` gets the `bn === 0` branch, which calls `agerrorf` and a new
   `printPath`, a port of `routespl.c:763-775`
   ([AD-2](decisions.md#ad-2-checkpath-rejects-an-all-degenerate-path-with-printpath)).

Done means:

- `2773`, `2773_1`, `2774`, `2774_1`, `2776`, `2778` and `2780` render with no
  throw. Their svg, xdot, plain and cmapx output and their stderr equal native
  16.1.1's (measured on a scratch copy at planning).
- Unit tests pin the new `checkPath` branch, `printPath`'s text, and the
  end-to-end render of `2773_1`.
- Every gate is green. The smoke bytediff is identical on every job.

Type `fix`, a patch release.

**Out of scope:**

- `2776_1`: native fails the layout first with `Edge length … larger than
  maximum` (#162). With this change it stops throwing but stays unlike native
  ([AD-5](decisions.md#ad-5-2776_1-waits-on-162)).
- The two existing silent failure branches of `checkPath` (`box 0` / `box N`
  `has LL coord > UR coord`), which return without C's `agerrorf` and
  `printpath` ([AD-3](decisions.md#ad-3-the-other-two-checkpath-failures-are-a-follow-up)).
  Open them as a `follow-up` issue.
- JSON residue on these ids: `/name` `%1` (#185) and subgraph `nodes` order
  (#199).
- `docs/known-divergences.md` and `test/corpus/*`
  ([AD-4](decisions.md#ad-4-the-ledger-and-corpus-records-stay-as-they-are)).

## Evidence (measured at planning, base `c558762c`)

- **Native 16.1.1** on the 8 ids: every one exits 1 and still writes a complete
  SVG. The stderr is in [harness/native-stderr.txt](harness/native-stderr.txt).
- **Port base:** all 8 throw `Cannot read properties of undefined (reading 'll')`.
- **Scratch head** (both parts, applied to a `$TMPDIR` copy): on all 7 in-scope
  ids, stderr equals native line for line. The pathplan lines are the port's
  existing unprefixed `triangulation failed` and `source point not in any
  triangle`. Svg (header aside), xdot, plain and cmapx equal native. Json differs
  only by #185/#199.
- **Reach:** [harness/detector.sh](harness/detector.sh) prints each time the
  widening loop indexes at or past `P.nbox`. It found 0 hits on all 49 smoke ids,
  each exiting 0 ([harness/detector-smoke.txt](harness/detector-smoke.txt)), and
  1 hit on `2773` (the throw).
- **Base vs scratch head**
  ([harness/survey-ids.txt](harness/survey-ids.txt), dot, 5 formats): 50 jobs.
  The 10 jobs of the controls `1332` and `2723` are identical. The 40 jobs of the
  8 targets differ, as expected (THROW → output). None capped.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with this
   brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline c558762c..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, and never merge `main` into it.
- **Base sha:** `c558762c83c249188cdd2cfce36419248978fa21` (tip at planning). If the tip moved, use the tip at execution start as
  the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-151 brief` (this
  directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T1's last step):** `git tag issue-151/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(dot): reject a path whose boxes are all degenerate

  Graphviz 16.1.1 fails a path in checkpath when no box survives the
  degenerate-box filter, printing the path and losing the edge (upstream
  2773, 2774, 2776, 2778). The port never got there: adjustregularpath
  widens slots past nbox, which C writes into its preallocated array and
  never reads, while the port's array is empty and threw. Skip those
  dead slots, and port the new checkpath branch with printpath.

  Refs: #151
  ```

  Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR,
  or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; 13561 + new passed, 18 expected fail |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-degenerate-path-reject.md#bytediff) | identical on every job |
| 6 | Targeted survey | see [T1](batch-1/T1-degenerate-path-reject.md#targeted-survey) | the table in T1 |

The oracle is graphviz 16.1.1 (ADR-0002): `~/git/graphviz-16.1.1/build/cmd/dot/dot`,
with `/tmp/ghl1611` for dot. Run `oraclePreflight` (`test/corpus/oracle-env.ts`)
for `dot` before trusting native output. If `config8` is missing, run
`GVBINDIR=<dir> <dot> -c`. Check `uptime` before gate 6, and wait if the load is
above 12. (It was 54-75 at planning, from another run.)

The baseline was green at planning: see [decisions.md](decisions.md#baseline).

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
3. Gate 5 shows any changed output. At planning no smoke input indexed past
   `nbox`, and an all-degenerate path is not reachable from a smoke input. A
   change means an unexpected path: diagnose it, and halt per the queue rules
   unless it equals native.
4. In gate 6, one of the 7 in-scope ids differs from native in svg, xdot, plain,
   cmapx or stderr, beyond the svg header and bd-job's trailing newline. Json may
   differ only at `/name` (#185) and subgraph `nodes` order (#199). If either
   control (`1332`, `2723`) changes, that is a stop too.
5. An existing test fails because of the change.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong. One
   example: a C reader of `P->boxes` past `nbox` that the AD-1 audit missed.

## Push-forward (decide alone, journal it)

- The `printPath` helper's exact name, and whether its lines are built with one
  template each or with a small formatter.
- The new test file's name, and the test names and their order.
- The follow-up issue's wording (AD-3).

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-5, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-degenerate-path-reject.md](batch-1/T1-degenerate-path-reject.md) | the task |
| [harness/detector.sh](harness/detector.sh) | reach check: widening past `nbox` per id |
| [harness/native-stderr.txt](harness/native-stderr.txt) | native 16.1.1 stderr on the 8 ids |
| [harness/survey-ids.txt](harness/survey-ids.txt) | gate 6 ids |
| [diagrams/data-flow.md](diagrams/data-flow.md) | the failing path, before and after |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (the project journal): mechanism, files,
  gates.
- Write `.agent-notes/issue-151.md` only for something novel. Otherwise, say in
  the journal row that nothing was novel.
- Comment on #151 with the outcome: the 7 ids that now equal native, `2776_1`
  waiting on #162, and the AD-3 follow-up's number.
- The final message ends with the driver's status line.

## Mission summary (2026-11-16)

- **Tasks:** 1 of 1 (T1).
- **Decisions:** 3 push-forward (a `portText` helper for the two port lines; a
  `rejected(pp)` helper and the test names; the follow-up's wording). One
  diagnosis, of the comparison script and not the port: Python read the port's
  big json integers exactly and native's `.000` floats as doubles, and
  `syntax ambiguity` lines were dropped from one side only
  ([decision-journal.md](decision-journal.md)).
- **Gates:** 1 typecheck 0; 2 `npm test` 13564 passed, 18 expected fail;
  3 goldens 5/5; 4 corpus + docs 2863 passed; 5 smoke bytediff 1960 jobs,
  identical 1960; 6 targeted survey: base vs head 50 jobs, identical 10 (the
  controls), diffs 40 (the 8 targets, THROW → output); head vs native on the 7
  in-scope ids: svg/xdot/plain/cmapx 28 of 28 equal, stderr 35 of 35 equal,
  json differs only at `/name` (#185) and subgraph `nodes` order (#199).
- **Accepted-row and toward-native changes:** none in the smoke bytediff (no
  output changed).
- **For review:** `2776_1` changed from THROW to a full render that is not
  native's (AD-5); it waits on #162.
- **Stop conditions:** none triggered.
- **Follow-ups:** #227 (AD-3, `checkPath`'s two silent failures).
- **Per-task history:** tag `issue-151/pre-squash`.
