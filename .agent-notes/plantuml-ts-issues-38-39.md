# plantuml-ts issues 38 and 39 (2026-11-04)

## Observation: a graph's subgraph membership is invisible to plantuml-ts's `dotEqual`
- **Context**: Tracing plantuml-ts issue 39, filed as a dot-engine placement bug on a border-point cluster.
- **Finding**: `tests/oracle/svek-dot.ts#scanNesting` in plantuml-ts folds the `ee` and `i` wrappers into the base cluster, so `dotEqual` is true while the anchor sits in a different subgraph from the jar's. That move shifts inner nodes by 2-11 pt and cluster widths by 3-8 pt.
- **Impact**: `dotEqual` true does not show the engine got the jar's graph. Before treating a plantuml-ts `layoutEqual: false` as an engine bug, render the jar's `svek-1.dot` through `DE.parse` and compare with native; if they match, diff the builder's graph with `render(b.graph, 'dot')`.
- **Confidence**: High

## Observation: an edit to one wrapper's membership reproduces a reported layout exactly
- **Context**: Same trace.
- **Finding**: Native on the jar's DOT with `zaent0001` moved into `cluster6i` gave the builder's positions to the point. The reverse move in the builder, done from a scratch script with a `Proxy` over `addSubgraph`, gave native's on all six nodes, with no change in plantuml-ts's checkout.
- **Impact**: Two-way mutation is a cheap proof of a consumer-side cause, and it needs no edits in the consumer's repo.
- **Confidence**: High

## Observation: GitHub Actions queued runs for 15+ minutes on 2026-11-04
- **Context**: Docs on `527a2f70` timed out in `actions/deploy-pages@v5` at `updating_pages`; the runs for `a211002b` and `d9284a3e` then sat in `queued`.
- **Finding**: No failure in the build step or the workflow's own code. The two symptoms were not shown to share a cause.
- **Impact**: Re-check Docs on the next main push before looking for a code cause.
- **Confidence**: Medium
