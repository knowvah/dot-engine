<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — imagemap triage (7 non-dot engines)

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|-----------|------|
| T8 | imagemap sweep ×7 non-dot + fix/accept | (main, diagnosis mode) | `src/render/map.ts`, `test/corpus/accepted-divergences-map.json`, `test/corpus/map-parity-*.json`, repo-root `plans/decision-journal.md` | T4 | [x] |

Sequenced after Batch 4 (shares `src/render/map.ts`). dot imagemap already a
track (99.2%); scope is the 7 non-dot engines. Iterative per AD-4.
