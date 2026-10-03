# Browser usage

@knowvah/dot-engine uses no Node-only APIs and is safe to bundle for the browser. This
page covers the two things to know when running client-side.

## Bundling

The library is plain ES modules. Any modern bundler (Vite, esbuild, Rollup,
webpack) can include it. There are no runtime dependencies to externalize and no
WASM artifacts to host.

```ts
import { renderSvg } from '@knowvah/dot-engine';

const svg = renderSvg('digraph { a -> b }', 'dot');
document.querySelector('#out')!.innerHTML = svg;
```

This very site's [playground](/playground) does exactly that — it imports the
engine and calls `renderSvg` in the browser, with no server round-trip.

## Text measurement

Graphviz needs text dimensions to size labels. @knowvah/dot-engine handles this
automatically:

- **In the browser** (when `document` exists), it measures text with the
  native `<canvas>` 2D context — host-faithful, since it's the same font the
  browser renders the SVG with.
- **In Node**, it defaults to the built-in **Estimate** measurer — a
  deterministic, headless-safe model that mirrors Graphviz's own
  `estimate_textspan_size`. No `canvas` install or font files are required to
  get correct layout in Node; a hinted lookup-table (LUT) measurer is also
  available as an opt-in for closer host-faithful sizing without a native
  canvas dependency. See [Text measurement](/guide/text-measurement) for how
  to select a measurer explicitly.

No font files are required for layout in any case.

## Web fonts: why prefetching matters

Label sizes come from measuring text with a font. If a face is declared with
`@font-face` but has not finished loading, the browser measures with the
**fallback** font instead, and the layout is wrong once the real font arrives.
Measured in Chromium with JetBrains Mono: a label box was **70.68 pt** wide when
measured before the face loaded (fallback) and **124.8 pt** after it loaded.

The async entry points (`renderSvgAsync`, `renderAsync`, `renderSvgInto`) avoid
this: they collect the fonts the graph will request, load them through
`document.fonts`, and only then run layout. `renderSvgAsync` produced the
same 124.8 pt as measuring after load.

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { node [fontname="JetBrains Mono"]; a -> b }',
  'dot',
  { fontTimeoutMs: 5000 },
);
```

- **`fontTimeoutMs`** (default `3000`) is one deadline shared by all faces, not
  per face.
- **`fontIssues`** is a list of `{ face, reason }`. `reason: 'failed'` means the
  face errored (for example a 404) or its load rejected; `reason: 'timeout'`
  means it had not loaded within `fontTimeoutMs`. In both cases layout proceeds
  with a fallback font. Each issue is also `console.warn`ed. Font problems never
  reject the promise.
- **Limitation:** only families declared with `@font-face` can be reported.
  A system font or an unknown family name resolves as "loaded" (there is nothing
  to wait for), so a misspelled `fontname` is never listed in `fontIssues`.
- **Node and Workers** have no `document.fonts`, so font prefetch is skipped and
  `fontIssues` is `[]`. Image hooks still work. You can pass a `fontSet`
  (anything with `load(font)`) to supply your own.

## Rendering into a page: `renderSvgInto`

```ts
import { renderSvgInto } from '@knowvah/dot-engine';

// <div id="graph"></div>
const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');
if (fontIssues.length > 0) {
  console.warn('fallback fonts used for', fontIssues.map((i) => i.face));
}
```

It replaces the children of the element with the given id by the rendered
`<svg>` (returned as `element`), using `DOMParser` and `importNode`, never
`innerHTML`. A missing id rejects with `ERR_INVALID_ARG_VALUE`. The SVG is
scrubbed by default; pass `sanitize` to use your own sanitizer or `trusted: true`
to skip sanitizing. See the README "Security" section for what the scrubber
removes and keeps, and keep a Content-Security-Policy in place.

## External images: `setImageSizer`

When an HTML-like label contains an external image
(`<IMG SRC="logo.png"/>`), Graphviz needs that image's intrinsic dimensions to
size the cell. (A node's `image=` attribute is not sized: the node keeps its
normal box, as in headless native Graphviz.) Because the library cannot
read the filesystem, you supply a sizer:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

If your graphs never reference external images, you do not need to call this.
To size images asynchronously (for example by loading them), pass an async
`imageSizer` to `renderSvgAsync` instead; see [Images](/guide/images).

## Web Workers

Layout runs synchronously, so a large graph blocks the thread it runs on. Run
it in a Worker to keep the page responsive. Inside a Worker there is no
`document`, so the library measures text with an `OffscreenCanvas` and the
async API loads fonts through the Worker's own font set (`self.fonts`).

Fonts in a Worker are separate from the page's: register them in the Worker
with the `FontFace` API (CSS `@font-face` rules don't reach Workers).

```ts
// graph-worker.ts (module worker)
import { renderSvgAsync } from '@knowvah/dot-engine';

self.fonts.add(new FontFace('Inter', 'url(/fonts/Inter.woff2)'));

self.onmessage = async (e: MessageEvent<string>) => {
  const { svg, fontIssues } = await renderSvgAsync(e.data, 'dot');
  self.postMessage({ svg, fontIssues });
};
```

Render with `renderSvgAsync` (or `renderAsync`) in a Worker, not `renderSvg`,
at least until each web font has loaded. Chromium keeps measuring a font string
with the fallback face if that exact string was measured in the Worker before
the face loaded, even after it loads; the async API loads fonts before it
measures, so it never hits this.

## What not to expect

The library targets **SVG** (plus `json` / `xdot` / `dot` / imagemap text
formats). Raster output (PNG/JPG), PostScript/PDF, and interactive/GUI backends
are out of scope — convert the SVG downstream if you need another format. See
[Known divergences](/divergences) for the full scope boundary.

## Large graphs: pre-render to SVG

Very large graphs — roughly **>10k nodes or a few MB of DOT source** — are
impractical to lay out at runtime in the browser. Layout (mincross, ranking,
spline routing) is superlinear, so this is a **scale ceiling shared with
upstream Graphviz, not a limitation specific to this engine**: on such inputs
native `dot`, the WASM builds (`@hpcc-js/wasm-graphviz`), and this engine all
time out or run out of memory alike. (This engine does **not** leak — its
per-render heap is flat; the limit is strictly graph size. See the
[performance dashboard](/perf) for the measured comparison.)

For graphs at that scale, **render once at build time and serve the resulting
`.svg`** rather than laying out in the browser on every view — the same pattern
you would use even with native `dot`, since it is too slow to run per request.

The build-time site adapters in
[knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) (published on NPM)
do exactly this:

- `@knowvah/vitepress-plugin-dot` — VitePress (markdown-it), build-time
- `@knowvah/eleventy-plugin-dot` — Eleventy (markdown-it), build-time
- `@knowvah/docusaurus-plugin-dot` — Docusaurus (MDX/remark), build-time
- `@knowvah/dot-markdown-it` — framework-agnostic markdown-it integration

For dynamic, user-supplied graphs where build-time rendering is not an option,
keep interactive rendering to reasonably sized graphs and cache the emitted SVG.
