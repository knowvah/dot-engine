# Decisions: issue #163

## Background

Graphviz 16.1.1 removes the undocumented `compact` graph attribute and the
"weak"/"strong" cluster machinery behind it (gitlab #2558):

| Upstream | `lib/dotgen/rank.c` change |
|---|---|
| `d5061e47c` | drops `BACKWARD_PENALTY`, `STRONG_CLUSTER_WEIGHT`, `TOPNODE`, `BOTNODE`, `is_a_strong_cluster`, `weak()` (with its `static int id`), the `tc`/`hc` locals and the `weak` arm of `compile_edges`, and the body of `compile_clusters` |
| `731f7c560` | removes the now-empty `compile_clusters` and its call in `dot2_rank` |

So in 16.1.1, `compile_edges` calls `strong()` for every constraining edge
(after the internal-edge `SWAP`), and nothing reads `compact`. Native prints no
warning: stderr is empty on all eight survey inputs.

Only the `newrank=true` ranker (`dot2_rank`) ever read `compact`. `dot1_rank`
never did, and neither version reads it anywhere else (`grep` over
`lib/dotgen`, `lib/common`).

The port (`src/layout/dot/rank-dot2.ts`) still has all of it: the constants
(`:20-25`), `XgState.weakId` (`:27-28`), `xgWeakExists`/`xgWeakSetWeights`/`xgWeak`
(`:215-244`), `isAStrongCluster` (`:246-249`), the weak dispatch in
`compileEdgeItem` (`:290-293`), `ClusterBounds`/`ccProcessNode`/`ccStrongCluster`/
`compileClusters` (`:300-346`), and the `compileClusters` call in `dot2Rank`
(`:522`).

The issue's triage note says it was "not yet checked against a 16.1.1 native
build". The #147 comment and this planning run have now checked it (README,
Evidence).

## AD-1: delete the machinery, as upstream does

Delete every symbol listed above, and make `compileEdgeItem` call `xgStrong`
whenever the edge is not internal to a cluster (`ceInternal` already calls it for
internal edges). `XgState` keeps `lastNode` only. `makeXnode` stays: C keeps it,
for `connect_components`' `ROOT` node.

[harness/counterfactual.patch](harness/counterfactual.patch) is this change in
`src/` (no tests). The executor also updates two comments the deletion makes
stale. The `makeXnode` doc comment (`:86-92`) explains TOP/BOT dedup; after the
change it should say the dedup matters only for `ROOT`. The F7 audit note
(`:82`) names `compileClusters`. Both are comment-only edits.

Rejected:

