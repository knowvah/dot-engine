<!-- SPDX-License-Identifier: EPL-2.0 -->
# T7 — regenerate the dashboards and run the final gates

**Agent:** executor · **Depends on:** T5 (and T6 if it ran) · **Commit:** one

## Context

`PARITY.md` and the per-track `PARITY-*.md` pages are generated from the parity
artifacts. This task is their **sole writer**, so no two tasks ever write the same
generated file. CLAUDE.md also treats a mission with any quarantined or excluded
case as incomplete until its comparison page exists and is referenced in the
decision journal.

## Task

1. Regenerate the dashboards:
   ```
   npx tsx test/corpus/dashboard.ts        # PARITY-dot.md from parity.json
   npx tsx test/corpus/parity-report.ts    # PARITY.md + every per-track page
   ```
2. Verify the target rows are resolved and no track regressed.
3. Run the final gates (below).
4. Append the mission summary to both this brief's journal and the repo-level
   `plans/decision-journal.md`: tasks completed vs planned, verdicts earned,
   anything escalated, and the follow-ups left open.
5. Sanity-check the **accepted tables render a reason for every row**. Class-only
   ids have no per-id registry row by design, so their reason comes from the class
   rationale seeded in `parity-report.ts`; a blank reason column means a
   "documented, won't-fix" row with no documentation.

## Write-set

- `test/corpus/PARITY.md` and `test/corpus/PARITY-*.md`
- `plans/attribute-and-address-new-divergences/decision-journal.md`
- `plans/decision-journal.md` (repo-level, append-only)

## Read-set

- [README.md](../README.md) — the batch table to mark complete
- every prior task's journal entries
- `test/corpus/parity-report.ts:696-740` — how accepted reasons and class
  rationales are resolved

## Acceptance criteria

1. **Given** all sweeps are complete, **when** the dashboards are regenerated,
   **then** `PARITY.md` shows the mission's 7 target rows resolved (`accepted`
   or `conformant`), and any id left `diverged` is one T6 explicitly escalated.
2. **Given** the accepted tables are inspected, **then** every accepted row has a
   non-empty reason.
3. **Given** the final gates run, **then** `npm run typecheck` is clean and
   `npm test` is green.
4. **Given** the mission touched only `test/corpus/` and `plans/`, **then** the PR
   title is `test:` or `chore:` — **never** `fix:`, which would publish a no-op
   npm release of an unchanged library. Use `fix:` only if T6 landed a `src/` fix.
5. **Given** `src/` was touched, **then** `npx tsx test/corpus/rules-gate.ts`
   reports 0 regressions.

## Observability requirements

The regenerated dashboards *are* this mission's observable output. Confirm the
per-track `surveyed` counts are internally consistent — a track lagging the
universe should be stated in the journal, not left as an unexplained number
(e.g. after this mission the deterministic-engine, plain, dot-format and imagemap
tracks will still be behind the 910-id universe; that is out of scope but must be
recorded so the next session does not rediscover it).

## Rollback

**Reversible** — generated documentation; re-run the two commands to reproduce.

## Commit

`test(corpus): refresh parity dashboards after drift attribution`
Body: the mission summary — planned vs completed, verdicts, escalations,
follow-ups.
