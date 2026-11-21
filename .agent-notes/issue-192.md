# issue-192 mission — observations (2026-11-21)

## Observation: `agattr` on the root resets a root default and keeps it printed
- **Context**: #192, porting `attach_phase_attrs` (`lib/dotgen/dotinit.c:241-256`), which calls
  `agattr_text(g, AGNODE, "rank"|"order", "")` on the root at a `phase` 1-3 stop.
- **Finding**: with a root `node [order=7]`, native prints `node [label="\N", order=""]`: `setattr`
  (`lib/cgraph/attr.c`, "update old local definition") replaces the default, and the symbol keeps
  `print`, so `write_dict` does not skip the empty default. With no root definition the new global
  symbol has `print` unset and nothing is printed. A subgraph's `node [rank=9]` is a local symbol
  and keeps its value. The port twin is `declareEmptyNodeAttr` (`src/layout/dot/index.ts`): set an
  existing root `nodeDefaults` entry to `''`, store nothing otherwise (a missing key is the port's
  empty default, and `agwrite.ts` prints every entry it holds).
- **Impact**: any later port of a C `agattr(g, kind, name, "")` call made after parsing needs the same
  conditional; always storing `''` would print `node [name=""]` where native prints nothing.
- **Confidence**: High (probes `p2-root-default`, `p3-root-both`, `e1`-`e4`, `e21`, `e22`, `e26`
  equal the carried 16.1.1 oracle in dot, xdot, json and plain)

## Observation: resetting a root default does not change the nodes' own copies
- **Context**: `digraph { phase=1; node [order=7]; a -> b }` (phase 1 writes `rank` only).
- **Finding**: native prints `order=""` on the root and `order=7` on `a` and `b`: cgraph copies the
  default into each node's record at creation, and `setattr` on an existing symbol does not revisit
  the nodes. The port's parser already snapshots the defaults in effect per node at creation
  (`Node.nodeDefaultsSnapshot`, `src/parser/builder.ts:effectiveNodeDefaults`), and the writers read
  that snapshot, so resetting `g.nodeDefaults` alone reproduces this with no extra work.
- **Impact**: do not "fix" the reset by clearing the attribute on nodes or in their snapshots.
- **Confidence**: High (probe `e1-p1-root-order`, 4 formats equal native)

## Observation: native segfaults on a newrank phase stop that leaves fill nodes
- **Context**: `digraph { newrank=true; phase=2; subgraph cluster_a { a1 a3 } a1 -> x -> a3 }`.
- **Finding**: the carried 16.1.1 build segfaults on `-Tdot` (recorded at planning), so there is no
  reference for the fill node `__fill_1_0` the port prints. `removeFill` runs only after the phase 3
  stop in C's `dotLayout`. Tracked in #282. Newrank without a fill node (probes `p2-newrank`,
  `e15`, `e16`) equals native.
- **Impact**: no probe can cover it; leave the port's output as it is until #282 is ruled.
- **Confidence**: Medium (the segfault is from the planning survey; not re-run at execution)

## Observation: no corpus input sets `phase`
- **Context**: choosing the targeted survey for #192.
- **Finding**: a search for `phase` over the corpus finds it only inside node names of `2621.dot`.
  The pipeline's phase stops are reached only by `test/golden/inputs/dot-phase.dot` and unit tests.
- **Impact**: a change behind `graphPhase(g) in 1..3` cannot move a corpus row; probes against native
  are the survey.
- **Confidence**: High (smoke bytediff 1960/1960 identical)
