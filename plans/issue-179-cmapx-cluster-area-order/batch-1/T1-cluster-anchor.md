# T1: red tests, cluster anchor after the label on the map device, gates, squash

## Context

Under `EMIT_CLUSTERS_LAST` (the map device), C writes a cluster's `<area>`
after the cluster's label, so it follows the label's cell areas. The port
writes it before the box. T1 ports C's anchor placement (AD-1), drops the map
renderer's `beginCluster` stand-in (AD-2), and adds the tests (AD-3, AD-4).
See the [README](../README.md#objective).

## Steps

1. **Red.** Add `src/render/map-cluster-area-order.test.ts` (AD-3). Its header
   comment names the C source (`@see lib/common/emit.c:emit_clusters`, `@see
   lib/common/emit.c:emit_map_rect`, `@see
   plugin/core/gvrender_core_map.c:map_begin_anchor`). It also says where the
   native files come from: 16.1.1, `harness/rowcheck.mjs` with `NATIVE_DIR`,
   2026-11-17.
   - Byte-equal probes, one case per probe × engine (dot, fdp, osage) ×
     format (`cmapx`, `cmapx-np`, `imap`, `imap-np`; native's files spell
     `-np` as `_np`): `repro`, `own`, `nested`, `nodes`, `cluster178`,
     `text`, `nourl`. Each output must equal
     `../../plans/issue-179-cmapx-cluster-area-order/harness/native/<probe>.gv.<engine>.<fmt>`.
     `text` and `nourl` already equal native on the base
     ([prototype-equal.tsv](../harness/prototype-equal.tsv)). They guard a
     text-labelled anchored cluster and an unanchored cluster with cell
     anchors.
   - `tooltip` (AD-4), cmapx and cmapx-np only: the last `<area>` has
     `id="clust1"`. After replacing every `title="..."` with `title=""` in
     both outputs, the port equals native. Its imap and imap-np rows are
     byte-equal (an empty url prints nothing), so they also go in the
     byte-equal list.
   - In `src/render/map-html-label-obj.test.ts` (AD-3): move `cluster` into
     `EQUAL_PROBES`, delete the order-free `cluster` case and the code only
     it uses, and change the header comment that says #179 still differs.

   Run both files on the base. The new file's `repro`, `own`, `nested`,
   `nodes` and `cluster178` cases fail in all four formats under all three
   engines (60 cases), and so does the `tooltip` order case (6). Everything
   else passes. The moved `cluster` cases in the #178 file fail in cmapx and
   cmapx-np under dot, neato and fdp. Journal the counts.
2. **Green (AD-1).** In `src/gvc/device-cluster.ts`, add the exported
   `beginClusterAnchor(sg, renderer, job): boolean`
   (`@see lib/common/emit.c:emit_clusters:3743-3747, 3861-3868`):
   - null `job.obj`, or `url === null && !explicitTooltip`: return `false`.
   - Otherwise `renderer.emitMapRect?.(sg.info.bb!, job)`, then
     `return beginAnchorIf(renderer, job)` (import it from `./anchor.js`).

   In `src/gvc/device.ts` `drawClusterInScheme` (`:270-299`):
   - Keep `resolveObjAnchor` where it is (before the box).
   - `const late = (job.flags & EMIT_CLUSTERS_LAST) !== 0;`
   - `const anchored = !late && beginClusterAnchor(sg, renderer, job);`
     replaces `:287`.
   - After `renderClusterLabel`:
     `if (anchored || (late && beginClusterAnchor(sg, renderer, job))) renderer.endAnchor?.(job);`
   - Change the comment so it names both sites (`emit.c:3743`, `:3861`).
   - Add `beginClusterAnchor` to the `device-cluster.js` import. Keep
     `beginAnchorIf` imported, because `renderPage` (`:393`) still uses it.

   `wc -l src/gvc/device.ts` must stay at most 510. The prototype got there by
   putting the `resolveObjAnchor` guard on one line. Run
   `src/render/map*.test.ts` and `src/gvc/device*.test.ts`.
3. **AD-2.** In `src/render/map.ts`, delete `MapRendererBase.beginCluster`
   (`:681-686`). `wc -l` must be below 804. Run `npm run typecheck` (unused
   imports) and the two test files. Both pass.
4. **Check every probe.** Build the head bundle (`npm run build:js`, then
   copy `dist/index.js`). From the brief directory, run
   `ENGINES=dot,fdp,osage FORMATS=cmapx,cmapx_np,imap,imap_np,svg,xdot node harness/rowcheck.mjs <base.mjs> <head.mjs> harness/probes/*.gv > harness/results/probes-head.tsv`.
   Pass: the verdict column equals
   [prototype-probes.tsv](../harness/prototype-probes.tsv) row for row
   (`native` 60, `toward` 6, `unchanged` 78). Journal the tally.
5. **Gates 1-6** (README). Record each in the journal.
6. **Diagnosis row.** Journal the artifact.
   - **Mechanism:** the map device carries `EMIT_CLUSTERS_LAST`, so C's
     `emit_clusters` runs `emit_map_rect` + `gvrender_begin_anchor` for an
     anchored cluster after `emit_label`, and `map_begin_anchor` writes the
     cluster's area after the label's cell areas. The port opened the
     cluster anchor before the box in every mode, and its map renderer
     computed the rect in `beginCluster`. So the area came first.
   - **Origin:** C `lib/common/emit.c:3743-3747, 3861-3868`; port
     `src/gvc/device.ts:287` and `src/render/map.ts:681-686` on the base.
   - **Chain:** `renderOneCluster` → `drawClusterInScheme` → `beginAnchorIf`
     → `MapRendererBase.beginAnchor` → `emitShape` writes `clust<N>` →
     `renderClusterLabel` → `emitHtmlLabel` → cell `initHtmlAnchor` writes
     `clust<N>_<k>` afterwards.
   - **Ruled out:** that #178's missing `allocObj` was the cause (it is on the
     base and the order still differs); line order in `map.ts` (C's map
     plugin has no cluster hooks, `gvrender_core_map.c:212-213`); the
     child-first recursion (already ported, `device.ts:308-314`; the `nested`
     probe's inner/outer order was right on the base, only the cell order was
     wrong); svg and xdot (they do not set `EMIT_CLUSTERS_LAST`, and every svg
     and xdot row is unchanged); the cell's `title` on `tooltip.gv` (#253,
     equal on base and head).
