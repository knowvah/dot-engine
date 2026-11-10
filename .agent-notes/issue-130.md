# issue-130 mission — observations (2026-11-10)

## Observation: a new subgraph changes which graph a recursing pass hands to a flag-setting primitive
- **Context**: adding C's `rank=source` subgraph `xxx` to the flat-adjacent aux graph. The brief's
  audit listed the sites that iterate `subgraphs`; the planned variants all rendered as before.
- **Finding**: `orderedEdges` (C `ordered_edges`) recurses into every non-cluster subgraph and calls
  `doOrderingNode(subg, n, ...)`, which calls `flatEdge(subg, fe)`. C's `flat_edge` flags `g` and
  `dot_root(g)` (`fastgr.c:219`); the port flagged `g` only, so with `ordering` on auxt the aux root
  was never flagged and `flatReorder(auxg)` returned at its guard. Output changed against the base on
  `digraph { a [ordering=out]; {rank=same; a; b} a:n -> b:n [label=x]; a:s -> b:s [label=y]; }`
  only; no corpus id has a node `ordering` on a flat-adjacent port group, so the smoke bytediff and
  the corpus survey were both clean before and after.
- **Impact**: when a mission adds a subgraph to a graph, audit what each recursing pass does with
  `g = the subgraph` (flags set on `g`, `dotRoot(g)`), not only whether the pass iterates
  `subgraphs`; and probe each audited site with an input that makes it do work, since the corpus may
  hold none.
- **Confidence**: High (port traces on base and head, native trace of `do_ordering_node` and
  `flat_reorder` from an instrumented 16.1.0 plugin).

## Observation: under rankdir=LR the flat-adjacent aux still clones auxt from the same node
- **Context**: the brief expected `rankdir=LR` (GD_flip) to make auxt the other end.
- **Finding**: with `{rank=same; a; b}` and `a -> b` edges, native prints `auxt=a` for TB and LR
  alike. Under LR the rank order is reversed, so e0 is the forward copy `b->a`, and the `GD_flip`
  SWAP hands `a` back. A different auxt needs the edges reversed (`b:n -> a:n`), which gives
  `auxt=b` in both directions.
- **Impact**: a test that wants to pin "auxt is the flip-swapped tail" needs a reversed-edge input;
  an LR copy of a TB input pins nothing new.
- **Confidence**: High (instrumented native trace, V2, V8, V9).

## Observation: a marker bundle finds the corpus ids a shared-primitive change can reach
- **Context**: choosing targeted-survey ids for the `flatEdge` change, which has four callers.
- **Finding**: a throwaway bundle built from a `$TMPDIR` copy of the head, with a `console.error`
  where the changed statement alters state (`dotRoot(g) !== g` and the root not yet flagged), run
  through `test/tools/bd-job.ts` on all 950 applicable ids (`-Kdot -Tdot`, 45 s cap, 6 lanes) took
  187 s and named 7 ids (`121`, `2239`, `258`, four `KW91` copies); 18 large ids hit the cap.
  The same scan with a marker in `makeFlatAdjEdges` names the 9 ids that reach the aux path
  (`1444`, `1444-2`, `1949`, `241_0`, `241_1`, `2437`, three `ports` copies). No native run is needed.
- **Impact**: cheaper and more exact than grepping inputs for attributes; the grep the brief
  proposed (rank + port syntax, 32 ids) contained all 9 aux ids, 23 that never reach the aux path, and none
  of the 7 others.
- **Confidence**: High
