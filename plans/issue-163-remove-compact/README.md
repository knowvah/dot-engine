# Mission: issue #163: ignore the removed `compact` attribute, as 16.1.1 does

## Objective

Graphviz 16.1.1 (`d5061e47c`, `731f7c560`; gitlab #2558) removes the
undocumented `compact` attribute. `compile_edges` always calls `strong()`,
`weak()`, `is_a_strong_cluster` and `compile_clusters` are gone, and `compact`
is ignored without a warning. The port's `newrank` ranker
(`src/layout/dot/rank-dot2.ts`) still builds weak diamonds and TOP/BOT
skeletons for `compact=true` clusters, so goldens `dot-newrank-compact-three`
and `dot-newrank-compact-weak` differ from their 16.1.1 refs. They sit in
`test/golden/known-failing.json`.

Done means:

- AD-1: the weak/strong machinery is deleted from `rank-dot2.ts` as upstream
  deletes it, and `compileEdgeItem` always ends in `xgStrong`.
  ([AD-1](decisions.md#ad-1-delete-the-machinery-as-upstream-does))
- AD-2: no warning and no attribute handling.
  ([AD-2](decisions.md#ad-2-no-warning-no-attribute-handling))
- AD-3: red-first Xg-level and rank-level tests; both goldens leave
  `known-failing.json`; the tests of deleted functions go.
  ([AD-3](decisions.md#ad-3-tdd-tests))
- T2: gates green; 0 expected-fail tests (was 4); the smoke bytediff is
  unchanged; the survey equals the planning table
  ([AD-5](decisions.md#ad-5-how-equals-native-is-judged)).

Type `fix`, a patch release.

**Out of scope** ([AD-6](decisions.md#ad-6-scope)): #237 (`compile_edges`'
persistent `SWAP`), #238 (golden descriptions and translations), the
`docs/known-divergences.md` row, corpus records, #183.

## Evidence (measured at planning, base `03dc6365`)

"cf" = the base plus [harness/counterfactual.patch](harness/counterfactual.patch)
(AD-1, src only). Native = 16.1.1 (`GVBINDIR=/tmp/ghl1611`, `config8` present).

- **Reach:** no file under `~/git/graphviz-16.1.1/tests` sets `compact`
  (`grep -rlIE '\bcompact\s*='`), so no corpus or smoke id can change. The
  inputs that set it are the five `dot-newrank-compact-*` goldens and three
  planning probes ([harness/survey-files.txt](harness/survey-files.txt)).
- **Output** ([harness/planning-survey.txt](harness/planning-survey.txt), 48
  jobs): the cf equals native on every job (svg, xdot, plain, json, dot, cmapx),
  with empty stderr on both sides. Only `three` and `weak` change (svg 44/60,
  xdot 66/92, plain 20/26, json 264/228, dot 25/34 diff lines on the base → 0).
  Their cmapx was equal on both. `single`, `nested`, `mixed` and the probes are
  equal to native on the base and the cf.
- **Refs:** the five goldens' `refs/*.svg` and `refs-xdot/*.xdot` are byte-equal
  to native 16.1.1. The cf passes all ten golden tests, and the two listed ids
  turn their `test.fails` red ("Expect test to fail"), so they must leave
  `known-failing.json`.
- **Probes:** `probe-north.dot` (upstream's own example) is the same in native
  16.1.0 and 16.1.1. `probe-root-compact.dot` changed between 16.1.0 and 16.1.1
  (root `compact` is inherited by clusters), but the port base already equals
  16.1.1 there (see #183 in decisions AD-6). `probe-no-newrank.dot` is the
  `dot1_rank` control. All three stay as controls.
- **Found on the way:** #237 (persistent `SWAP` in `compile_edges`), #238
  (stale golden text). Both filed as `follow-up`.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 03dc6365..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `03dc6365` (tip at planning). If the tip moved, use the tip at
  execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-163 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`.
- **Finish (T2):** `git tag issue-163/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(dot): ignore the removed compact attribute as graphviz 16.1.1 does

  Graphviz 16.1.1 removes the undocumented compact attribute and the
  weak/strong cluster machinery behind it (upstream d5061e47c, 731f7c560,
  gitlab 2558): compile_edges always calls strong() and compile_clusters
  is gone, so newrank ranks a compact cluster like any other, with no
  warning. Delete weak(), is_a_strong_cluster and compile_clusters from
  the dot2 ranker. Goldens dot-newrank-compact-three and
  dot-newrank-compact-weak now equal native and leave known-failing.

  Refs: #163
  ```

  Add a "Mission done" paragraph before the footer, as #162 did. Lines ≤ 80,
  subject ≤ 72, no attribution. Never push, rebase, sign, open a PR, or use
  `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; **0 expected fail** (base: 4) |
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

Measured at planning on `03dc6365` (all green):

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 589 files, 13802 passed, 4 expected fail |
| `bash test/golden/gates.sh` | 5/5 PASS |
| `npx vitest run test/corpus test/docs` | 25 files, 2863 passed |

The 4 expected fails are the two listed goldens × (SVG, xdot); AD-3 removes them.
Gate 2's passed count changes by design: the deleted tests go, the new ones
come in.

## Stop conditions

1. A file outside the task write-sets needs a change.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
3. A T1 red test passes on the base, or the rank-level test cannot reach native's
   ranks (decisions AD-3) on the head by either construction.
4. A smoke job changes, or a survey line differs from the planning table, and it
   does not equal native.
5. Any golden other than the two un-listed ones changes verdict.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong
   (for example, 16.1.1 reads `compact` somewhere planning missed).

## Push-forward (decide alone, journal it)

- Test names, and whether the rank-level test lives in the branch test file or
  a new `rank-dot2.compact.test.ts`.
- How the rank-level graph is built (hand-built, or DOT through
  `test/helpers/dot-position.ts`), as long as the expected ranks are native's.
- Wording of the two updated comments and of section headers in the test file.
- The scratch-directory layout under `$TMPDIR`.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | background, AD-1..AD-6, rollback, readiness, auto-confirmed table |
| [batch-1/overview.md](batch-1/overview.md) | the batch |
| [batch-1/T1-remove-compact.md](batch-1/T1-remove-compact.md) | delete the machinery, test-first |
| [batch-1/T2-gates-finish.md](batch-1/T2-gates-finish.md) | gates, survey, comments, squash |
| [harness/counterfactual.patch](harness/counterfactual.patch) | AD-1 as planned (src only) |
| [harness/golden-compare.sh](harness/golden-compare.sh), [normalize.mjs](harness/normalize.mjs), [toward.mjs](harness/toward.mjs) | port vs native per file and format |
| [harness/survey-files.txt](harness/survey-files.txt), [planning-survey.txt](harness/planning-survey.txt) | gate 6 inputs and the planning result |
| [harness/probe-north.dot](harness/probe-north.dot), [probe-root-compact.dot](harness/probe-root-compact.dot), [probe-no-newrank.dot](harness/probe-no-newrank.dot) | control probes |
| [diagrams/data-flow.md](diagrams/data-flow.md), [diagrams/component-map.md](diagrams/component-map.md) | diagrams |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1-T2 | [x] |

## Session end

- One row in `plans/decision-journal.md`; `.agent-notes/issue-163.md` if novel.
- Comments on #163 and #148.
- The final message ends with the driver's status line.

## Summary (2026-11-16)

- **Tasks:** 2 of 2 done (T1, T2). Base `03dc6365` (unchanged since planning);
  per-task history under tag `issue-163/pre-squash`.
- **Decisions:** AD-1..AD-6 held. Journalled judgment calls: the rank-level
  test is hand-built in `rank-dot2.branch.test.ts` (no layout helper needed);
  `compileEdges` and `compileEdgeItem` lose the `st` parameter only `xgWeak`
  used (a departure from the counterfactual in form, not behaviour); the old
  agent note on the weak/strong path gets a "superseded" pointer (outside the
  planned write-set).
- **Gates:** typecheck exit 0; `npm test` 589 files, 13798 passed, 0 expected
  fail (was 13802 passed, 4 expected fail; 8 tests of deleted functions gone,
  4 golden tests now pass); goldens 5/5; corpus + docs 2863 passed; smoke
  bytediff 1960/1960 identical; targeted survey equals the planning table
  line for line ([harness/execution-survey.txt](harness/execution-survey.txt)).
- **Equal to native on the head** (were not on the base): svg, xdot, plain,
  json and dot of `dot-newrank-compact-three` (44, 66, 20, 264, 25 diff lines
  → 0) and `dot-newrank-compact-weak` (60, 92, 26, 228, 34 → 0). cmapx was
  equal on both. Stderr is empty on both sides everywhere.
- **Accepted-row changes / toward-native changes:** none.
- **For review:** nothing. No `needs-ruling` question arose.
- **Follow-ups (already filed at planning):** #237 (`compile_edges`'
  persistent `SWAP`), #238 (golden descriptions and translations). None new.
- **Left for the maintainer:** the `docs/known-divergences.md` row for #163
  (AD-6).
