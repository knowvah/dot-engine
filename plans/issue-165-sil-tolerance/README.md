# Mission: issue #165: tolerance in splineintersectsline, as 16.1.1 has it

## Objective

Graphviz 16.1.1 (`d3ab9ba47`) compares three values in pathplan's
`splineintersectsline` within 1e-7 instead of exactly: a barrier's x-extent and
y-extent against 0, and a point barrier's x-root against its y-root. The port
(`src/pathplan/route.ts`) still compares exactly, as 16.1.0 did, so a
near-vertical barrier (x-extent non-zero but under 1e-7) takes the general
branch. That branch divides by the tiny extent and reports crossings that 16.1.1
does not, or misses ones it finds.

Done means:

- AD-1: `RouteHelper.eq(a, b)` (`Math.abs(a - b) < 1e-7`, local constant) at the
  three sites, in C's order.
  ([AD-1](decisions.md#ad-1-port-eq-as-c-has-it))
- AD-2: red-first tests with values from native 16.1.1: `routeSpline` for the
  coefficient sites, `RouteHelper.splineIntersectsLine` (now an `@internal`
  export) for the root site.
  ([AD-2](decisions.md#ad-2-test-through-routespline-and-splineintersectsline-via-an-internal-export))
- AD-3: root values compared to 1e-15 (solve3's libm last bit), counts exactly.
  ([AD-3](decisions.md#ad-3-root-values-are-compared-to-1e-15-counts-exactly))
- T2: gates green; the smoke bytediff changes nothing; the reach probe and the
  survey equal the planning records
  ([AD-4](decisions.md#ad-4-how-equals-native-is-judged)).

Type `fix`, a patch release.

**Out of scope** ([AD-5](decisions.md#ad-5-scope)): the other `route.c`
commits in `16.1.0..16.1.1` (no behaviour); solve3's libm last bits; corpus
records (the maintainer's, at merge).

## Evidence (measured at planning, base `954ec6b3`)

"cf" = the base plus [harness/counterfactual.patch](harness/counterfactual.patch)
(AD-1, src only). Native = 16.1.1 (`/tmp/ghl1611`, `/tmp/ghl1611-all`, both with
`config8`).

- **`Proutespline` harness** ([route-cases.c](harness/route-cases.c), linked
  against each build's `libpathplan`): 48 cases (near-vertical barriers above
  and below a bulging spline, near-point barriers, a corridor polygon, x-extents
  from 3e-16 to 2e-7). 8 cases differ between 16.1.0 and 16.1.1. The port on the
  base equals 16.1.0 byte for byte, and the cf equals 16.1.1 byte for byte
  ([route-1611.out](harness/route-1611.out),
  [port-route-cf.out](harness/port-route-cf.out)). Both directions occur:
  `A[dx=1e-15]` 16.1.0 sees a crossing that is not there (the spline collapses
  to its chord); `A[dx=-1e-15]` and `C[dx=1e-14]` 16.1.0 misses one.
- **`splineintersectsline` harness** ([sil-cases.c](harness/sil-cases.c)
  `#include`s each build's `route.c`, compiled with the oracle's `-O3`): 17
  cases, 9 differ between versions, all three sites among them (`P[k=1.7]`,
  `Qp[d=0]` root site; `Qv[dx=-1e-15]`, `Qv[dx=1e-9]` vertical site). On the cf,
  every root count equals 16.1.1 and every root is within 1e-15; the last bit
  differs through solve3's libm `acos`/`cbrt` (AD-3).
- **Unit tests on the cf:** `npx vitest run src/pathplan` 70/70 pass. No
  existing test pins the old behaviour.
- **Corpus reach** ([planning-probe.txt](harness/planning-probe.txt)): an
  instrumented cf over 602 svg jobs (30 `splines=true` ids × 7 routing engines,
  plus the 49 smoke ids × 8) reaches a changed decision in 3 jobs:
  `2168|circo`, `2168|fdp`, `2168_2|fdp`. Each is a near-vertical polygon edge
  (x-extent 7.1e-15 or 1.4e-14, from trig-placed vertices). Their output does
  not change: base against cf, 15 jobs in 5 formats, 15 identical. No smoke job
  reaches a changed decision.
- **Native survey** ([planning-survey.txt](harness/planning-survey.txt), the 3
  reached pairs × 5 formats, run at load 11.65 after `oraclePreflight`): svg,
  xdot, plain and cmapx equal native on base and cf; json differs by the 2
  lines of #185 (`"name": "%1"`), on both.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 954ec6b3..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `954ec6b3` (tip at planning). If the tip moved, use the tip at
  execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-165 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`.
- **Finish (T2):** `git tag issue-165/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(pathplan): compare within 1e-7 in splineintersectsline as 16.1.1

  Graphviz 16.1.1 (upstream d3ab9ba47) tests a barrier's x- and y-extent
  against 0, and a point barrier's x-root against its y-root, with
  eq(a, b) = fabs(a - b) < 1e-7 instead of ==. A near-vertical barrier
  used to take the general branch, which divides by the tiny extent and
  reported crossings that do not exist or missed real ones. Port eq as
  a RouteHelper method with its own 1e-7 constant, use it at the three
  sites, and pin the change with values from 16.1.1's own Proutespline
  and splineintersectsline. RouteHelper becomes an @internal export so
  the root site, which Proutespline cannot observe, can be tested.

  Refs: #165
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
| 5 | Smoke bytediff | see [T2](batch-1/T2-gates-finish.md#bytediff-gate-5) | 0 changed jobs |
| 6 | Targeted survey | see [T2](batch-1/T2-gates-finish.md#targeted-survey-gate-6) | probe, reached jobs and survey equal the planning records |

Oracle: graphviz 16.1.1 (ADR-0002), `~/git/graphviz-16.1.1/build/cmd/dot/dot`,
`GVBINDIR=/tmp/ghl1611` (dot) or `/tmp/ghl1611-all` (other engines). Run
`oraclePreflight` (`test/corpus/oracle-env.ts`) before trusting native output;
if `config8` is missing, run `GVBINDIR=<dir> <dot> -c`. Check `uptime` before
native renders and the bytediffs; wait while the load is above 12.

## Baseline (Phase 8)

Measured at planning on `954ec6b3` (all green):

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 589 files, 13799 passed, 0 expected fail |
| `bash test/golden/gates.sh` | 5/5 PASS (goldens 253/253) |
| `npx vitest run test/corpus test/docs` | 25 files, 2863 passed |

## Stop conditions

1. A file outside the task write-sets needs a change.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
3. A T1 red test passes on the base, a control fails on either side, or
   `harness/run.sh` on the head prints anything but `EQUAL` for
   `port vs 16.1.1` and `sil`.
4. A smoke job, a probe line, a reached-job bytediff or a survey line differs
   from the planning record and does not equal native.
5. Any golden changes verdict, or any golden output changes.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong
   (for example, a site where the port's branch order differs from C's).

## Push-forward (decide alone, journal it)

- Test names, `describe` grouping, and helper names in the test file.
- Wording of the `eq` doc comment, the `@internal` comment and the header
  comment update.
- Whether the P case builds its points inline or through a small helper.
- The scratch-directory layout under `$TMPDIR`.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | background, AD-1..AD-5, rollback, readiness, auto-confirmed table |
| [batch-1/overview.md](batch-1/overview.md) | the batch |
| [batch-1/T1-eq-tolerance.md](batch-1/T1-eq-tolerance.md) | the change, test-first |
| [batch-1/T2-gates-finish.md](batch-1/T2-gates-finish.md) | gates, probe, survey, comments, squash |
| [harness/counterfactual.patch](harness/counterfactual.patch) | AD-1 as planned (src only) |
| [harness/run.sh](harness/run.sh), [route-cases.c](harness/route-cases.c), [sil-cases.c](harness/sil-cases.c), [port-cases.ts](harness/port-cases.ts), [port-sil.ts](harness/port-sil.ts), [sil-compare.py](harness/sil-compare.py) | the C and port harnesses |
| `harness/route-161{0,1}.out`, `sil-161{0,1}.out`, `port-*-{base,cf}.out` | planning outputs |
| [harness/instrument.patch](harness/instrument.patch), [probe-ids.txt](harness/probe-ids.txt), [planning-probe.txt](harness/planning-probe.txt) | gate 6 step 1 |
| [harness/engine-compare.sh](harness/engine-compare.sh), [survey-list.txt](harness/survey-list.txt), [planning-survey.txt](harness/planning-survey.txt), [normalize.mjs](harness/normalize.mjs), [toward.mjs](harness/toward.mjs) | gate 6 step 3 (scripts from #164) |
| [diagrams/data-flow.md](diagrams/data-flow.md), [diagrams/component-map.md](diagrams/component-map.md) | diagrams |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1-T2 | [x] |

## Session end

- One row in `plans/decision-journal.md`; `.agent-notes/issue-165.md` if novel.
- Comments on #165 and #148.
- The final message ends with the driver's status line.

## Summary (2026-11-16)

- **Tasks:** 2 of 2 done (T1, T2). Base `954ec6b3` (unchanged since planning);
  per-task history under tag `issue-165/pre-squash`.
- **Decisions:** AD-1..AD-5 held. `git diff 954ec6b3 -- src/pathplan/route.ts`
  is [harness/counterfactual.patch](harness/counterfactual.patch) plus the
  `@internal` export line and its comment. Journalled judgment calls: the
  export went in before the red run, so the five `splineIntersectsLine` tests
  fail for the stated reason and not on a missing import; two `describe`s, a
  `silRoots` helper and the constants `CLEAR_Y`, `ARCH`, `ROOT_DIGITS` in the
  test file.
- **Red first:** on base behaviour 7 of the 9 new tests fail, each as the T1
  table says (`A[dx=1e-15]` 0, `A[dx=-1e-15]` 4.444444444444445, `C[dx=1e-14]`
  -4.444444444444445, `P[k=1.7]`, `Qp[d=0]`, `Qv[dx=-1e-15]` 0 roots,
  `Qv[dx=1e-09]` off by 1.3e-12); the two 2e-7 controls pass on both sides.
- **Gates:** typecheck exit 0; `npm test` 589 files, 13808 passed (13799 + 9),
  0 expected fail; goldens 5/5 (253/253); corpus + docs 25 files, 2863 passed;
  smoke bytediff 1960 jobs, 1960 identical, 0 capped; reach probe 602 jobs, 3
  diffs, 0 capped, equal to [planning-probe.txt](harness/planning-probe.txt),
  svg identical in all three (only `ISSUE165 coeff` lines, x-extent 7.1e-15
  and 1.4e-14); reached jobs 15/15 identical; the native survey equals the
  planning survey line for line
  ([harness/execution-survey.txt](harness/execution-survey.txt), 15 lines).
- **C harness:** `harness/run.sh` on the head prints `route: port vs 16.1.1
  EQUAL` (48 cases, byte for byte) and `sil EQUAL` (17 cases: counts exact,
  roots within 1e-15). The four C outputs and both port outputs are byte-equal
  to the planning files.
- **Toward-native changes:** none.
- **Accepted-row changes:** none.
- **For review:** nothing. No `needs-ruling` question arose.
- **Follow-ups:** none.
- **Left for the maintainer** (AD-5): corpus records and
  `docs/known-divergences.md`; no corpus output changed.
- **Load:** other projects' queues held the machine between load 11 and 200;
  each bytediff and the native survey started on a 1-minute reading below 12.
