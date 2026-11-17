# Mission: issue #153: compass-port angles in integer units of π/4

## Objective

Graphviz 16.1.1 (upstream `54360ff3b`) holds `compassPort`'s `theta` as an
`int` count of π/4 and does the rankdir flips on integers in `invflip_angle`,
converting to radians once with `angle * 0.25 * M_PI`
(`~/git/graphviz-16.1.1/lib/common/shapes.c:2605-2637`, `:2698-2863`). The
port's `src/common/compass-port.ts` still does 16.1.0's radian arithmetic,
including float `===` comparisons in `invflipAngleRL`.

The port needs:

1. `DirectionResult.theta` in quarter-pi units, with C's values (`e 0, ne 1,
   n 2, nw 3, w 4, sw -3, s -2, se -1`), and `invflipAngle` doing C's integer
   flips, then returning radians
   ([AD-1](decisions.md#ad-1-theta-travels-in-quarter-pi-integer-units-as-1611-holds-it)).
2. The BT negation keeps a zero at `+0`, as C's `int` does
   ([AD-2](decisions.md#ad-2-rankdirbt-on-theta-0-yields-0-not--0)).

Done means:

- A unit matrix pins `pp.theta` exactly (`Object.is`) for 8 compass points × 4
  rankdirs, plus `+0` under BT for `e` and `c`.
- Every gate is green. The smoke bytediff, the survey and the four probes are
  byte-identical base to head
  ([AD-4](decisions.md#ad-4-no-output-changes-so-no-corpus-records-change)).

Type `refactor`: no output changes (AD-1's evidence), so no release note.

**Out of scope:**

- The issue body's direction table, which has the north and south signs
  reversed. Follow the C ([AD-3](decisions.md#ad-3-cs-direction-table-not-the-issues)).
- Other float-equality cleanups in 16.1.1 (#154, #165).
- `test/corpus/*` records and `docs/known-divergences.md` (AD-4).

## Evidence (measured at planning, base `74b09d00`)

- **Formula identity:** the old and new formulas give the same bits for 34 of
  36 (compass, rankdir) pairs. The other 2 are BT on theta 0 (`e`, and
  `c`/`_`/default), `-0` before and `+0` after (AD-1, AD-2).
- **Scratch head** (the change applied to a `git archive` copy under
  `$TMPDIR`): the four probes in [harness/probes/](harness/probes/) (8 compass
  points on an ellipse, record fields and a labelled box, one probe per
  rankdir), dot, 5 formats: 20 jobs, 20 identical.
- **Port vs native 16.1.1** on the probes (oracle preflight ok): xdot, plain and
  cmapx equal byte for byte on all four (base and head are identical). svg and
  json differ only in the header and pretty-printing.
- **Survey** ([harness/survey-ids.txt](harness/survey-ids.txt), 56 ids, dot,
  5 formats), base vs scratch head: 280 jobs, 280 identical, 0 diffs, 0
  capped. `2475_1` and `2621` (BT, no port syntax, so `compassPort` never
  runs) timed out at 120 s on both sides and were dropped from the list.
- **Baseline gates** (load 7-17): typecheck exit 0; `npm test` 579 files,
  13584 passed, 18 expected fail; `gates.sh` 5/5 PASS; corpus + docs 25 files,
  2863 passed.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with this
   brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 74b09d00..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, and never merge `main` into it.
- **Base sha:** `74b09d002f0185f2a886319e99f1320a1e5614c5` (tip at planning). If
  the tip moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-153 brief` (this
  directory), then `refactor(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T1's last step):** `git tag issue-153/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  refactor(common): hold compass-port theta in quarter-pi units

  Graphviz 16.1.1 keeps compassPort's theta as an int count of pi/4 and
  does invflip_angle's rankdir flips on integers, converting to radians
  once (upstream 54360ff3b). Port it: the per-direction thetas become
  units and invflipAngle returns angle * 0.25 * pi. The radians are
  bit-identical to before except under rankdir=BT, where a zero theta is
  now +0 as C's int gives, not -0.

  Refs: #153
  ```

  Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR,
  or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; 13584 + new passed, 18 expected fail |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-compass-theta-units.md#bytediff) | identical on every job |
| 6 | Targeted survey | see [T1](batch-1/T1-compass-theta-units.md#targeted-survey) | identical on every job; probes equal native |

The oracle is graphviz 16.1.1 (ADR-0002): `~/git/graphviz-16.1.1/build/cmd/dot/dot`,
with `/tmp/ghl1611` for dot. Run `oraclePreflight` (`test/corpus/oracle-env.ts`)
for `dot` before trusting native output. If `config8` is missing, run
`GVBINDIR=<dir> <dot> -c`. Check `uptime` before gates 5 and 6, and wait if the
load is above 12.

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
3. In T1's red step, a matrix row other than BT `e` (and the BT zero-sign
   cases) fails on the base. That means AD-1's bit-identity evidence is wrong.
4. Gate 5 or 6 shows any changed output, base to head. Diagnose it (expected
   suspect: a `-0` that reached output). If the head equals native there, it is
   a toward-native change under the queue rules: record it and go on.
   Otherwise halt.
5. An existing test fails because of the change.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong,
   for example a reader of `DirectionResult.theta` outside `applyDir`.

## Push-forward (decide alone, journal it)

- Test names, and whether the matrix is one `it.each` or one per rankdir.
- Whether the existing RL `toBeCloseTo` table stays (made exact) or goes,
  since the matrix covers it.
- The wording of the doc comments and of AD-2's `0 - a` comment.
- Whether `invflipAngle` mutates a local or returns from each case, as long as
  the conversion `a * 0.25 * Math.PI` happens once, after the switch.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-compass-theta-units.md](batch-1/T1-compass-theta-units.md) | the task |
| [harness/scan-compass.mjs](harness/scan-compass.mjs) | lists corpus inputs with compass ports (survey selection) |
| [harness/survey-ids.txt](harness/survey-ids.txt) | gate 6 ids |
| [harness/theta-identity.mjs](harness/theta-identity.mjs) | old vs new theta, bit for bit (AD-1, AD-2) |
| [harness/probes/](harness/probes/) | 8 compass points × 4 rankdirs |
| [diagrams/data-flow.md](diagrams/data-flow.md) | theta's path through compassPort |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (the project journal): mechanism, files,
  gates.
- Write `.agent-notes/issue-153.md` only for something novel (the `-0` from a
  JS negation of an int-typed C value may qualify if no note covers it).
  Otherwise, say in the journal row that nothing was novel.
- Comment on #153 with the outcome: no output change; the issue body's
  direction table has north and south reversed (AD-3).
- The final message ends with the driver's status line.

## Summary (2026-11-16)

- **Tasks:** 1 of 1 (T1).
- **Decisions:** 5 push-forward choices, all in
  [decision-journal.md](decision-journal.md); none flagged for review. AD-1 to
  AD-4 held as planned.
- **Gates:** typecheck exit 0; `npm test` 579 files, 13610 passed, 18 expected
  fail; `gates.sh` 5/5; corpus + docs 25 files, 2863 passed; smoke bytediff
  1960/1960 identical; survey 280/280 identical; probes 20/20 identical and
  equal to native 16.1.1 on xdot, plain and cmapx.
- **Accepted-row changes:** none. **Toward-native changes:** none (no output
  changed).
- **Follow-ups:** none filed. The issue body's direction table has the north
  and south signs reversed (AD-3); said in the #153 comment.
