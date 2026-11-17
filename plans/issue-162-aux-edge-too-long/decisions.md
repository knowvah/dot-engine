# Decisions: issue #162

## Background

Graphviz 16.1.1 (`f86899fcc`, upstream 2781/2776) turned `make_aux_edge`'s
clamp into a failure. 16.1.0 printed `Edge length %f larger than maximum %d
allowed.\nCheck for overwide node(s).\n` and clamped `len` to `INT_MAX`. 16.1.1
prints the same message, frees the edge, and returns `NULL`
(`lib/dotgen/position.c:179-200`). Eight plumbing commits propagate that
result:

| C site (16.1.1) | Upstream | Behaviour on `NULL` |
|---|---|---|
| `make_LR_constraints` adjacent-pair edge, `position.c:269` | `e62e35be5`, `92ef8d508` | `return -1` |
| `make_LR_constraints` flat-label pair, `:288`, `:293` | `e62e35be5` | `return -1` |
| `make_LR_constraints` unlabelled non-adjacent flat edge, `:324` | `e62e35be5` | `return -1` |
| `make_edge_pairs` both edges, `:357`, `:360` | `73c1fd4d1`, `f0d837f19` | `return -1` |
| `create_aux_edges`, `:534-550` | `d3f55476c`, `eee08edc1`, `f1e5ad67d` | returns the rc before `pos_clusters` |
| `dot_position`, `:135-140` | `f444e5192` | returns the rc before `rank(g, 2, …)` |
| every other caller (`connectGraph`, `contain_clustnodes`, `make_lrvn`, `contain_nodes`, `keepout_othernodes`, `contain_subclust`, `separate_subclust`, `compress_graph`, `class1.c:interclust1`) | none | ignores the result: the edge is simply absent (16.1.0 clamped it) |

`dotLayout` returns the rc (`dotinit.c:283-290`), `doDot` returns it on every
arm, including the pack loop (`dotinit.c:437-445`), and `dot_layout` skips
`dotneato_postprocess` (`dotinit.c:473-481`). The renderer then writes the
unpositioned graph: native exits 1 with a complete `-Tsvg`/`-Txdot`.

The issue body says "Only `make_edge_pairs` checks the result". That is wrong:
`e62e35be5` checks all four `make_LR_constraints` sites too. The brief follows
the C, not the triage note.

The port today (`src/layout/dot/position-aux.ts:109-115`) clamps with
`Math.min`, prints nothing, and lays the graph out at 1e12-1e26 pt.

## AD-1: `makeAuxEdge` refuses, as 16.1.1 does

`makeAuxEdge(u, v, len, wt): Edge | null`. When `len > 2147483647` it calls
`agerrorf` with the 16.1.1 message and returns `null` before creating the edge,
so nothing is linked into the fast lists. Otherwise it is unchanged: `cround(len)`
with no `Math.min`. The `%f` is `printfFixed(len, 6)` (`src/util/printf-round.ts`),
which is exact for every finite double. `toFixed` switches to exponent form at
1e21 and cannot print 2781's `71999999999999994497073152.000000`.

The message is one `agerrorf` call whose text holds the `\n`, so it prints as
`Error: Edge length … allowed.` and `Check for overwide node(s).` on two lines,
as native does. The counterfactual prints exactly native's two lines on all five
ids.

**Unchecked callers:** they keep ignoring the result, as C does. The port's
`position-cluster.ts` and `connectGraph` callers already discard it, so they need
no edit. `classify.ts:interclust1` reads `rt`/`rh` (C writes `ED_to_orig` on
both without a test). Its lengths are C `int`s (`offset = ED_minlen(e) + t_rank -
h_rank`), so they cannot exceed `INT_MAX`. A non-null assertion (`!`) with that
reason is the faithful port: a `null` there would be C's `NULL` dereference.

**Rejected:** (a) keep the clamp and add only the message. That is 16.1.0's
behaviour, not the oracle's, and the issue asks for the failure. (b) Throw from
`makeAuxEdge`. C returns a value and the unchecked callers continue, so a throw
would abort layouts that native finishes.

## AD-2: return codes through the checked chain, nothing more

The port splits C's `make_LR_constraints` into helpers. Each helper on a checked
path returns a status, and each caller tests it in C's order:

