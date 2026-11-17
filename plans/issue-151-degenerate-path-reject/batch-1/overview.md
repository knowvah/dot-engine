# Batch 1

One task. No dependencies.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Skip dead slots in `widenPathBoxes`; port checkpath's all-degenerate rejection and `printpath` | orchestrator (no subagent: two small edits in two functions) | `src/layout/dot/edge-route-faithful.ts`, `src/common/splines-routespl.ts`, `src/common/splines-routespl.test.ts`, `src/layout/dot/degenerate-path-reject.test.ts`, journals | — | [x] |

Spec: [T1-degenerate-path-reject.md](T1-degenerate-path-reject.md).
