# Mission: issue #129: conjgrad-mkernel's error prints on one line

## Objective

`src/layout/neato/conjgrad-mkernel.ts:28` (C `lib/neatogen/conjgrad.c:65`,
`conjugate_gradient_mkernel`) ends its `agerrorf` text with `\n`. The port's agerr
writers end the line themselves (`src/common/agerr.ts:8-10`, AD-7 of the
structured-errors work), so the console prints a blank second line and an
`agseterrf` sink gets `...vector\n\n`. Native prints one line. Part 11 T5 fixed the
same defect at `conjgrad.ts:209,326` (commit `bbd0b48d`). This mission fixes the
third site and makes its test pin what native does.

Done means: `ZERO_LENGTH_MESSAGE` has no trailing `\n`; the test asserts one
console line, `Error: conjugate_gradient: unexpected length 0 vector`, and the
sink pieces `['Error', ': ', '...vector\n']`; follow-ups README item 139 is marked
DONE; all gates are green. Type `fix`, so this is a patch release.

**Out of scope:** any other agerr site, any other file under `src/`.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read the queue rules (`.claude/queue-policy.md`, injected into the session). They
   override this brief where the two disagree.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 35f98bb0..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, never merge `main` into it.
- **Base sha:** `35f98bb00054f3adc43cafc6ae61507acf8373cc` (tip at planning time).
  If the tip moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-129 brief` (this
  directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T1's last step):** `git tag issue-129/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(neato): print conjgrad-mkernel's error on one line

  conjugate_gradient_mkernel passed C's trailing \n to agerrorf, but the
  port's agerr writers finish the line themselves, so the console printed
  a blank second line and an agseterrf sink got two newlines. Part 11 T5
  fixed the other two conjugate_gradient sites the same way.

  Refs: #129
  ```

  Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR,
  or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [batch-1/T1](batch-1/T1-drop-trailing-newline.md#bytediff) | every changed output equals native; expected: no change |
| 6 | Targeted survey | see [batch-1/T1](batch-1/T1-drop-trailing-newline.md#targeted-survey) | port stderr and output equal native |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot`
(16.1.0). Run `oraclePreflight` (`test/corpus/oracle-env.ts:124`) or
`preflightOrExit` before trusting native output; a missing `config8` is fixed with
`GVBINDIR=<dir> <dot> -c`. Check `uptime` before gate 6; above 12, wait.

Baseline at planning: `npm run typecheck` and `npm test` green on `35f98bb0`
(see [decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts: diagnose to a stated
   mechanism, journal it, stop.
3. Native does not print exactly one line for this message (an instrumented native
   shows otherwise): the premise is wrong; stop with the evidence.
4. The smoke bytediff or targeted survey shows any output or stderr change other than
   the removed blank line: halt per the queue rules.
5. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test wording and structure, as long as it mirrors `conjgrad.test.ts` (T5's).
- Whether the zero-length text becomes a shared constant with `conjgrad.ts`: no.
  Keep the module-local constant (AD-2).
- Which neato corpus ids make up the targeted survey, within the rule in T1.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-3, baseline |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-drop-trailing-newline.md](batch-1/T1-drop-trailing-newline.md) | the task |
| [diagrams/data-flow.md](diagrams/data-flow.md) | message path, console vs sink |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (project journal): mechanism, files, gates.
- `.agent-notes/issue-129.md` only for something novel; otherwise state there was
  nothing novel in the journal row.
- Final message ends with the driver's status line.

## Summary (2026-11-10)

- Tasks: 1 of 1 done (T1).
- Decisions: none beyond AD-1..AD-3. Two execution choices journalled: the base
  bundle came from `git archive` rather than a temporary worktree, and gate 6 used
  a headless plugin dir with `neato_layout` built in `$TMPDIR`, because `/tmp/ghl`
  is dot-only.
- Gates: typecheck 0; `npm test` 557 files / 12730 tests; goldens 5/5; corpus and
  docs 23 files / 2837 tests; smoke bytediff 1960/1960 identical; targeted survey
  8 ids x svg, xdot: head = base = native, stderr empty.
- Native check: a harness on the 16.1.0 `libneatogen.a` prints one line and
  returns 1 on the test's fixture.
- Known issues or follow-ups: none in the port. `.agent-notes/issue-129.md` records
  the missing all-engines 16.1.0 plugin dir.
