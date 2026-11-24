# issue-197 mission — observations (2026-11-23)

## Observation: `viewport`'s three `sscanf` forms assign partially
- **Context**: porting `init_job_viewport` (`lib/common/emit.c:3355-3375`).
- **Finding**: C never tests which fields a failed `sscanf` assigned ("rv is ignored since args
  retain previous values if not scanned"). So `"W,H"` overrides the view and keeps the `size=`
  fit's Z; `"W,H,Z,x"` is format 2 with rv == 4, which reads `x` as a node name (a node named
  `30` is found by `viewport="60,60,1,30"`); `"W,H,Z,name,5"` makes format 2 return 5, and format
  3 then stops on the name; `"W,H,Z,'name"` needs no closing quote; `"W,H,Z,''"` is the bare
  name `''`. `%lf` skips leading whitespace, the literal `,` does not, so `"60 ,60"` reads W
  alone. `applyViewportAttr` models all of it as "each value read overrides its field, in order",
  on `scanStrtod` (hex floats, `inf`, `nan` as the macOS oracle reads them).
- **Impact**: do not reuse `parseDrawingSize`'s `FLOAT` regex for a `sscanf("%lf,...")` port: it
  has no hex, inf or nan and lets whitespace through before a comma.
- **Confidence**: High (47 probes × 5 formats equal the carried oracle)

## Observation: `JobViewport.zoom` is the real Z; `job.zoom` stays 1
- **Context**: `src/gvc/viewport.ts`, `src/gvc/device.ts:render`.
- **Finding**: the port keeps `job.zoom` at 1 and carries Z in `job.scale` (D4). C's `job->view`,
  `job->zoom` and `job->focus` are `JobViewport { view, zoom, focus }`, built by `jobViewport`;
  `RenderJob.view` is C's view, and `setupPageSize(vp)` is `view / zoom`. `deviceClip`,
  `buildMapCtx` and `writePlain` each call `jobViewport` again with their own pad (plain's is 0,
  #198's question).
- **Impact**: a consumer that needs C's `job->zoom` must take it from `jobViewport`, not from
  `job.zoom`.
- **Confidence**: High

## Observation: `edge_in_box` now gates in the walk; two re-tests always pass
- **Context**: AD-3. C gates all of `emit_edge` on `edge_in_box(e, job->clip) && edge_in_layer`.
- **Finding**: `edgeShown` (`src/gvc/emit-walk.ts`) tests `edgeHasDrawableContent` first. The
  re-tests in `src/render/svg.ts` (`edgeGroupOpen`) and `src/render/dot.ts` (`edgeDrawable`) can
  no longer fail. They were left alone: a cleanup candidate, not a fix. A hand-built test edge
  needs a spline bb that meets the clip, or the walk skips it (`device.test.ts` AC3).
- **Impact**: a renderer added later needs no clip test of its own for edges. Clusters are not
  clip-gated in C (`emit_clusters`), and nodes gate on `node_in_box` (`emit-gates.ts`).
- **Confidence**: High

## Observation: init_job_pagination floors the page at the device's default page
- **Context**: probes added at execution with a negative `viewport` W or H.
- **Finding**: `pageSize = fmax(fmax(default_pagesize - 2 * margin, 0), imageSize)`
  (`emit.c:1209-1220`); svg's default page is 0 x 0. `job->width/height` read `pageSize`, while
  `canvasBox` (the viewBox) reads `imageSize`. So `viewport="-60,-60,1,30,30"` prints
  `width="0pt" height="0pt" viewBox="0.00 0.00 -60.00 -60.00"`, and `margin=-1` on `a -> b` prints
  a 0pt page too. Before `viewport` the image was never negative, so only a negative margin
  reached the floor. `emitSvgTag` now ports it with `fmax` (a NaN W reads as the 0 page). The
  centering term of the same function (`center=true`, `(pageSize - imageSize) / 2`) is not
  ported: #307.
- **Impact**: the SVG width and the viewBox are separate quantities in C; a change to one formula
  must not be copied to the other.
- **Confidence**: High (3 probes, 5 unit cases with native values)

## Observation: native writes `nan` and `-inf` into json, which is not JSON
- **Context**: exploratory probes `viewport="nan,60,1,30,30"`, `"inf,..."` and `"60,60,0,30,30"`.
- **Finding**: the canvas polygon's points print as `nan` and `-inf` in native `-Tjson`, and the
  port prints the same tokens. `JSON.parse` throws on both, so a harness that falls back to raw
  text (`probe.ts` `norm`) reports `out`: the raw texts differ only in #184's layout. Quoting the
  tokens before parsing shows the values equal. These three inputs equal native in svg, xdot,
  cmapx and plain, and are not in the committed probe set.
- **Impact**: a json row that is `out` on an input with a non-finite number needs a tolerant
  parse before it is called a difference.
- **Confidence**: High

## Observation: the 500-line write hook pins `device.ts` and `map.ts`
- **Context**: `src/gvc/device.ts` (508 lines) and `src/render/map.ts` (797) are over the hook's
  500-line limit already.
- **Finding**: the hook blocks a write that grows either file past its current count, so the
  fix replaced lines one for one there, and the gate lives in `emit-walk.ts`.
- **Impact**: new logic for either file goes in a sibling module.
- **Confidence**: Medium (planning's observation; this run did not add a line to either file)

## Observation: the port has no neato `-n` mode
- **Context**: `tests/tests.txt:208-215` runs `graphs/viewport.gv` with `-n2 -Gviewport=...`.
- **Finding**: the three `rtest-viewport-*` probes set the value in the file and run under plain
  neato, in the port's formats (not png or ps). All 15 rows equal native.
- **Impact**: a C test that needs `-n` can only be ported as its non-`-n` variant today.
- **Confidence**: High

## Cleanup candidates (other files, not done here)
- `fmax` / `fmin` exist in `src/common/emit-bb.ts` (now exported for `svg-graph.ts`) and as
  `fmaxf` / `fminf` in `src/layout/neato/quad-prog-solve.ts`; `src/common/arith.ts` is the
  natural home for one copy.
- The always-true `edge_in_box` re-tests in `src/render/svg.ts` and `src/render/dot.ts`.
