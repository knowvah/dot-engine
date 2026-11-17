# Issue #159: flat_edges' ND_other scan for the abomination rank (graphviz 16.1.1)

## Observation: C reads a freed matrix pointer as a flag
- **Context**: Porting the gate `GD_rank(g)[0].flat || GD_n_cluster(g) > 0`
  (`lib/dotgen/flat.c:274` at 16.1.1).
- **Finding**: `cleanup2` calls `free_matrix(GD_rank(g)[r].flat)`
  (`mincross.c:864`) and `free_matrix` (`mincross.c:415-420`) frees without
  nulling the field. At `flat_edges` the pointer is non-null exactly when a
  `flat_breakcycles` run on the root saw a node of that rank with a flat
  out-edge, FLATORDER edges included. The port's `cleanup2Ranks` cleared the
  field, which is why an older note called the matrix "unreliable at
  position-time". It now keeps it; `abomination` (`flat.c:198`) is the only
  place C nulls it.
- **Impact**: A C `free` of a field is not a reset of the field. Before porting
  one as `= undefined`, grep C for later reads of the pointer.
- **Confidence**: High (C source; `probe-b.gv` throws with the scan and no gate).

## Observation: a self-loop is never flat-adjacent, and every loop is in ND_other
- **Context**: `checkFlatAdjacent` and the unfiltered `ND_other` scan.
- **Finding**: C's `for (i = lo + 1; i < hi; i++)` ends at `i == lo + 1` when
  `lo == hi`, so `if (i == hi)` is false for a loop (`flat.c:224-236`). class2
  puts every loop in `ND_other`; a node's second and later loops get
  `merge_oneway(e, prev)` first (`class2.c:206-210`), so they share the first
  loop as main edge. `dot_splines_`' group loop reads `ED_adjacent(e0)` on
  loops too (`dotsplines.c:366`): with the port's old `adjacent = 1` all loops
  of a node became one `makeSelfEdge` group, where C breaks on `portcmp`.
- **Impact**: A labeled rank-0 self-loop counts for the abomination when the
  gate is open, and then nothing is placed on the new rank (the label pass
  skips loops), leaving an empty rank that #160's guards handle.
- **Confidence**: High (probes a, d, e against native).

## Observation: the port's self-loop edge-type constants are not C's (#232)
- **Context**: `probe-d.gv`, `probe-e.gv`, `probe-g5.gv` still differ from
  native after the change.
- **Finding**: `src/layout/dot/splines.ts:38-40` has `SELFNPEDGE = 3`,
  `SELFWPEDGE = 4`, `EDGETYPEMASK = 7`; C has 8, 4, 15
  (`lib/common/const.h:150-155`). `edgecmp` sorts the larger type first, so C
  routes unported loops before ported ones and the port after. With C's values
  in a scratch tree all three probes equal native (d and e only together with
  #159's change). Not fixed in #159; filed as #232.
- **Impact**: Any difference in the order or nesting of a node's loops when
  some carry ports is this until #232 lands.
- **Confidence**: High for the measured outputs; the corpus reach is unmeasured.

## Observation: an empty rank -1 changes no drawing by itself
- **Context**: The survey: abomination fires on the head only for `2759`,
  `2759_1`, `2870_0`, `2870_1`, and every job is byte-identical to the base.
- **Finding**: `flat_edges` returns `reset = false` when no label vnode was
  made, so `set_ycoords` is not re-run, and the empty rank has no leader to
  place. Only a label vnode on the new rank (`probe-c.gv`) moves anything.
- **Impact**: "No changed corpus output" is the expected result of this port,
  not a sign the code path was missed; the detector markers show it is reached.
- **Confidence**: High (45 survey jobs, 1960 smoke jobs).
