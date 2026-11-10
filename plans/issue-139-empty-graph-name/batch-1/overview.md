# Batch 1

One task. No dependencies.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Root header reads `g.anonymous`; subgraph anonymity is `%`-prefix only; parser consumes anon id 1 only for a nameless root; `createGraph()` without `name` is anonymous; pin six harness fixtures against native refs | orchestrator (no subagent: four small edits) | `src/render/dot/agwrite.ts`, `src/parser/builder.ts`, `src/api/builder.ts`, `src/model/graph.ts` (doc), `src/model/cgraph-ops.ts` (doc, if stale), `src/render/dot/empty-graph-name.test.ts` (new), `src/api/builder.test.ts`, `plans/issue-139-empty-graph-name/harness/out/*` (regenerated), `plans/post-16.1-followups/README.md` (item 153), journals, `.agent-notes/issue-139.md` | — | [x] |

Spec: [T1-empty-graph-name.md](T1-empty-graph-name.md).
