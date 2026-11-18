# T1: red tests, the layer prefix in `objId`, gates, squash

## Context

C's `getObjId` puts `<layer>_` at the front of every object id on layers
after the first, so every string built from `obj->id` carries it. The port
adds it only where it writes the svg group ids. T1 moves the prefix into
`RenderJob.objId` (AD-1), documents the page half it leaves out (AD-2), adds
the tests (AD-3), and reports `gid-inherit` to #251 (AD-4). See the
[README](../README.md#objective).

## Steps

1. **Red.** Add `src/render/svg-layer-id.test.ts` (AD-3). Its header comment
   names the C source (`@see lib/common/emit.c:getObjId`, `@see
   lib/common/emit.c:layerPagePrefix`, `@see lib/common/emit.c:emit_page`,
   `@see lib/common/emit.c:firstlayer`) and where the native files come from:
   16.1.1, `harness/rowcheck.mjs` with `NATIVE_DIR`, 2026-11-17. Use
   `renderFormat` from `test/helpers/render-format.js`, as
   `map-cluster-area-order.test.ts` does.
   - svg body equality: one case per probe × engine (dot, neato, fdp) for
     `html`, `gradient`, `explicitid`, `gid`, `edgelabels`, `select`, `list`
     and `nolayers`. Compare `s.slice(s.indexOf('<g id='))` of the port's
     output with the same slice of
     `../../plans/issue-180-svg-layer-anchor-id/harness/native/<probe>.gv.<engine>.svg`.
   - `select`, cmapx and cmapx-np under dot, neato and fdp: byte equality
     with `native/select.gv.<engine>.cmapx` and `.cmapx_np`.
   - `repro` under dot: the `id="a_..."` values in order are `a_graph0`,
     `a_node1`, `a_l2_graph0`, `a_l2_clust1`, `a_l2_node2` and `a_l2_edge1`.
   - `RenderJob.objId`: build a `RenderJob`, set `layerIDs` to
     `[<unused>, 'l1', 'l2']` and `drawingId`. With `layerNum` 0 and 1, expect
     `objId('x', 'node1')`, `objId(undefined, 'node1')` and
     `objId(undefined, 'graph0', true)` to return `x`, `G_node1` and `graph0`.
     With `layerNum` 2 they return `l2_x`, `l2_G_node1` and `l2_graph0`.

   Run the file on the base. Every case fails except the `nolayers` cases and
   the `objId` cases at `layerNum` 0 and 1. Journal the counts.
2. **Green (AD-1, AD-2).** In `src/gvc/job.ts` `objId`, compute
   `const pfx = this.idLayerPrefix();` and put it at the front of the result in
   all three branches. Change the doc comment from "steps after
   layerPagePrefix" to say it includes the layer half of `layerPagePrefix`.
   Add one line saying the page half (`page<x>,<y>_`) is left out because only
   ps and quartz page, and neither prints an id (AD-2). Keep
   `@see lib/common/emit.c:getObjId`, and add `@see
   lib/common/emit.c:layerPagePrefix`. Then remove `job.idLayerPrefix() + `
   from `src/render/svg-cluster.ts:17`, `src/render/svg-graph.ts:410` and
   `src/render/svg-helpers.ts:189, 228`. The two comments next to them in
   `svg-cluster.ts:14-16` and `svg-helpers.ts:226-227` say "layer prefix
   only". Change them to say the prefix comes with the id (`objId`). In
   `svg-helpers.ts`, change the comment on the same lines without adding a
   line: it is 597 lines and must not grow. If `svg-id.ts`'s header comment
   describes the id steps, add the layer prefix to it. Run the new test file
   and `src/render/svg*.test.ts`. Both must pass.
3. **Check every probe.** Build the head bundle (`npm run build:js`, then
   copy `dist/index.js`). From the brief directory, run:
   - `ENGINES=dot,neato,fdp,sfdp,circo,twopi,osage,patchwork node harness/bodyeq.mjs <base.mjs> <head.mjs> harness > harness/results/body-head.tsv`.
     Pass: its first four columns equal
     [prototype-body-equal.tsv](../harness/prototype-body-equal.tsv)'s, row for
     row.
   - `ENGINES=dot,neato,fdp,sfdp,circo,twopi,osage,patchwork FORMATS=svg,cmapx,cmapx_np,imap,imap_np,xdot node harness/rowcheck.mjs <base.mjs> <head.mjs> harness/probes/*.gv > harness/results/probes-head.tsv`.
     Pass: its row lines (not the `  port` detail lines) equal
     [prototype-probes.tsv](../harness/prototype-probes.tsv)'s.
   - For `repro` and `gid-inherit` under every engine where `bodyeq` says
     `NE`, `diff` the head body against native. `repro` may differ only in
     the layer-1 block `<g id="clust1" class="cluster">` … `</g>` (#181).
     `gid-inherit` may differ only in the lines with `G\G`/`GG` (root group,
     #249) and `GG_clust1` (cluster, #242).

   Journal the tallies.
4. **Gates 1-6** (README). Record each in the journal.
5. **AD-4 comment.** Comment on #251 with the `gid-inherit` rows: the probe
   path, the 8 engines × svg, the cluster anchor line (base `a_GG_clust1`, head
   `a_l2_GG_clust1`, native `a_l2_Gcluster_k`), and the evidence that the
   other anchor lines on layer 2 now equal native. Write it to a file and pass
   `--body-file`. Do not put an `@` before any name.
6. **Diagnosis row.** Journal the artifact.
   - **Mechanism:** C's `getObjId` writes `layerPagePrefix` before
     everything else, so `obj->id` and every id built from it carry
     `<layer>_` when `layerNum > 1`. The port's `objId` left the prefix out,
     and only the four group writers added it back.
   - **Origin:** C `lib/common/emit.c:194-202, 211` (and `:3556-3561` for the
     root). Port `src/gvc/job.ts:323-327` on the base.
   - **Chain:** `emitNodeBody` → `setHtmlAnchorObj(svgNodeId)` and
     `poly-gencode` → `svgNodeId` → `objId` (no prefix) → anchor `a_node2`,
     cell anchors `node2_<n>` and gradients `node2_l_<n>`. Meanwhile
     `svgBeginNode` writes `idLayerPrefix() + svgNodeId` → `l2_node2_l2`. The
     same goes for edges, clusters (`device.ts:279-285`) and the root
     (`device.ts:391`, `svg-graph.ts:272`).
   - **Ruled out:** layer selection itself (the group ids, and which objects
     appear on which layer, were already native's on every probe except #181's
     cluster). The `<gid>_` and explicit-`id` steps (`nolayers`, and every
     layer-1 line, equal native on the base). The page half (AD-2). Map
     formats without `layerselect` (`layerNum` is 1 there, and every such row
     is unchanged). The #181, #242 and #249 lines (the same text on base and
     head).
7. **Close-out.** Then **finish** as the README's "Branch and commits"
   section says.

## Write-set

- `src/gvc/job.ts` (`objId` and its doc comment)
- `src/render/svg-cluster.ts`, `src/render/svg-graph.ts`,
  `src/render/svg-helpers.ts` (drop the explicit prefix; comments)
- `src/render/svg-id.ts` (header comment only, if needed)
- `src/render/svg-layer-id.test.ts` (new)
- `plans/issue-180-svg-layer-anchor-id/harness/extra/` and `results/`
  (new probes, result tables)
- `plans/decision-journal.md`; this mission's `decision-journal.md`, README
  and `batch-1/overview.md` (status checkboxes and a summary)
- `.agent-notes/issue-180.md` (only if novel)
- A comment on #251 (AD-4), and any `follow-up` issue that the queue rules call
  for

## Interface contracts

- `RenderJob.objId(idAttr, defaultId, isRoot?)`: same signature. It now
  returns `idLayerPrefix() + <old result>`. Callers must not add the
  prefix again.
- `RenderJob.idLayerPrefix()` and `idLayerSuffix()`: unchanged.

## Bytediff

This is gate 5 of the queue rules. Base bundle: `$TMPDIR/i180/base.mjs` if the
base is still `2eea1a9f`. It was built from the clean tree at that sha.
Otherwise `git archive <base>` into `$TMPDIR`, symlink `node_modules`, run
`npm run parser:regen` and `npm run build:js`, and copy `dist/index.js`. Build
the head bundle from the worktree. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/i180/base.mjs $TMPDIR/i180/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i180-smoke.json
```

#179 ran it as two halves by engine (`BD_ENGINES=dot,neato,fdp,osage`, then
`circo,twopi,sfdp,patchwork`) to stay inside the command limit. No smoke id
sets `layers`, so expect 0 diffs. Any changed output must equal native (stop
condition 3).

## Targeted survey

**Selection rule.** The change alters a result only when `layerNum > 1`.
`layerNum` is set only by `firstLayer`/`nextLayer` (`src/gvc/first-layer.ts`),
and it goes past 1 only when the graph sets `layers`. So the inputs it can
reach are exactly the applicable corpus inputs that set `layers` or
`layerselect`. A grep over the 982 applicable manifest paths
(`\blayers?\s*=|layerselect`) finds 3:
[../harness/survey-layers.txt](../harness/survey-layers.txt) (`graphs/layer.gv`,
`layer2.gv`, `layers.gv`, relative to `~/git/graphviz-16.1.1/tests`). The smoke
bytediff covers the rest of the corpus, which the change cannot reach.

```
C=~/git/graphviz-16.1.1/tests
ENGINES=dot,neato,fdp,sfdp,circo,twopi,osage,patchwork \
  FORMATS=svg,cmapx,cmapx_np,imap,imap_np,xdot node harness/rowcheck.mjs \
  <base.mjs> <head.mjs> $(sed "s|^|$C/|" harness/survey-layers.txt) \
  > harness/results/survey-head.tsv
```

**Pass:** 144 rows, every one `unchanged`, as in
[prototype-survey-layers.tsv](../harness/prototype-survey-layers.tsv). The three
inputs carry no anchor, explicit `id` or gradient, and their group ids were
already prefixed. A changed row means AD-1's reach is wrong (stop condition 6).
Wait while `uptime` is above 12.

## Observability / rollback

Observability: N/A (a library with no logs, metrics or traces). Rollback:
Reversible (revert the one squashed commit).

## Acceptance criteria

- Given the base source, when the new tests run, then every layer case fails,
  and the `nolayers` cases and the `objId` cases at `layerNum` 0 and 1 pass.
- Given the fix, when the issue's input renders as svg under dot, then the
  anchors inside layer `l2` are `a_l2_graph0`, `a_l2_clust1`, `a_l2_node2` and
  `a_l2_edge1`, and the group ids are unchanged (no doubled prefix).
- Given HTML labels, gradients, explicit ids and edge labels on layers after
  the first, when they render as svg under any of the 8 engines, then the body
  equals native byte for byte.
- Given `layerselect=l3`, when the graph renders as cmapx, then the area ids
  are `l3_node1`, `l3_node2`, `l3_edge1` and `l3_graph0`, as native has them.
- Given gates 1-6, when they run on the head, then each passes as the README
  says. The log has exactly one commit after the base, with footer
  `Refs: #180`, and tag `issue-180/pre-squash` holds the per-task history.
