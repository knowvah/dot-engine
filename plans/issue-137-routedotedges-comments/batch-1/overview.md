# Batch 1

One task. No dependencies.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Rewrite four comments that name the removed backstop or `edge-order.ts`. Remove the port-only aux `placeRegularEdgeLabels` call (AD-1). Prove byte identity | orchestrator (no subagent: small change) | `src/layout/dot/{splines-flat-labeled,splines-flat}.ts`, `src/render/svg.ts`, `src/model/edgeInfo.ts`, `src/util/bsd-qsort.ts`, `.agent-notes/followup-14-flat-labeled-lost.md` (one line), `plans/post-16.1-followups/README.md` (item 151), journals, `.agent-notes/issue-137.md` | — | [x] |

Spec: [T1-retire-backstop-refs.md](T1-retire-backstop-refs.md).
