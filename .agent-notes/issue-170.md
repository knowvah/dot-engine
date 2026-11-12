# issue-170 mission — observations (2026-11-11)

## Observation: two sides that add "the same" edges by sequence number can add different edges
- **Context**: #170's planning ruled out the FLATORDER edges because native and the port both add
  the AGSEQ pairs (1,2) and (2,3) in the flat-adjacent aux graph.
- **Finding**: the pairs are equal and the edges are not. AGSEQ in the aux is the order
  `make_flat_adj_edges` clones the group in, and that order differed (#172), so AGSEQ 1 was the `y`
  edge on native and the `x` edge on the port. A dump that names each node by its label
  (`ND_label(v)->text` for a label vnode) showed `y→x, x→V` against `x→y, y→V` on the first line.
- **Impact**: when comparing two traces of a derived graph, print an identity that survives the
  derivation (label text, port name, original endpoint names), never a sequence number or an index
  alone. A "ruled out" that rests on ids assigned by the code under test is not ruled out.
- **Confidence**: High (instrumented 16.1.0 plugin and a matching port trace, four inputs).

## Observation: the dispatch loop's run already has C's edgecmp order; the flat routers re-derive theirs
- **Context**: finding where the port could take C's group order from.
- **Finding**: `dispatchEdgeGroup` (`src/layout/dot/splines-groups.ts`) holds the `groupSize` slice
  of the `gvQsort(edges, edgecmp)` list, which is C's `edges + ind`, `cnt`. The flat routers did not
  receive it: each rebuilt its group from `g.edges` and sorted it by "tail is the left node, then
  creation seq". `collectAdjacentFlatGroup` now filters the run (the `run` parameter from
  `routeLoneEdge` down). `collectNonAdjacentFlatGroup` (`splines-flat-multi.ts`) and
  `collectAdjFlatGroup` (`splines-flat-labeled.ts`) still re-derive. On 950 applicable corpus ids the
  adjacent collector's set equalled the run in all 26 aux calls, and its order differed in one
  (`241_0`, nodes 2 and 3), where the instrumented native prints the run's order.
- **Impact**: a group-order difference in a flat router is fixed by passing the run, not by a new
  comparator: `setflags` runs on list entries, so an original whose entry is a `flat_rev` virtual
  copy has no `tree_index` of its own and `edgecmp` on it reads a stale network-simplex value.
- **Confidence**: High

## Observation: fixing one of two stacked defects can raise the diff-line count
- **Context**: a 480-input probe matrix of flat-adjacent groups, native against base and head.
- **Finding**: 62 `rankdir=LR`/`RL` inputs with two labelled port edges went from 6 differing
  `-Tdot` lines to 9 or 10. On base the two edges sat in each other's channel and the `bb` was equal
  by symmetry; on head the layout is native's apart from #173 (`GD_ranksep/2` is integer division),
  whose 1.6-point `bb` growth shifts every `y`. Two checks separated the defects: the variant whose
  creation order already is C's order differs by the same 9 lines on base and head; and a throwaway
  bundle of head plus #173's truncation renders all 98 still-differing rows byte-equal to native.
- **Impact**: a line count measures text, not mechanisms. Before reading "more lines differ" as a
  regression, find the control input where the fixed mechanism was already right on base, and stack
  the suspected second fix in a throwaway bundle. Both checks took minutes.
- **Confidence**: High

## Observation: `merge2: ... has only N < N+1 nodes` under `-v` is not a signal
- **Context**: the brief listed `merge2: graph auxg, rank 1 has only 3 < 4 nodes` as an unexplained
  clue.
- **Finding**: `allocate_ranks` sets `an = n = cn[r] + 1` (`lib/dotgen/mincross.c:1144`), one slot
  more than the rank can hold, so `merge2` prints the line for every rank of every graph.
- **Impact**: ignore it when reading native `-v` output.
- **Confidence**: High
