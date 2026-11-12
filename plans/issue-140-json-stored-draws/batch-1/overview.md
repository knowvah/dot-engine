# Batch 1

One task. No dependencies.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Pin json's stored draw strings on undrawn objects against native refs; mutation check; fix two comments; mark item 154; file the viewport follow-up | orchestrator (no subagent: one test file and two comments) | `src/render/json-stored-draws.test.ts` (new), `src/render/dot.ts` (comment), `src/render/json.ts` (comment), `plans/issue-140-json-stored-draws/harness/out/*` (regenerated, must not change), `plans/post-16.1-followups/README.md` (item 154), journals, `.agent-notes/issue-140.md` | — | [x] |

Spec: [T1-json-stored-draws.md](T1-json-stored-draws.md).
