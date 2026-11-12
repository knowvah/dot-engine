# Batch 1

One task. No dependencies.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | json0's node `pos`/`width`/`height` fallback uses attach_attrs' formatting through one exported write-back function; pin native json0 refs | orchestrator (no subagent: small change) | `src/render/dot/write-back.ts`, `src/render/json.ts`, `src/render/json0-node-attrs.test.ts` (new), `plans/issue-136-json0-node-numbers/harness/out/*` (regenerated; must not change), `plans/issue-136-json0-node-numbers/followup-anon-root-name.md` (issue number), `plans/post-16.1-followups/README.md` (item 147), journals, `.agent-notes/issue-136.md` | — | [x] |

Spec: [T1-json0-node-numbers.md](T1-json0-node-numbers.md).
