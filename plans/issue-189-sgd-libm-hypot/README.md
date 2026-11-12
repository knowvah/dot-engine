# Mission: issue #189: neato sgd uses the libm-hypot model at sgd.c:223

## Objective

2-D `mode=sgd` calls `Math.hypot` at `src/layout/neato/sgd.ts:346` (C
`lib/neatogen/sgd.c:223`). On macOS arm64 the oracle's libm `hypot` differs from it
in the last bit on 18516 of 49590 calls, and SGD amplifies that to as much as 1.59
points. The maintainer's ruling on #133 adopts the existing model
`src/common/libm-hypot.ts` here, as circo, fdp, pathplan, emit-bb and poly-sizing
already do.

Done means: `sgdIteration` calls `libmHypot`; a unit test pins a native-traced
step that `Math.hypot` gets wrong; the ledger entry for `mode=sgd` names `exp` as
the only remaining cause, in English and all 23 locale pages; follow-ups items 143
and 144 are marked; all gates are green. Type `fix`, so this is a patch release.

**Out of scope:** a macOS `exp` model (wontfix, #133; `sgd.c:216` stays
`Math.exp`). Any other layout. Any other `src/` file.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. They override this brief where
   the two disagree.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline b7d2680b..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, never merge `main` into it.
- **Base sha:** `b7d2680ba67ca258dc43a037ede3bfb5fdc0cc70` (tip at planning time).
  If the tip moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-189 brief` (this
  directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T1's last step):** `git tag issue-189/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(neato): use the libm-hypot model in sgd

  sgd.c:223 calls libm hypot, and Math.hypot misses the oracle's macOS
  libm in the last bit on over a third of the calls, which SGD amplifies
  to as much as 1.59 points. Reuse the model circo, fdp and pathplan
  already use. The exp residual stays accepted (ruling on #133).

  Refs: #189
  ```

  Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR,
  or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs`, then `npm run docs:i18n-status` | exit 0; `stale pages: 0` |
| 5 | Smoke bytediff | see [T1](batch-1/T1-sgd-libm-hypot.md#bytediff) | identical on every job (expected) |
| 6 | Targeted survey | see [T1](batch-1/T1-sgd-libm-hypot.md#targeted-survey) | the table in T1 |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot`
(16.1.0). `/tmp/ghl` holds only core and dot_layout, so gate 6 needs its own plugin
dir (recipe in [T1](batch-1/T1-sgd-libm-hypot.md#targeted-survey)). Never use
`/tmp/ghl1611*` here: that is the 16.1.1 build. Run `oraclePreflight`
(`test/corpus/oracle-env.ts:124`) for `neato` before trusting native output. Check
`uptime` before gate 6; above 12, wait.

Baseline at planning: all four baseline gates green on `b7d2680b` (see
[decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts: diagnose to a stated
   mechanism, journal it, stop.
3. Gate 5 shows any changed output. The smoke list has one input that reaches
   sgd, `2613`, and swapping the call left it identical at planning. A change means
   an unexpected path: diagnose it, and halt per the queue rules unless it equals
   native.
4. Gate 6 misses its table: a differing-line count above the table's, a structure
   change, or a delta above the table's maximum. The premise of the ruling is
   wrong: stop with the evidence.
5. A test other than the new one fails because of the swap. At planning, none of
   the nine neato test files that mention sgd did. Issue #189 allows re-recording a
   test that pins the old `Math.hypot` value, but only after stating which value it
   pinned and why the new one equals native.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test wording and placement inside `sgd.test.ts`.
- Each locale's wording of the ledger bullet, as long as it says what
  [AD-3](decisions.md#ad-3-update-the-ledger-entry-in-place)'s English says and
  passes T1's marker check.
- The port's extra `if (mag === 0) continue;` (`sgd.ts:347` before the edit) has no
  C counterpart, and #189's scope excludes it: leave it. Two probes with coincident
  and pinned nodes equal native. File a `follow-up` issue only if a probe shows a
  divergence.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-sgd-libm-hypot.md](batch-1/T1-sgd-libm-hypot.md) | the task |
| [harness/compare.mjs](harness/compare.mjs) | gate 6: native, base, head per input and format |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where the hypot value goes |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (project journal): mechanism, files, gates.
- `.agent-notes/issue-189.md` only for something novel; otherwise state there was
  nothing novel in the journal row.
- Final message ends with the driver's status line.

## Summary (2026-11-10)

- Tasks: 1 of 1 complete.
- Decisions: 5 journal rows, none flagged for review. The brief's AD-1..AD-4 held.
- Gates: 1-6 green; gate 6 equals T1's table; smoke bytediff 1960 of 1960 identical.
- Follow-up: #208, the port's `mag === 0` guard has no C counterpart (native prints
  `nan` on coincident nodes). Same on base and head; left as the brief says.
