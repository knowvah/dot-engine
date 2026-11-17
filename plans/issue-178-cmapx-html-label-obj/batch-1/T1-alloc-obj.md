# T1: red tests, allocObj/freeObj around the HTML label, gates, squash

## Context

The port's `emitHtmlLabel` pushes no temporary obj. The rects of anchored
cells therefore stay in the enclosing obj's `urlMapPts`, and the map
renderer's `endGraph` prints them as a root `<area>` that native never writes
([README](../README.md#objective)). T1 ports C's `allocObj`/`freeObj` (AD-1),
removes the node workaround that the port has needed until now (AD-2), and
leaves `map.ts` alone (AD-3).

## Steps

1. **Red.** Add `src/render/map-html-label-obj.test.ts` (AD-4). Start it with
   a header comment that names the C source (`@see
   lib/common/htmltable.c:emit_html_label`, `:allocObj`, `:freeObj`, `@see
   plugin/core/gvrender_core_map.c:map_end_page`) and says where the native
   files come from (16.1.1, `harness/rowcheck.mjs` with `NATIVE_DIR`,
   2026-11-17).
   - Byte-equal probes, one case per probe × engine (dot, neato, fdp) ×
     format (`cmapx`, `cmapx-np`; native's files spell it `_np`): `repro`,
     `tblhref`, `nested`, `paint`, `rooturl`, `roottip`, `node`, `edge`,
     `text`. Each must equal
     `../../plans/issue-178-cmapx-html-label-obj/harness/native/<probe>.gv.<engine>.<fmt>`.
     `rooturl`, `roottip`, `node`, `edge` and `text` already equal native on
     the base (planning run). They guard against regressions: the graph
     area with a root URL or tooltip, the node hot spot after AD-2, and the
     edge's cell and label areas.
   - Partial probe `cluster`: assert only that the output has no area with
     the bare root id (`id="graph0"`) and has each of native's lines. It
     does not assert their order, because #179 puts the `clust2` area before
     its cell's area.
   - Unit cases, inline DOT under dot `cmapx`: the issue's input has no
     ` id="graph0" ` area and has 3 areas. With `URL="http://r"` on the root
     the graph area is present once, carries `href="http://r"`, and its
     coords are the page box, not a cell's. With `tooltip="t"` on the root
     the graph area is present with `title="t"`.

   Run on the base. The cmapx and cmapx-np cases of `repro`, `tblhref`,
   `nested` and `paint`, and the first unit case, fail. Everything else
   passes. Journal it.
2. **Green (AD-1).** In `src/common/htmltable-emit.ts`:
   - Rename the exported `emitHtmlLabel` to a module-private `emitHtmlTbl`
     and point its JSDoc at `emit_html_tbl`.
   - Change the nested call (`:247`) to `emitHtmlTbl`.
   - Add `allocObj` and `freeObj` as AD-1 specifies.
   - Export a new `emitHtmlLabel` with the same signature that runs
     `allocObj` → `emitHtmlTbl` → `freeObj` (in `finally`).
   - Update the file header ("emitHtmlLabel is the port of emit_html_tbl"
     becomes two lines).
   - `job.obj === null`: C always has a parent here, because
     `emit_html_label` runs inside an object. First make `allocObj` throw
     `InternalError` on null and run `npm test`. If no test reaches it, keep
     the throw (that is the boundary assertion). If a test harness reaches
     it, emit without a push when there is no parent, quote the caller in a
     comment, and journal which choice you made.

   Then run the new test file plus `src/render/map*.test.ts` and
   `src/common/htmltable*.test.ts`. All of them pass.
3. **AD-2.** In `src/common/poly-gencode.ts` `polyGencode`, remove
   `savedShape`/`savedPts` and the restore block. Keep the
   `EMIT_CLUSTERS_LAST` comment, shortened, with its `@see shapes.c:poly_gencode`.
   `wc -l` must be below 559. Run `src/common/poly*.test.ts` and the new
   file. All pass.
4. **Check every probe.** Build the head bundle (`npm run build:js`, then
   copy `dist/index.js`). From the brief directory run
   `ENGINES=dot,neato,fdp FORMATS=cmapx,cmapx_np,imap,imap_np,svg,xdot node harness/rowcheck.mjs <base.mjs> <head.mjs> harness/probes/*.gv`.
   Pass: the verdict column equals
   [prototype-probes.tsv](../harness/prototype-probes.tsv) row for row
   (`native` 24, `unchanged` 156). Write the run to `harness/results/probes-head.tsv`
   and journal the tally.
5. **Gates 1-6** (README). Record each in the journal.
6. **Diagnosis row.** Journal the artifact.
   - **Mechanism:** C's `emit_html_label` runs the whole label inside a
     temporary obj (`allocObj`/`freeObj`), so the `emit_map_rect` of each
     anchored cell writes that obj's `url_map_p` and the write is thrown
     away. The port's `emitHtmlLabel` pushed no obj, so the last anchored
     cell's rect stayed in the root obj, and `endGraph`
     (`writeCmapxGraphShape`) printed it as `id="graph0"` with the root's
     default tooltip, the label text.
   - **Origin:** C `lib/common/htmltable.c:665-703, 728, 767`; port
     `src/common/htmltable-emit.ts:286` on the base.
   - **Chain:** `emit_page`/`renderOneLabel` → `emitHtmlLabel` → cell
     `initHtmlAnchor` → `renderer.emitMapRect` → `computeClusterUrlMap(box, job.obj)`
     sets the root obj's `urlMapPts` → `endGraph` sees non-empty points →
     an extra `<area>`.
   - **Ruled out:** `map_end_page` gating (C prints whenever `url_map_p` is
     set, `gvrender_core_map.c:37`, with no url check); the root obj's own
     map (only set with url/explicit tooltip, `emit.c:3570`, ported in
     `endGraph`); imap (an empty url prints nothing,
     `gvrender_core_map.c:40`; imap rows unchanged); svg/xdot (anchors take
     their url and id as arguments; all svg and xdot rows unchanged).
7. **Close-out.** Then **finish** as the README's "Branch and commits"
   section says.

## Write-set

- `src/common/htmltable-emit.ts` (`emitHtmlLabel` split, `allocObj`, `freeObj`)
- `src/common/poly-gencode.ts` (AD-2 only; must shrink)
- `src/render/map-html-label-obj.test.ts` (new)
- `plans/issue-178-cmapx-html-label-obj/harness/extra/` and `results/` (new
  probes, result tables)
- `plans/decision-journal.md`; this mission's `decision-journal.md`, README and
  `batch-1/overview.md` (status checkboxes and a summary)
- `.agent-notes/issue-178.md` (only if novel)

## Interface contracts

- `emitHtmlLabel(placed: PlacedHtml, pos: Point, renderer: RendererPlugin, job: RenderJob): void`:
  same signature and callers (`src/gvc/device-labels.ts:97`,
  `src/common/poly-gencode.ts:280`). New contract: `job.obj` is a temporary
  child obj while the label emits, and the stack depth is the same on return,
  even when the label throws.
- `allocObj(job)` / `freeObj(job)`: module-private.

## Bytediff

This is gate 5 of the queue rules. Base bundle: `$TMPDIR/i178/base.mjs` if the
base is still `e865cfb1` (it was built from the clean tree at that sha).
Otherwise `git archive <base>` into `$TMPDIR`, symlink `node_modules`, run
`npm run parser:regen` and `npm run build:js`, and copy `dist/index.js`. Head
bundle: build it from the worktree. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/i178/base.mjs $TMPDIR/i178/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i178-smoke.json
```

Every changed output must equal native (stop condition 3). Only `cmapx` and
`cmapx_np` jobs of inputs whose root graph label is an HTML table with an
anchored cell, and whose root has no URL or tooltip, can change. Expect none
or almost none in the smoke list.

## Targeted survey

**Selection rule.** The change runs for every top-level HTML label in every
renderer, so two sets:

- **A.** Every corpus input whose text has an HTML label (`<table` or
  `label=<`, case-insensitive; 70 files in
  [../harness/survey-html.txt](../harness/survey-html.txt)), under dot in
  `svg`, `xdot` and `cmapx`. svg and xdot cover the paint and emit-state
  fields that `allocObj` copies. cmapx covers the map leak.
- **B.** The 11 of those that also contain `href`, `URL`, `tooltip` or
  `title`
  ([../harness/survey-html-anchor.txt](../harness/survey-html-anchor.txt)),
  under dot, neato and fdp in `cmapx_np` and `imap`.

```
C=~/git/graphviz-16.1.1/tests
ENGINES=dot FORMATS=svg,xdot,cmapx node harness/rowcheck.mjs <base.mjs> <head.mjs> \
  $(sed "s|^|$C/|" harness/survey-html.txt) > harness/results/survey-head.tsv
ENGINES=dot,neato,fdp FORMATS=cmapx_np,imap node harness/rowcheck.mjs <base.mjs> <head.mjs> \
  $(sed "s|^|$C/|" harness/survey-html-anchor.txt) > harness/results/survey-anchor-head.tsv
```

Wait while `uptime` is above 12. A native timeout (120 s) is listed but not
counted. A row whose port fails on base and head with the same error
(`PORT FAILED`, for example `1494.dot`'s ParseError) shows as `AWAY` only
because the stack trace contains the bundle path. Count it as an unchanged
failure, and check that the first error line is identical on both.

**Pass:** no real `AWAY` row, no row that was byte-equal on the base differs
on the head, and the verdicts equal
[prototype-survey.tsv](../harness/prototype-survey.tsv) and
[prototype-survey-anchor.tsv](../harness/prototype-survey-anchor.tsv) row for
row. See the README for the planning tallies. The run takes about 30 minutes.
Give it a background limit of an hour and a half, and journal the tables.

## Observability / rollback

Observability: N/A (a library with no logs, metrics or traces). Rollback:
Reversible (revert the one squashed commit).

## Acceptance criteria

- Given the base source, when the new tests run, then the `repro`,
  `tblhref`, `nested` and `paint` cmapx cases and the repro unit case fail,
  and the rest pass.
- Given the fix, when the issue's input renders as `cmapx` under dot, neato
  and fdp, then the output equals native byte for byte (3 areas, no
  `id="graph0"`).
- Given a root with `URL`, when it renders as `cmapx`, then the graph area is
  still written, with the page-box coords.
- Given AD-2, when `node.gv` renders in every probe format, then the output
  is unchanged from the base.
- Given gates 1-6, when they run on the head, then each one passes as the
  README says. The log has exactly one commit after the base, with footer
  `Refs: #178`, and tag `issue-178/pre-squash` holds the per-task history.
