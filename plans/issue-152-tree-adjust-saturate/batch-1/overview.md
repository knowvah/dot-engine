# Batch 1

One task. No dependencies.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Port `sadd_saturate` to `src/util/overflow.ts`; use it in `treeAdjust` | orchestrator (no subagent: one helper and one statement) | `src/util/overflow.ts`, `src/util/overflow.test.ts`, `src/layout/dot/ns-subtree.ts`, `src/layout/dot/ns-range.test.ts`, journals | — | [x] |

Spec: [T1-tree-adjust-saturate.md](T1-tree-adjust-saturate.md).