7. **Close-out.** Then **finish** as the README's "Branch and commits"
   section says.

## Write-set

- `src/gvc/device-cluster.ts` (`beginClusterAnchor`, one import)
- `src/gvc/device.ts` (`drawClusterInScheme` and one import line; must not
  grow)
- `src/render/map.ts` (delete `beginCluster`; must shrink)
- `src/render/map-cluster-area-order.test.ts` (new)
- `src/render/map-html-label-obj.test.ts` (`cluster` probe made exact)
- `plans/issue-179-cmapx-cluster-area-order/harness/extra/` and `results/`
  (new probes, result tables)
- `plans/decision-journal.md`; this mission's `decision-journal.md`, README
  and `batch-1/overview.md` (status checkboxes and a summary)
- `.agent-notes/issue-179.md` (only if novel)

## Interface contracts

- `beginClusterAnchor(sg: Graph, renderer: RendererPlugin, job: RenderJob): boolean`:
  exported from `src/gvc/device-cluster.ts`; its only caller is
  `drawClusterInScheme`. It returns C's `doAnchor`. When it returns `true`,
  the caller must call `renderer.endAnchor` once.
- `MapRendererBase` no longer implements `beginCluster`. The optional hook
  stays in `RendererPlugin` (`src/gvc/context.ts:112`) for svg and dot.

## Bytediff

