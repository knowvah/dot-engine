# Batch 1

Two tasks, in order. Orchestrator only, no subagent: T1 is one deletion in one
source file with its tests, and T2 needs T1's head.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Delete weak/strong clusters from `rank-dot2.ts`; red tests; un-list both goldens | orchestrator | `rank-dot2.ts`, `rank-dot2.branch.test.ts`, optional `rank-dot2.compact.test.ts`, `test/golden/known-failing.json` | — | [x] |
| T2 | Gates 1-6, comments, report, squash | orchestrator | journals, README | T1 | [x] |

Specs: [T1](T1-remove-compact.md), [T2](T2-gates-finish.md).
