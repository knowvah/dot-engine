# issue-137 mission — observations (2026-11-10)

## Observation: no corpus or golden input puts a label in a flat-adjacent aux graph
- **Context**: gate 6 of #137, proving that the second `placeRegularEdgeLabels` on the aux graph
  of `makeFlatAdjEdges` was a no-op before removing it.
- **Finding**: a marker bundle over 1197 corpus and golden inputs (dot, svg) found 10 ids that
  reach `makeFlatAdjEdges` (`1444`, `1444-2`, `1949`, `241_0`, `241_1`, `2437`, `graphs-ports`,
  `linux.x86-ports_dot`, `nshare-ports_dot`, golden `c90-dot-flat-adj-both-arrows`; 27 calls).
  None has a labelled virtual node in its aux graph. Labelled port-bearing adjacent flats exist
  only as fixtures (`plans/issue-137-routedotedges-comments/harness/f1..f7.gv`), and the port
  equals native on all of them in svg, xdot and json.
- **Impact**: byte identity on the corpus says nothing about label handling in the aux layout.
  A change there needs these fixtures (or new ones) in its survey.
- **Confidence**: High (`harness/marked.json`, `harness/survey.json`)

## Observation: `routeLoneEdge`'s `lost` skip is not taken on the corpus
- **Context**: the same marker bundle printed a line when the skip fired for an edge the pass
  had not routed.
- **Finding**: 0 hits over 1184 finished inputs and eight fixtures, including `2470`, `2471`
  and `2796`, whose lost edges the removed backstop used to route twice. The reader is still
  reachable in code (a member lost during a sibling's flat-group call; the group-wide mark in
  `routeParallelEdgeGroup`). Filed as #188.
- **Impact**: `lost` is unpinned by any corpus id; removing or changing it needs a fixture that
  takes one of those paths and a stderr comparison.
- **Confidence**: High for the count; the reachability claim is from reading the code.

## Observation: 13 corpus ids do not finish a dot svg render inside bytediff's caps
- **Context**: marker run, one process per id, 120 s and `--max-old-space-size=1536`.
- **Finding**: timeouts on `tree-share-examples-4elt`, `tree-share-examples-world`, `1652`,
  `2064`, `2095_1`, `2343`, `2371`, `2475_1`, `2593`, `2621`, `2834`; out of memory on `1864`
  and `2646`. Native `-Tcanon` on `1864.dot` (14 MB) had not finished after 4.5 minutes, so it is
  no shortcut for scanning these inputs; a text scan for port syntax is.
- **Impact**: a marker survey over "every applicable id" covers 937 of 950 corpus ids; the rest
  need a static argument. Budget about 7 minutes at 5 lanes for the run.
- **Confidence**: High

## Observation: a failed aux layout does not stop the port's spline pass
- **Context**: the brief's `rc` check on `makeFlatAdjEdges`.
- **Finding**: the port's `dotSplines_` returns non-zero only from `orthoDispatch`, never for
  an aux graph. C's `dot_splines_` also returns `make_flat_edge`'s `rc`
  (`dotsplines.c:418-423`); the port's group loop has no result code and
  `routeFaithfulSidePort` treats a non-zero `makeFlatAdjEdges` as "declined". Filed as #187.
- **Impact**: #162 (16.1.1: fail the layout when an aux edge is too long) has no path to
  travel yet.
- **Confidence**: High (read; no corpus input takes the path)
