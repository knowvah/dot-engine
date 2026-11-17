# Mission: issue #154: non-finite division guards (poly_inside, bend, vpsc alpha/beta)

## Objective

Graphviz 16.1.1 replaces four "is the divisor zero?" guards with "is the
quotient finite?" guards, through two new helpers, `fdiv_overflow` and
`fdivf_overflow` (`~/git/graphviz-16.1.1/lib/util/overflow.h:142-174`;
upstream `0d34ab7d6`, `fb7f0feb3`, `0b24f6444`, `d8c1cc3c9`). The port still
has the 16.1.0 guards at:

- `src/common/poly-inside.ts:77-78`, `:88-89` (`poly_inside`'s scale, both
  branches)
- `src/layout/dot/straight-edges.ts:188` (`bend`)
- `src/layout/neato/quad-prog-vpsc.ts:176` (alpha) and `:198-200` (beta)

The port needs:

1. `fdivOverflow` and `fdivfOverflow` in `src/util/overflow.ts`, returning the
   quotient or `null`
   ([AD-1](decisions.md#ad-1-one-helper-pair-in-srcutiloverflowts-returning-number--null)),
   with the float one rounding to float32
   ([AD-2](decisions.md#ad-2-fdivfoverflow-rounds-operands-and-quotient-to-float32)).
2. The four call sites using them as 16.1.1 does
   ([AD-3](decisions.md#ad-3-betas-change-cannot-change-output-so-it-gets-no-behaviour-test),
   [AD-4](decisions.md#ad-4-bend-keeps-mathhypot-and-cs-check-order)).

Done means:

- Unit tests, each red on the base: the helpers; `polyInside` with a subnormal
  `xsize` (both branches); a curved edge whose centroid is ±∞ or NaN; one vpsc
  iteration whose float alpha overflows.
- Every gate is green. The smoke bytediff, the survey and the five probes are
  byte-identical base to head
  ([AD-5](decisions.md#ad-5-no-corpus-output-changes-so-no-corpus-records-change)).

Type `fix`: non-finite inputs now behave as in 16.1.1. No corpus output moves.

**Out of scope:**

- `bend`'s `Math.hypot` against the libm model (AD-4).
- Other 16.1.1 float cleanups: #165 (`splineintersectsline` tolerance).
- Every other `x !== 0 ? a / x : …` in `src/`. 16.1.1 changed only these four.
- `test/corpus/*` records and `docs/known-divergences.md` (AD-5).

## Evidence (measured at planning, base `064266d2`)

A scratch head (the change applied to a `git archive` copy under `$TMPDIR`)
against a scratch base:

- **Unit cases, base → scratch head:** poly_inside subnormal `lw`
  (`{x: 0.4}`) `false` → `true`; fixedshape flip with a `1e-320`-high box
  (`{x: 0.1}`) `false` → `true`; `bend` with B at x = ∞ or NaN: control x
  `NaN` → `0`; vpsc with diagonal −1e−39: `place` `[-∞, ∞]` → `[0, -0.5]`.
- **Probes** ([harness/probes/](harness/probes/)), base vs scratch head, 5
  formats: ipsep 5/5, ipsep-diredge 5/5, curved-dot 10/10 (dot, neato),
  curved-neato 10/10, shape-scale 10/10: all identical. A counting copy of the
  bundle confirmed that each probe reaches its site (T1 lists the counts).
- **Port vs native 16.1.1** on the probes (`oraclePreflight` ok for dot and
  neato): xdot, plain and cmapx equal byte for byte on all 18 jobs.
- **Survey** ([harness/survey-ids.txt](harness/survey-ids.txt), 18 ids, all 8
  engines, 5 formats), base vs scratch head: 720 jobs, 720 identical,
  0 diffs, 0 capped. `1652` was dropped: every job of it timed out at 120 s
  on both bundles, dot included (T1).
- **Baseline gates** (load 13-26): typecheck exit 0; `npm test` 579 files,
  13610 passed, 18 expected fail; `gates.sh` 5/5 PASS; corpus + docs 25 files,
  2863 passed.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with this
   brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 064266d2..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, and never merge `main` into it.
- **Base sha:** `064266d28e5d89baf34faa50b809aedeed4a41ad` (tip at planning). If
  the tip moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-154 brief` (this
  directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T1's last step):** `git tag issue-154/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(common): test division results for finiteness, as 16.1.1 does

  Graphviz 16.1.1 replaces four divisor-is-zero guards with a check that
  the quotient is finite (fdiv_overflow, fdivf_overflow; upstream
  0d34ab7d6, fb7f0feb3, 0b24f6444, d8c1cc3c9). Port the two helpers and
  use them in poly_inside's scale, bend, and the vpsc alpha and beta
  steps. Only non-finite quotients behave differently (a subnormal or
  non-finite operand, or a float32 overflow); no corpus output changes.

  Refs: #154
  ```

  Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR,
  or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; 13610 + new passed, 18 expected fail |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-fdiv-overflow-guards.md#bytediff) | identical on every job |
| 6 | Targeted survey | see [T1](batch-1/T1-fdiv-overflow-guards.md#targeted-survey) | identical on every job; probes equal native |

The oracle is graphviz 16.1.1 (ADR-0002): `~/git/graphviz-16.1.1/build/cmd/dot/dot`,
with `/tmp/ghl1611` for dot and `/tmp/ghl1611-all` for neato. Run
`oraclePreflight` (`test/corpus/oracle-env.ts`) for both before trusting native
output. If `config8` is missing, run `GVBINDIR=<dir> <dot> -c`. Check `uptime`
before gates 5 and 6, and wait if the load is above 12.

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
3. A red-step test passes on the base. That means the planning measurement of
   that case is wrong: diagnose before changing the test.
4. Gate 5 or 6 shows any changed output, base to head. Diagnose it to a
   mechanism. If the head equals native there, it is a toward-native change
   under the queue rules: record it and go on. Otherwise halt.
5. An existing test fails because of the change.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong,
   for example a reader of beta other than `applyBeta` (AD-3).

## Push-forward (decide alone, journal it)

- Test names, and whether the ∞ and NaN `bend` cases are one `it.each`.
- Doc-comment wording for the helpers and the exact `@see` line ranges.
- Whether `descentStep` names `alpha` in a local before negating it, as long as
  it returns `-alpha` with alpha = 1 on overflow.
- Whether the existing "zero xsize" test's comment gains a line on 16.1.1's
  guard.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-5, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-fdiv-overflow-guards.md](batch-1/T1-fdiv-overflow-guards.md) | the task |
| [harness/scan-fdiv.mjs](harness/scan-fdiv.mjs) | lists corpus inputs that reach the sites with unusual operands (survey selection) |
| [harness/survey-ids.txt](harness/survey-ids.txt) | gate 6 ids |
| [harness/probes/](harness/probes/) | ipsep, curved and shape-scale probes |
| [diagrams/data-flow.md](diagrams/data-flow.md) | one guarded division |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (the project journal): mechanism, files,
  gates.
- Write `.agent-notes/issue-154.md` only for something novel (AD-3's "a guard
  whose fallback the reader cannot tell from the old value" may qualify).
  Otherwise, say in the journal row that nothing was novel.
- Comment on #154 with the outcome: the four guards ported, which unit cases
  changed, no corpus output change.
- The final message ends with the driver's status line.

## Summary (2026-11-16)

- **Tasks:** 1 of 1 (T1).
- **Decisions:** AD-1 to AD-5 held as planned. Journalled push-forwards: extra
  helper cases and a -inf `bend` case; `alpha` named in a local; the head
  bundle built straight to `$TMPDIR`. None flagged for review.
- **Gates:** typecheck 0; `npm test` 579 files, 13632 passed, 18 expected
  fail; `gates.sh` 5/5; corpus + docs 2863 passed; smoke bytediff 1960/1960
  identical; survey 720/720 identical; probes 40/40 identical and equal to
  native 16.1.1 on 24/24 jobs (xdot, plain, cmapx).
- **Known gaps:** `1652` is not compared (it times out on both bundles, as at
  planning). The brief's "18" native jobs is 24.
- **Stop summary:** done, no halt.
