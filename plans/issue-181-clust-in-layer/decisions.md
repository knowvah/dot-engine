# Decisions: issue #181

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-17, base `59862c28`. Nobody confirmed these. Each one lists the options
it rejected and its evidence, so the maintainer can audit it.

### AD-1: port `clust_in_layer` into `layers.ts`, and test it in `renderClusters`'s loop

**Context.** C's `emit_clusters` (`lib/common/emit.c:3720-3736`) skips a
cluster, and every cluster under it, when `clust_in_layer(job, sg)`
(`:1593-1606`) is false. That function returns true when `job->numLayers <= 1`
or the cluster's own `layer` selects the layer. A non-empty `layer` that does
not select it returns false. With no `layer`, it returns true when any node of
the cluster passes `node_in_layer(job, sg, n)`, and that test reads only the
edges of `sg` (`agfstedge(sg, n)`). It reads the attribute with
`late_string(sg, agattr_text(sg, AGRAPH, "layer", 0), "")`, which is the
cluster's own value or the default it was created under. The port has
`nodeInLayer` and `edgeInLayer` (`src/common/layers.ts:99, 113`) and no
`clust_in_layer`. `renderClusters` (`src/gvc/device.ts:340-347`) draws every
cluster on every layer.

**Decision.**
- Add `clustInLayer(info: LayerInfo, layerNum: number, sg: Graph): boolean` to
  `src/common/layers.ts`, after `edgeInLayer`, as the C reads: return true
  when `info.numLayers <= 1`. Read `pg = graphAttrInherited(sg, 'layer') ?? ''`
  (`src/common/attr-get.ts:40`, the port's `agxget` for graphs). Return true
  when `selectedLayer` matches. Return false when `pg !== ''`. Otherwise
  return true when some `n` of `sg.nodes` passes `nodeInLayer(info, layerNum,
  n, sg)`. Pass `sg`, not the root, so only the cluster's own edges count.
  `@see lib/common/emit.c:1593 clust_in_layer`.
- Add `clusterShown(info, job, sg)` to `src/gvc/emit-walk.ts`, next to
  `nodeShown` and `edgeShown`, with the same guard:
  `info === undefined || job.numLayers <= 1 || clustInLayer(...)`. Export it.
- In `src/gvc/device.ts`, give `renderClusters` and `renderOneCluster` an
  optional last parameter `info?: LayerInfo`. `renderPage` passes its `info`.
  Both recursive calls pass it on. The loop in `renderClusters` becomes
  `if (sg && clusterShown(info, job, sg)) renderOneCluster(sg, renderer, job, info);`.
  This is the place C tests it: in `emit_clusters`' loop, before the
  `EMIT_CLUSTERS_LAST` recursion, so a skipped cluster's sub-clusters are
  skipped too. `device.ts` is 510 lines and must not grow. The prototype
  changed 8 lines there and added none.

**Rejected.**
- (a) Store the `LayerInfo` on `RenderJob`. That is new state on the job for
  one reader. `walkNodesAndEdges` already takes `info` as a parameter, and the
  clusters follow it.
- (b) Call `parseLayers(g.root)` again inside `renderClusters`. `parseLayers`
  warns when `layerselect` matches no layer (`layers.ts:56`, then
  `parseLayerselect`), so the warning would repeat once per cluster level.
- (c) Test the cluster inside `renderOneCluster`. The output is the same, but
  the test then sits away from the loop where C has it.

**Evidence.** A scratch prototype of AD-1 and AD-2 was built and then reverted.
The diff is [harness/prototype.diff](harness/prototype.diff): 38 insertions and
15 deletions over 5 files. Probes ([harness/probes/](harness/probes/), 13
inputs):
[harness/results/proto2-body.tsv](harness/results/proto2-body.tsv) has 104 svg
body rows under 8 engines. On the base, 50 differ from native. On the
prototype, all 104 are byte-equal from the first `<g id=`.
`nested` (a sub-cluster on a layer its parent is not on, and a cluster `layer`
that a node `layer` contradicts), `inneredge` (an edge declared inside the
cluster), `all` (`layer=all`, a list and a number), `inherit` (a root
`layer=l2` declared before the cluster) and `layersep` (the #180 probe with the
cell anchor numbers) are all byte-equal. Before AD-2, the AD-1 prototype alone
gave the same svg table
([harness/results/proto-body.tsv](harness/results/proto-body.tsv)).

### AD-2: the xdot writer reads cluster membership from `GD_clust`, not from `endCluster`

**Context.** The port's dot/xdot writer (`src/render/dot/agwrite.ts`) has a
list `this.clusters`. `XdotRenderer.endCluster` fills it
(`src/render/dot.ts:310`). The writer uses it for two different things:
- **Which subgraphs are clusters** (C: `GD_clust`, walked by
  `rec_attach_bb`, `lib/common/output.c:229-249`): `hasBb` (`agwrite.ts:115`),
  `irrelevantSubgraph` (`:124`) and the `clusterAttrs` choice in `writeDicts`
  (`:186`). These print `bb` and the label triple.
- **Which clusters `xdot_end_cluster` ran for**
  (`plugin/core/gvrender_core_dot.c:280-291`): `renderedDraws`'s `cluster`
  flag (`dot.ts:87`) and the `_draw_` term in `clusterAttrs` (`:400`).

Until now every cluster in `GD_clust` was drawn, so the two sets were the same.
After AD-1, a cluster can be skipped. That happens under `layerselect`, which
keeps `numLayers > 1` even on a device without layers (`firstlayer`,
`emit.c:1109-1128`). The skipped cluster then falls out of the first set too.
On the AD-1 prototype, `select.gv` under `-Txdot` and `-Tjson` lost
`cluster_c`'s `bb` ([harness/results/proto-formats.tsv](harness/results/proto-formats.tsv),
10 `AWAY` rows). Native 16.1.1 prints `graph [URL=c, bb="8,8,78,60"]`:
`bb`, and no `_draw_`.

