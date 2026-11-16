# Batch 1

Two tasks, in order. Orchestrator only, no subagent: T1 is three small guards
and one walker branch in three files, and T2 needs T1's head.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Port the five 16.1.1 no-out-edge guards; red tests; 2765 pin | orchestrator | `edge-route-chain.ts`, `edge-route-faithful.ts`, `splines-route.ts`, their tests, `edge-route-chain.dead-end.test.ts`, `no-out-edge-2765.test.ts` | — | [x] |
| T2 | Gates 1-6, comments, report, squash | orchestrator | journals, README | T1 | [x] |

Specs: [T1](T1-no-out-edge-guards.md), [T2](T2-gates-finish.md).
