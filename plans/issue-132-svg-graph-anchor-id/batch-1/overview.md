# Batch 1

One task. No dependencies.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | `svgGraphId` returns `graph<seq>`; delete `graphObjId`; pin anchor, area and HTML-anchor ids against native refs | orchestrator (no subagent: small change) | `src/render/svg-id.ts`, `src/render/svg-graph.ts`, `src/gvc/device.ts` (comment), `src/render/svg-subgraph-id.test.ts`, `src/gvc/layout-reset.edges.test.ts`, `plans/issue-132-svg-graph-anchor-id/harness/out/*`, `plans/post-16.1-followups/README.md` (item 142), journals, `.agent-notes/issue-132.md` | — | [x] |

Spec: [T1-svg-graph-id-seq.md](T1-svg-graph-id-seq.md).
