# Batch 1

Two tasks, in order. Orchestrator only, no subagent: T1 is one small change in
one source file with its tests, and T2 needs T1's head.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | `generateRandomOrdering` → `gvPermutation`, no seed, `SEED` gone; red tests; re-pinned fixtures | orchestrator | `src/ortho/partition.ts`, `src/ortho/index.ts`, `src/ortho/partition.test.ts`, `src/ortho/ortho-failure.test.ts`, `src/ortho/ortho.test.ts` | — | [x] |
| T2 | Gates 1-6, comments, report, squash | orchestrator | journals, README, `harness/execution-survey.txt` | T1 | [x] |

Specs: [T1](T1-gv-permutation.md), [T2](T2-gates-finish.md).
