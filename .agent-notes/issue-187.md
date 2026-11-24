# issue-187 mission — observations (2026-11-21)

## Observation: the flat routers' `number | null` contract
- **Context**: carrying `make_flat_adj_edges`'s rc from `makeFlatAdjEdges` to `dotSplines_`.
- **Finding**: `routeFlatEdge`, `routeFaithfulSidePort` and `routeFlatAdjGroup`
  (`src/layout/dot/edge-route.ts`) return `0` (edge consumed), `null` (declined: the caller tries
  the next router, then the regular or fitter path) or a non-zero value, which is C's
  `make_flat_edge` rc and must be returned unchanged. "Declined" is a port idea: C has one
  `make_flat_edge`. The rc goes up `routeOneEdge`/`routeLoneEdge` → `routeFlatGroup` →
  `dispatchEdgeGroup` → `routeEdgeGroups` (`{ rc, runOrigs }`) to `dotSplines_`, which returns it
  before `normalizeRunOrigs` and `finalizeSplines` (`dotsplines.c:418-424`).
- **Impact**: a new flat router that can fail returns its rc through this chain; a truthiness
  test on a flat router's result is a bug (`0` is success). Only the flat-adjacent aux layout
  produces a non-zero rc today; the aux mincross failure and a non-zero aux `dotSplines_` are
  propagated but no input reaches them.
- **Confidence**: High

## Observation: what native prints after a failed spline pass
- **Context**: probes `plans/issue-187-flat-adj-rc/harness/probes/p1..p12.gv`, carried oracle.
- **Finding**: native exits 1 and still writes the output. Node `pos` and `bb` are the
  untranslated layout coordinates (`bb="-27,0,99,2.88e+09"` on `p1`: no
  `dotneato_postprocess`), no edge has a `pos` (edges after the failing group are never routed,
  and edges routed before it are not printed because `State < GVSPLINES`, which is #275), and
  `dot_compoundEdges` does not run (`p10`). stderr is the one `Edge length` error.
- **Impact**: a test of this path compares `-Tdot` byte for byte and masks the number in the
  `Edge length` line (#274: native's `int` port offset saturates, the port's does not).
- **Confidence**: High (`harness/results/probes-head.tsv`)

## Observation: the probe recipe that fails only the aux graph
- **Context**: finding an input for the failure path; no corpus input takes it (#137).
- **Finding**: `{rank=same; a [height=40000000]; b [height=40000000]} a:s -> b:n`. The aux
  graph of `make_flat_adj_edges` has its rank axis rotated, so the `:s`/`:n` port offset
  (2.88e9 pt) is an x offset there: `make_edge_pairs`'s aux edge exceeds `INT_MAX` and the aux
  `dot_position` returns -1 (#162). In the main graph the same ports have x offset 0, so the main
  layout succeeds. A huge `width` instead fails the main `dot_position` (`p2`); `:e`/`:w` ports
  fail nothing (`p3`); under `rankdir=LR` the roles of `width` and `height` swap (`p6`).
- **Impact**: reusable for #274, #275 and any later work on the aux pipeline.
- **Confidence**: High

## Observation: `triangulation failed` is not visible through `agseterrf`
- **Context**: the red test's stderr cases; the brief expected all five to fail on the base.
- **Finding**: pathplan's `triangulation failed` / `source point not in any triangle` lines are
  console prints that do not pass through `agerr`, so a test that captures stderr with
  `agseterrf` never sees them. Through `agseterrf` the base printed only the `Edge length` error
  on `p1`, `p4`, `p10`, and added `Error: lost a b edge` on `p5`, `p9`.
- **Impact**: a stderr assertion built on `agseterrf` cannot pin the absence of pathplan's
  prints; spy on the console for those.
- **Confidence**: High (measured on base `98aa9373`)

## Observation: the pack arm does not reach the aux failure
- **Context**: extra probe `harness/extra/x1-pack.gv` (`p1` plus `pack=true` and a second
  component).
- **Finding**: native prints the `Edge length` error and segfaults in every format (carried and
  pristine 16.1.1). The port prints `Pshortestpath failed` / `lost a b edge` and never calls into
  the failing aux layout; base and head are identical. A small input shows the same arm
  differing from native with no failure at all:
  `digraph { pack=true; {rank=same; a; b} a:s -> b:n; c -> d }` (`x1c`). Without the ports it
  equals native. Filed as #277; not diagnosed.
- **Impact**: #187's fix is measured on the non-pack arm only. `dotPhasePostNoFinish` returns
  the rc on both arms, but no probe exercises it under `pack`.
- **Confidence**: High for the observations; the cause is unknown.
