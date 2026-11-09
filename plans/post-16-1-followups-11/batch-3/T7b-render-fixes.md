# T7b: the three render-layer causes behind 137 (user decision, 2026-11-09)

**Context:** T7 (journal row "T7 — Stop 1 on the fix; harness landed") showed native's subgraph/root variance is heap order
(settled 16/16 under `noaddr.patch`) and that the port's fdp and osage *layouts* already equal settled native on every render.
The residual diffs come from three render-layer mechanisms outside T7's write-set, each confirmed by a gated counterfactual
(`harness/T7/counterfactual.patch`, `harness/T7/port-vs-noaddr.cf.txt`). The user chose to fix all three in this mission.

- **(A) Stored draw strings.** C's agwrite prints attribute values. `xdot_end_node`/`xdot_end_edge` agxset only non-empty
  buffers (`plugin/core/gvrender_core_dot.c:240,254`), so an object not drawn this render keeps the `_draw_`/`_ldraw_` an
  earlier render stored; a subgraph that was a render root keeps its local `_draw_` and `xdotversion` (`:433,438`). The port
  prints only this render's side table (`src/render/dot.ts:84-86` `drawsOf`; `src/render/dot/attrs.ts:210-218`, which skips
  `_draw_` and `xdotversion` at subgraph scope). T7's crude counterfactual printed `_draw_=""`: not the fix shape.
- **(B) `Spline.bb` and `edge_in_box`.** C's `gvRenderJobs` runs `init_bb` → `init_splines_bb` (with `arrow_bb`) before each
  render (`lib/common/emit.c:4101-4163`), and `edge_in_box` tests `spl->bb` against the clip (`emit.c:2692`). The port never
  computes `Spline.bb` (it stays `{0,0,0,0}`), and `src/common/edge-in-box.ts:48` dropped the `spl->bb` test on purpose: its
  comment says adding it regressed neato and circo edges. Port `init_bb`/`init_splines_bb`/`arrow_bb` faithfully first, then
  restore the test; the earlier regression is evidence the bb was wrong, not that the test is.
- **(C) Non-finite values.** C's printf prints `inf`/`-inf`/`nan`; the port prints `Infinity`/`-Infinity`/`NaN` (xdot `bb`,
  `_draw_`, svg `translate` and `points`). C derives the page clip through focus/pageSize arithmetic (`emit.c:1559-1562`),
  which is `nan` for an infinite bb; the port uses `job.bb ± pad` (`src/render/dot.ts:146`, `src/gvc/emit-gates.ts:47-52`).

**Task:** fix (A), (B) and (C) faithfully, each with tests first from native output (the T0 `subg-*` refs; T7's noaddr runs
under `harness/T7/`; new native refs you generate with the T15 harness into `harness/T7b/`). One commit per mechanism, in the
order C, A, B (B last: largest reach), each `fix(T7): <mechanism>` ≤72 chars. Remove `\` + newline before comparing xdot only if
T3 has not landed at your base (it should have; check `git log`).

**Write-set:** `src/render/dot.ts`, `src/render/dot/attrs.ts`, `src/render/dot/write-back.ts`, `src/render/svg*.ts` (number
formatting only), `src/common/edge-in-box.ts`, `src/common/emit-bb.ts` (new, for `init_bb`/`init_splines_bb`/`arrow_bb` if no
port of them exists — search first), `src/gvc/emit-gates.ts`, `src/gvc/emit*.ts` (render-job setup only), new tests beside them,
`plans/post-16-1-followups-11/harness/T7b/`. Not `src/render/map.ts`, `xdot-ops.ts`, `agwrite*.ts` (T3's), not `src/layout/`.
**Read-set:** `lib/common/emit.c` (`init_bb`, `init_splines_bb`, `edge_in_box`, `setup_page`, `init_job_viewport`),
`lib/common/arrows.c:arrow_bb`, `plugin/core/gvrender_core_dot.c`, `lib/cgraph/write.c`; `harness/T7/`.

**Acceptance criteria:**
- *Given* each T0 `subg-*` case, *when* rendered as the harness does, *then* every render equals settled native (`noaddr` class;
  `subg-fdp.cluster_k.nofree.xdot` has no native render 2), bytes except the T9 svg id work already landed.
- *Given* the smoke bytediff and the orchestrator's full bytediff, *then* any first-render change is byte-equal to native; any
  other first-render change is stop 8. Report every first-render change you expect, with a native check of each.
- *Given* (B), *then* neato and circo first renders do not lose edges (the regression `edge-in-box.ts`'s comment records):
  check `edgeHasDrawableContent` decisions against native's drawn edge count on the smoke ids for all 8 engines.

**Observability:** N/A. **Rollback:** Reversible per commit.
