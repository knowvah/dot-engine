# Batch 1

Two tasks, in order. Orchestrator only, no subagent: T1 is four small guards
with tests in four files, and T2 needs T1's head.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Port the five 16.1.1 empty-rank guards; branch tests; 2759 regression | orchestrator | `self-loop.ts`, `position-bbox.ts`, `position-ycoords.ts`, `position-aux.ts`, their test files, `empty-rank-2759.test.ts` | — | [x] |
| T2 | Gates 1-6, follow-up issue, comments, report, squash | orchestrator | journals, README | T1 | [x] |

Specs: [T1](T1-empty-rank-guards.md), [T2](T2-gates-finish.md).
