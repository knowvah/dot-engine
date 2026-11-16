# Batch 1

Two tasks, in order. Orchestrator only, no subagent: T1 is three small edits in
two source files with their tests, and T2 needs T1's head.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Gate, `flat_in`/`ND_other` scan, C self-loop adjacency; branch tests; regression file | orchestrator | `flat.ts`, `mincross.ts`, their branch tests, `flat-other-label.test.ts` | — | [x] |
| T2 | Gates 1-6, follow-up issue, comments, report, squash | orchestrator | journals, README, `harness/execution-survey.txt` | T1 | [x] |

Specs: [T1](T1-flat-other-scan.md), [T2](T2-gates-finish.md).