This is gate 5 of the queue rules. Base bundle: `$TMPDIR/i179/base.mjs` if the
base is still `9e48acd7` (it was built from the clean tree at that sha).
Otherwise `git archive <base>` into `$TMPDIR`, symlink `node_modules`, run
`npm run parser:regen` and `npm run build:js`, and copy `dist/index.js`. Build
the head bundle from the worktree. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/i179/base.mjs $TMPDIR/i179/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i179-smoke.json
```

Every changed output must equal native (stop condition 3). Only the `cmapx`
jobs of inputs that have a cluster with `URL`, `href` or `tooltip` can change.
Expect none or almost none in the smoke list.

## Targeted survey

**Selection rule.** The change runs for every cluster under every renderer,
but output can move only where a cluster is anchored and the device is a map.

- **A.** Every corpus input with a cluster and an anchor attribute: a file
  matching `subgraph "?cluster` (case-insensitive) and also `URL`, `href` or
  `tooltip` (6 files in
  [../harness/survey-cluster-anchor.txt](../harness/survey-cluster-anchor.txt)).
  Run them under dot, fdp and osage in `cmapx`, `cmapx_np`, `imap`, `imap_np`
  and `svg`.
- **B.** Every corpus input with a cluster (285 files in
  [../harness/survey-cluster.txt](../harness/survey-cluster.txt)), under dot in
  `cmapx`. This checks that unanchored clusters do not change, now that
  `beginCluster` no longer computes a rect for them.

```
C=~/git/graphviz-16.1.1/tests
ENGINES=dot,fdp,osage FORMATS=cmapx,cmapx_np,imap,imap_np,svg node harness/rowcheck.mjs \
  <base.mjs> <head.mjs> $(sed "s|^|$C/|" harness/survey-cluster-anchor.txt) \
  > harness/results/survey-anchor-head.tsv
ENGINES=dot FORMATS=cmapx node harness/rowcheck.mjs <base.mjs> <head.mjs> \
  $(sed "s|^|$C/|" harness/survey-cluster.txt) > harness/results/survey-head.tsv
```

Wait while `uptime` is above 12. A native timeout (120 s) is listed but not
counted. A row whose port fails on base and head with the same error shows as
`AWAY` only because the stack trace names the bundle path. Count it as an
unchanged failure, and check that the first error line is identical on both.

**Pass:**
- Set A's verdicts equal
  [prototype-survey-anchor.tsv](../harness/prototype-survey-anchor.tsv) row
  for row (79 rows: `unchanged` 70, `timeout` 4, and 5 identical port
  failures for `1879.dot` fdp, `RenderError: splines=compound ...` on both
  bundles). `2621.dot` was planned only under dot cmapx, cmapx_np, imap and
  imap_np (all native timeouts). Its dot svg, fdp and osage rows were stopped
  because the port side also runs for minutes. Those 11 rows must be
  `unchanged`, `timeout` or an identical port failure.
- No set A row changes at all. None of the 6 inputs has an anchored cluster
  whose label writes areas of its own, so the order cannot move.
- In set B, every row is `unchanged`, `timeout` or an identical port failure,
  except rows of set A's inputs, which must match their set A cmapx verdict.
- No row that was byte-equal on the base differs on the head.

Set B was not run at planning: the selection rule and AD-2's reasoning
predict no change. A changed row outside set A means AD-2 is wrong (stop
condition 6). Give B a background limit of two hours, and journal both tables.

## Observability / rollback

Observability: N/A (a library with no logs, metrics or traces). Rollback:
Reversible (revert the one squashed commit).

## Acceptance criteria

- Given the base source, when the new tests run, then the `repro`, `own`,
  `nested`, `nodes` and `cluster178` map cases and the `tooltip` order case
  fail, and the rest pass.
- Given the fix, when the issue's input renders as `cmapx` under dot, fdp and
  osage, then the output equals native byte for byte: `clust1_2`, `clust1_3`,
  then `clust1`.
- Given nested anchored clusters with HTML labels, when they render as
  `cmapx`, then the order is inner cell, inner cluster, outer cell, outer
  cluster, as native has it.
- Given any probe, when it renders as svg or xdot, then the output is
  unchanged from the base.
- Given gates 1-6, when they run on the head, then each passes as the README
  says. The log has exactly one commit after the base, with footer
  `Refs: #179`, and tag `issue-179/pre-squash` holds the per-task history.
