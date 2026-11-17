# Issue #162: fail the dot layout when an aux edge is too long (graphviz 16.1.1)

## Observation: `printfFixed` is the `%f` for values at or past 1e21
- **Context**: Porting `make_aux_edge`'s `Edge length %f larger than maximum
  %d allowed.` message (upstream `f86899fcc`).
- **Finding**: `Number.prototype.toFixed` switches to exponent form at 1e21:
  `(1e24 * 72).toFixed(6)` is `7.1999999999999994e+25`, where C prints
  `71999999999999994497073152.000000`. `printfFixed(len, 6)`
  (`src/util/printf-round.ts`) prints the exact decimal expansion and matches
  native on all five corpus ids (`1314`, `2758`, `2776_1`, `2781`, `2781_1`).
- **Impact**: Any ported `%f` whose argument can reach 1e21 needs
  `printfFixed`, not `toFixed`.
- **Confidence**: High (stderr equals native byte for byte on the five ids).

## Observation: a decimal literal is not the double a product gives
- **Context**: A unit test fed `7.2e25` to `makeAuxEdge` and expected 2781's
  message.
- **Finding**: The literal `7.2e25` is the double
  `72000000000000003087007744`; 2781's length is the product `1e24 * 72` =
  `71999999999999994497073152`, one ulp lower.
- **Impact**: When a test reproduces a value native printed, build it the way
  the C does (the same operations), not from the rounded decimal.
- **Confidence**: High.

## Observation: native `int` fields filled by `POINTS` saturate on the arm64 oracle
- **Context**: Corpus `2758` (`nodesep=40000000`, 2.88e9 pt).
- **Finding**: Native 16.1.1 reports `Edge length 2147483701.000000`, which is
  `2147483647 + 27 + 27`: `GD_nodesep` (an `int`, `lib/common/types.h`) holds
  INT_MAX after `POINTS(xf)` (`lib/common/input.c:657-659`). The port's
  `points()` returned 2880000000 and reported `2880000054.000000`.
  `parseSepAttrs` (`src/common/graph-init.ts`) now wraps nodesep in `d2i`.
- **Impact**: The other `POINTS` sites in `graph-init.ts` (`ranksep`, `size`,
  `page`) are not saturated. Whether clang emitted the scalar (saturating) or
  vectorised (low 32 bits, `arith.ts:croundNarrow32`) conversion at each is
  unchecked; no corpus input reaches them past INT_MAX.
- **Confidence**: High for nodesep (one corpus id, exact arithmetic);
  unknown for the other sites.

## Observation: native segfaults after a failed pack component
- **Context**: `plans/issue-162-aux-edge-too-long/harness/pack-probe.dot`
  (`pack=true`, two components, the first with an aux edge of 7.2e25 pt).
- **Finding**: Native 16.1.1 prints the `Edge length` error once, then exits
  139 with empty stdout: `doDot` returns at the first failed `dotLayout(sg)`
  (`lib/dotgen/dotinit.c:437-445`) and the renderer walks a root whose second
  component was never laid out. The port returns the unpositioned graph. On the
  base the port dropped `dotPosition`'s status on this arm and ran out of heap
  packing 1e25-pt components (re-measured here with a 768 MB heap cap: the
  vitest worker dies with `JavaScript heap out of memory`).
- **Impact**: The pack arm after a failed component has no native bytes to
  pin; `pack-components.aux-fail.test.ts` checks control flow only. Removing
  the probe's `a -> b` edge makes every component a single node, nothing
  fails, and both native and the port try to pack 1e25-pt components.
- **Confidence**: High (planning measurement; port side re-measured here).

## Observation: which `make_aux_edge` callers can fail the layout
- **Context**: Reading 16.1.1 `lib/dotgen/position.c` against the issue text,
  which said only `make_edge_pairs` tests the result.
- **Finding**: `make_LR_constraints` tests it at four sites (`:269`, `:288`,
  `:293`, `:324`; upstream `e62e35be5`, `92ef8d508`) and `make_edge_pairs` at
  two (`:357`, `:360`). Every other caller (`connectGraph`, `make_lrvn`,
  `contain_nodes`, `contain_clustnodes`, `keepout_othernodes`,
  `contain_subclust`, `separate_subclust`, `compress_graph`,
  `class1.c:interclust1`) ignores a NULL: the edge is absent and the layout
  carries on. On the 982 applicable dot corpus ids every refusal is at the
  adjacent-pair edge (`:269`, the port's `lrRankPair`).
- **Impact**: An oversized cluster margin or border prints the error and still
  lays the graph out, in native and in the port. `interclust1` dereferences the
  result unchecked in C; its lengths are C `int`s, so the port asserts non-null.
- **Confidence**: High.

## Cleanup candidates (other files, not touched)
- `INT_MAX` is declared separately in `src/layout/dot/position.ts:17`,
  `src/layout/dot/position-aux.ts`, `src/util/overflow.ts:9` and (as
  `INT32_MAX`) `src/util/math.ts:9`; neither util constant is exported.
