# Batch 1

One task. No dependencies.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Port `label_subgs`/`insert`/`lookup` (json writer's cluster map) with `insert`'s `Duplicate cluster name` warning; `assignIds` uses them; pin native stderr refs | orchestrator (no subagent: small change) | `src/render/json-cluster-edge.ts`, `src/render/json.ts`, `src/render/json-dup-cluster.test.ts` (new), `plans/issue-135-json-dup-cluster-warn/harness/out/*` (regenerated; must not change), `plans/post-16.1-followups/README.md` (item 146), journals, `.agent-notes/issue-135.md` | — | [x] |

Spec: [T1-dup-cluster-warn.md](T1-dup-cluster-warn.md).