| Port function | Returns | C counterpart |
|---|---|---|
| `lrRankPair` | `number \| null` (`null` = failed; `v.info.rank` not written) | `:269-273` (the `ND_rank(v)` assignment follows the test) |
| `applyFlatLabel`, `makeFlatLabelConstraints` | `0` / `-1` | `:277-296` |
| `processFlatEdge`, `makeFlatEdgeConstraints` | `0` / `-1` | `:299-330` |
| `makeLrRankConstraints`, `makeLrConstraints` | `0` / `-1` | the rank loops |
| `addEdgePair`, `makeEdgePairs` | `0` / `-1` | `:340-366` |
| `createAuxEdges` | rc, before `posClusters` | `:534-550` |
| `dotPosition` | rc, before `rankIsXCoord`/`rank(g, 2, …)` | `:135-140` |
| `dotLayoutComponent` (`pack-components.ts`) | `dotPosition`'s rc before `dotPhasePostNoFinish` | `dotLayout`'s `dot_position` test on the pack arm |

The root arm (`dotLayoutPipeline`, `index.ts:266-267`) and the flat-adjacent aux
arms (`splines-flat.ts:100,368`) already test `dotPosition`'s rc. Nothing new is
needed for the failed render: the `posRc` early return already skips
`dotPhasePost` and `gvPostprocess`, as it does for 2825's `dot_concentrate`
failure.

**Pack arm:** `dotLayoutComponent` drops both `dotMincross`'s and `dotPosition`'s
rc today. Only `dotPosition`'s is in scope, because #162 is what makes it fail.
`dotMincross`'s rc on that arm is a separate pre-existing gap, filed as follow-up
`#235`. A two-component `pack=true` probe (`harness/pack-probe.dot`)
shows the difference: the base runs out of heap packing 1e25-pt components, and
the counterfactual fails the first component and returns before packing, printing
the error once.

Native 16.1.1 on the probe prints the same single error, then **segfaults**
(exit 139, empty stdout) in a normal run. Under `lldb` (no ASLR) it exits 1 and
writes `-Tplain` without node `c`, whose component was never laid out, where the
counterfactual writes `node c 0 0 0 0 …`. That is native undefined behaviour on
an uninitialised component after `doDot`'s early return, so the probe is not a
conformance target: T1 tests the port's control flow there (no packing, error
once), not its bytes. Do not chase the `node c` line.

## AD-3: `GD_nodesep` saturates at int32 (2758)

