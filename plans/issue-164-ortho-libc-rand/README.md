# Mission: issue #164: order ortho segments with libc rand(), as 16.1.1 does

## Objective

Graphviz 16.1.1 (`b99490ece`) orders ortho's segments with `gv_permutation`, a
Fisher-Yates shuffle over the unseeded, process-global libc `rand()` stream.
16.1.0 seeded `srand48(173)` and swapped with `drand48()`. The port
(`src/ortho/partition.ts`) still has 16.1.0's ordering, so `splines=ortho`
routes differ from 16.1.1 wherever the trapezoidation depends on the order. The
maintainer ruled (2026-11-09, on #164) to emulate macOS `rand()` with the port's
existing `gvPermutation` (`src/common/crand.ts`).

Done means:

- AD-1: `generateRandomOrdering` returns `gvPermutation(n)` + 1; `partition`
  no longer seeds; `SEED` and its re-export are gone.
  ([AD-1](decisions.md#ad-1-port-generaterandomordering-as-1611-has-it))
- AD-2: ortho shares the one `crand` stream with every other `rand()` consumer.
  ([AD-2](decisions.md#ad-2-one-shared-stream-no-reseed))
- AD-3: red-first tests with values from native 16.1.1's own `partition()`; the
  fixtures re-pinned; the `SEED` tests gone.
  ([AD-3](decisions.md#ad-3-tests-from-the-1611-c-test-first))
- T2: gates green; the smoke bytediff moves exactly the 4 `2643|twopi` jobs
  toward native; the reach and survey equal the planning records
  ([AD-4](decisions.md#ad-4-how-equals-native-is-judged)).

Type `fix`, a patch release.

**Out of scope** ([AD-6](decisions.md#ad-6-scope)): corpus records and the
`docs/known-divergences.md` row (the maintainer's, at merge); native's heap
overflow on degenerate cells (#239, [AD-5](decisions.md#ad-5-native-undefined-behaviour-stays-out));
the circo `1447`/`1658` native crashes.

## Evidence (measured at planning, base `208b8b84`)

"cf" = the base plus [harness/counterfactual.patch](harness/counterfactual.patch)
(AD-1, src only). Native = 16.1.1 (`/tmp/ghl1611`, `/tmp/ghl1611-all`, both with
`config8`; `oraclePreflight` passed).

- **C harness** ([harness/partition-1611.c](harness/partition-1611.c), linked
  against the oracle build's `libortho.a` and `libutil.a`): on 10 cases (the 3
  `partition.test.ts` fixtures, the 5 `ortho-failure.test.ts` inputs, 2 fuzzed
  silent-null inputs), each from `srand(1)`, the cf's
  [port-cases.ts](harness/port-cases.ts) output equals native's byte for byte:
  both orderings, the sorted rectangle sets, the stderr lines, and the next
  `rand()` after `partition`. The base differs on the stream (it never draws),
  the point cell (null + 2 lines; 16.1.1: 4 rectangles) and silentA (19
  rectangles; 16.1.1: silent null). One old input is native UB (AD-5, #239).
- **Unit tests on the cf:** 7 fail, all in `src/ortho`: the 2 `SEED` tests, the
  3 drand48 permutation pins, and 2 `ortho-failure` cases whose 16.1.0
  expectations 16.1.1 no longer gives. Everything else passes (589 files).
  Golden gate: 253/253.
- **Reach** ([planning-reach-bytediff.txt](harness/planning-reach-bytediff.txt)):
  23 corpus ids set `splines=ortho`; × 7 routing engines = 805 jobs. 39 change:
  circo `1447`, `1658`, `1880`, `1990`; twopi `2168_5`, `2183`, `2643`; dot and
  osage `2783` (osage: stderr only). 50 jobs (`2783`/`2784` under the 5 non-dot,
  non-osage engines) are OOM on both sides. The 8 ortho goldens: 40/40
  unchanged.
- **Survey** ([planning-survey.txt](harness/planning-survey.txt), 95 jobs): every
  changed job equals native, or moves toward it with only #185 (`"name": "%1"`)
  or #175 (cmapx `-0`) left, except circo `1447` and `1658`, where native
  crashes (rc 139). `2783` under dot and osage now prints native's two
  trapezoid failure lines, as #148 predicted.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 208b8b84..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `208b8b84` (tip at planning). If the tip moved, use the tip at
  execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-164 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`.
- **Finish (T2):** `git tag issue-164/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(ortho): order segments with libc rand() as graphviz 16.1.1 does

  Graphviz 16.1.1 (upstream b99490ece) builds ortho's segment permutation
  with gv_permutation, a Fisher-Yates shuffle over the process-global
  libc rand() stream, where 16.1.0 seeded srand48(173) and swapped with
  drand48(). The trapezoidation depends on that order, so splines=ortho
  routes and failures moved. Draw the permutation from the port's
  bit-exact macOS rand() model (gvPermutation in common/crand.ts), drop
  the srand48 seed and the SEED constant, and re-pin the partition tests
  from 16.1.1's own partition().

  Refs: #164
  ```

  Add a "Mission done" paragraph before the footer, as #162 did. Lines ≤ 80,
  subject ≤ 72, no attribution. Never push, rebase, sign, open a PR, or use
  `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0, 0 expected fail |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T2](batch-1/T2-gates-finish.md#bytediff-gate-5) | exactly the 4 `2643\|twopi` jobs; 3 equal native, json toward native |
| 6 | Targeted survey | see [T2](batch-1/T2-gates-finish.md#targeted-survey-gate-6) | reach and survey equal the planning records |

Oracle: graphviz 16.1.1 (ADR-0002), `~/git/graphviz-16.1.1/build/cmd/dot/dot`,
`GVBINDIR=/tmp/ghl1611` (dot) or `/tmp/ghl1611-all` (other engines). Run
`oraclePreflight` (`test/corpus/oracle-env.ts`) before trusting native output;
if `config8` is missing, run `GVBINDIR=<dir> <dot> -c`. Check `uptime` before
native renders and the reach bytediff; wait while the load is above 12.

## Baseline (Phase 8)

Measured at planning on `208b8b84` (all green):

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 589 files, 13798 passed, 0 expected fail |
| `bash test/golden/gates.sh` | 5/5 PASS |
| `npx vitest run test/corpus test/docs` | 25 files, 2863 passed |

## Stop conditions

1. A file outside the task write-sets needs a change.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
3. A T1 red test passes on the base, or `port-cases.ts` on the head differs from
   `partition-1611.out` (a clean native run; the port side is deterministic).
4. A smoke job, a reach job or a survey line differs from the planning record
   and does not equal native.
5. Any golden changes verdict, or any golden output changes.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong
   (for example, a port path that draws `crand` before ortho where C does not).

## Push-forward (decide alone, journal it)

- Test names; whether the stream test sits in the fixture loop or its own
  `describe`; `beforeEach` versus a per-call `csrand(1)`.
- Whether silentA or silentB pins the silent-null case.
- Wording of the header comments and of the two code comments in
  `partition.ts`.
- The scratch-directory layout under `$TMPDIR`.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | background, AD-1..AD-6, rollback, readiness, auto-confirmed table |
| [batch-1/overview.md](batch-1/overview.md) | the batch |
| [batch-1/T1-gv-permutation.md](batch-1/T1-gv-permutation.md) | the change, test-first |
| [batch-1/T2-gates-finish.md](batch-1/T2-gates-finish.md) | gates, survey, comments, squash |
| [harness/counterfactual.patch](harness/counterfactual.patch) | AD-1 as planned (src only) |
| [harness/partition-1611.c](harness/partition-1611.c), [build-c.sh](harness/build-c.sh), [partition-1611.out](harness/partition-1611.out), [port-cases.ts](harness/port-cases.ts) | the 16.1.1 C `partition()` and the port, same cases |
| [harness/partition-fuzz-1611.c](harness/partition-fuzz-1611.c) | finds silent-null inputs |
| [harness/reach-ids.txt](harness/reach-ids.txt), [planning-reach-bytediff.txt](harness/planning-reach-bytediff.txt) | gate 6 step 1 |
| [harness/engine-compare.sh](harness/engine-compare.sh), [survey-list.txt](harness/survey-list.txt), [planning-survey.txt](harness/planning-survey.txt), [normalize.mjs](harness/normalize.mjs), [toward.mjs](harness/toward.mjs) | gate 6 step 2 |
| [diagrams/data-flow.md](diagrams/data-flow.md), [diagrams/component-map.md](diagrams/component-map.md) | diagrams |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1-T2 | [x] |

## Session end

- One row in `plans/decision-journal.md`; `.agent-notes/issue-164.md` if novel.
- Comments on #164 and #148.
- The final message ends with the driver's status line.

## Summary (2026-11-16)

- **Tasks:** 2 of 2 done (T1, T2). Base `208b8b84` (unchanged since planning);
  per-task history under tag `issue-164/pre-squash`.
- **Decisions:** AD-1..AD-6 held. The source change equals
  [harness/counterfactual.patch](harness/counterfactual.patch) byte for byte.
  Journalled judgment calls: `beforeEach(csrand(1))` in both test files plus
  one explicit reseed in the determinism test; the stream test sits in the
  fixture loop; silentA pins the silent null; the test-local `genOrder` stays
  as `gvPermutation(n)` + 1.
- **Gates:** typecheck exit 0; `npm test` 589 files, 13799 passed, 0 expected
  fail (was 13798: 2 `SEED` tests gone, 3 stream tests in); goldens 5/5
  (253/253); corpus + docs 2863 passed; smoke bytediff 1960 jobs, 4 diffs,
  exactly `2643|twopi|{svg,xdot,plain,json}`; reach bytediff 805 jobs, 39
  diffs and 50 capped, equal to the planning record; the 8 ortho goldens 40/40
  identical; the native survey equals the planning survey line for line
  ([harness/execution-survey.txt](harness/execution-survey.txt), 95 lines).
- **C harness:** `port-cases.ts` on the head equals `partition-1611.out` byte
  for byte (10 cases: both orderings, rectangle sets, stderr, next `rand()`).
- **Equal to native on the head** (were not on the base; diff lines against
  native 16.1.1): circo `1880` svg 40, xdot 66, plain 20 → 0; circo `1990`
  svg 16, xdot 24, plain 8, json 142 → 0; twopi `2168_5` svg 2, xdot 4,
  plain 2 → 0; twopi `2183` svg 24, xdot 38, plain 12, json 186 → 0; twopi
  `2643` svg 4, xdot 8, plain 4 → 0; dot `2783` svg 12, xdot 16, plain 6 → 0.
  Stderr: dot and osage `2783` now print native's two trapezoid failure lines
  (0 → 79 bytes, equal to native); osage `2783`'s output does not change.
- **Toward-native changes** (every changed line now equals native; what is
  left predates the mission): json of circo `1880` 290 → 2, twopi `2168_5`
  10 → 2, twopi `2643` 18 → 2 (the smoke row), dot `2783` 24 → 2, all the
  one `"name": ""` / `"%1"` pair of #185; cmapx of circo `1880` 22 → 2, the
  `0,-0` of #175.
- **Accepted-row changes:** none.
- **Native-crash rows:** circo `1447` and `1658`. Native 16.1.1 exits 139 on
  both in every format, so there is no native output; the port's svg, xdot,
  plain and json change (cmapx does not). `1447` crashes in 16.1.0 too; `1658`
  is the #147 finding (NULL `dtmatch` in `chanSearch`). Both were measured at
  planning and are on #164.
- **For review:** nothing. No `needs-ruling` question arose.
- **Follow-ups:** #239 (native heap overflow on a zero-width cell), filed at
  planning. None new.
- **Left for the maintainer** (AD-6): the corpus records for the rows above
  and the `docs/known-divergences.md` row.
- **Load:** other projects' queues kept the machine between load 12 and 150;
  each bytediff and the native survey started on a 1-minute reading below 12.
