<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Plain triage

Run the plain sweep across all 8 engines and resolve every divergence. This is
the judgment-heavy task; obey diagnosis discipline (instrument C, state the
mechanism, no guessing) and the stop conditions.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|-----------|------|
| T6 | plain sweep ×8 + fix/accept all divergences | (main, diagnosis mode) | `src/render/map.ts`, `test/corpus/accepted-divergences-plain.json`, `test/corpus/plain-parity-*.json`, repo-root `plans/decision-journal.md` | T5 | [ ] |

Sequenced (not parallel with T7/T8 — shares `src/render/map.ts`). Known first
target: node + edge label DOT-canonicalization in `writePlain` (labels with
spaces/quotes currently emitted raw; C uses `canon()`).
