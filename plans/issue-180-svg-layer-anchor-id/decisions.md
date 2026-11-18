# Decisions: issue #180

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-17, base `2eea1a9f`. Nobody confirmed these. Each one lists the options
it rejected and its evidence, so the maintainer can audit it.

### AD-1: put the layer prefix in `RenderJob.objId`, and drop it from the four group writers

**Context.** C's `getObjId` (`lib/common/emit.c:204-245`) calls
`layerPagePrefix(job, xb)` (`:194-202`) first, before the explicit-`id`
check and before the `<gid>_` prefix. So `obj->id` is `<layer>_<id>` on
layers after the first, and every consumer reads it from there. The svg
groups read it in `svg_print_id_class`. The node group adds its `_<layer>`
suffix there too. The anchors (`a_<id>`), edge label anchors and HTML cell
anchors (`env.objid`, `htmltable.c:747`) read it. So do the gradients
(`gvrender_core_svg.c:172-182, 592, 632`) and the map areas. The root graph's
id comes from `emit_begin_graph` while `layerNum` is 0, so it carries no
prefix there. `emit_page` then prefixes it when `NotFirstPage` holds
(`:3539-3561`). The port's `RenderJob.objId` (`src/gvc/job.ts:323-327`) stands
for the part of `getObjId` after `layerPagePrefix`, as its doc comment says.
Every port id goes through it, by way of `svgNodeId`, `svgEdgeId`,
`svgClusterId` and `svgGraphId` (`src/render/svg-id.ts`). The four group
writers add `job.idLayerPrefix()` themselves (`svg-cluster.ts:17`,
`svg-graph.ts:410`, `svg-helpers.ts:189, 228`).

**Decision.** `objId` starts every id it returns with `this.idLayerPrefix()`,
in each of its three branches (explicit `id`, `<gid>_`, plain). Its doc comment
then names `layerPagePrefix` as included. The four group writers drop their own
`job.idLayerPrefix() +`. `svgBeginNode` keeps `job.idLayerSuffix()`.
`idLayerPrefix()` stays: `objId` calls it. The root graph needs no separate
branch. `svgGraphId` is called inside the layer loop, where `layerNum` is
the current layer, and is never called while `layerNum` is 0
(`renderGraph`, `src/gvc/device.ts:366`). That gives `emit_page`'s
`NotFirstPage` rule. C's `"layer"` fallback for a NULL root id
(`emit.c:3558`) cannot happen in the port, because `svgGraphId` always
returns a string.

**Rejected.**
- (a) Add `job.idLayerPrefix() +` at each of the other sites: `device.ts:94,
  202, 205, 235, 279, 281, 285, 391`, `poly-gencode.ts:317, 371` and
  `svg-graph.ts:272`. That puts eleven copies of a step C does once, in
  `getObjId`. It also needs `device.ts`, which is over the 500-line cap at 510
  lines.
- (b) Prefix in `svg-id.ts`'s four functions instead of `objId`. That gives
  the same bytes, but it leaves `objId` as a partial `getObjId` that callers
  must remember to wrap. `objId` is the port's `getObjId`, so the step belongs
  there.

