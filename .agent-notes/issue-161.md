# Issue #161: virtual nodes with no out edge (graphviz 16.1.1)

## Observation: concentrate can leave a to_virt chain ending at an orphan vnode
- **Context**: Porting upstream `4f9ef1d9e`, `a79e42588`, `f3da7c569`,
  `f8e3f2100`, `5649d079c` (gitlab #2765).
- **Finding**: On `tests/2765.dot` after position, the first `:Target` edge's
  `to_virt` leads to a VIRTUAL node on rank 1 with `in.size` 0 and `out.size`
  0, at `order` 2 where the rank's `n` is 2 (outside `v[0..n)`). The second
  `:Target` edge was merged into that chain by class2 (`to_virt.to_orig` is
  the first edge) and sits in `ND_other`. Only the second is collected by the
  splines pass; C routes it (hackflag) to the orphan, resizes the orphan, and
  drops it. The first is never routed, by C or the port.
- **Impact**: "No spline" has two causes on such an input: an edge routed to a
  dead end (`info.lost === true`) and an edge nothing collects (`lost`
  unset). A test that expects `lost` on every unsplined edge is wrong.
- **Confidence**: High (probe of the port's graph; native markers fire once).

## Observation: the orphan is not translated by postprocess
- **Context**: Reading the orphan's size after a full `render`.
- **Finding**: The orphan keeps layout-frame coordinates after `render`
  (`x = 5.34` on 2765 where real nodes moved by the translate): it is in no
  rank's `v[0..n)` and not in the node list. An edge's `info.to_virt` also
  survives `render`, while `info.in`/`info.out` of chain vnodes are cleared.
- **Impact**: A test can read a dead chain's vnode after `render` through
  `to_virt`, and compare it with values an instrumented native prints inside
  `dot_splines_`, with no frame conversion. Do not test `out.size` after
  `render`: every chain vnode then reads as having no out edge.
- **Confidence**: High.

## Observation: a planning counterfactual's detector cannot see what it declines
- **Context**: The planning patch kept `routeBackEdge`'s `segs.length < 2`
  return ahead of its `P161BK` marker.
- **Finding**: A back edge whose chain is one segment to an orphan returned
  before the marker, so the port detector could not report it, while native
  takes the dead-end close there (variants E and F in
  `plans/issue-161-no-out-edge-guards/harness/head-dead-end-values.txt`). The
  corpus has no such id, so the planning table was still right.
- **Impact**: When a detector reports "no hits" for a path, check that no
  early return sits between the function entry and the marker; hand-made
  variants traced in an instrumented native find what the corpus lacks.
- **Confidence**: High.

## Observation: edge-route-chain.ts sits at the 500-line limit
- **Context**: Adding about 80 lines to a 499-line file.
- **Finding**: The edge views (`makeFwdEdge`, `chainEnds`, the hackflag
  views) moved to `edge-route-chain-views.ts`; `edge-route-chain.ts` is 484
  lines on the head and re-exports `makeFwdEdge`.
- **Impact**: The next addition to the chain walker has 16 lines of room;
  `recoverSlack` with `resizeVnInBox` is the next self-contained piece to
  move.
- **Confidence**: High.

## Cleanup candidates (other files, not touched)
- `layoutToPosition` is defined privately in
  `src/layout/dot/edge-route-faithful.test.ts` and
  `src/layout/dot/edge-route-splines.test.ts`; `test/helpers/dot-position.ts`
  now has the shared one.
- `backChainSegments` (`src/layout/dot/edge-route-chain.ts`) steps through
  `out?.list[0]` where `chainSegments` tests `out.size`. Equal while
  `zapinlist` keeps C's NULL sentinel.
- A chain that ends at a merge vnode with no out edge (`in.size > 1`) is still
  declined by the whole-chain builders; C leaves its loop there and routes the
  final segment. No corpus id reaches it (`P161MR incomplete-notdead` never
  fired at planning).
