# Decisions: issue #179

## Confirmed (planned unattended)

Confirmed by the maintainer on 2026-11-18, after review against native 16.1.1:
the probe re-run of #178-#180 and the 6f593c50..9336a55c bytediff
classification.

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-17, base `9e48acd7`. Nobody confirmed these. Each one lists the options
it rejected and its evidence, so the maintainer can audit it.

### AD-1: open the cluster anchor where C's `emit_clusters` opens it

**Context.** C's `emit_clusters` (`lib/common/emit.c:3721-3887`, 16.1.1) sets
`doAnchor = obj->url || obj->explicit_tooltip` (`:3742`). Drawing devices run
`emit_map_rect(job, GD_bb(sg))` and `gvrender_begin_anchor` before the box
(`:3743-3747`, `!(flags & EMIT_CLUSTERS_LAST)`). The map device carries
`EMIT_CLUSTERS_LAST` (`plugin/core/gvrender_core_map.c:237`), so it runs the
same two calls only after `emit_label` (`:3859-3868`). `map_begin_anchor`
writes the `<area>` from the obj's `url_map_p`. The cluster's area therefore
follows the areas of its HTML label's cells. The port's `drawClusterInScheme`
(`src/gvc/device.ts:270-299`) calls `beginAnchorIf` before the box (`:287`) in every
mode. The map renderer's `beginCluster` (`src/render/map.ts:681-686`) stands
in for `emit_map_rect`: it computes the cluster rect for every cluster, with or
without an anchor. So under cmapx and imap the cluster's area comes first.

**Decision.** Add `beginClusterAnchor(sg, renderer, job): boolean` to
`src/gvc/device-cluster.ts`, the port of C's
`if (doAnchor) { emit_map_rect(job, GD_bb(sg)); gvrender_begin_anchor(...) }`.
It returns `false` without a call when `job.obj` is null or has neither a url
nor an explicit tooltip. Otherwise it calls `renderer.emitMapRect?.(bb, job)`,
then `beginAnchorIf(renderer, job)`, and returns `true`. In
`drawClusterInScheme`, read `EMIT_CLUSTERS_LAST` once, call
`beginClusterAnchor` before the box when the flag is clear and after
`renderClusterLabel` when it is set, and close the anchor with
`renderer.endAnchor` in either case. `src/gvc/device.ts` (510 lines at base)
must not grow. The prototype kept it at 510 by joining the
`resolveObjAnchor` guard onto one line.

**Rejected.**
- (a) Keep `MapRendererBase.beginCluster`'s rect and only move
  `beginAnchorIf` after the label. It gives the same bytes on every probe,
  because #178's `allocObj` keeps the label's cell rects off the cluster obj.
  But it keeps a port-only hook (C's `map_begin_cluster` is `0`,
  `gvrender_core_map.c:212`), and it computes a rect for unanchored clusters
  that C never computes.
- (b) Buffer the cluster's area in `map.ts` and write it at `endCluster`. C's
  `map_end_cluster` is also `0`. That would be a new mechanism at the sink,
  not the C order at its origin (`rules/diagnosis.md`, scope of change).
- (c) Inline the helper in `device.ts`. The file is over the 500-line cap, and
  the complexity hook blocks any growth.

**Evidence.** A scratch prototype of AD-1 plus AD-2 was built and then
reverted. The diff is `$TMPDIR/i179/proto.diff` and the bundles are
`$TMPDIR/i179/{base,proto}.mjs`. 8 probes × dot, fdp, osage × cmapx,
cmapx_np, imap, imap_np, svg, xdot give 144 rows: `native` 60, `toward` 6,
`unchanged` 78
([harness/prototype-probes.tsv](harness/prototype-probes.tsv)). Exact
`cmp` against native, which is stricter than the verdict column
(`.agent-notes/issue-178.md`), is in
[harness/prototype-equal.tsv](harness/prototype-equal.tsv). All 60 `native`
rows are byte-equal on the prototype and none of them is on the base. The 6
`toward` rows are `tooltip.gv` cmapx/cmapx_np: the order is now native's,
and the one remaining line is the cell's `title` (#253, out of scope). Every
svg and xdot row is unchanged. `npx vitest run src/render src/gvc src/common`
on the prototype: 200 files, 4371 tests, all pass. #178's `cluster` probe
(`plans/issue-178-cmapx-html-label-obj/harness/native/cluster.gv.*`) becomes
byte-equal in cmapx, cmapx_np, imap and imap_np under dot, neato and fdp.

### AD-2: remove `MapRendererBase.beginCluster`

With AD-1 the cluster rect comes from `emitMapRect` (`map.ts:694-698`), at
the C site. `beginCluster` then has no C counterpart (`map_begin_cluster` is
`0`), and its rect is overwritten before any reader sees it. Remove the
method; `RendererPlugin.beginCluster` is optional (`src/gvc/context.ts:112`).
`map.ts` goes from 804 to 797 lines. `computeClusterUrlMap` keeps its other
caller (`emitMapRect`). Rejected: an empty override. The other no-op
overrides in `map.ts` are hooks that C's map plugin also leaves `0`, but an
empty `beginCluster` would only hide where the rect moved.

### AD-3: a new test file reading this brief's native captures, plus #178's `cluster` probe made exact

Add `src/render/map-cluster-area-order.test.ts`, following
`src/render/map-html-label-obj.test.ts`. It checks byte equality against
`plans/issue-179-cmapx-cluster-area-order/harness/native/` for each probe,
engine (dot, fdp, osage) and map format, as T1 lists. In
`src/render/map-html-label-obj.test.ts`, move `cluster` into `EQUAL_PROBES`,
remove its order-free check, and update the header comment that names #179.
Rejected: adding the cases to `map.branch.test.ts`, which is over 500 lines.

### AD-4: `tooltip.gv` is checked on order only

A cell in the label of a cluster that has only `tooltip=` gets native's
`title="tip"`. The port writes the label text instead (#253, open, older
than this change). The test asserts that the cluster's area is the last
`<area>` and that the port's lines match native's once the `title` attribute
of the cell area is masked. It does not assert byte equality. When #253 lands,
that mission tightens it.

## Baseline

Planning base `9e48acd712f1ef3c414c1f475c508c5ee0156ee8`. See
[decision-journal.md](decision-journal.md), row 0.

## Rollback

Reversible: revert the one squashed commit. No API or data contract changes.
`RendererPlugin.beginCluster` stays optional and in the interface. Only the
map renderer's implementation goes. The output change touches only the line
order of `-Tcmapx`/`-Timap` (and `_np`) for clusters with `URL`, `href` or
`tooltip`, and it moves that order to native's.

## Irreversible changes

None.
