# Mission: issue #155: HTML labels ignore white space around `<IMG>`

## Objective

Graphviz 16.1.1 accepts strings before and after `<IMG/>` in a `<TD>`
(`~/git/graphviz-16.1.1/lib/common/htmlparse.y:338-356`; upstream `765733407`,
`3261dba20`, test `test_2821`). Strings made only of spaces print nothing. A
string with any other character prints
`Syntax error: non-space string used before <IMG>` (or `after <IMG>`). Native
still draws the label with its image after that error, because `htmlerror`
runs without `YYABORT`, and rv 3 makes the caller print `in label of …`. The
port still has 16.1.0's rule (`src/common/htmltable-parse.ts:273-292`). It
turns every such cell into a hard `syntax error` and an empty label. Corpus
ids `2821_1` and `2821_2` show this (#148).

The port needs:

1. The image rule's grammar
   ([AD-4](decisions.md#ad-4-an-image-cell-holds-the-image-alone)) in a new
   module ([AD-3](decisions.md#ad-3-the-image-rule-goes-in-a-new-module)).
2. A soft parse error that prints, keeps the label and returns rv 3
   ([AD-1](decisions.md#ad-1-a-soft-parse-error-print-it-keep-the-label-return-rv-3)),
   and quiets later `htmlerror` and expat messages as C's `ctx->error` guard
   does ([AD-2](decisions.md#ad-2-after-a-soft-error-only-htmlerror-and-expat-messages-go-quiet)).

Done means:

- Tests that are red on the base cover each AD-4 row, the AD-2 sequences, rv
  and the drawn image.
- [harness/compare-native.sh](harness/compare-native.sh) on the head gives
  14/15 EQUAL. `soft-then-unknown` differs only by the line #228 covers.
- Every gate is green. Smoke bytediff identical. In the survey, only `2821_1`
  and `2821_2` change, and they equal native.

Type `fix`.

**Out of scope:**

- #226 (harness cwd and image sizer). #228 (the unknown element printed twice).
- Corpus records ([AD-5](decisions.md#ad-5-no-corpus-records-change)) and
  native's exit status
  ([AD-6](decisions.md#ad-6-natives-exit-status-is-not-modelled)).
- Any other `htmlparse.y` change in 16.1.0..16.1.1.

## Evidence (measured at planning, base `ea97a89a`)

- **Native 16.1.1**, 15 probes ([harness/probes/](harness/probes/)), with
  `2821.png` present and absent. The stderr and xdot are in
  [native-png/](harness/native-png/) and [native-nopng/](harness/native-nopng/).
  Blank strings: no message, one image. Non-space strings: the soft error and
  `in label of node Q`, and the image is still drawn (exit 1). IMG followed by
  another tag: hard `syntax error` at that tag (`two-img`: context
  `...  <IMG …/> ...`; `ws-after-br`: `...  <BR/> ...`).
- **Base port vs native** (`compare-native.sh`, xdot and stderr): 0/15 EQUAL.
  The base gives a hard `syntax error` at the whitespace token every time.
- **From the repository root** (the survey's cwd), native on
  `2821_0`/`2821_1`/`2821_2` prints the missing-file warning, the
  `No or improper image` error and `in label of …`.
- **`oraclePreflight`** for dot (`/tmp/ghl1611`): ok, version 16.1.1.
- **Baseline gates** (load 10-32): typecheck exit 0; `npm test` 579 files,
  13632 passed, 18 expected fail; `gates.sh` 5/5 PASS; corpus + docs 25 files,
  2863 passed.
- Filed while planning: #228 (follow-up).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with this
   brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline ea97a89a..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, and never merge `main` into it.
- **Base sha:** `ea97a89a2e398d3a630b91bd9d1527ae49a3397a` (tip at planning). If
  the tip moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-155 brief` (this
  directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T1's last step):** `git tag issue-155/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(common): allow white space around img in html-like labels

  Graphviz 16.1.1 lets strings stand before and after <IMG> in a cell
  (htmlparse.y image rule; upstream 765733407, 3261dba20). Blank ones
  are ignored. A non-space one is reported through htmlerror without
  aborting, so the label is still drawn and make_label prints "in
  label of". Port the rule, and C's ctx->error guard that quiets later
  parser and expat errors.

  Refs: #155
  ```

  Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR,
  or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; 13632 + new passed, 18 expected fail |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-img-white-space.md#bytediff) | identical |
| 6 | Targeted survey | see [T1](batch-1/T1-img-white-space.md#targeted-survey) | only `2821_1`/`2821_2` change, equal to native; probes 14/15 |

The oracle is graphviz 16.1.1 (ADR-0002): `~/git/graphviz-16.1.1/build/cmd/dot/dot`
with `/tmp/ghl1611`. Run `oraclePreflight` (`test/corpus/oracle-env.ts`)
before trusting native output. If `config8` is missing, run
`GVBINDIR=/tmp/ghl1611 <dot> -c`. Check `uptime` before gates 5 and 6, and wait
if the load is above 12.

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
3. A red-step test passes on the base: diagnose before changing the test.
4. Gate 5 or 6 changes an output that the brief does not expect. Diagnose it to
   a mechanism. If the head equals native there, it is a toward-native change:
   record it and go on. Otherwise halt.
5. A probe's head output differs from native in a way AD-1 to AD-4 do not
   explain (other than #228's line). Instrument native, find where the port
   departs, and journal it. If the fix lies outside the write-set, halt.
6. `htmltable-parse.ts` cannot stay at 584 lines or fewer without moving code
   beyond the image rule, `parseError` and the cell scan.

## Push-forward (decide alone, journal it)

- Where the soft error helper lives (state module or image module), and its
  name.
- How AD-2 tells unknown-element lexical errors from the others.
- Test names and grouping, and whether the end-to-end cases get a new file.
- How the cell scan records "only strings since `<TD>`" (a flag or a start
  index).

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-6, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-img-white-space.md](batch-1/T1-img-white-space.md) | the task |
| [harness/compare-native.sh](harness/compare-native.sh) | probes: port bundle vs native, xdot and stderr |
| [harness/probes/](harness/probes/) | 15 probe graphs |
| [harness/survey-ids.txt](harness/survey-ids.txt) | gate 6 ids |
| [diagrams/data-flow.md](diagrams/data-flow.md) | a soft error, end to end |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (the project journal): mechanism, files,
  gates.
- Write `.agent-notes/issue-155.md` only for something novel. A grammar error
  that keeps the label (htmlerror without YYABORT) probably qualifies.
- Comment on #155 with the outcome: the probes, and which ids moved.
- The final message ends with the driver's status line.

## Summary (2026-11-16)

- **Tasks:** 1 of 1 done (T1).
- **Decisions:** 13 journal rows in [decision-journal.md](decision-journal.md).
  One is for review: AD-4's fourth row was refined from native. With a
  non-space string after the IMG and then a token other than `</TD>`, native
  prints the after-IMG error at that token and drops the label without
  another message. The plain `syntax error` the row names prints only when the
  strings are blank. Evidence: [harness/probes-extra/](harness/probes-extra/)
  `e01`, `e02`, `e07`, `e24` and
  [harness/htmlparse-image-states.txt](harness/htmlparse-image-states.txt).
- **Gates:** typecheck exit 0; `npm test` 580 files, 13683 passed, 18 expected
  fail; `gates.sh` 5/5; corpus + docs 2863 passed; smoke bytediff 1960/1960
  identical; survey 25/35 identical, the 10 changed jobs being `2821_1` and
  `2821_2` in every format, each equal to native from the repository root;
  probes 14/15 EQUAL, `soft-then-unknown` short #228's line.
- **Toward-native changes:** `2821_1`, `2821_2` (dot; svg, xdot, plain, json,
  cmapx). Accepted-row changes: none.
- **Known issues and follow-ups:** #228 (the unknown element printed twice)
  and #226 (harness cwd and image sizer) stay open. Nothing new was filed.
- **Write-set:** as planned, plus `.agent-notes/issue-155.md` and extra probe
  evidence under `harness/`. `htmltable-parse.ts` is 574 lines.
