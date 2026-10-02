# Reclassification table (old → new)

Single source for the corpus gate (only these changes are allowed on failing inputs)
and for the README migration section (T9). T3–T8 append rows as they land; T4/T5
fill the C-port rows (one row per site, with its C reference).

## Public API / registry

| Situation | Before | After | Task |
|---|---|---|---|
| `parse(non-string)` / `renderSvg(non-string, …)` | `ParseError` `GENERIC_ERROR` | `TypeError` `ERR_INVALID_ARG_TYPE` | T2, T8 |
| engine argument not registered | `RenderError` `RENDER_ERROR` (via wrap) | `TypeError` `ERR_INVALID_ARG_VALUE` | T3, T8 |
| `tryRenderSvg` with invalid arguments | returned as `{ errors }` data (`GENERIC_ERROR` / `RENDER_ERROR`) | throws `TypeError` `ERR_INVALID_ARG_*` | T8 |
| engine argument not registered but DOT sets a valid `layout=` | rendered with the attribute's engine | `TypeError` `ERR_INVALID_ARG_VALUE` (argument checked first) | T3, T8 |
| format argument not registered (`render(g, 'pdf')`) | `RenderError` `RENDER_ERROR` | `TypeError` `ERR_INVALID_ARG_VALUE` | T3, T8 |
| DOT `layout="foo"` unknown | `RenderError` `RENDER_ERROR` | `RenderError` `UNKNOWN_LAYOUT` (`semantic`) | T3 |
| `render(null)` / `getDrawOps(null)` | `RenderError` "Cannot read properties of null" | `TypeError` `ERR_INVALID_ARG_TYPE` | T8 |
| `getLayout(null)` / `addEdge(null, …)` | raw `TypeError` (no code) | `TypeError` `ERR_INVALID_ARG_TYPE` | T6 |
| `getLayout` before layout | `RenderError` `GENERIC_ERROR` | `Error` `ERR_INVALID_STATE` | T6 |
| builder fails to create node/subgraph | `RenderError` `GENERIC_ERROR` | `InternalError` `INTERNAL_ERROR` | T6 |
| `ctx.layout`/`freeLayout` non-object `g` or non-string engine; `bestRenderer` non-string format | incidental `TypeError` / generic `Error` | `TypeError` `ERR_INVALID_ARG_TYPE` | T3 |
| `getLayout(g, { yAxis: 'other' })` | silently treated as y-up | `TypeError` `ERR_INVALID_ARG_VALUE` | T6 |
| `createGraph`/builder/handles with wrong argument types; `addEdge` non-string `name` | accepted silently / coerced | `TypeError` `ERR_INVALID_ARG_TYPE` | T6 |
| `setImageSizer`/`setImageResolver`/`setTextMeasurer` with a wrong value | accepted; failed later inside layout | `TypeError` `ERR_INVALID_ARG_TYPE` | T7 |
| foreign throw inside layout/render (bug) | `RenderError` `RENDER_ERROR`, original stack lost | `InternalError` `INTERNAL_ERROR`, `cause` = original | T8 |

## C-port throw sites (T4, T5 fill in)

| Site (file:line) | C reference | C behaviour | Before | After | Task |
|---|---|---|---|---|---|
| layout/neato/cdt-surface.ts:167 | gts triangle.c gts_triangle_vertices_edges | g_assert_not_reached | Error | InternalError | T4 |
| layout/neato/cdt-surface.ts:401 | gts cdt.c:677 gts_delaunay_add_vertex | returns v, continues | Error (throw) | no throw: returns v (ported) | T4b |
| layout/neato/cdt-surface.ts:485 | gts cdt.c:863 remove_intersected_edge | collects constraint, continues | Error (throw) | no throw: collected (ported) | T4b |
| layout/neato/cdt-surface.ts (new) | gts cdt.c:887, 895 | g_assert | (missing) | InternalError | T4b |
| layout/neato/cdt-surface.ts:493, 547 | gts cdt.c:842, 967 | g_assert(next) | Error | InternalError | T4 |
| layout/neato/cdt-surface.ts:551 | gts cdt.c:974 | g_assert_not_reached | Error | InternalError | T4 |
| layout/neato/multispline-router.ts:168 | multispline.c:556 mkRouter | NULL sf dereferenced (crash) | Error | InternalError | T4 |
| layout/neato/multispline-router.ts:196 | multispline.c:128 findMap | assert(ip) | Error | InternalError | T4 |
| layout/neato/multispline-router.ts:289 | multispline.c:904 edgeToSeg | assert(0) | Error | InternalError | T4 |
| vpsc/Solver.ts:132, 195 | solve_VPSC.cpp:98, 130 | uncaught runtime_error | Error | InternalError | T4 |
| vpsc/Solver.ts:186 | solve_VPSC.cpp:190 | uncaught runtime_error | Error | InternalError | T4 |
| ortho/ortho-parallel.ts:84 | ortho.c:759 decide_point | assert(0) | Error | InternalError | T4 |
| ortho/trap-query.ts:99 | (port default case) | — | Error | InternalError | T4 |
| label/index.ts:263 | label/index.c:178 | assert | Error | InternalError | T5 |
| label/rectangle.ts:84 | label/rectangle.c:73 | agerrorf + graphviz_exit | Error | RenderError RENDER_ERROR | T5 |
| label/node.ts:264 | (port ESM shim) | — | Error | InternalError | T5 |
| layout/dot/pack-components.ts:259 | pack/ccomps.c:364 | assert(op) | Error | InternalError | T5 |
| layout/fdp/ports.ts:81, 154 | fdpgen/layout.c:572, 689 | assert | Error | InternalError | T5 |
| layout/fdp/xlayout.ts:336 | neatogen/adjust.c:917-972 | C honours the overlap mode | Error | RenderError UNSUPPORTED_FEATURE | T5 |
| layout/sfdp/init.ts:134, 150 | sfdpgen/sfdpinit.c:214, 218 | C honours smoothing/rotation | Error | RenderError UNSUPPORTED_FEATURE | T5 |
| layout/twopi/circle.ts:26 | (port accessor guard) | — | Error | InternalError | T5 |
| common/poly-shapes.ts:76 | common/shapes.c:739 | C draws the shape | Error | RenderError UNSUPPORTED_FEATURE | T5 |
| util/xml.ts:158, 166 | util/xml.c:~135 | fprintf + graphviz_exit | Error | RenderError RENDER_ERROR | T5 |
| gvc/job.ts:368 | common/emit.c:132 pop_obj_state | assert(obj) | Error | InternalError | T5 |
