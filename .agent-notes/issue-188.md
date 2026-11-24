# issue-188 mission — observations (2026-11-21)

## Observation: no original edge reaches `routeLoneEdge` twice in a routing pass
- **Context**: removing `EdgeInfo.lost` (port-only), whose one reader was `routeLoneEdge`'s skip.
- **Finding**: three steps. (1) `collectRankEdges` mirrors C's collection (`dotsplines.c:281-320`):
  NORMAL nodes, and virtual nodes only where `splineMerge` holds, so an original has exactly one
  entry that does not start at a merge node. (2) `routeLoneEdge`'s only callers are in
  `dispatchEdgeGroup` (`src/layout/dot/splines-groups.ts`): the flat loop, deduplicated by original,
  and the lone cross-rank branch, taken only when `routeEntryRun` returns `null`, which it never
  does for an entry that starts at a merge node. (3) So each original is offered once per pass, and
  a failed route needs no "already tried" flag: the router returns with no spline, as
  `make_regular_edge` and `make_flat_labeled_edge` do.
- **Impact**: the field, its seven writes, its clear in `beginRoutingPass` and the skip are gone
  (#188). A new router branch that consumes an edge without a spline just returns "handled". If a
  later change adds a second caller of `routeLoneEdge` or a second non-merge entry per original,
  a failed edge would be routed and reported twice; `routing-failure-once.test.ts` pins the count
  for five paths (parallel group, forward chain, back chain, labelled flat, side port).
- **Confidence**: High for the measurements (marker 0 skips and 0 re-offers over 35 inputs with
  39 writes, and 0 over #137's 1184 inputs; base vs head 105/105 jobs and 1960/1960 smoke jobs
  identical, stdout and stderr). Medium for "every input": the argument is from the collection
  rules, not a proof over every `edgecmp` grouping.

## Observation: two of the seven lost paths have no input
- **Context**: the marker over every corpus input on which native loses an edge.
- **Finding**: `routeFaithfulRegularPlain` and `routeFaithfulAdjacentBack` (plain adjacent-rank
  forward and back edges) return `'lost'` on no corpus, golden or probe input. The other five
  paths fire: multi-rank 15, labelled flat 10, parallel group 5, side port 3, back chain 2.
- **Impact**: a change to those two branches has no input to compare with native; build one first.
- **Confidence**: High (`plans/issue-188-edgeinfo-lost/harness/results/marker-planning.tsv`).

## Observation: a base-vs-head compare script can pass on two timeouts
- **Context**: gate 6's `harness/compare.sh` writes `CAPPED` when a job hits its 120 s alarm.
- **Finding**: with both sides capped, both files held only `CAPPED` and `cmp` called them
  identical. The script now reports `CAPPED` and does not count the pair. `test/tools/bytediff.ts`
  already never counts a capped job as identical.
- **Impact**: a mission harness copied from an older compare script may have the same hole;
  check for it before trusting an "N/N identical" line produced under load.
- **Confidence**: High (read; no pair was capped in this mission's runs).
