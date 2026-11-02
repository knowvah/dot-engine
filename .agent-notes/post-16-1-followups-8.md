# post-16-1-followups-8 mission — observations (2026-11-02)

## Observation: native KK circuit and mds overflow on the 1-based AGSEQ
- **Context**: T0 model fixtures.
- **Finding**: `circuit.c:46-47` and `neatoinit.c:1231-1232` index 0-based n×n arrays by
  `AGSEQ` (1..n). Row 0 of `Gm` stays zero, so `lu_decompose` is singular on every graph:
  KK `model=circuit` always warns "graph G is disconnected" and uses shortest paths, on
  connected graphs too. `Gm[n]` / `GD_dist[n]` read past the row pointers: `kk-circuit`
  exits 139 in about 3 of 4 runs, `kk-len-mds` in all but about 1 of 1500, and pack cases in
  every run sampled (seq exceeds the component's nG). An isolated last-created node removes
  the overflow and makes native deterministic.
- **Impact**: pick native KK fixtures with a retry loop, or end the graph in an isolated
  node. Never read rc 139 here as an oracle failure.
- **Confidence**: High

## Observation: non-KK neato splits disconnected graphs before the solver
- **Context**: T0 `*-disc-circuit` printed no warning on major or hier.
- **Finding**: `neato_layout` sets `Pack = CL_OFFSET` when `layoutMode` is non-zero, so
  each connected component is solved alone (`neatoinit.c:1371-1376`). `pack=false` does not
  undo this. Pinned nodes in different components stay in one (`pccomps`), which is the way
  to reach stress.c's disconnected warning.
- **Impact**: a disconnected probe on major or hier needs pinned nodes to exercise that
  branch.
- **Confidence**: High

## Observation: a /tmp clean deletes config8 and every engine then reports no layout support
- **Context**: T0 preflight.
- **Finding**: both plugin dirs had lost `config8` while the dylibs stayed; the error is
  `There is no layout engine support for "dot"` and rc 1. `GVBINDIR=<dir> dot -c` fixes it
  at the same path, which keeps the walk caches valid.
- **Impact**: run the preflight first in any session after a gap.
- **Confidence**: High

## Observation: a shortest-path-consistent `len` graph cannot tell mds from shortpath
- **Context**: T0 classification of `major-len-mds`, which passed before T6.
- **Finding**: mds overwrites Dij with each edge's `len`; if every edge is already its ends'
  shortest path, the matrix is unchanged. A distinguishing probe needs an edge longer than
  the path around it.
- **Impact**: check that a probe fails before its fix is in.
- **Confidence**: High
