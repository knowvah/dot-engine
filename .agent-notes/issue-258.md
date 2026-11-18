# issue-258 mission — observations (2026-11-18)

## Observation: a re-opened named subgraph is one `Graph`
- **Context**: #258, `graph G { subgraph p { a } cluster=true; subgraph p { b } }`.
- **Finding**: `processSubgraph` (`src/parser/builder.ts`) looks the name up in the direct
  parent's `subgraphs` map and, when it is there, builds the body into that `Graph` and returns
  it, as `agsubg` returns the existing subgraph (`lib/cgraph/subg.c:52-60`). Nothing is retaken:
  no new seq, no new `graphDefaultsSnapshot`, no seeding pass. The subgraph keeps its nodes,
  edges, child subgraphs, `nodeDefaults`, `edgeDefaults` and local attributes across bodies. A
  same name under another parent is a different subgraph. A named re-open takes no anonymous id.
- **Impact**: seeding (every snapshot key since #242) runs once, after the FIRST body. Code that adds
  a seeded key must not assume the body it follows is the only one. A graph-attribute statement
  in a later body goes through `declareGraphAttr`, which removes the key from `seededAttrs` (C
  gives it a local symbol, `lib/cgraph/attr.c:setattr`); a new path that sets `attrs` on a
  subgraph during parsing must go through it too, or `-Tdot` hides the value.
- **Confidence**: High (26 probes × 8 engines against native 16.1.1)

## Observation: subgraph edge endpoints read membership after the statement
- **Context**: `subgraph p {a} subgraph p {b} -- subgraph p {c}` gives native all 9 pairs.
- **Finding**: `processEdgeStmt` resolves every endpoint first (`resolveEndpoint` returns the
  `Graph` for a subgraph item), then expands each subgraph to `[...sg.nodes.values()]` sorted by
  node id, as `endedge`/`edgerhs` walk `agfstnode(subg)` once the statement is parsed
  (`lib/cgraph/grammar.y:449-530`). `NameCollector` (expansion from the endpoint's body text) is
  gone. On the 1320 corpus inputs the two rules give identical models.
- **Impact**: an endpoint's node set is the subgraph's whole membership at statement end: nodes
  of an earlier body and nodes a later endpoint of the same statement adds are included.
- **Confidence**: High

## Observation: the parse-model reach harness
- **Context**: gate 6 for a builder-only change.
- **Finding**: `plans/issue-258-reopened-subgraph/harness/model-reach.mjs <base.mjs> <head.mjs>
  <dir...>` parses every input under the directories with both bundles and compares the models
  (node ids, order, attributes and snapshots; edges with seq and attributes; the subgraph tree
  with name, seq, attrs, seeded keys, snapshot, first declarations, defaults and membership). It
  takes directories, not single files. About 10 s for the 1320 corpus inputs, no native runs.
- **Impact**: for a parse-side change, "model differs 0" over the corpus proves no corpus output
  can change, and replaces a native survey of unaffected ids. The probes then carry the
  comparison with native.
- **Confidence**: High

## Observation: sfdp differs from native on a 3-node multigraph with loops
- **Context**: extra probe `extra6` (`subgraph p {a} -- subgraph p {b} -- subgraph p {c}`,
  18 edges among `a`, `b`, `c`).
- **Finding**: under sfdp the head is 20 lines off native (positions differ by up to 0.03,
  structure equal). `harness/extra/extra6-control.gv` spells the same graph with no re-open:
  base and head render it identically and differ from native by the same 20 lines. `reopen15`
  under sfdp is the same case.
- **Impact**: #257's family (sfdp on cyclic inputs); `extra6-control.gv` is a small repro for it.
- **Confidence**: High

## Observation: `connectEndpoints` is over the complexity limits
- **Context**: `lizard src/parser/builder.ts` while checking `processSubgraph` (28 NLOC, CCN 9).
- **Finding**: `StmtProcessor.connectEndpoints` has 41 NLOC and CCN 13 (limits 30 and 10). It
  predates this mission and was not touched.
- **Impact**: the complexity hook blocks an Edit that leaves it over the limit; a change there
  needs the strict-duplicate branch split out first.
- **Confidence**: High
