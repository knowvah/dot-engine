# Async render API — design proposal

Status: **Proposed** (not scheduled). Date: 2026-10-01.

## Question

Should dot-engine expose an async API, and does text measurement force the
API to stay synchronous?

## Findings (current state)

- The pipeline is synchronous end to end, matching the C. Nothing in `src/`
  (outside tests) is `async` or returns a `Promise`.
- All three host hooks are synchronous callbacks invoked deep inside layout
  or emit:
  - `TextMeasurer.measure()` — per-context; `createDefaultContext()` does
    `new GvcContext(createMeasurer())` (`src/gvc/default-context.ts:44`).
  - `ImageSizer` — process-global via `setImageSizer`
    (`src/gvc/usershape.ts`), but HTML `<IMG>` sizing already accepts a
    per-call override (`env.imageSizer`, `src/common/htmltable.ts:226`).
  - `ImageResolver` — process-global only, consulted at SVG emit when
    `RenderOptions.inlineImages` is set (`src/gvc/image-resolver.ts:80`).
- Node-level `image=`/`shapefile=` is **not** sized by any hook: the port
  models the headless oracle (box at normal dims,
  `src/common/shapes.ts:bindShape`). Only HTML `<IMG>` consults a sizer.

## Answer

Measurement does **not** require a sync *public* API — browser canvas
`measureText` is itself synchronous. What sync forbids is *waiting* on the
inputs measurement depends on:

1. **Web fonts.** An unloaded `@font-face` family measures as the fallback
   font. Layout bakes the wrong widths in; there is no reflow afterwards.
   Nothing in `src/` consults `document.fonts`.
2. **Image dimensions.** Browsers only expose intrinsic size asynchronously
   (`Image.onload`, `fetch` + `createImageBitmap`). A sync `ImageSizer` works
   only if the host already knows the sizes.
3. **Main-thread blocking.** Large layouts freeze the UI; moving work to a
   Worker makes the call boundary async by construction.

## Decisions

### D1 — The core stays synchronous

Making `measure()` return a `Promise` colors every function from the layout
entry down to label sizing as `async`. That violates "keep function
boundaries / do not reorder logic", adds a microtask per call in hot loops,
and buys nothing: every async input can be resolved before layout starts.

### D2 — Prefetch, then run the sync pipeline

```ts
renderSvgAsync(src: string, engine: EngineName, opts?: {
  imageSizer?: (src: string) => Promise<{ w: number; h: number } | null>;
  imageResolver?: (src: string) =>
    Promise<{ bytes: Uint8Array; mime?: string } | Uint8Array | null>;
  fontTimeoutMs?: number;
}): Promise<string>
```

1. `parse()` (sync).
2. Collect resources from the graph:
   - fonts: `fontname`/`fontsize` on root, clusters, nodes, edges (incl.
     head/tail/xlabel), plus HTML-label `<FONT FACE/POINT-SIZE>` and `<B>`/
     `<I>` variants;
   - images: HTML `<IMG SRC>` (sizing) and, when `inlineImages`, `image=`/
     `<IMG SRC>` (bytes).
3. `await Promise.all` of:
   - `document.fonts.load(<css font shorthand>)` per distinct face/variant,
     bounded by `fontTimeoutMs`;
   - the async sizer/resolver per distinct src, results cached in `Map`s.
4. Build a fresh `GvcContext` with a canvas measurer and **sync** closures
   over the Maps, then run the existing `layout → render → freeLayout`.

Purely additive: no ported C function changes, `renderSvg` is untouched.

### D3 — Per-render hooks, not global swaps

Concurrent `renderSvgAsync` calls must not race on module globals.
- Measurer: already per-context — no change.
- Sizer: thread the Map-backed sizer through the existing `env.imageSizer`
  path rather than `setImageSizer`.
- Resolver: needs a per-context resolver (context field consulted before the
  global in `findImageBytes`). This is the one new seam.

(Swapping globals immediately before the sync section would be safe —
nothing interleaves inside a synchronous run — but it leaks hook state to
any sync render the host triggers from a callback. Per-context is cleaner.)

### D4 — Font naming must be shared with the measurer

The prefetch step must translate Graphviz font names to CSS exactly as the
measurer does, or it preloads a face the measurer never asks for. Today
`CanvasTextMeasurer` passes the raw Graphviz name into `ctx.font`
(`src/common/textmeasure.ts:287`), so PostScript names (`Times-Roman`) and
unquoted multi-word names silently fall back. That is fixed separately
(see `plans/canvas-font-mapping/`); this design depends on its mapping
function.

### D5 — Worker support (implemented 2026-10-03)

`createMeasurer()` gates canvas use on `document`, so inside a Worker it
falls back to `EstimateTextMeasurer`. Adding an `OffscreenCanvas` branch,
plus `self.fonts` for preloading, would make Worker renders host-faithful.
Implemented: `createMeasurer` uses an `OffscreenCanvas` 2d context when there
is no `document`, and the async API's default font set falls back to
`self.fonts`. Verified in Chromium 153 (module Worker, `FontFace` added to
`self.fonts`): web-font label 124.8 pt, same as the page. Chromium quirk: a
font string measured in a Worker before its face loads stays on the fallback
face afterwards, so Workers should render through the async API. Firefox and
Safari not verified.

## Open questions

1. API surface: `renderSvgAsync` beside `renderSvg`, an async twin of
   `render(g, format, opts)`, or both?
2. Font-load timeout policy: throw, warn-and-proceed, or fall back to
   `EstimateTextMeasurer`?
3. Should a failed `fonts.load` (unknown family) be distinguishable from a
   timeout in the result?

## Rollback

Additive API + one optional context field. Removing it means deleting the
new entry point and the field; no data model or existing contract changes.

## Owner decisions (2026-10-03)

Status: **Implemented** on feature/async-api (see plans/async-api/README.md).

1. **API surface: both.** `renderSvgAsync(src, engine, opts)` and an async
   twin of `render`: `renderAsync(graph, format, opts)`.
2. **Font timeout: warn and proceed.** Lay out with what the canvas measures
   at the deadline; `console.warn` names the face.
3. **Font errors: structured result.** The async calls return
   `{ svg | output, fontIssues: [{ face, reason: 'failed' | 'timeout' }] }`
   instead of a bare string.
4. **Div example: exported helper.** Ship `renderSvgInto(id, src, engine,
   opts)` in the library (DOM-coupled; browser only), plus docs. It must
   respect the README Security section (sanitize before inserting).
5. D4 dependency met: `canvasFont` (`src/common/css-font.ts`) is on
   `feature/v2-silent-gaps` and `main`.
