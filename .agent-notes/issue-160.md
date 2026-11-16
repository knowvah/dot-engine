# Issue #160: empty-rank guards (graphviz 16.1.1)

## Observation: an empty rank's leader is null inside the rank array and absent past it
- **Context**: Porting upstream `ca3353d80`, `1a77ac9df`, `8e06a6261`,
  `9fca64d0f`, `d49e3a529` (C's `GD_rank(g)[r].v[0] == NULL` tests).
- **Finding**: After `render` of `tests/2759_1.dot` the root's rank 1 has
  `n: 0`, `an: 1`, `v: [null]` (`mincross-build.ts:86` fills the allocated
  array with null, as C's calloc does), while the entry past `maxrank` has
  `v: []`, so `v[0]` is `undefined`. Hand-built test ranks use `v: []` too.
- **Impact**: A port of a C `v[0] == NULL` test must use `== null`, not
  `=== null` or `=== undefined`. `rk.n === 0` is not the same test either: C
  checks both in `dot_compute_bb`.
- **Confidence**: High (probe of the rank array; both `TypeError` texts seen).

## Observation: make_LR_constraints was already safe for an empty rank in the port
- **Context**: Writing the red-first test for `makeLrRankConstraints`.
- **Finding**: C crashed at `double last = ND_rank(rank[i].v[0]) = 0`, before
  its loop. The port's per-rank function does that write after the loop under
  `rk.n > 0`, so `n === 0` was a no-op on the base. The 16.1.1 guard changes
  the port only for `v[0]` null with `n > 0`, which no corpus id reaches (the
  planning detector's `P160LRN` marker never fired).
- **Impact**: A guard ported for fidelity may have no red case on the input C
  crashed on; look for the input where the port's own read order differs.
- **Confidence**: High.

## Observation: set_ycoords' guard and its unguarded neighbours read the same rank
- **Context**: Trying to observe `maxht` in a case where the 16.1.1 guard in
  `setYcoordsInitial` fires.
- **Finding**: The guard fires when rank `r` has nodes and rank `r + 1` has no
  leader. The `exact_ranksep` re-assign (`equalSpaceRanks`), `recomputeMaxht`
  and `setYcoordsCopy` read the same leader with no guard, in C too. So with
  `ranksep="... equally"` such a graph still throws in the port and crashes
  native 16.1.1 (corpus `2761`, `2761_1`, quarantined `oracle-crash`).
- **Impact**: The port's throw on those inputs is C's behaviour, not a missed
  guard. `position-ycoords.branch.test.ts` pins it.
- **Confidence**: High (C source read at 16.1.1 `position.c:810-835`).

## Observation: json drops a cluster's bb and _draw_ in one nesting shape
- **Context**: The targeted survey: `2759`/`2759_1` equal native in svg, xdot,
  plain and cmapx but not json.
- **Finding**: `digraph{ a->b {subgraph cluster{ x }} }` `-Tjson` lacks the
  cluster's `"bb"` and `_draw_` on the base and on the head; `-Txdot` has
  both. Filed as #231; not diagnosed.
- **Impact**: A json diff against native that is only a cluster's `_draw_` and
  `bb` is this defect, not a layout difference.
- **Confidence**: High for the outputs; the mechanism is unknown.
