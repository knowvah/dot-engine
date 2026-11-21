# Survey design: issue #188

## Reach selection

Removing the skip in `routeLoneEdge` changes output only on an input where
the skip fires on the base. The skip reads `lost`, and only a writer sets
`lost`, in the same pass, after a routing failure. So the inputs that can
change are the ones on which a writer fires. Writers fire on routing
failures, and native reports those as `in routesplines, Pshortestpath
failed` and/or `Error: lost <t> <h> edge` (`map_edge`; not printed under
`concentrate`).

1. [native-scan.mjs](native-scan.mjs) ran the carried oracle (`-Kdot -Tdot`,
   60 s cap) over every applicable dot corpus input and every golden input:
   1229 inputs, 3 minutes at load 5-14. Of the 28 rows it reports, 15 are
   `exit1` with a failure line and 12 are `TIMEOUT`
   ([results/native-scan.tsv](results/native-scan.tsv)). No golden input
   fails.
2. Added 2765 and 2765_1: `concentrate` dead ends (#161). Native prints
   nothing there (`concentrate` suppresses `map_edge`'s line), but the port's
   `multiRank` writer fires.
3. Probes ([probes/](probes/)):
   - `r1`-`r4`: the four `routing-failure-once.test.ts` inputs (parallel
     group, forward chain, back chain, labelled flat).
   - `d1`: the dead-end back-edge input of `edge-route-chain.dead-end.test.ts`.
   - `s1`: `tests/graphs/structs.gv`, 308 bytes, the side-port writer
     (`routeFaithfulSidePort`); T1's new test case.
   - `c1`-`c4`: attempts at path 2 below. `c1`-`c3` use `concentrate` with a
     sametail parallel group; `c4` is a three-edge lost parallel group
     without it.
4. #137's 8 labelled flat-adjacent fixtures
   (`plans/issue-137-routedotedges-comments/harness/f*.gv`).

The marker run gives 35 inputs, and five writers fire on them: `multiRank`
15, `flatLabeled` 10, `parallelGroup` 5, `sidePort` 3, `chainBack` 2. Two
writers fire on no input: `routeFaithfulRegularPlain` and
`routeFaithfulAdjacentBack`, which are the plain adjacent-rank forward and
back edges. Their writes are the same one-line assignment as the
`multiRank` writer's, and the reasoning below covers them too.

## Why the skip cannot fire

The skip fires when `routeLoneEdge(O)` runs for an original edge `O` that a
writer has already marked in this pass.

- **Who marks whom.** Six writers sit on `routeLoneEdge(O)`'s own call
  chain (`routeOneEdge`, `routeFlatEdge`, `routeFaithfulSidePort`,
  `routeBackEdge`, `makeFlatLabeledEdge`) and mark the edge they route,
  which is `O`. The seventh, `routeParallelEdgeGroup`
  (`splines-route.ts:393`), marks the originals of every member of a group
  whose shared base is lost.
- **Who calls `routeLoneEdge`.** Only `dispatchEdgeGroup`
  (`splines-groups.ts:105,152`): `routeFlatGroup` for each original of a
  same-rank group, deduplicated (`dedupByOrig`), and the lone cross-rank
  branch when the group has one original and its first entry is not a
  merge-bounded run (`routeEntryRun` returns `null`).
- **How many entries an original has.** `collectRankEdges`
  (`splines.ts:391-408`) mirrors C's `dot_splines_` collection
  (`dotsplines.c:281-320`). It takes `ND_out`, `ND_flat_out` and `ND_other`
  from NORMAL nodes, and from virtual nodes only where `splineMerge` holds.
  A chain's only NORMAL interior node is its tail. So an original has
  exactly one entry that does not start at a merge node. A flat original
  has exactly one entry, in `ND_flat_out` or in `ND_other`. Every further
  entry of a chain starts at a `splineMerge` node. `entryRunSegments` then
  returns its run (`edge-route-chain.ts:347`), and `routeEntryRun` routes
  it without consulting `lost`.

So `routeLoneEdge` gets each original at most once per pass, and a writer
on its own chain marks it during that one call. A member marked by
`routeParallelEdgeGroup` has had its one entry used up in that group. Any
other entry it has starts at a merge node and goes to `routeEntryRun`, or
sits in another group with more than one original and goes to
`routeParallelEdgeGroup`, which does not read `lost`.

The marker also logs `ISSUE188_LOSTREOFFER` when a lost original reaches
`routeParallelEdgeGroup` or `routeEntryRun`. It fires 0 times, so neither
route offers a lost edge again in practice either.

**Limit.** This argues from the collection rules. It does not prove the
`edgecmp` group boundaries for every input. The measurements support it:
0 skips over #137's 1184 inputs, and 0 over planning's 35. If an input ever
reaches the skip, removing it routes that edge a second time, which adds a
`Pshortestpath failed` line and maybe a spline. The smoke and reach
comparisons check stderr byte for byte, and so does the maintainer's full
`--all` bytediff before the branch merges.
