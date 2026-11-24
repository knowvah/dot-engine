# Mission: issue #193: neato mode=KK keeps spline_edges' bb, as native does

## Objective

On `graph { mode=KK; a -- b -- c -- a }` laid out three times with no
`freeLayout`, native prints `graph 1 1.7338 1.6854` on renders 2 and 3. The
port prints `1.4416` all three times. C's `neato_layout` runs `compute_bb`
after routing only in its `Pack >= 0` branch (`lib/neatogen/neatoinit.c:1416`).
`mode=KK` with no pack takes the other branch, which keeps the bb
`spline_edges` made. That bb counts the stale beziers and carries
`neato_set_aspect`'s scale. The port recomputes it on every path
(`src/layout/neato/index.ts:222`). The full diagnosis, with what was ruled
out, is in [decisions.md](decisions.md#mechanism-planning-s-diagnosis).

Planning reproduced it against the carried oracle (`twice.c nofree`, built by
[harness/build.sh](harness/build.sh)) and tried the fix
([harness/prototype.diff](harness/prototype.diff)):

- **No-free matrix** (12 probes × plain and xdot × 3 layouts): base 6/24
  identical, prototype 24/24 ([harness/survey.md](harness/survey.md)).
- **One single-layout change, toward native:** `mode=KK; ratio=fill;
  size="3,3!"` goes from `graph 1.2198 2.4523 2.4595` to native's
  `graph 1 3 3` (journal row 4).
- **Corpus:** no input uses `mode=KK` (0 of 1007), so the smoke bytediff
  should show 0 diffs. `npm test` passes unchanged on the prototype.

Done means: the post-routing recompute is guarded with `pack >= 0` (AD-1).
Two `NOFREE_CASES` rows, `kk-tri` and `kk-ratio`, pin it against
carried-oracle fixtures (AD-2). The matrix is 24/24 and the smoke bytediff
shows 0 diffs. Type `fix`.

**Out of scope:** #283 (KK no-pack clusters, filed at planning), `addZ` order
and the dead `refineSplines` branch (AD-3).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md) and
   [batch-1/T1-kk-bb.md](batch-1/T1-kk-bb.md). Check finished work with
   `git log --oneline 670a47d9..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `670a47d9a1e1a3376554cbe569ed363b7bc08eed` (the tip at
  planning). If the tip has moved, use the tip at execution start as the
  base, re-run the matrix on it before the change (T1 step 1), and journal it.
- Per-task commits while working: first `docs(mission): add issue-193 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-193/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(neato): keep the spline_edges bb when kk mode does not pack

  <two to four lines: neato_layout runs compute_bb after routing only when
  it packs; mode=KK without pack keeps spline_edges' bb, which counts a
  no-free relayout's stale beziers and the ratio scale; the port recomputed
  it on every path>

  Refs: #193
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never push,
  rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; the two new cases pass |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | [T1 step 7](batch-1/T1-kk-bb.md#steps) | 0 diffs, 0 capped |
| 6 | Targeted survey | [T1 steps 5, 8](batch-1/T1-kk-bb.md#steps) | matrix 24/24; fixture graph lines equal native |

Oracle: the carried build (ADR-0003, the newest accepted ADR), from
`test/corpus/oracle-paths.mjs`: `~/git/sseely/graphviz-carried/build/cmd/dot/dot`
with `GVBINDIR=/tmp/ghl1611-carried-all` (neato).
[harness/build.sh](harness/build.sh) links `twice-native` against that build's
libraries. Run `npx tsx plans/issue-193-neato-kk-bb/harness/preflight.ts`
before trusting native output. A missing `config8` is fixed with
`GVBINDIR=<dir> <dot> -c` or `test/corpus/build-carried-oracle.sh`. The issue
has no `upstream-16.1.1` label. Check `uptime` before gate 5 and the matrix;
above 12, wait.

Baseline at planning: typecheck and `npm test` green on `670a47d9`
([decision-journal.md](decision-journal.md) row 0).

## Stop conditions

1. A non-test file outside [T1's write-set](batch-1/T1-kk-bb.md#write-set)
   must change. Journal why and stop.
2. On the base, a case other than the two new ones fails in T1 step 3, or
   either new case passes. The test does not reach the line: journal and stop.
3. The matrix (T1 step 5) differs from the planning prototype's in any row,
   or gate 5 shows a diff or a job capped twice. Diagnose it and stop.
4. The recaptured fixtures (T1 step 2) differ from `harness/native/`. The
   oracle has moved: journal it and stop.
5. The same gate check fails twice in a row after fix attempts. Diagnose it
   to a stated mechanism, journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong,
   or a criterion looks as if it needs #283 fixed (a brief error).

## Push-forward (decide alone, journal it)

- Comment wording, provided every `@see` and C reference stays.
- The local's name (`pack`), and where it is declared within `neatoLayout`.
- More probes in `harness/probes/` for a path the matrix does not reach. Run
  them on base and head. A new non-identical row on the head that is also
  non-identical on the base, with the same diff, is pre-existing: file a
  `follow-up` issue. Any other new row is stop 3.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | mechanism, AD-1..AD-3, baseline, rollback, auto-confirmed table |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-kk-bb.md](batch-1/T1-kk-bb.md) | fixtures, tests, fix, matrix, gates, squash |
| [harness/survey.md](harness/survey.md) | what can change, probe selection, planning results |
| [harness/build.sh](harness/build.sh) | builds `twice-native` against the carried oracle |
| [harness/probe.ts](harness/probe.ts) | port probe, same protocol |
| [harness/native-compare.sh](harness/native-compare.sh), [harness/probes/](harness/probes/) | the 24-row matrix and its inputs |
| [harness/recapture.sh](harness/recapture.sh), [harness/native/](harness/native/) | writes the test fixtures; planning's copies |
| [harness/results/](harness/results/) | planning TSVs (base, prototype) |
| [harness/prototype.diff](harness/prototype.diff) | the prototype, reverted |
| [harness/preflight.ts](harness/preflight.ts) | oracle preflight |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where the bb comes from, per branch |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  origin, fix, files, gates, matrix counts, accepted-row changes (expected:
  none) and toward-native changes (expected: `kk-ratio` render 1, probe only;
  none in the corpus).
- Write `.agent-notes/issue-193.md` (novel): `neato_layout`'s `Pack < 0`
  branch keeps `spline_edges`' bb and adds no clusters (#283), and
  `computeSubgraphBB`'s `refineSplines` branch has no production caller and a
  comment true only for `Pack < 0` (AD-3). In `.agent-notes/issue-138.md`, add
  a line to the reset-skip observation saying #193 is fixed and what caused it.
- The final message ends with the driver's status line.

## Summary (execution, 2026-11-21)

- Tasks: 1 of 1 done (T1), on base `670a47d9` (not moved).
- Decisions: journal rows 5-15. None flagged for review beyond planning's
  rows 3 and 4. One count differs from the brief: 3 KK fixtures, not 6, had
  no native render in this run (row 12: native's intermittent segfault).
- Gates: typecheck exit 0; `npm test` 611 files / 15213 tests; goldens 5/5;
  corpus + docs 27 files / 2887 tests; smoke bytediff 1960/1960 identical,
  0 capped; no-free matrix 24/24 (base 6/24); fixture survey 85/85 equal
  native, base equals head on all 88.
- Accepted-row changes: none. Toward-native changes: none on the corpus;
  `kk-ratio` render 1 (probe) goes from 14 diff lines (plain) and 34 (xdot)
  against native to 0.
- Follow-ups: #283 (filed at planning). Nothing new.
