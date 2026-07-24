<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — json triage (7 non-dot engines)

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|-----------|------|
| T7 | json sweep ×7 non-dot + fix/accept | (main, diagnosis mode) | json serializer src (`src/render/*json*`), `test/corpus/accepted-divergences-json.json`, `test/corpus/json-parity-*.json`, repo-root `plans/decision-journal.md` | T3 | [ ] |

Sequenced after Batch 3 (may touch shared src). dot json is already a track
(99.7%); scope here is neato/fdp/sfdp/circo/twopi/osage/patchwork. Iterative
engines per AD-4.