**Decision.**
- Export `inClusterTree` from `src/render/dot/attrs.ts:244`. It already walks
  the ancestors' `info.clust` lists. Use it in `agwrite.ts` at `hasBb`,
  `irrelevantSubgraph` and `writeDicts`.
- `this.clusters` keeps its fill in `endCluster` and now means only "drawn".
  `clusterAttrs` prints `_draw_` when `(this.emitDraws &&
  this.clusters.includes(sg)) || d?.draw`. So a skipped cluster prints only a
  stored `_draw_`, as native does when `xdot_end_cluster` never runs.
- Update the doc comments on `clusters` (`agwrite.ts:40`, header `:9`) and the
  comment at `:143-144` to say which set is which, without growing the file:
  `agwrite.ts` is 533 lines.

**Rejected.**
- (a) Fill `this.clusters` from `GD_clust` in `beginGraph`. Then
  `renderedDraws` would see `cluster = true` for a skipped cluster. It would
  print `_draw_=""` and drop a stored `_draw_` (`write-back.ts:139`). Native
  keeps the stored one: on the prototype, `select-stored.gv` xdot is
  byte-equal to native under the 5 engines that draw clusters.
- (b) Leave the writer alone. Then the `select` xdot and json rows move away
  from native, which the queue rules count as a halt.

**Evidence.** On the AD-1 + AD-2 prototype, over all 13 probes and 8 engines:
- cmapx, cmapx_np, imap, imap_np, xdot and plain: 528 rows, 503 `unchanged`
  and 25 `native` ([harness/results/proto2-formats.tsv](harness/results/proto2-formats.tsv)).
- dot and xdot again, with the two later probes: 208 rows, 198 `unchanged` and
  10 `native` ([harness/results/proto2-dot.tsv](harness/results/proto2-dot.tsv)).
- json, judged on canonical json: 104 rows, 94 `unchanged` and 10 `native`
  ([harness/results/proto2-json-rowcheck.tsv](harness/results/proto2-json-rowcheck.tsv)).

The `native` rows are `select` and `select-stored`, under dot, neato, fdp,
osage and patchwork. `npx vitest run src/render src/gvc src/common` on the
prototype gives 202 files and 4510 tests, all passing. Without `layers`, the
two sets are equal, so AD-2 must change no output. The base-vs-head identity
survey checks that over the 293 cluster inputs (T1, gate 6b). At planning it
gave 876 of 879 rows `same` and none `CHANGED`. The other 3 rows are 2621's,
which runs over 300 s ([journal](decision-journal.md) row 1).

### AD-3: tests

- `src/common/layers.test.ts`: unit cases for `clustInLayer` on graphs built
  with `parse`:
  - a cluster's own `layer` selects it, and a non-matching `layer` rejects it
    even when a node of it is in the layer;
  - with no `layer`, a node `layer` decides;
  - a node with no `layer` and no edge in the cluster is in every layer;
  - an edge declared inside the cluster with `layer=l2` puts its unlayered
    nodes in `l2` only;
  - an edge declared at the root does not count;
  - `numLayers` 1 returns true.
- `src/render/svg-clust-in-layer.test.ts` (new), reading this brief's harness
  as `svg-layer-id.test.ts` reads #180's:
  - svg body equality with native for `issue`, `clusterlayer`, `nested`,
    `inneredge`, `all`, `inherit`, `layersep`, `select` and `nolayers`, under
    dot, neato and fdp;
  - `select` under cmapx and cmapx-np, byte equality;
  - `select` and `select-stored` under xdot, byte equality (AD-2);
  - `select` json, structural equality: `JSON.parse` both and `toEqual`.
- `src/render/svg-layer-id.test.ts`: add `repro` to `BODY_EQUAL_PROBES`, and
  drop `LAYER1_CLUSTER_ANCHOR_181` and its filter, as the #180 comment on #181
  asks. The anchor case then asserts native's list exactly.

The 8-engine matrix stays in the harness (T1 step 3), so the unit suite does
not render each probe 8 times.

## Baseline

Planning base `59862c28d82b2745f69cefe6b45bcca4b23e5010`. See
[decision-journal.md](decision-journal.md), row 0.

## Rollback

Reversible: revert the one squashed commit. No public API changes:
`renderClusters` is internal (not exported from `src/index.ts`), and its new
parameter is optional. Output changes only when `job.numLayers > 1`, which
needs `layers`, and every change is toward native's: clusters disappear from
layers that native leaves them off, in svg (and every layered device), and in
maps, xdot and json under `layerselect`.

## Irreversible changes

None.
