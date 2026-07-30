<!-- SPDX-License-Identifier: EPL-2.0 -->
# Stop and push-forward conditions

Approved 2026-07-30. `S*` = stop and wait for human input. `P*` = decide alone.

## Stop conditions

### Standard
- **S1** A task needs to modify a file outside its write-set, and that file is in
  no other task's write-set.
- **S2** Two consecutive gate failures on the same check (typecheck, `npm test`,
  or `rules-gate`).
- **S3** Implementation would contradict D1-D5 in [decisions.md](./decisions.md).
- **S4** The same location or approach has been changed 3+ times without
  resolving the same failing check — three failures signal a design problem, not
  an iteration problem.

### Oracle dependency (this mission's external service)
- **S5** The native oracle no longer emits `GVTS_POS` dump lines (the
  session-local `GVTS_POS_DUMP` patch is gone). Attribution is impossible; do not
  substitute hand acceptance.
- **S6** The oracle binary's sha1 changed mid-mission, so attribution's D4 guard
  refuses to resume. Do NOT `--fresh` past it blindly — a changed oracle
  invalidates the cached dumps and possibly the baseline.
- **S7** The oracle emits incomplete output for a target id that previously
  rendered.

### Scope explosion
- **S8** T1's budget fix flips **more than 15** new `(engine, id)` pairs into
  `diverged`. The phantom-timeout class was masking substantial work; re-scope
  rather than absorb it.
- **S9** `2621` still records `timeout` on any xdot track after T1. That
  falsifies the budget model for iterative engines — diagnose, do not just raise
  the number again.
- **S10** A T6 fix would need broad `src/` surgery (more than one bounded
  mechanism) — D4 tier 3.

### Evidence integrity
- **S11** An id's verdict flips between two runs of the same check *after* being
  re-verdicted standalone. That is the ULP-nondeterminism class
  (`oracle-pos-dump-is-ulp-nondeterministic`): document it, never "fix" the port
  for it.
- **S12** Any `harness-error` row remains in an attribution file at the end of T3.
- **S13** T4 shows an id exonerated on xdot but not transferring to json —
  escalate under D5 instead of absorbing it.

### Repo discipline
- **S14** A `src/` edit is needed while any sweep is running (sweeps read live
  source).
- **S15** A `src/` change was made but only a resume-style sweep has been run. A
  fresh sweep is mandatory before commit.

## Push-forward conditions

- **P1** Env-var names, constant values, and the extracted function signature in
  T1 — provided the shape mirrors `survey.ts`'s `renderBudgetMs`.
- **P2** Raising `ATTR_ORACLE_TIMEOUT_MS` for `2621`; choosing concurrency within
  the <= 4 guidance.
- **P3** Re-verdicting a heavy id standalone when a flip is suspected. This is
  required practice, not a decision.
- **P4** Skipping T6 entirely if every id exonerates and transfers.
- **P5** Journal wording, evidence-file wording, and commit messages within the
  Conventional Commits spec.
- **P6** Regenerating any dashboard that has gone stale.
- **P7** Declaring a `timeout` on a **non-target** id pre-existing and out of
  scope — provided it is recorded in the journal.

## Explicitly NOT push-forward

Both of these would quietly undo work landed in PR #37:

- Writing a **hand per-id acceptance row** instead of letting the computed class
  absorb an id (D5 rejects this).
- **Accepting an id on inherited xdot evidence** when T4's json check failed or
  was not run (D3 forbids this).
