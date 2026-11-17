# T1: red tests, one renderer-independent `drawingId`, gates, squash

## Context

Map area ids lack the root id prefix because only the svg writer sets
`job.drawingId` ([README](../README.md#objective)). T1 sets it once in
`render()` for every renderer (AD-1), substituted as `graph_init` does (AD-2).

## Steps

1. **Red.** Add `src/render/map-id-prefix.test.ts` (AD-4):
   - Unit: `drawingIdOf` on a parsed graph gives `''` with no `id`, `''` with
     `id=""`, `G2` for `id="G2"`, `xG` for `id="x\G"` in graph `G`.
   - Probes: one case per probe × engine (dot, neato, fdp) × format (`cmapx`,
     `cmapx-np`; native files spell `_np`) for `repro`, `html`, `ownid`,
     `glabel`, `clust-late`, `subst`, expecting byte equality with
     `../../plans/issue-176-cmapx-id-prefix/harness/native/<probe>.gv.<engine>.<fmt>`.
     For `elabel`, `clust` and `subst2`, assert that the node and edge
     (polyline) area lines equal native's lines, and say in a comment which
     lines are left out and why (#177, #242, #249; AD-3).
   - svg: `subst.gv` under dot contains `<g id="xG_node1" class="node">`.
   Run on the base: the prefix and `\G` cases fail; `drawingIdOf` does not
   exist yet (a compile failure of the new file counts as red). Journal it.
2. **Green (AD-1, AD-2).** Add `drawingIdOf(g)` to `src/render/svg-id.ts`
   (`@see lib/common/input.c:graph_init (786-788)`), and update its header
   comment: the id prefix is renderer-independent. In
   `src/gvc/device.ts:render()`, assign `job.drawingId = drawingIdOf(g)`
   before `renderGraph`, importing it on the existing `svg-id.js` import
   line. Remove the assignment and its comment from `svgBeginGraph`
   (`src/render/svg-graph.ts:341-342`). Correct the `drawingId` doc comment
   in `src/gvc/job.ts:311-314` (set by `render()` for every renderer,
   substituted). `wc -l src/gvc/device.ts`: at most 510 (stop condition 2).
   Run the new and the touched tests; all pass.
3. **Check every probe.** Build the head bundle (`npm run build:js`, copy
   `dist/index.js`). From the brief directory run
   `node harness/rowcheck.mjs <base.mjs> <head.mjs> harness/probes/*.gv`.
   Pass: the table equals [prototype-probes.tsv](../harness/prototype-probes.tsv)
   row for row in its verdict column (`native` 36, `unchanged` 30,
   `toward` 12, `AWAY` 12, the `AWAY` rows being only `clust` and `elabel`
   cmapx/cmapx_np with the lines AD-3 names). Journal the tally.
4. **Gates 1-6** (README). Record each in the journal.
5. **Diagnosis row.** Journal the artifact. Mechanism: C's `getObjId`
   prefixes non-root ids with `GD_drawing(root)->id`, set at `graph_init`
   for every renderer and substituted; the port set `job.drawingId` only in
   `svgBeginGraph`, raw, so the map renderer saw `''`. Origin: C
   `lib/common/emit.c:203-244`, `lib/common/input.c:786-788`; port
   `src/render/svg-graph.ts:342`, `src/gvc/job.ts:322-326` on the base. Chain:
   `svgNodeId`/`svgEdgeId`/`svgClusterId` and the HTML-anchor base id are
   built from `job.drawingId` in `src/gvc/device.ts`, shared by all
   renderers; cmapx prints them. Ruled out: the map renderer building its own
   ids (it prints `obj.id` from the shared path, `src/render/map.ts:450, 729`);
   the root area (`G2` already equal); layout (every coordinate equal on
   `2258.dot` under all three engines); cluster inheritance as a cause of the
   prefix (`clust-late` byte-equal).
6. **Finish** (README, "Branch and commits"): tag, soft reset, one commit.

## Write-set

- `src/render/svg-id.ts` (`drawingIdOf`, header comment)
- `src/gvc/device.ts` (`render()`: the assignment, the import; no net growth)
- `src/render/svg-graph.ts` (remove the assignment and its comment)
- `src/gvc/job.ts` (the `drawingId` doc comment only)
- `src/render/map-id-prefix.test.ts` (new)
- `plans/issue-176-cmapx-id-prefix/harness/extra/` (new probes, only if
  push-forward needs them)
- `plans/decision-journal.md`; this mission's `decision-journal.md`, README and
  `batch-1/overview.md` (status checkboxes and a summary)
- `.agent-notes/issue-176.md` (only if novel)

## Interface contracts

- `drawingIdOf(g: Graph): string`: C's `GD_drawing(root)->id`, that is
  `substObjAnchor(g.attrs.get('id'), g)` when non-empty, else `''`. Internal;
  producer for `RenderJob.drawingId`.
- `RenderJob.drawingId`: set by `render()` before any renderer hook, for every
  format. `objId` is unchanged.

## Bytediff

The queue rules, gate 5. Build the base bundle from `git archive <base>` in
`$TMPDIR` (`npm ci` or symlinked `node_modules`, `npm run parser:regen`,
`npm run build:js`, then copy `dist/index.js` to `base.mjs`). Build the head
bundle from the worktree. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/base.mjs $TMPDIR/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i176-smoke.json
```

Expected: no changed output. No smoke id sets `id` on its root graph with an
anchor, and none has a `\` escape in a root `id` (`2184` and `2613` set `id`
only on a subgraph or nodes). Any change is stop condition 3 unless it equals
native.

## Targeted survey

**Selection rule.** An output changes only where the root graph has a
non-empty `id`: on cmapx/cmapx_np, through any area of a non-root object
without its own `id`; on svg, only if that `id` holds a `\` escape. So:

1. Every corpus input whose text sets `id`
   ([../harness/survey-rootid.txt](../harness/survey-rootid.txt), 11 files)
   under dot, neato and fdp in `cmapx`, `cmapx_np` and `svg`, except
   `2854.dot` (685 kB, node ids only; list it as not run).
2. Every corpus input with `URL`, `href` or `tooltip`
   ([../harness/survey-anchor.txt](../harness/survey-anchor.txt), 41 files,
   issue-175's list) under dot in `cmapx`: the inputs with areas but no root
   `id`, which must not change.

```
C=~/git/graphviz-16.1.1/tests
node harness/rowcheck.mjs <base.mjs> <head.mjs> \
  $(grep -v 2854 harness/survey-rootid.txt | sed "s|^|$C/|")
ENGINES=dot FORMATS=cmapx node harness/rowcheck.mjs <base.mjs> <head.mjs> \
  $(sed "s|^|$C/|" harness/survey-anchor.txt)
```

Wait while `uptime` is above 12. A native timeout (120 s) is listed, not
counted.

**Pass:** no `AWAY` row, no row byte-equal on the base that differs on the
head. Expected from the prototype: part 1 `native` 6 (`2258.dot`),
`unchanged` 81, `timeout` 3 (`2239.dot` fdp); part 2 all `unchanged` except
`2258.dot` (`native`). Journal the table.

## Observability / rollback

Observability: N/A (library: no logs, metrics or traces). Rollback: Reversible
(revert the one squashed commit).

## Acceptance criteria

- Given the base source, when the new tests run, then the prefix and `\G`
  cases fail and `noid`-style expectations (none prefixed) would pass.
- Given the fix, when `2258.dot` renders as `cmapx` under dot, neato and fdp,
  then the output equals native byte for byte (`G2_node1`, `G2_node2`,
  `G2_edge1`).
- Given the fix, when `html.gv` renders as `cmapx`, then the cell areas are
  `R_node1_0` and `R_node1_1`, as native.
- Given the fix, when `rowcheck.mjs` runs over the probes, then its verdicts
  equal the prototype's, and no svg row changes except `subst`/`subst2`.
- Given gates 1-6, when they run on the head, then each passes as the README
  says; the log has exactly one commit after the base, footer `Refs: #176`,
  and tag `issue-176/pre-squash` holds the per-task history.
