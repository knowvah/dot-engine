<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — fdp map timeout classification

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|-----------|------|
| T6 | Classify 4 fdp map timeout ids (AD-4) | (main) | `test/corpus/accepted-divergences-map.json` or perf-quarantine notes, `map-parity-fdp.json(l)` | T4 | [ ] |

Depends on T4 because any fdp layout fix changes these ids' outputs.
Gate: typecheck + tests; classifications journaled.
