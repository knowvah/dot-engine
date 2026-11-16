# Issue #158: flat_reorder's valid_rank (graphviz 16.1.1)

## Observation: valid_rank skips every rank that holds a constraining flat edge
- **Context**: Porting upstream `9fb21f570` (`lib/dotgen/mincross.c:1340-1366`
  at 16.1.1) into `flatReorderBuildTemprank` / `flatReorderRank`.
- **Finding**: A node with a constraining incoming flat edge always ends the
  walk: unmarked it fails `local_in_cnt == 0`, marked it fails `!MARK(v)`. So
  the rank keeps mincross's order and its "nonconstraint flat edges must be
  made LR" loop does not run. This is not limited to cyclic or odd inputs: the
  head of any `rank=same {a -> b}` edge triggers it.
- **Impact**: At 16.1.1 a constraining flat edge may point right to left after
  mincross (`tests/121.dot`: `B` at x 0.59722, `A` at 1.5972 for `A -> B`).
  Code after mincross must not assume flat_reorder made such edges forward;
  `BWDEDGE`/`makefwdedge` handling is reached far more often than at 16.1.0.
- **Confidence**: High (C source read; native 16.1.1 output on 121, 700813 and
  the unit probes equals the port's).

## Observation: an `ordering` FLATORDER edge also invalidates its rank
- **Context**: Re-capturing `src/layout/dot/ordering.test.ts` (#169) from
  native 16.1.1.
- **Finding**: `digraph { node [ordering=out]; q -> p; q -> z; z -> v; p -> v;
  p -> u; }` renders byte-identically (`-Tplain`) to the same graph with the
  default declared after the nodes (no ordering applied): `p` is drawn right
  of `z`. A trace of the port on that input shows ranks 1 and 2 invalid, each
  holding one FLATORDER edge (`p->z`, `v->u`, `edge_type` 4, weight 1), with
  the rank order `[z, p]` and `[v, u]` left as mincross had it. At 16.1.0 the
  two outputs differed.
- **Impact**: A drawing no longer proves that a node `ordering` was applied.
  Tests of `ordering` should check the FLATORDER edge or a stderr line, not
  only positions. `ordering.test.ts` gained a `not recognized` probe for the
  subgraph-scoped default for that reason.
- **Confidence**: High for the measured outputs and the trace; whether upstream
  intends it is not known.

## Observation: a non-adjacent flat group is in AGSEQ order, not left tail first
- **Context**: `tests/700813.dot` after valid_rank: every node equalled native
  and the flat 2-cycle `B -> C` / `C -> B` had each other's route.
- **Finding**: Inside one `make_flat_edge` run every `edgecmp` key before the
  last is equal, so the run is in `AGSEQ` order
  (`lib/dotgen/dotsplines.c:edgecmp`), and edge `i` gets the `(i+1)`-th route
  out. `collectNonAdjacentFlatGroup` sorted "tail is the left node first". The
  two rules agree whenever the lowest-seq edge has its tail on the left, which
  16.1.0's flat_reorder made true for a constrained pair; 16.1.1 does not.
- **Impact**: Any other place that orders a flat group by node side rather than
  by `seq` is suspect now. The planning detector found only 700813 for this
  site.
- **Confidence**: High.

## Observation: `layout=dot` in a corpus input makes every engine job the dot job
- **Context**: The smoke bytediff showed `2592` changed under all eight engines.
- **Finding**: `tests/2592.dot:10` sets `layout=dot` on the graph, which
  overrides `-K`. Its neato, fdp, sfdp, circo, twopi, osage and patchwork jobs
  are byte-identical to its dot job on both bundles.
- **Impact**: A dot-only change shows up as 8 x formats changed jobs for such
  an id in `bytediff.ts`; that is not another engine changing.
- **Confidence**: High (outputs compared).

## Observation: routesplines' "illegal values of prev and next" is silent in the port
- **Context**: `tests/2723.dot` stopped throwing; native prints one more stderr
  line than the port.
- **Finding**: `src/common/splines-routespl.ts:322` and `:342` return false
  where C calls `agerrorf("in routesplines, illegal values of prev %d and next
  %d, line %d\n", ...)` (`lib/common/routespl.c:373`, `:407`). Filed as #229.
- **Impact**: stderr parity on inputs with a degenerate box list; the drawing
  is unaffected.
- **Confidence**: High (trace fired at `:322` with native's `prev 1 next 1`).
