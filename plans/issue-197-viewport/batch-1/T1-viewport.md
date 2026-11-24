# T1: port `viewport=` (init_job_viewport) and emit_edge's edge_in_box gate; tests, gates, squash

## Context

C's `init_job_viewport` reads `viewport` and sets the job's view, zoom and
focus. The page size and `job->clip` follow from them, so objects outside the
view are not drawn. The port never reads the attribute, and derives view and
focus from the bb at five sites. Once the clip moves, the map renderer shows a
second gap: C gates all of `emit_edge` on `edge_in_box`, and the port's walk
does not ([../decisions.md](../decisions.md#mechanism-plannings-diagnosis)).
[../harness/prototype.diff](../harness/prototype.diff) is the working fix
(AD-1 to AD-3) with its tests (AD-4).

## Write-set

| File | Action |
|---|---|
| `src/gvc/viewport.ts` | Modify: add `JobViewport`, `initJobViewport`, `applyViewportAttr`, `jobViewport` and the `sscanf` helpers; change `setupPageClip` and `setupPageSize` to take a `JobViewport`; remove `initJobViewportZoom`; import `scanStrtod` (AD-1, AD-2) |
| `src/gvc/job.ts` | Modify: `view: Point` on `RenderJob` |
| `src/gvc/device.ts` | Modify: `render` sets Z and `job.view` from `jobViewport`; ≤ 508 lines |
| `src/gvc/emit-xdot.ts` | Modify: `deviceClip` |
| `src/gvc/emit-walk.ts` | Modify: `edgeShown` tests `edge_in_box` (AD-3) |
| `src/gvc/emit-gates.ts` | Modify: `emitEdgeComments` drops its own gate (AD-3) |
| `src/render/svg-graph.ts` | Modify: `emitSvgTag`'s page extent from `job.view` |
| `src/render/map.ts` | Modify: `writePlain`, `buildMapCtx`, one import; ≤ 797 lines |
| `src/common/graph-init.ts` | Modify: one comment names `jobViewport` |
| `src/gvc/viewport-attr.test.ts` | Create (AD-4) |
| `src/gvc/viewport.test.ts`, `src/gvc/viewport.branch.test.ts`, `src/render/svg-graph.test.ts`, `src/gvc/device.test.ts` | Modify: fixtures only (AD-4) |
| `plans/decision-journal.md`, this brief's `decision-journal.md`, `README.md` status, `harness/results/` | Modify |
| `.agent-notes/issue-197.md` | Create |

Read-set: `lib/common/emit.c:1164-1300` (init_job_pagination),
`:1504-1556` (setup_page), `:2998-3045` (emit_edge), `:3311-3386`
(init_job_viewport), `:4210-4225`; `src/gvc/viewport.ts`,
`src/gvc/device.ts:438-508`, `src/gvc/emit-xdot.ts:28-45`,
`src/gvc/emit-walk.ts:25-40`, `src/gvc/emit-gates.ts:60-80`,
`src/render/svg-graph.ts:64-115,380-410`, `src/render/map.ts:410-435,600-625`,
`src/xdot/strtod.ts:150-170`, `src/common/edge-in-box.ts`.

## Steps

1. **Start.** Run `git log --oneline fa380cee..`. If the tip has moved, the tip
   at start is the base: journal it, and build the base bundle from it in
   step 5. Check `uptime` (above 12, wait) and the oracle:
   `ls /tmp/ghl1611-carried/config8 /tmp/ghl1611-carried-all/config8`. If one
   is missing, run `GVBINDIR=<dir> ~/git/sseely/graphviz-carried/build/cmd/dot/dot -c`.
2. **Fixtures.** Run `bash plans/issue-197-viewport/harness/recapture.sh $TMPDIR/i197/native`,
   then `diff -r $TMPDIR/i197/native plans/issue-197-viewport/harness/native`.
   Any difference means the oracle moved: stop 4.
3. **Tests first** (AD-4). Apply the diff's test file
   (`git apply --include='src/gvc/viewport-attr.test.ts' plans/issue-197-viewport/harness/prototype.diff`).
   On the base, prove it reaches the defect: append export-only stubs to
   `src/gvc/viewport.ts`:

   ```ts
   export interface JobViewport { view: Point; zoom: number; focus: Point }
   export const initJobViewport = (bb: Box, size: DrawingSize | null, pad: Point): JobViewport =>
     ({ view: { x: 0, y: 0 }, zoom: initJobViewportZoom(bb, size, pad), focus: { x: 0, y: 0 } });
   export const applyViewportAttr = (vp: JobViewport, _g: Graph): JobViewport => vp;
   ```

   Run `npx vitest run src/gvc/viewport-attr.test.ts`, then remove the stubs.
   Pass: 117 failed, 72 passed, and the failing names equal
   `harness/results/tests-on-base.txt` (strip timings before you compare).
   Otherwise stop 2.
4. **Fix** (AD-1 to AD-3). `git apply` the rest of the diff
   (`--exclude='src/gvc/viewport-attr.test.ts'`), or make the same edits by
   hand if the base moved. Run `npx vitest run src/gvc src/render`: all pass.
   Check `wc -l`: `device.ts` ≤ 508, `map.ts` ≤ 797. Check
   `lizard -l typescript -C 10 -L 30 -a 5 -w src/gvc/viewport.ts`: no new
   function in the warnings.
5. **Probe matrix.** Build the head bundle (`npm run build:js`, copy
   `dist/index.js` to `$TMPDIR/i197/head.mjs`) and the base bundle (step 7's
   method). Run the three matrices of [../harness/survey.md](../harness/survey.md#probes)
   into `harness/results/probe-head*.tsv`. Pass: every head column is `eq`,
   with tallies as planning's (`results/probe-prototype*.tally`), and every row
   equals its `probe-prototype*.tsv` row. Any other row is stop 3.
6. **Gates 1-4** (README table). Record each in the journal.
7. **Gate 5: smoke bytediff.** Build the base bundle from `git archive <base>`
   in `$TMPDIR/i197/base-src`: symlink `node_modules`, run
   `npm run parser:regen` and `npm run build:js`, and copy `dist/index.js` to
   `$TMPDIR/i197/base.mjs` (never `git stash`). Then run
   `BD_FORMATS=svg,xdot,json,plain,cmapx,dot npx tsx test/tools/bytediff.ts $TMPDIR/i197/base.mjs $TMPDIR/i197/head.mjs ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i197/smoke.json`.
   Pass: 2352 identical, 0 diffs (journal row 2). A job capped once means the
   machine is loaded: re-run that job alone.
8. **Gate 6: targeted survey.** Run the bytediff of
   [../harness/survey.md](../harness/survey.md#corpus-gate-6). Pass: 0 diffs,
   and the capped jobs are the ones journal row 3 lists, capped on both
   bundles. Then, at load ≤ 12, re-run `2621` × cmapx alone (an ids file
   holding `2621 dot`, `BD_FORMATS=cmapx BD_CAP_MS=1200000`). cmapx is the
   one format the moved edge gate can change for it. Journal identical, or
   capped on both bundles. `1652` stays capped: row 3 gives the reason it
   cannot move. A diff or a one-sided cap that planning did not see is stop 3.
9. **Notes and journals** (README "Session end"). File
   [../harness/follow-up-margin-dpi.md](../harness/follow-up-margin-dpi.md) as a `follow-up`
   issue if the session may. Otherwise say in the report that it is unfiled.
10. **Squash** (README "Branch and commits").

## Acceptance criteria

- Given the issue's repro (`focus-xy.gv`), when it is rendered to svg, xdot,
  json and cmapx under dot, then each output equals native: an SVG of
  `60pt`×`60pt` with node `d` alone, and a canvas polygon of
  `0 0 0 60 60 60 60 0` with no draw strings on `a`, `b`, `c`.
- Given `focus-node.gv`, `focus-quoted.gv` and `unclosed-quote.gv`, when they
  are rendered, then the focus is node `c`'s coord, as native.
- Given `four-numbers.gv`, `focus-missing-node.gv` and `name-then-number.gv`,
  when they are rendered, then the focus stays the bb's centre, as native.
- Given `zoom2.gv` and `whz.gv`, when they are rendered to plain, then the
  graph line's scale is the viewport's Z (2, 0.5), as native.
- Given `urls.gv` and `edge-color-warn.gv`, when they are rendered, then an
  edge outside the view has no cmapx `<area>` and reports no warning, as
  native.
- Given the three `rtest-*` probes (tests.txt's `viewport` cases) under neato,
  when they are rendered, then all 15 rows equal native.
- Given the smoke list, every id is byte-identical between base and head.

## Observability

N/A: library code with no runtime telemetry. The evidence is the TSVs under
`harness/results/` and the journal rows.

## Rollback

Reversible: revert the squashed commit. Nothing persists outside the repo.
