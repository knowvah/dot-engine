# Decisions: issue #178

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-17, base `e865cfb1`. Nobody confirmed these. Each one lists the options
it rejected and its evidence, so the maintainer can audit it.

### AD-1: port `allocObj`/`freeObj` around the top-level HTML label

**Context.** C's `emit_html_label` (`lib/common/htmltable.c:724-768`, 16.1.1)
opens with `allocObj(job)` (`:728`) and ends with `freeObj(job)` (`:767`).
`allocObj` (`:665-693`) calls `push_obj_state` (`lib/common/emit.c:110-129`:
it copies pencolor, fillcolor, pen, fill, penwidth, gradient_angle and
stopcolor from the parent) and then copies `type`, `emit_state`, `u`, `url`,
`tooltip`, `target` and `explicit_tooltip`. It does not copy `id`, `label`
or the map fields. `freeObj` (`:695-703`) clears url, tooltip, target and id,
then calls `pop_obj_state`. So the `emit_map_rect` that each anchored cell or
table runs in `initAnchor` (`htmltable.c:399`) writes `url_map_p` into the
temporary obj, which is then thrown away. A nested table goes through
`emit_html_cell` to `emit_html_tbl` (`:644`) and gets no obj of its own. The
port's `emitHtmlLabel` (`src/common/htmltable-emit.ts:286`) covers both the
top-level label and nested tables (`:247`), and pushes no obj. The cell rects
therefore stay in the enclosing obj's `urlMapPts`.

**Decision.** Rename the body of the current `emitHtmlLabel` to a
module-private `emitHtmlTbl` (`@see htmltable.c:emit_html_tbl`). The nested
call at `:247` calls `emitHtmlTbl`. Add `allocObj(job)` and `freeObj(job)`
(C names, `@see htmltable.c:allocObj` / `:freeObj`). The exported
`emitHtmlLabel(placed, pos, renderer, job)` (same signature, same two callers)
becomes `allocObj` → `emitHtmlTbl` → `freeObj`, with `freeObj` in a `finally`.
`allocObj` builds the new obj with `createObjState(parent.type)`
(`src/gvc/job.ts`), sets `parent`, and copies exactly C's fields (the
push_obj_state paint set plus allocObj's set: `emitState`, `graphObj` for
`u`, `url`, `tooltip`, `target`, `explicitTooltip`). `freeObj` calls
`job.popObj()`. Clearing the strings first is C's memory bookkeeping and has
no observable effect in TS.

**Rejected.**
- (a) Gating `writeCmapxGraphShape` on `obj.url || obj.explicitTooltip`.
  It fixes the root symptom at the sink only, and the cell rects would still
  leak into cluster and edge objs. `rules/diagnosis.md` asks for the fix at
  the origin.
- (b) Saving and restoring `urlMapShape`/`urlMapPts` around the label in
  `renderOneLabel`, as `polyGencode` does for nodes today. That copies the
  current workaround to a second site, while C has one mechanism for every
  label owner.
- (c) Pushing the obj at the two callers (`device-labels.ts:97`,
  `poly-gencode.ts:280`). It duplicates the push, and `poly-gencode.ts` is
  over 500 lines (AD-2 shrinks it).

**Evidence.** A scratch prototype of exactly this change, plus AD-2, was
built and then reverted. The diff is `$TMPDIR/i178/proto.diff`, and the
bundles are `$TMPDIR/i178/{base,protoA,protoAB}.mjs`. Over 10 probes × dot,
neato, fdp × cmapx, cmapx_np, imap, imap_np, svg, xdot (180 rows) it moved
24 rows to byte-equal native. The other 156 were unchanged, every svg, xdot
and imap row among them, and none moved away
([harness/prototype-probes.tsv](harness/prototype-probes.tsv)). For the
planning survey, see the README.

### AD-2: remove `polyGencode`'s save/restore of the node hot spot

`src/common/poly-gencode.ts:536-557` saves `job.obj.urlMapShape` and
`urlMapPts` before the node label and restores them before the deferred
`EMIT_CLUSTERS_LAST` anchor. Its comment gives the reason: "HTML cells
overwrite obj.urlMapPts via emit_map_rect". C's `poly_gencode`
(`lib/common/shapes.c:2932-2936, 3087-3092`) has no such save. It relies on
`allocObj` and reuses `url_map_p` from `emit_begin_node`. With AD-1 in place
the restore does nothing, because the label no longer touches the node obj.
Remove it, keep the `EMIT_CLUSTERS_LAST` comment with its `@see`, and leave
`beginNodeAnchor` as it is. Evidence: the bundle with AD-1 only (`protoA`) and
the one with AD-1 and AD-2 (`protoAB`) produce identical output on all 10
probes × 3 engines × cmapx, cmapx-np, imap, svg and xdot. `node.gv` has a node
with `URL` and an anchored cell. Rejected: keeping it. It would be dead code
that encodes the bug's mechanism (the `pr-workflow.md` dead-code rule), and
`poly-gencode.ts` (559 lines) may not grow while it may shrink.

### AD-3: `src/render/map.ts` does not change

The graph-area write (`endGraph`, `map.ts:664-674`; `writeCmapxGraphShape`,
`:455-459`) already mirrors `map_end_page` (`gvrender_core_map.c:173-192`): it
prints whatever map points the root obj holds. With AD-1 the root obj holds
points only when `computeGraphUrlMap` ran (url or explicit tooltip, C's
`emit_page`, `emit.c:3570-3591`). If T1 finds `map.ts` must change, AD-1 was
wrong (stop condition 6).

### AD-4: a new test file reading this brief's native captures

Add `src/render/map-html-label-obj.test.ts`, following
`src/render/map-id-prefix.test.ts`. It checks probe × engine × format byte
equality against `plans/issue-178-cmapx-html-label-obj/harness/native/` for
the probes listed in T1. The `cluster` probe is checked only on the lines
this change owns, because #179 (the cluster area order) still differs. It
also has inline unit cases: no `id="graph0"` area on the repro, and the graph
area is present with `URL=`. Rejected: adding the cases to
`map.branch.test.ts`, which is over 500 lines.

## Baseline

Planning base `e865cfb16152771801c54e1f804f7ba8478fe0b2`. `npm run typecheck`
exit 0, `npm test` 594 files, 14098 tests, exit 0 (Phase 8; journal row 0).

## Rollback

Reversible: revert the one squashed commit. No API or data contract changes.
The obj stack is internal (`RenderJob.pushObj`/`popObj`), and `emitHtmlLabel`
keeps its signature.

## Irreversible changes

None.
