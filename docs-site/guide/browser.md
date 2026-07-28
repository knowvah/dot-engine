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

## External images: `setImageSizer`

When a graph references an external image (e.g. `node [image="logo.png"]`),
Graphviz needs that image's intrinsic dimensions. Because the library cannot
read the filesystem, you supply a sizer:

```ts
import { setImageSizer } from '@knowvah/dot-engine';

setImageSizer((src) => {
  // Return the intrinsic { w, h } for this image source, or null if unknown.
  return { w: 64, h: 64 };
});
```

If your graphs never reference external images, you do not need to call this.

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