`graph_init` stores `POINTS(nodesep)` in `int GD_nodesep` (`lib/common/input.c:657-659`,
`types.h:334`). `POINTS` is `ROUND(x*72)` = `(int)(f + .5)`. For a value past
`INT_MAX`, that conversion is undefined in C. The oracle's arm64 build saturates
it to 2147483647 (scalar `fcvtzs w`, as `arith.ts:croundNarrow32`'s doc says of
the scalar ROUND sites). Evidence: on 2758 (`nodesep=40000000`, 2.88e9 pt),
native reports `Edge length 2147483701.000000`, which is `2147483647 + 27 + 27`
(two 54-pt nodes' `rw + lw`). The port's `points()` does not saturate, so the
counterfactual without AD-3 reported `2880000054.000000`.

Fix it at the one site: `parseSepAttrs` (`src/common/graph-init.ts:125`) wraps
the nodesep in `d2i` (`src/util/math.ts:79`, clamps to the int32 range and
truncates; the argument is already a `cround` result, so truncation is a no-op).
Only corpus `2758` sets a nodesep above 2.98e7 in (grep of all corpus `nodesep`
values). With AD-3 the counterfactual prints native's message on 2758 byte for
byte.

**Not in scope:** the other `POINTS` sites in `graph-init.ts` (`ranksep`, `size`,
`page`). No corpus input reaches them past `INT_MAX`, and whether clang emitted
the scalar (saturating) or vectorised (low-32-bit, `croundNarrow32`) conversion
at each has not been checked. Changing them without that evidence would be a
guess.

## AD-4: TDD tests and corpus pins

Red first, on the base:

1. `makeAuxEdge` with `len = 1e20`: returns `null`, links nothing into
   `u.info.out`/`v.info.in`, and prints the two lines with `printfFixed`'s value
   (capture with `agseterrf` or a `console.error` spy). `len = 2147483647` still
   gives `minlen 2147483647`. This replaces the clamp test at
   `position-aux.branch.test.ts:168`.
2. One test per checked site: `lrRankPair` returns `null` and leaves
   `v.info.rank` unwritten; `applyFlatLabel`, `processFlatEdge` and `addEdgePair`
   return `-1`; `makeLrConstraints`/`makeEdgePairs`/`createAuxEdges` stop at the
   first failure (`createAuxEdges` does not call `posClusters`; pass spies).
3. One unchecked site: `connectGraph` or a cluster caller with an oversized
   length prints the message, adds no edge, and carries on.
4. `parseSepAttrs` with `nodesep=40000000` gives `2147483647`.
5. Corpus pins (a new `src/layout/dot/aux-edge-too-long-2781.test.ts`, following
   `no-out-edge-2765.test.ts`): `-Tplain` of `1314`, `2781_1`, `2776_1` and `2758`
   equals native 16.1.1's stdout. Their stderr carries the exact error lines.
   `2781` is the same graph as `2781_1` plus a parse warning; one of the two
   is enough.
6. Pack probe: with `harness/pack-probe.dot`, `layoutAndPack` returns without
   packing: the render returns (no out-of-heap), and the error prints once.
   There is no native pin, because native segfaults here (AD-2).

The existing tests whose types change (`position-aux.auxedge.test.ts` and the
`makeAuxEdge` users in `position-aux.branch.test.ts`/`position-aux.test.ts`) take a
non-null assertion on lengths below `INT_MAX`. Change no assertion values.

## AD-5: how "equals native" is judged

As #160/#161: `harness/native-compare.sh` (unchanged copy) renders base, head and
native for svg, xdot, plain, json and cmapx, normalises the generator comment,
the `<svg>` attribute wrap and trailing blank lines (`normalize.mjs`), and counts
diff lines. Stderr is compared separately (T2).

**Known residue, not a #162 defect:** on `2781`/`2781_1` svg and xdot, node `00`'s
ellipse centre is `cx="0"` in the port and `cx="2147483648"` in native.
Mechanism: `poly_gencode` computes `AF[i].x = P.x * xsize + ND_coord(n).x`
(`lib/common/shapes.c:3023`). The arm64 build fuses that into one `fma`, while the
port rounds the product first. With `xsize = 7.2e25/54` and `x = 1`, the fused
`+27` vertex rounds up one ulp (2^32), so the midpoint `gvrender_ellipse` takes
(`lib/gvc/gvrender.c:526`) is `2^31` instead of `0`. Exact `BigInt` arithmetic
reproduces both values ([harness/fma-ellipse.mjs](harness/fma-ellipse.mjs)). The
text anchor (`x="1"`) and every `-Tplain` field agree. This is the
render-side fma contraction class, not the position failure. It is filed as
follow-up `#236`. The T2 gate expects exactly that one line per
format on these two ids.

## AD-6: scope

In: AD-1..AD-4. Type `fix`, a patch release.

Out: #187 (a failed flat-adjacent aux layout falls through to other routers);
the pack arm's `dotMincross` rc (`#235`); the `poly_gencode` fma
(`#236`); the other `POINTS` sites (AD-3); `2776` (its exit 1 is
pathplan's `checkpath` chain, #151); json's root `"name": "%1"` (#185); corpus
records (`parity*.json`, `1314`'s structural-match row) and the ledger, which the
maintainer's survey refreshes.

## Rollback

Reversible: revert the squashed commit. No data model, API or attribute change.
Library callers see the new stderr message and an unpositioned drawing on graphs
that 16.1.1 also refuses.

## Operational readiness

- Observability: N/A (library; the only new signal is the 16.1.1 error line).
- Scalability: makeAuxEdge gains one comparison per aux edge.
- Backwards compatibility: no API shape change. Graphs with an aux edge longer
  than `INT_MAX` now render as native 16.1.1 does (the unpositioned 8×8 pt page)
  instead of a 1e12-1e26 pt layout.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
|---|---|---|---|
| AD-1 refusal | `Edge \| null`, message via `agerrorf` + `printfFixed` | keep clamp; throw | C `position.c:179-200`; cf stderr equals native on 5/5 ids |
| AD-2 plumbing | status returns along C's checked chain, plus the pack arm's `dotPosition` | also the pack arm's `dotMincross` rc | `dotinit.c:283-290,437-445`; mincross rc is not a #162 change |
| AD-3 nodesep | `d2i` at `parseSepAttrs` only | saturate every `POINTS`; leave 2758's message wrong | 2758 native value `2147483701` = INT_MAX + 54 |
| AD-5 residue | accept 2781 ellipse `cx` as the fma follow-up | port fma in `poly_gencode` here | exact-arithmetic replay, `harness/fma-ellipse.mjs` |
