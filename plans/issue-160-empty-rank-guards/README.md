# Mission: issue #160: guard empty ranks as graphviz 16.1.1 does

## Objective

Graphviz 16.1.1 (upstream #2759) guards five reads of a rank's leader
`GD_rank(g)[r].v[0]` against an empty rank: the self-loop `sizey` in
`dot_splines_` (`ca3353d80`, `1a77ac9df`), `dot_compute_bb` (`8e06a6261`),
`set_ycoords` (`9fca64d0f`) and `make_LR_constraints` (`d49e3a529`). The port
has 16.1.0's unguarded reads, so `2759` and `2759_1` throw `InternalError`
where native 16.1.1 renders them.

Done means:

- The five guards are ported in place, as C has them
  ([AD-1](decisions.md#ad-1-port-the-five-upstream-guards-in-place-as-c-has-them)),
  each with a red-first branch test, and `2759`/`2759_1` render `-Tplain`
  byte-equal to native in a new regression test
  ([AD-2](decisions.md#ad-2-tdd-at-the-function-level-one-corpus-regression-test))
  (T1).
- Gates green; the smoke bytediff is unchanged; the survey equals the planning
  table ([AD-3](decisions.md#ad-3-how-equals-native-is-judged)); the json
  follow-up is filed and #230 gets the json rows (T2).

Type `fix`, a patch release.

**Out of scope:** #159 (planned next; now `Blocked by #160`), #225, #185,
#199, the json cluster defect (filed, not fixed), `2761`/`2761_1`, and the
corpus records and ledger
([AD-4](decisions.md#ad-4-corpus-records-and-the-ledger-stay-as-they-are),
[AD-5](decisions.md#ad-5-scope)).

## Evidence (measured at planning, base `bd5ddf75`)

"cf" = the base plus [harness/counterfactual.patch](harness/counterfactual.patch)
(AD-1 alone). Native = 16.1.1 (`GVBINDIR=/tmp/ghl1611`, `config8` present).

- **Issue ids** ([harness/planning-survey.txt](harness/planning-survey.txt),
  5 formats): on the base both throw (`reading 'info'` of null at
  `setYcoordsInitial`). On the cf both equal native in svg (from
  `<g id="graph0"`), xdot, plain and cmapx. Json differs by 31 lines: #185's
  root name, plus the cluster's `_draw_` and `"bb"` missing, a json-writer
  defect from before this mission, reproduced on the base with
  `digraph{ a->b {subgraph cluster{ x }} }`
  ([harness/followup-json-cluster-bb.md](harness/followup-json-cluster-bb.md)).
- **Reach** ([harness/detector.sh](harness/detector.sh) +
  [detector.patch](harness/detector.patch), all 982 applicable ids, `-Tplain`,
  60 s cap): markers only on `2759` and `2759_1` (`P160LR0`, `P160SIZEY below`,
  `P160YC`); no id reaches the empty-min-rank bb guard or the empty-rank-above
  `sizey` guard. 17 ids did not finish (16 capped, `1864` exit 1; none a smoke
  id): [harness/detector-nonzero.txt](harness/detector-nonzero.txt).
- **Smoke reach:** none of the 49 smoke ids hits a marker, so gate 5 expects
  0 changed jobs.
- **Quarantined `2761`/`2761_1`:** the port throws at `setYcoordsCopy` on base
  and cf alike. C leaves that copy loop unguarded, and native 16.1.1 crashes
  there too.
- **Why #160 before #159:** with #159's 16.1.1 `ND_other` scan added to a
  scratch build, `digraph G { a -> a [label="loop"]; a -> b; subgraph
  cluster_x { b; c; } b -> c; }` throws in `dotComputeBb` on abomination's
  empty rank -1. That is the `8e06a6261` guard, and native renders the graph
  (#159 comment 6930117553).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline bd5ddf75..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `bd5ddf75` (tip at planning). If the tip moved, use the tip at
  execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-160 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`.
- **Finish (T2):** `git tag issue-160/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(dot): guard empty ranks as graphviz 16.1.1 does

  Graphviz 16.1.1 checks a rank's leader for NULL before reading it in
  the self-loop sizey of dot_splines_, dot_compute_bb, set_ycoords and
  make_LR_constraints (upstream ca3353d80, 1a77ac9df, 8e06a6261,
  9fca64d0f, d49e3a529). Port the five guards; 2759 and 2759_1 now
  render as native does instead of throwing.

  Refs: #160
  ```

  Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR,
  or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; expected-fail count as the baseline |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T2](batch-1/T2-gates-finish.md#bytediff-gate-5) | 0 changed jobs |
| 6 | Targeted survey | see [T2](batch-1/T2-gates-finish.md#targeted-survey-gate-6) | equals the planning table |

Oracle: graphviz 16.1.1 (ADR-0002), `~/git/graphviz-16.1.1/build/cmd/dot/dot`,
`GVBINDIR=/tmp/ghl1611`. Run `oraclePreflight` (`test/corpus/oracle-env.ts`)
before trusting native output; if `config8` is missing, run
`GVBINDIR=/tmp/ghl1611 <dot> -c`. Check `uptime` before native renders; wait
while the load is above 12.

## Baseline (Phase 8)

Measured at planning on `bd5ddf75` (all green):

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 580 files, 13712 passed, 4 expected fail |
| `bash test/golden/gates.sh` | 5/5 PASS |
| `npx vitest run test/corpus test/docs` | 25 files, 2863 passed |

Oracle preflight: `/tmp/ghl1611/config8` present; the 16.1.1 binary rendered
`2759`/`2759_1` (exit 0) this session. Gate 2's expected-fail count stays 4: no
known-failing entry covers `2759`.

## Stop conditions

1. A file outside the task write-sets needs a change.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
3. A T1 branch test passes before its guard is in (the case does not reach the
   empty rank it claims to: fix the test, and if it can't be built, stop).
4. `2759`/`2759_1` `-Tplain` on the head differs from the native capture.
5. A smoke job changes, or a survey line differs from the planning table, and
   it neither equals native nor is the AD-3 json residual.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test names and where new cases sit; `position.test.ts` versus a new
  `position-bbox.branch.test.ts`.
- The name of a private helper in `self-loop.ts`, and the unreachable initial
  `UR.y` value with its comment.
- Wording of doc comments and fixture provenance comments.
- The scratch-directory layout under `$TMPDIR`.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-5, rollback, readiness |
| [batch-1/overview.md](batch-1/overview.md) | the batch |
| [batch-1/T1-empty-rank-guards.md](batch-1/T1-empty-rank-guards.md) | port the guards |
| [batch-1/T2-gates-finish.md](batch-1/T2-gates-finish.md) | gates, survey, follow-up, squash |
| [harness/counterfactual.patch](harness/counterfactual.patch) | AD-1 as planned |
| [harness/native-compare.sh](harness/native-compare.sh), [normalize.mjs](harness/normalize.mjs), [toward.mjs](harness/toward.mjs) | port vs native per job (from #158, unchanged) |
| [harness/detector.sh](harness/detector.sh), [detector.patch](harness/detector.patch), [detector-hits.txt](harness/detector-hits.txt), [detector-nonzero.txt](harness/detector-nonzero.txt) | reach markers and the planning run |
| [harness/survey-ids.txt](harness/survey-ids.txt), [planning-survey.txt](harness/planning-survey.txt) | gate 6 ids and the planning result |
| [harness/followup-json-cluster-bb.md](harness/followup-json-cluster-bb.md) | the follow-up T2 files |
| [diagrams/data-flow.md](diagrams/data-flow.md), [diagrams/component-map.md](diagrams/component-map.md) | diagrams |
| [harness/execution-survey.txt](harness/execution-survey.txt) | gate 6 at execution |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1-T2 | [x] |

## Session end

- One row in `plans/decision-journal.md`; `.agent-notes/issue-160.md` if novel.
- Comments on #160, #159 and #230; the follow-up issue (T2).
- The final message ends with the driver's status line.

## Summary (2026-11-16)

- **Tasks:** 2 of 2 done (T1, T2). Base `bd5ddf75` (the tip at execution
  start); per-task history under tag `issue-160/pre-squash`.
- **Decisions:** AD-1..AD-5 held. Journalled judgment calls: the
  `makeLrRankConstraints` red case uses `v[0]` null with `n > 0`, because the
  `n === 0` input was already a no-op on the base (stop condition 3 read: the
  test was rebuilt, not dropped); `UR.y`'s unreachable initial value is `NaN`;
  `maxht` cannot be observed where the `set_ycoords` guard fires, so a case
  pins the unguarded `exact_ranksep` throw instead; bb cases sit in
  `position-bbox.branch.test.ts`.
- **Gates:** typecheck exit 0; `npm test` 581 files, 13726 passed, 4 expected
  fail; goldens 5/5; corpus + docs 25 files, 2863 passed; smoke bytediff 1960
  jobs, 0 changed; targeted survey equals the planning table line for line
  ([harness/execution-survey.txt](harness/execution-survey.txt)).
- **Accepted-row changes:** none. **Toward-native changes:** none (no smoke
  job changed).
- **For review:** #230 (`needs-ruling`) now also lists the json of `2759` and
  `2759_1` (base threw; head differs from native by #185's line and #231).
- **Follow-ups:** #231 (json: a cluster inside an anonymous subgraph after an
  edge loses `bb` and `_draw_`). For the maintainer's survey: `2759`, `2759_1`
  move from port-error to equal-to-native in svg, xdot, plain and cmapx (#160
  comment).
