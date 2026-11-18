# T1: red tests, `clustInLayer`, the xdot cluster set, gates, squash

## Context

C skips a cluster in `emit_clusters` when `clust_in_layer` is false. The port
has no such test, so it draws every cluster on every layer. T1 ports the test
(AD-1). It splits the xdot writer's "is a cluster" set from its "was drawn"
set (AD-2), so that a skipped cluster keeps its `bb` in xdot and json. It adds
the tests (AD-3). See the [README](../README.md#objective).

## Steps

1. **Red.** Write the AD-3 tests:
   - `src/common/layers.test.ts`: the `clustInLayer` cases;
   - `src/render/svg-clust-in-layer.test.ts` (new). Its header comment names
     `@see lib/common/emit.c:clust_in_layer`, `@see
     lib/common/emit.c:emit_clusters` and `@see
     plugin/core/gvrender_core_dot.c:xdot_end_cluster`. It also says where the
     native files come from: 16.1.1, `harness/rowcheck.mjs` with
     `NATIVE_DIR`, 2026-11-17. svg natives are in `harness/native/`, and the
     other formats in `harness/native-all/`. Use `renderFormat` from
     `test/helpers/render-format.js`;
   - the `svg-layer-id.test.ts` change.

   Run them on the base. Every layered svg case fails. So do the `select`
   map, xdot and json cases and the `repro` cases in `svg-layer-id.test.ts`,
   and the `clustInLayer` cases fail to import. The `nolayers` cases pass.
   Journal the counts.
2. **Green (AD-1).** Apply AD-1 to `layers.ts`, `emit-walk.ts` and
   `device.ts`. `wc -l src/gvc/device.ts` must still print 510 or fewer. Then
   run `npx vitest run src/common src/gvc src/render`. The svg cases pass, and
   the `select` xdot and json cases still fail on `cluster_c`'s missing `bb`.
   That is the coupling AD-2 removes, so journal it.
3. **Green (AD-2).** Apply AD-2 to `attrs.ts` and `agwrite.ts`.
   `wc -l src/render/dot/agwrite.ts` must still print 533 or fewer. Run the
   three test directories again. All must pass.
4. **Check every probe.** Build the head bundle (`npm run build:js`, then
   copy `dist/index.js` to `$TMPDIR/i181/head.mjs`). From
   `plans/issue-181-clust-in-layer/harness`, with
   `E=dot,neato,fdp,sfdp,circo,twopi,osage,patchwork`, run:
   - `ENGINES=$E node bodyeq.mjs <base.mjs> <head.mjs> . > results/body-head.tsv`.
     Pass: every head column is `EQ` (104 rows), as in
     [proto2-body.tsv](../harness/results/proto2-body.tsv).
   - `ENGINES=$E FORMATS=cmapx,cmapx_np,imap,imap_np,xdot,plain,dot,json node rowcheck.mjs <base.mjs> <head.mjs> probes/*.gv > results/probes-head.tsv`.
     Pass: every row is `unchanged` or `native`. The `native` rows are exactly
     `select.gv` and `select-stored.gv` under dot, neato, fdp, osage and
     patchwork. For `select.gv` that is cmapx, cmapx_np, imap, imap_np, xdot
     and json. For `select-stored.gv` it is xdot and json only (its maps
     are `unchanged`: `proto2-formats-late.tsv`). Compare with the
     `proto2-*.tsv` tables. rowcheck judges json on canonical, key-sorted json.

   Journal the tallies.
5. **Gates 1-6** (README). Record each in the journal. Gate 6 has two parts.

   **6a: layer survey.** The clustInLayer half changes output only when
   `job.numLayers > 1`, which needs `layers`. A grep over every `.gv`/`.dot`
   under `~/git/graphviz-16.1.1/tests` (`\blayers?\s*=|layerselect`) finds the
   3 inputs in [survey-layers.txt](../harness/survey-layers.txt). Repeat the
   grep and journal it if it finds more. From the harness directory:

   ```
   C=~/git/graphviz-16.1.1/tests
   ENGINES=$E FORMATS=svg,cmapx,cmapx_np,imap,imap_np,xdot,dot,json \
     node rowcheck.mjs <base.mjs> <head.mjs> $(sed "s|^|$C/|" survey-layers.txt) \
     > results/survey-layers-head.tsv
   ```

   Pass: 192 rows, all `unchanged`, as in
   [proto2-survey-layers.tsv](../harness/results/proto2-survey-layers.tsv).
   None of the three has a cluster.

   **6b: cluster identity survey.** The AD-2 half reaches every dot, xdot and
   json output that has a cluster. Without `layers` it must change none of
   them. [survey-clusters.txt](../harness/survey-clusters.txt) lists the 293
   applicable manifest inputs whose text matches `subgraph\s+"?cluster`:

   ```
   awk '{print > ("'$TMPDIR'/i181/shard." (NR%4))}' survey-clusters.txt
   for i in 0 1 2 3; do
     node samecheck.mjs <base.mjs> <head.mjs> $TMPDIR/i181/shard.$i \
       > $TMPDIR/i181/out.$i.tsv &
   done; wait
   cat $TMPDIR/i181/out.*.tsv > results/samecheck-head.tsv
   ```

   Run it in the background with a 2-hour timeout. Serially, it takes about
   90 minutes, and the background cap kills a command at 10 minutes unless
   given a timeout. That is how the planning run first stopped at input 58.

   Pass: every row is `same`. A `port-timeout` row must time out on base and
   head alike (the 60 s cap): name it in the journal and rerun it alone with
   `PORT_TIMEOUT_MS=300000`. At planning, 2108 passed at 300 s. 2621 (722 KB,
   `oracleError` in `dot-parity-dot.json`) still timed out, so leave it out
   and name it. A `CHANGED` row is judged against native with
   `rowcheck.mjs`. If it is not `native`, that is stop condition 3. The
   planning run is
   [proto2-samecheck.tsv](../harness/results/proto2-samecheck.tsv).

   Wait while `uptime` is above 12 before 5, 6a and 6b.
6. **Diagnosis row.** Journal the artifact:
   - **Mechanism:** C's `emit_clusters` skips a cluster, and the clusters
     under it, when `clust_in_layer` is false: its own `layer` does not
     select the layer, or, with no `layer`, none of its nodes is in the layer.
     The port's `renderClusters` had no such test.
   - **Origin:** C `lib/common/emit.c:1593-1606` and `:3735`. Port
     `src/gvc/device.ts:340-347` on the base.
   - **Chain:** `renderGraph` → per layer `renderPage` → `renderClusters`
     → `renderOneCluster` for every `info.clust` entry → `svgBeginCluster`
     writes `<g id="clust1" class="cluster">` on layer `l1`. In
     `layersep.gv`, that cluster's HTML label takes `anchorId` 0, which
     shifts the later layers' cell anchors by one.
   - **Second mechanism (AD-2):** the xdot writer took "is a cluster" from
     `endCluster`. Once a cluster can be skipped under `layerselect`, it
     lost `bb`. Origin: `src/render/dot.ts:310` and the readers at
     `agwrite.ts:115, 124, 186`.
   - **Ruled out:**
     - `nodeInLayer` and `edgeInLayer`: node and edge placement equals native
       on every probe on the base, outside the cluster block;
     - attribute inheritance: `inherit.gv` is byte-equal through
       `graphAttrInherited`;
     - nested-subgraph node membership: `nested` and `anon-select` are
       byte-equal;
     - maps without `layerselect`: `numLayers` is forced to 1, and every such
       row is `unchanged`;
     - the AD-2 change without layers: every 6b row is `same`.
7. **Close-out.** Comment on #181 with the result: the probe tables, the
   `layersep` cell anchors now native's, and the AD-2 coupling. Write the
   comment to a file and pass `--body-file`. Do not put an `@` before any
   name. Then **finish** as the README's "Branch and commits" section says.

## Write-set

- `src/common/layers.ts` (`clustInLayer`, header comment's list of ported
  functions)
- `src/common/layers.test.ts`
- `src/gvc/emit-walk.ts` (`clusterShown`)
- `src/gvc/device.ts` (`renderClusters`, `renderOneCluster`, `renderPage`,
  one import line; no growth)
- `src/render/dot/attrs.ts` (export `inClusterTree`)
- `src/render/dot/agwrite.ts` (three membership tests, `clusterAttrs`'s
  `_draw_` term, comments; no growth)
- `src/render/svg-clust-in-layer.test.ts` (new)
- `src/render/svg-layer-id.test.ts` (`repro` byte equality)
- `plans/issue-181-clust-in-layer/harness/` (new probes, `results/`)
- `plans/decision-journal.md`; this mission's `decision-journal.md`, README
  and `batch-1/overview.md` (status checkboxes and a summary)
- `.agent-notes/issue-181.md` (only if novel)
- A comment on #181, and any `follow-up` issue that the queue rules call for

## Read-set

- C: `~/git/graphviz-16.1.1/lib/common/emit.c:1558-1606` (`node_in_layer`,
  `edge_in_layer`, `clust_in_layer`), `:3720-3745` (`emit_clusters`),
  `:1109-1128` (`firstlayer`); `plugin/core/gvrender_core_dot.c:280-291`
  (`xdot_end_cluster`); `lib/common/output.c:229-249` (`rec_attach_bb`)
- Port: `src/common/attr-get.ts:40`, `src/gvc/first-layer.ts`,
  `src/render/dot.ts:80-110, 295-312`, `src/render/dot/write-back.ts:87-160`
- [harness/prototype.diff](../harness/prototype.diff): the planning
  prototype. It is a reference, not a patch to apply blind. The comments it
  lacks are still required.
- `.agent-notes/issue-180.md`, `.agent-notes/issue-178.md`

## Interface contracts

- `clustInLayer(info: LayerInfo, layerNum: number, sg: Graph): boolean` (new,
  exported from `src/common/layers.ts`).
- `clusterShown(info: LayerInfo | undefined, job: RenderJob, sg: Graph):
  boolean` (new, exported from `src/gvc/emit-walk.ts`).
- `renderClusters(g, renderer, job, info?: LayerInfo)`: the new parameter is
  optional. Without it nothing is filtered, as before.
  `svg-cluster-fill.test.ts` calls it with three arguments and keeps working.
- `inClusterTree(g: Graph): boolean`: now exported. Same body.

## Bytediff

This is gate 5 of the queue rules. The base bundle is `$TMPDIR/i181/base.mjs`
if the base is still `59862c28`. It was built from the clean tree at that
sha. Otherwise `git archive <base>` into `$TMPDIR`, symlink `node_modules`, run
`npm run parser:regen` and `npm run build:js`, and copy `dist/index.js`. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/i181/base.mjs $TMPDIR/i181/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i181-smoke.json
```

If one run does not fit the command limit, run it as two halves by engine
(`BD_ENGINES=dot,neato,fdp,osage`, then `circo,twopi,sfdp,patchwork`), as #179
did. 19 smoke ids have clusters and none sets `layers`, so expect 0 diffs. Any
changed output must equal native (stop condition 3).

## Observability / rollback

Observability: N/A (a library with no logs, metrics or traces). Rollback:
Reversible (revert the one squashed commit).

## Acceptance criteria

- Given the issue's input, when it renders as svg under dot, neato, fdp,
  osage or patchwork, then layer `l1` holds no `clust1` group and the body
  equals native byte for byte.
- Given a cluster whose own `layer` does not name the current layer, when a
  node of it does, then the cluster is still not drawn there (`nested`,
  `cluster_x`), as `clust_in_layer` returns false on a non-empty `layer`.
- Given `layerselect=l1` and a cluster whose nodes are all on `l2`, when the
  graph renders as xdot or json, then the cluster keeps its `bb` and has no
  `_draw_` unless the input stored one (`select`, `select-stored`).
- Given a graph without `layers`, when it renders as dot, xdot or json, then
  the output is byte-identical to the base (6b, 293 inputs).
- Given gates 1-6, when they run on the head, then each passes as the README
  says. The log has exactly one commit after the base, with footer
  `Refs: #181`, and tag `issue-181/pre-squash` holds the per-task history.
