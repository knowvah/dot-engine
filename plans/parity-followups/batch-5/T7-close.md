<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — Reconcile + close

## Task
1. Audit all three registries: zero entries whose rationale still says
   "follow-up" or "blind spot" without a mechanism; every entry either
   deleted (id passes) or carries its final mechanism-specific rationale.
2. Regenerate `PARITY.md` + detail pages (`npx tsx test/corpus/
   parity-report.ts`); compare every track's pass count against the
   mission-start commit — 0 regressions, improvements listed.
3. Full gates: `npm run typecheck`, `npm test`, `npm run docs:build`.
4. `git diff --name-only <start> -- src/` audited against the union of
   T2–T5 write-sets; any extra file must have a journal entry.
5. Mission summary appended to repo-root `plans/decision-journal.md`
   (fixes vs accepts vs closures, per-track deltas) and to this brief's
   README; all batch checkboxes `[x]`.

## Write-set
- `test/corpus/PARITY*.md` (regenerated), registries (final state)
- repo-root `plans/decision-journal.md`, `plans/parity-followups/README.md`

## Acceptance criteria
- Given the registries, then no placeholder rationale exists anywhere.
- Given PARITY.md, then 0 unexplained diverged and no track regressed.
- Given the gates, then all three exit 0.

## Observability / rollback
N/A. Reversible.

## Quality bar
All gates green; summary written; checkboxes updated.
