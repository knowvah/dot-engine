# Decisions: issue #141

## AD-1: port init_job_pad with a per-renderer `defaultPad`

- **Context:** C's `init_job_pad` (`lib/common/emit.c:3290-3304`) sets `job->pad` from
  `pad=` (`gvc->graph_sets_pad`, read at `emit.c:3241-3251`). Otherwise it uses
  `job->render.features->default_pad` for a render plugin, and `DEFAULT_GRAPH_PAD`
  (`lib/common/const.h:96`, = 4) for any other output language. The port hardcodes the svg
  value (`parseGraphPad` falls back to `SVG_PAD`).
- **Decision:** add `readonly defaultPad?: number` to `RendererPlugin`
  (`src/gvc/context.ts`), documented `@see lib/gvc/gvcjob.h gvrender_features_t.default_pad`.
  Set it on every built-in renderer from C:

  | Renderer (port type) | C features | defaultPad |
  |---|---|---|
  | `svg` | `gvrender_core_svg.c:810` | 4 |
  | `xdot` (and `dot` subclass) | `gvrender_core_dot.c:745` / `:734` | 0 |
  | `plain`, `plain-ext` | rendered by the dot engine, `render_features_dot` (`:734`) | 0 |
  | `json`, `json0` | `gvrender_core_json.c:745` | 0 |
  | `imap`, `imap-np`, `cmapx`, `cmapx-np` | `gvrender_core_map.c:244` | 4 |

  `parseGraphPad(raw, fallback)` returns the fallback when `pad=` is unset or unparsable,
  which is `init_job_pad`'s else branch. `render` passes `renderer.defaultPad`.
- **Consequences:** `job.pad` becomes 0 on xdot, dot, plain and json. Its other readers
  (`svg-graph.ts`, `map.ts` `buildMapCtx`, and `device.ts` `z` feeding `job.scale`) are
  svg-only or map-only per the planning grep. T1 confirms this (stop condition 4). The
  optional field does not break third-party renderers registered through
  `GvcContext.register`.
- **Rejected:** (B) keep the type-string dispatch in `deviceClip`, add the map family,
  and have `nodeInBox` read `job.clip`. That is smaller, but it keeps a device table
  outside the devices, which is the cause here. (C) give `nodeInBox` alone the
  `deviceClip` pad rule. That fixes xdot and json nodes but leaves map's node and edge
  clip at 0 against C's 4.

## AD-2: `nodeInBox` reads `job.clip`

- **Context:** `emit.c:1808` calls `node_in_box(n, job->clip)`. The port rebuilds
  `job.bb ± job.pad` and argues in a comment that this reduces to `job->clip`. That holds
  only up to `setup_page` rounding, and only when the pad matches the device.
- **Decision:** `nodeInBox(n, job)` returns `boxOverlap(nodeBBox(n), job.clip)`. Keep the
  signature, and rewrite the doc comment to cite `emit.c:1636-1639` and `:1808`.
- **Consequences:** svg's node gate now uses the same rounded clip as its edge gate
  (`edgeHasDrawableContent(e, job.clip)`) and its cluster and background code. Any svg
  change has to equal native (gate 5).

## AD-3: `deviceClip` uses `job.pad`

- **Decision:** `deviceClip` drops its `renderer.type === 'svg'` test and its private
  `pad=` parse, and computes `setupPageClip(job.bb, size, job.pad, initJobViewportZoom(job.bb, size, job.pad))`.
  Keep the `renderer` parameter only if a caller still needs it. Otherwise remove it
  and update the callers in `device.ts`, `emit-xdot.ts:213` and `src/render/dot.ts:143`.
- **Consequences:** the xdot and json clip is unchanged (0, or `pad=`). The map clip moves
  from 0 to 4, as C has it.

## AD-4: a renderer without `defaultPad` gets `DEFAULT_GRAPH_PAD`

- **Context:** C reaches its `default:` branch (4) only for output that is not a render
  plugin. Every built-in port renderer sets the field (AD-1). So the fallback applies only
  to third-party renderers, which today get a node pad of 4 and a clip pad of 0.
- **Decision:** fall back to a named `DEFAULT_GRAPH_PAD = 4` (`@see lib/common/const.h:96`).
- **Consequences:** a custom renderer's edge, cluster and background clip grows by 4 pt to
  match its node gate. Journal this as a visible change for plugin authors.

## Auto-confirmed (unattended)

AD-1..AD-4 were taken on the planner's recommendation, with nobody present. Evidence:
`emit.c:1808` (`node_in_box(n, job->clip)`); `emit.c:3290-3304` (`init_job_pad`); the
`default pad` lines in `plugin/core/gvrender_core_{svg,dot,json,map}.c`; port `deviceClip`
(`emit-xdot.ts:39-44`) and `nodeInBox` (`emit-gates.ts:49-55`); map renderers route nodes
through `renderNode` (`src/render/map.ts:637` `MapRendererBase.beginNode`). The rejected
options and their reasons are listed under AD-1. Native probe at planning: no input found
puts a node outside `GD_bb` (README, planning evidence).

## Baseline

On `ca9c09f3` at planning: `npm run typecheck` exit 0; `npm test` 565 files / 13320 tests
passed. The project has no separate lint script, so typecheck stands in for lint.

## Rollback

Reversible: revert the squash commit. There is no data or format migration. The only
contract change is the optional `RendererPlugin.defaultPad`, which is additive.
