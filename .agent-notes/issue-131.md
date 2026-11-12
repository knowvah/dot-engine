# issue-131 mission — observations (2026-11-10)

## Observation: stderr tells a bound aux symbol from an unbound one when stdout cannot
- **Context**: probing the ten symbols C's `setState` nulls for the flat-adjacent aux layout. On
  every input that equals native without the symbol, stdout (dot, xdot, svg) was equal on the base.
- **Finding**: native reports a malformed HTML value once per `make_label` call. With
  `<<b>x</i>>` in `label` (which `setState` rebinds from auxg) native prints the error twice, main
  graph and aux; in `xlabel`, `headlabel`, `taillabel` or a node `xlabel` (nulled) it prints it
  once. The port printed all of them twice until the aux init stopped reading the four.
- **Impact**: when a mission asks whether an init-time read happens in a sub-layout, probe with a
  value that makes the read itself print (malformed HTML is the cheapest), and compare stderr line
  counts; a stdout-only probe reports "equal" for a read whose result is thrown away.
- **Confidence**: High (native and port stderr on 12 inputs plus the `label` control; an
  instrumented native plugin prints `has_labels=1 label=1 xlabel=0 head=0 tail=0 nodexlabel=0` for
  the aux of all 17 test inputs).

## Observation: check a probe matrix's base cases against native before the variants
- **Context**: the brief's B2 (`rankdir=LR` on the two-port-edges-plus-label group) was to carry
  every symbol through the `GD_flip` branch.
- **Finding**: B2 differs from native with none of the symbols set (#172: the group reaches the aux
  in creation order, C passes `edgecmp` order). Two more base-only differences surfaced the same
  way: #173 (`GD_ranksep/2` is integer division in C) and #174 (the "exterior labels positioned"
  warning is not ported). In each case the control was the input with the attribute under test
  removed: the same difference on both sides means the attribute is innocent.
- **Impact**: render the plain bases first; replace any that differs with one that is equal (here
  `rankdir=LR` with one port edge, and `rankdir=LR` on w4), keep the differing one only as a
  record, and file it. A matrix on a base that already differs judges nothing.
- **Confidence**: High

## Observation: C `int` graph fields divide as integers, and the aux makes `ranksep` odd
- **Context**: diagnosing #173 from the boxes passed to `routesplines`.
- **Finding**: `GD_ranksep` and `GD_nodesep` are `int` (`lib/common/types.h:335`).
  `GD_ranksep(g)/2` in `beginpath`/`endpath` is 4 for a `ranksep` of 9; the port computes 4.5.
  `edgelabel_ranks` sets `(ranksep + 1) / 2` on the main graph (36 to 18) and again on the
  flat-adjacent aux (18 to 9), so the default `ranksep` is odd exactly in the aux of a graph with
  edge labels. The output differs only where `splinefits`' first tangent lands between the two box
  heights (node widths 1.2-1.4 in the repro), which is why it looks geometry-dependent.
- **Impact**: when porting an expression on `GD_ranksep`/`GD_nodesep`, check the C operand types
  (`/ 2` against `/ 2.`); a width- or size-dependent last-segment tangent that is exactly half or
  double native's points at a `splinefits` halving, so compare the path boxes first.
- **Confidence**: High (native and port box dumps; a throwaway bundle with the truncation renders
  the eight differing inputs byte-equal to native)

## Observation: trace libgvc behaviour from the dotgen call site
- **Context**: the instrumented native build swaps only `gvplugin_dot_layout` into the oracle.
- **Finding**: `routesplines` lives in `lib/common` (libgvc), which the oracle binary owns, so a
  trace inside it would need a rebuilt libgvc. An env-gated dump of `P->boxes`, the end points and
  the returned points in `lib/dotgen/dotsplines.c`, around each of its five `routesplines` calls,
  gives the same information from the plugin alone. With the #130 copy's build dir kept, each new
  trace cost one incremental `cmake --build <dir> --target gvplugin_dot_layout`.
- **Impact**: prefer call-site traces in the plugin; keep the instrumented tree's build dir between
  missions on the same code.
- **Confidence**: High
