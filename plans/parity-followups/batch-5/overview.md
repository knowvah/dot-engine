<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — Reconcile + report + close

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|-----------|------|
| T7 | Registry reconciliation + PARITY regen + full gates + journal wrap | (main) | `test/corpus/PARITY*.md` (regen), registries (final state), repo-root `plans/decision-journal.md`, this brief's `README.md` | T1–T6 | [x] |

Gate: `npm run typecheck` + `npm test` + `npm run docs:build` all exit 0;
PARITY.md shows 0 unexplained diverged and no track regressed vs the
mission-start commit.
