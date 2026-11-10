# Batch 1

One task. No dependencies.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | `echoAttr`/`echoGraphAttr` use `agstrcanon`; delete dead `agcanonEscape`/`isEscapeSeq`; pin ten harness cases against native refs | orchestrator (no subagent: small change) | `src/render/dot/attrs.ts`, `src/render/dot/xdot-ops.ts`, `src/render/dot/xdot-ops.branch.test.ts`, `src/render/dot.ts` (comment), `src/render/dot/echo-attr-wrap.test.ts` (new), `plans/issue-134-echo-attr-canon/harness/out/*` (regenerated), `plans/post-16.1-followups/README.md` (item 145), journals, `.agent-notes/issue-134.md` | — | [x] |

Spec: [T1-echo-attr-canon.md](T1-echo-attr-canon.md).
