# Batch 1

One task. No dependencies.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Port 16.1.1's finite-quotient guards: `fdivOverflow`/`fdivfOverflow` and their four call sites | orchestrator (no subagent: four small edits that share one helper) | `src/util/overflow.ts`, `src/common/poly-inside.ts`, `src/layout/dot/straight-edges.ts`, `src/layout/neato/quad-prog-vpsc.ts`, their four test files, journals | — | [x] |

Spec: [T1-fdiv-overflow-guards.md](T1-fdiv-overflow-guards.md).
