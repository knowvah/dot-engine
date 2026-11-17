# Batch 1

Two tasks, in order. Orchestrator only, no subagent: T1 is one small change in
one source file with its tests, and T2 needs T1's head.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | `RouteHelper.eq` at the three sites; `@internal` export; red tests from native 16.1.1 | orchestrator | `src/pathplan/route.ts`, `src/pathplan/route.branch.test.ts` | — | [x] |
| T2 | Gates 1-6, comments, report, squash | orchestrator | journals, README, `harness/execution-survey.txt` | T1 | [x] |

Specs: [T1](T1-eq-tolerance.md), [T2](T2-gates-finish.md).
