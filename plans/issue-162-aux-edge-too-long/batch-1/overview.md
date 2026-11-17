# Batch 1

Two tasks, in order. Orchestrator only, no subagent: T1 is one refusal and its
return-code plumbing across five files, and T2 needs T1's head.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | `makeAuxEdge` refuses `len > INT_MAX`; status returns to `dotPosition` and the pack arm; nodesep saturation; red tests; corpus pins | orchestrator | `position-aux.ts`, `position.ts`, `classify.ts`, `pack-components.ts`, `graph-init.ts`, their tests, `aux-edge-too-long-2781.test.ts`, `graph-init.nodesep.test.ts` | — | [x] |
| T2 | Gates 1-6, comments, report, squash | orchestrator | journals, README | T1 | [x] |

Specs: [T1](T1-aux-edge-failure.md), [T2](T2-gates-finish.md).
