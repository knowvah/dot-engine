# issue-193 mission — observations (2026-11-21)

## Observation: neato_layout's Pack < 0 branch keeps spline_edges' bb and adds no cluster
- **Context**: `mode=KK` with no `pack` and no `packmode`, the only way `neato_layout` reaches its
  `else` branch (`lib/neatogen/neatoinit.c:1430-1436`; `Pack` is decided at `:1369-1379`).
- **Finding**: C runs `compute_bb(g)` after routing only inside `Pack >= 0` (`neatoinit.c:1416`). On
  the other branch the graph bb is the one `spline_edges` made: `compute_bb` at its entry
  (`neatosplines.c:840`), which counts beziers still on the edges from an earlier layout with no
  `gvFreeLayout`; the origin shift; `neato_set_aspect`'s scale; then `update_bb_bz` for each route
  `clip_and_install` installs. `addCluster` (`neatoinit.c:1428`) also sits inside `Pack >= 0`, so
  native draws no cluster on this branch. The port now guards its post-routing
  `computeSubgraphBB` with `pack >= 0` (`src/layout/neato/index.ts:228`); `addClusters` still runs
  on every path (#283).
- **Impact**: a KK no-pack bb difference is not a `compute_bb` matter: read which branch ran
  first. A no-free relayout there has a taller or wider bb than layout 1 on native too
  (`graph 1 1.7338 1.4416`, then `1.6854`), and `ratio`/`size` reach the bb only through
  `neato_set_aspect`. A cluster probe under `mode=KK` differs until #283.
- **Confidence**: High (24-row no-free matrix against the carried oracle, 6/24 on the base, 24/24
  on the head; `plans/issue-193-neato-kk-bb/harness/results/`)

## Observation: computeSubgraphBB's refineSplines branch has no production caller
- **Context**: reading `src/layout/pack/index.ts` for the recompute the fix guards.
- **Finding**: `expandBoundsByEdge`'s `refineSplines` branch (`src/layout/pack/index.ts:121`) runs
  only when `computeSubgraphBB` gets `refineSplines = true`. No non-test caller passes it (sfdp
  passes `false`, the rest default). Its comment says native never re-runs `compute_bb` after
  routing on a single-component neato-family graph; that holds only for `Pack < 0`, since the
  `Pack >= 0` branch calls `compute_bb` for one component too (`neatoinit.c:1416`).
- **Impact**: comment and dead branch only; outside #193's write-set. Fix or remove it with the
  next change to that file (grep the tests for `refineSplines` first).
- **Confidence**: High (grep of `computeSubgraphBB(` over `src/`)

## Observation: the count of KK fixtures native cannot render changes from run to run
- **Context**: one-layout survey of `src/layout/neato/__fixtures__/{models,dim}/*.gv` against the
  carried oracle; planning counted 6 KK inputs with no native stdout, execution 3.
- **Finding**: over 6 tries each, `kk-disc-circuit-pack`, `kk-disc4-circuit-pack` and `kk-len-mds`
  exit 139 every time; `kk-circuit`, `kk-disc-circuit` and `kk-len-circuit` exit 139 in 4, 3 and 5
  of 6 and print one stable text otherwise, which the port equals. It is the AGSEQ overflow of
  `.agent-notes/post-16-1-followups-8.md`, still present in the carried 16.1.1 build.
- **Impact**: a survey over these fixtures needs a retry loop before it reports "no native
  reference"; a differing count between two runs is not a moved oracle.
- **Confidence**: High for the six inputs sampled