- **Keep the code, make `isAStrongCluster` return `false`.** It gives the same
  output (the #147 counterfactual did exactly this). But it leaves C-less dead
  code in a port whose rule is "keep function boundaries" with the C. The C
  deleted these functions.
- **Keep `compact` behind an option.** YAGNI (CLAUDE.md): the C has no such
  option.

## AD-2: no warning, no attribute handling

16.1.1 ignores `compact` silently, so the port adds nothing: no
unknown-attribute message, and no stripping. In `-Tdot`/`-Txdot` output
`compact=true` is still printed as a user attribute on both sides. That is
measured equal in the survey's `dot` and `xdot` rows.

## AD-3: TDD tests

Red first, on the base, each failing for the stated reason:

1. **Xg level** (`rank-dot2.branch.test.ts`): `compileEdgeItem` on an edge from a
   node in a `compact=true` cluster to a node outside it adds one Xg edge
   `Xt -> Xh` carrying the original edge's `minlen` and `weight` (via `strong`).
   It creates no `_weak_*` node, and `Xg.nodes.size` is unchanged. On the base
   this fails: `_weak_0` is created. This replaces the test "routes through xgWeak
   when either endpoint is in a strong cluster" (`:580`).
2. **Ranks** (`rank-dot2.branch.test.ts`, or a new `rank-dot2.compact.test.ts` if
   building the graph needs the layout helpers): `dot2Rank` on the topology of
   golden `dot-newrank-compact-three` with `compact=true` on all three clusters
   gives native 16.1.1's ranks:

   | node | a | b | c | d | e | f | z |
   |---|---|---|---|---|---|---|---|
   | native 16.1.1 = cf | 0 | 0 | 1 | 2 | 3 | 3 | 4 |
   | base | 0 | 0 | 0 | 1 | 1 | 1 | 2 |

   (From `-Tplain` node y: 1 in per rank at default `ranksep`, measured at
   planning.) This replaces the test "strong cluster (compact=true) pulls members
   together" (`:894`), whose chain passes on both sides and so pins nothing. If a
   hand-built graph (`makeRankGraph`, `makeSubg`, `addRankEdge`; set
   `e.info.minlen = 0` for the `minlen=0` edges) does not reproduce native's
   ranks on the head, build the graph from DOT text through the layout pipeline
   (`test/helpers/dot-position.ts`) instead. Do not change the expected ranks.
3. **Goldens**: remove `dot-newrank-compact-three` and `dot-newrank-compact-weak`
   from `test/golden/known-failing.json` (leaving `"goldens": []`). Their SVG and
   xdot golden tests then run as normal tests: red on the base, green on the
   head. With the entries in place, the head fails them (`test.fails`, "Expect
   test to fail"), which planning saw on the counterfactual. So the removal is
   required, not optional.

Delete the tests of the deleted functions: `xgWeakExists`, `xgWeakSetWeights`,
`xgWeak` (`:387-442`), `isAStrongCluster` (`:467-475`), `ccProcessNode`
(`:607-640`). Also remove their imports (`:25-27`) and `weakId` from `makeSt`
(`:57`). Rename the section headers that list them.

## AD-4: goldens stay; their text is a follow-up

All five `dot-newrank-compact-*` goldens stay, with their refs. The refs are
16.1.1 output, byte-equal to native in `-Tsvg` and `-Txdot` (checked at
planning). They now pin "16.1.1 ignores `compact`". Their manifest descriptions
and the 23 locale translations, plus the header comment of
`dot-newrank-compact-weak.dot`, still describe weak/strong clusters. Rewording
them is translation work outside a code fix, filed as **#238**. Leave
`test/golden/manifest.json`, `docs-site/` and `test/golden/inputs/` untouched.

## AD-5: how "equals native" is judged

[harness/golden-compare.sh](harness/golden-compare.sh) renders each input with the
base bundle, the head bundle (`test/tools/bd-job.ts`) and native 16.1.1, in svg,
xdot, plain, json, dot and cmapx. It counts `diff` lines against native after
[harness/normalize.mjs](harness/normalize.mjs) (svg header and json key order
only; copied unchanged from #162). It also records each side's stderr byte count.
"Equals native" means `head~native:0` and `native-err=0 head-err=0`.

## AD-6: scope

In: AD-1..AD-3 and the gates.

Out:

- **#237**: C's `SWAP(&Xt, &Xh)` in `compile_edges` persists across the tail
  node's later out-edges; the port's `ceInternal` swaps per edge. It predates
  16.1.1, is unrelated to `compact`, and its reach is unmeasured. Leave
  `ceInternal`/`ceShouldSwap` exactly as they are.
- **#238**: golden descriptions, translations and the input comment (AD-4).
- The `docs/known-divergences.md` row for #163, and corpus records. The
  maintainer updates the ledger when the queue branch merges, as with #158 and
  #162.
- `isACluster`'s inheritance (#183). Planning saw that a root-level
  `compact=true` changed 16.1.0's layout (it is inherited by the clusters via
  `agget`) but not the port base's. That is moot once nothing reads `compact`;
  the probe stays in the survey as a control.

## Rollback

Reversible: revert the squashed commit. No data model, API or file-format
change. Only `newrank=true` graphs whose clusters set `compact=true` (directly
or inherited) change, and they now rank as native 16.1.1 ranks them.

## Operational readiness

- Observability: N/A (library; no new signal, and native prints none).
- Scalability: `dot2Rank` drops a pass over the clusters and the weak-diamond
  search (`xgWeakExists` was O(E²) per weak edge).
- Backwards compatibility: no API shape change. Callers who relied on
  `compact=true` get 16.1.1's ranking, as native users do.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
|---|---|---|---|
| AD-1 removal | delete the functions and constants as upstream does | `isAStrongCluster` returns `false`; an option | `d5061e47c`, `731f7c560`; cf output equals native on 48/48 jobs |
| AD-2 warning | none | warn on `compact` | native stderr empty on all 8 survey inputs |
| AD-3 tests | Xg-level + rank-level red tests; un-list both goldens | keep the goldens listed | cf flips both goldens' `test.fails` red (svg and xdot) |
| AD-4 golden text | follow-up #238 | reword the manifest and 23 locales here | translation work; the refs are already 16.1.1 |
| AD-6 swap | follow-up #237 | fix `ceInternal` here | predates 16.1.1; reach unmeasured |
