# Batch 1

One task, with no dependencies.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Build the aux `rank=source` subgraph `xxx` with `auxt` in it, pin it and native's aux ranks in tests | orchestrator (no subagent: a few lines of change plus a native probe that needs the session's context) | `src/layout/dot/splines-flat.ts`, `src/layout/dot/splines-clone.ts`, `src/layout/dot/splines-clone.test.ts`, `src/layout/dot/flat-adj-source-subgraph.test.ts` (new), `plans/post-16.1-followups/README.md`, `plans/decision-journal.md`, this mission's `decision-journal.md`, `.agent-notes/issue-130.md` (only if novel) | none | [x] |

Spec: [T1-source-subgraph.md](T1-source-subgraph.md).
