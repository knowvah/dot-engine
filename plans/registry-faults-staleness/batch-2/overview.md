# Batch 2 — staleness check, engine join, json/map walkers

Three independent tasks, all consuming T1's exports from
`test/corpus/accepted-class.ts` (read-only here). Write-sets are disjoint, so
they may run as parallel subagents; the orchestrator lands them one at a time
(gates between) and journals each.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T2](T2-staleness.md) | Staleness helper + table-driven test; retire fdp 1879 ×3, dot-format 1435 | typescript-pro | `test/corpus/registry-staleness.ts`, `registry-staleness.test.ts`, `accepted-divergences-{engines,json,map,dot}.json` | T1 | [x] |
| [T3](T3-engine-join.md) | Engine-track report join accepts matching fault rows | typescript-pro | `test/corpus/parity-report.ts`, `parity-report.test.ts`, `accepted-divergences-engines.test.ts` | T1 | [x] |
| [T4](T4-walkers.md) | json/map walkers mark matching port-errors `accepted` | typescript-pro | `test/corpus/json-walk.ts`, `map-walk.ts`, `json-dashboard.ts`, `map-dashboard.ts` | T1 | [x] |

Note: T2 edits `accepted-divergences-engines.json` (removal only) while T3
edits its *test*; T5 later adds the A10 entries. No file is shared within
the batch.