**Evidence.** A scratch prototype of exactly this decision was built and then
reverted (8 insertions and 7 deletions over 4 files; diff at
`$TMPDIR/i180/proto.diff`). Probes:
[harness/prototype-body-equal.tsv](harness/prototype-body-equal.tsv) has 80 svg
rows. On the base, 72 differ from native and the 8 `nolayers` rows are
byte-equal. On the prototype, 67 are byte-equal: `html`, `gradient`,
`explicitid`, `gid`, `edgelabels`, `select`, `list` and `nolayers` under all 8
engines, and `repro` under sfdp, circo and twopi. The rest is `repro` under
the 5 engines that draw the cluster (#181) and `gid-inherit` (AD-4).
[harness/prototype-probes.tsv](harness/prototype-probes.tsv) has 480 rows over
all formats. Every xdot, imap and imap_np row is `unchanged`. Every cmapx and
cmapx_np row is `unchanged` except `select.gv` under 8 engines (16 rows), which
are `native`. `npx vitest run src/render src/gvc src/common` on the prototype
gives 201 files and 4473 tests, all passing. No existing test asserts a layer
id.

### AD-2: do not port the `page<x>,<y>_` half of `layerPagePrefix`

That half writes `page<x>,<y>_` when `job->pagesArrayElem` is not `(0,0)`.
Only a device with `GVDEVICE_DOES_PAGES` gets more than one page
(`emit.c:1181`), and only `ps` and `quartz` carry the flag
(`plugin/core/gvrender_core_ps.c:508`, `plugin/quartz/gvrender_quartz.c:483`).
Neither prints `obj->id`: `gvrender_core_ps.c` has no reference to it. The
port has neither renderer and keeps no `pagesArrayElem`. Its pagination is a
single page (`src/gvc/viewport.ts:187, 220`). So the half has no state to read
and no output to change. `objId`'s doc comment says this in one line, so the
omission is visible. Rejected: adding `pagesArrayElem` to `RenderJob` for this
alone, which would be state with no writer (YAGNI, CLAUDE.md).

### AD-3: a new test file reading this brief's native captures

Add `src/render/svg-layer-id.test.ts`, following
`src/render/map-cluster-area-order.test.ts`:

- svg body equality with native (from the first `<g id=`) for `html`,
  `gradient`, `explicitid`, `gid`, `edgelabels`, `select`, `list` and
  `nolayers`, under dot, neato and fdp. Native files:
  `plans/issue-180-svg-layer-anchor-id/harness/native/`.
- cmapx and cmapx-np byte equality for `select` under dot, neato and fdp.
- `repro` (issue input, dot): the four anchors inside layer `l2` are
  `a_l2_graph0`, `a_l2_clust1`, `a_l2_node2` and `a_l2_edge1`, in that order,
  and layer `l1` holds `a_graph0` and `a_node1`. Ids are asserted, not
  bytes, because of #181.
- Unit cases on `RenderJob.objId` with `layerNum` 0, 1 and 2: explicit id,
  `<gid>_` and root. At 2 every result starts with `<layer>_`. At 0 and 1
  none does.

The 8-engine matrix stays in the harness (gate 6 and T1 step 4), so the unit
suite does not render every probe 8 times. Rejected: extending
`svg-subgraph-id.test.ts` or `svg-graph.test.ts`. They hold no native
captures, and the second is 438 lines.

### AD-4: `gid-inherit` keeps one changed line that is not native's; add it to #251

`gid-inherit.gv` declares the root `id="G\G"` before the cluster. Native's
cluster inherits that `id` in cgraph and gets `Gcluster_k`. The port does not
inherit root graph attributes into subgraphs (#242). The port also leaves the
group id unsubstituted (#249). On layer 2 the prototype moves three anchor lines
to native's (`a_l2_GG`, `a_l2_GG_node1`, `a_l2_GG_edge1`). The cluster anchor
moves from `a_GG_clust1` to `a_l2_GG_clust1`, but native has
`a_l2_Gcluster_k`. That one line per engine gains native's prefix but is still
not native's line, which is #251's class (#176's rows that gain the root id
prefix). Keeping the old text would need a branch C does not have. So T1 does
not test `gid-inherit` for equality. At close-out T1 comments on #251 with the
8 rows, the line and the evidence, so the pending ruling covers them. Rejected:
a new `needs-ruling` issue for the same class. #251 is open and unruled, and a
duplicate would split one ruling in two. This is a probe, not a corpus row: no
corpus input sets a root `id` together with `layers`.

## Baseline

Planning base `2eea1a9f0b37ce87b377e9dc61d9348dce8ff52c`. See
[decision-journal.md](decision-journal.md), row 0.

## Rollback

Reversible: revert the one squashed commit. No API or data contract changes.
`RenderJob.objId` keeps its signature. Only its result changes, and only when
`layerNum > 1`, which needs a `layers` attribute. Output changes in two places,
both to native's: svg ids on layers after the first (anchors, HTML cell
anchors, gradient ids), and map area ids when `layerselect` starts past the
first layer.

## Irreversible changes

None.
