# API reference

The public surface is intentionally small. Most callers only need `renderSvg`.
See the [Overview](/guide/overview) for which entry point to use, [Types](/guide/types)
for the shapes each function consumes and returns, and the generated
[Reference](/reference/) for exhaustive signatures, every field, and every
overload.

> Type declarations (`.d.ts`) are emitted by `npm run build` (the `build:types`
> step runs `tsc -p tsconfig.build.json`). The `package.json` `exports` map
> wires `types` conditions for each entry, so `@knowvah/dot-engine`, `@knowvah/dot-engine/api`,
> and `@knowvah/dot-engine/render` all resolve types in editors and downstream builds.
>
> The build also emits declaration maps (`.d.ts.map`) and JS source maps, and
> the package ships its `src/` sources — so "go to definition" jumps straight
> to the real TypeScript, making it easy to read the code and open a PR.

This page is organized by the three entry points ([Overview](/guide/overview)
covers when to reach for each): the root `@knowvah/dot-engine` package (parse + render
in one call, plus process-global configuration), `@knowvah/dot-engine/api` (build a
graph in code, read back computed geometry), and `@knowvah/dot-engine/render`
(multi-format output and raw draw-ops). Every function below re-exports from
the root package too (`export * from './api/index.js'` /
`export * from './render/index.js'` in `src/index.ts`) — importing everything
from `@knowvah/dot-engine` works, but the sub-path imports are more explicit about
which layer you're touching.

## `@knowvah/dot-engine` (root)

### `renderSvg`

```ts
function renderSvg(dotSource: string, engine: EngineName): string;
```

Parses the DOT source, runs the named [layout engine](/guide/engines), renders
to SVG, and returns the SVG string. This is the one-call convenience wrapper:
it constructs a `GvcContext`, registers the eight built-in engines and the SVG
renderer, lays out, renders, and frees the layout — see
[`GvcContext` / `renderWithContext`](#gvccontext-renderwithcontext) below if
you need those steps separated.

- **`dotSource`** — DOT-language graph source.
- **`engine`** — `EngineName`: one of the built-ins (`dot`, `neato`, `fdp`,
  `sfdp`, `circo`, `twopi`, `osage`, `patchwork`) or any custom-registered name.
- **Throws** a `DotEngineError` for any problem with the input: `ParseError` if
  `dotSource` is invalid, `RenderError` if layout or rendering fails,
  `InternalError` (with `cause`) for a dot-engine bug. A `TypeError` with
  `code` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` if `dotSource` or
  `engine` is invalid (including an engine name that is not registered). See
  [Errors and exceptions](/guide/errors).

Full signature, JSDoc, and the `GvError` field list: [Reference](/reference/).

### `tryRenderSvg` / `RenderResult`

```ts
function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult;
```

Result-style sibling of `renderSvg`. Returns (never throws) for any DOT input:
`{ svg }` on success or `{ errors: [one] }` on the first failure; `svg` and
`errors` are mutually exclusive. It throws only for invalid arguments (`TypeError`
`ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`). Each entry in `errors` is
plain, JSON-serializable data (`type`, `code`, `message`, `friendlyMessage`, plus
`location` / `expected` when present; no `cause`, no stack trace), so it's safe to
send across a worker/postMessage boundary or serialize into a log. Prefer this over
`renderSvg` + `try`/`catch` when the caller wants to branch on `code` / `type`
rather than catch an exception. See [Errors and exceptions](/guide/errors).
[Reference](/reference/).

### `parse` / `ParseError`

```ts
function parse(dotSource: string): Graph;
```

Parses DOT into the in-memory graph model **without** laying it out. Useful
for inspecting or transforming the graph — or handing it to `@knowvah/dot-engine/api`'s
`getLayout` / `@knowvah/dot-engine/render`'s `render` — before rendering.

- **Throws** `ParseError` for syntax errors or edge-direction violations (e.g.
  `->` in an undirected graph). `ParseError` extends `DotEngineError` and
  implements `GvError` with `type: 'syntax'`; it carries a
  `location: { line, column, offset? }`. `TypeError` `ERR_INVALID_ARG_TYPE` if
  `dotSource` is not a string. [Errors and exceptions](/guide/errors),
  [Reference](/reference/).

### `DotEngineError` / `RenderError` / `InternalError`

```ts
abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;
}
class RenderError extends DotEngineError {
  readonly type: 'render' | 'semantic';
  readonly code: GvErrorCode; // 'RENDER_ERROR' | 'UNKNOWN_LAYOUT' | 'UNSUPPORTED_FEATURE'
}
class InternalError extends DotEngineError {
  readonly type: 'render';
  readonly code: 'INTERNAL_ERROR';
}
function isGvError(e: unknown): e is GvError;
```

`instanceof DotEngineError` means dot-engine failed on this input. `RenderError`
covers known layout/render failures (`type` is `semantic` for `UNKNOWN_LAYOUT` and
`UNSUPPORTED_FEATURE`). `InternalError` is a dot-engine bug; `cause` holds the
original error when one was wrapped. Caller mistakes throw a standard `TypeError`
/ `RangeError` / `Error` with a `code` instead. `isGvError` checks for a string
`type` and `code`, so it works across duplicate bundles. See
[Errors and exceptions](/guide/errors) for every code and what each function can
throw, [Types](/guide/types) for the `GvError` shape, and
[Reference](/reference/) for `GvErrorCode`'s member list.

### `setTextMeasurer` / `getTextMeasurer`

```ts
function setTextMeasurer(measurer: TextMeasurer | null): void;
function getTextMeasurer(): TextMeasurer;
```

Registers (or clears, with `null`) the process-global text measurer consulted
during layout to size labels. Clearing falls back to the library default
(browser: `CanvasTextMeasurer`; headless/Node: `EstimateTextMeasurer`, unless a
LUT measurer is wired — see [Text measurement](/guide/text-measurement) for the
full resolution order and the `CanvasTextMeasurer` / `EstimateTextMeasurer` /
`LutTextMeasurer` implementations exported alongside these functions).
[Reference](/reference/).

### `setImageSizer` / `setImageResolver`

Two related, but distinct, image-configuration seams — both process-global
registries mirroring the same pattern (register a callback, pass `null` to
clear), both no-ops until a caller registers one:

- **`setImageSizer`** — reports an external image's *intrinsic dimensions* so
  the layout engine can reserve space for an HTML `<IMG>` cell or a node
  `image=` attribute before rendering. Returning `null` (or leaving no sizer
  registered) reproduces native Graphviz's missing-image behavior: a warning
  and zero size.
- **`setImageResolver`** (new — see [`inlineImages`](#inlineimages) below) —
  supplies the actual image *bytes* so the SVG renderer can inline them as a
  `data:` URI instead of emitting `xlink:href="src"` as a raw passthrough.

```ts
type ImageSizer = (src: string) => { w: number; h: number } | null;
function setImageSizer(sizer: ImageSizer | null): void;

type ImageResolver = (
  src: string,
) => { bytes: Uint8Array; mime?: string } | Uint8Array | null;
function setImageResolver(fn: ImageResolver | null): void;
```

`ImageResolver` may return a bare `Uint8Array` (MIME inferred from `src`'s file
extension — `.png`, `.jpg`/`.jpeg`, `.gif`, `.svg`, `.webp`; anything else
falls back to `application/octet-stream`) or `{ bytes, mime }` to set the MIME
type explicitly. Return `null` when `src` can't be resolved — the renderer
falls back to the raw `src` passthrough, same as no resolver being registered.
Registering a resolver has no effect by itself; it's consulted only when
`render`'s `inlineImages` option is `true` (below). See
[Working with images](/guide/images) for a worked example and
[Reference](/reference/) for both callback types.

### `renderSvgAsync` / `renderSvgInto`

```ts
function renderSvgAsync(
  dotSource: string,
  engine: EngineName,
  opts?: AsyncSvgOptions,
): Promise<{ svg: string; fontIssues: FontIssue[] }>;

function renderSvgInto(
  id: string,
  src: string,
  engine: EngineName,
  opts?: RenderSvgIntoOptions,
): Promise<{ element: SVGSVGElement; fontIssues: FontIssue[] }>;

type FontIssue = { face: string; reason: 'failed' | 'timeout' };
type AsyncSvgOptions = Omit<AsyncRenderOptions, 'engine'>;
interface RenderSvgIntoOptions extends AsyncSvgOptions {
  sanitize?: (svg: string) => string;
  trusted?: boolean;
  document?: Document;
}
```

`renderSvgAsync` is the async counterpart of `renderSvg`: it prefetches the web
fonts and image data the graph needs, then lays out and renders. `renderSvgInto`
renders and replaces the children of the element with id `id`, sanitizing the SVG
by default (`trusted: true` skips it; `sanitize` replaces the built-in scrubber).
Failures, including bad arguments, are promise rejections with the same error
classes as `renderSvg`; a missing element id rejects with `ERR_INVALID_ARG_VALUE`.
Font problems never reject; they come back in `fontIssues`. See
[Browser usage](/guide/browser) and [Images](/guide/images), and
[Reference](/reference/).

### `GvcContext` / `renderWithContext`

```ts
class GvcContext {
  constructor(measurer: TextMeasurer, options?: { debug?: DebugOptions });
  register(plugin: LayoutEngine | RendererPlugin): void;
  layout(g: Graph, engineName: EngineName): void;
  freeLayout(g: Graph, engineName: EngineName): void;
}

function renderWithContext(ctx: GvcContext, g: Graph, format: string): string;
```

Lower-level orchestration for callers that need to drive layout and rendering
as separate steps. `renderSvg` is a convenience wrapper over exactly this:
construct a context, register engines/renderers, `layout`, `renderWithContext`,
`freeLayout`. Reach for these directly only when you need that control — for
example, to register a subset of engines, add a custom `LayoutEngine` or
`RendererPlugin`, or render the same laid-out graph to multiple formats
without re-running layout (call `layout` once, then `renderWithContext` for
each format, then `freeLayout`). [Reference](/reference/).

## `@knowvah/dot-engine/api`

Programmatic construction, safe edge insertion, and computed-geometry readout
— the layer for building a graph without hand-writing DOT text and reading its
layout back as plain data. See [Types](/guide/types) for `LayoutSnapshot` and
its nested shapes.

### `createGraph`

```ts
function createGraph(opts?: {
  directed?: boolean;
  strict?:   boolean;
  name?:     string;
}): GvGraphBuilder;
```

Creates a fresh graph ready for handoff to `render` / `getLayout` /
`getDrawOps`. Defaults: `directed: true`, `strict: false`, `name: ''`. Returns
a `GvGraphBuilder` — `addNode`, `addEdge`, `addSubgraph`, `setAttr`/`getAttr`,
`setHtmlAttr` (for HTML-table labels), and a `.graph` property exposing the
opaque `Graph` handle. See [Build a graph in code](/guide/build-a-graph) and
[Reference](/reference/) for the full `GvGraphBuilder`/`GvNode`/`GvEdge`
interfaces.

### `addEdge`

```ts
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
```

Lower-level edge-insertion helper underlying `GvGraphBuilder.addEdge` —
exported directly for callers working with the internal `Node`/`Edge`
references (e.g. edges added onto a graph returned by `parse()`) rather than
the builder's opaque `GvNode`/`GvEdge` handles. Most callers should use
`createGraph(...).addEdge(tail, head, attrs?)` instead.

- **`name`** — edge key; defaults to `''` (anonymous). Ignored for strict-graph
  dedup, which matches on `(tail, head)` alone (symmetric for undirected
  graphs).
- **Returns** the new edge, or the existing one if `g` is strict and a
  `(tail, head)` edge already exists (mirrors `agedge` with `cflag=1`).

See [Build a graph in code](/guide/build-a-graph) and
[Reference](/reference/).

### `getLayout`

```ts
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;
```

Returns a plain, JSON-serializable snapshot of the graph's computed geometry —
node positions, edge spline control points, edge labels, cluster bounding
boxes, and the overall graph bounds — all in points.

- **`g`** — must already be laid out (via `render(g, ...)`, `getDrawOps(g)`, or
  `ctx.layout(g, engine)`); calling `getLayout` on a not-yet-laid-out graph
  throws rather than silently returning all-zero geometry.
- **`opts.yAxis`** — default `'down'`: screen coordinates, origin top-left, y
  increases downward, and `bounds` is normalized to `(0, 0)`. `'up'` returns
  native Graphviz coordinates (origin bottom-left, y increases upward) with
  `bounds.x`/`bounds.y` at the raw lower-left corner.
- **Throws** `Error` with `code` `ERR_INVALID_STATE` if `g` has not been laid
  out; `TypeError` `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` for a bad `g`
  or `opts`. See [Errors and exceptions](/guide/errors).

Node `width`/`height` are converted to points (the internal model stores
inches); every other coordinate is already in points. See
[Read computed geometry](/guide/geometry) for the coordinate-system writeup
and [Types](/guide/types) / [Reference](/reference/) for the full
`LayoutSnapshot`, `NodeGeometry`, `EdgeGeometry`, `ClusterGeometry`, and
`BoundsGeometry` field lists.

### `Graph`

Opaque handle type re-exported from the internal model. Only the *type* is
exposed (not the mutable class) — annotate a variable holding a builder's
`.graph` or a `parse()` result with it, but don't construct or inspect its
fields directly; use the builder, `getLayout`, or `getDrawOps` to read state
back out. [Reference](/reference/).

## `@knowvah/dot-engine/render`

Multi-format output and raw draw-op access — the layer for rendering an
already-`parse`d or builder-constructed graph.

### `render`

```ts
function render(
  g:      Graph,
  format: OutputFormat,
  opts?:  RenderOptions,
): string;
```

Lays out and renders a graph to the requested format string.

- **`format`** — `OutputFormat`: `'svg' | 'dot' | 'xdot' | 'json' | 'plain' |
  'plain-ext' | 'imap' | 'cmapx'`.
- **`opts.engine`** — layout engine (default `'dot'`).
- **`opts.inlineImages`** — see [below](#inlineimages).
- **Throws** `RenderError` on layout or render failure; `InternalError` on a
  dot-engine bug; `TypeError` with a `code` for invalid arguments (including an
  unregistered engine or format). See [Errors and exceptions](/guide/errors).

`opts.engine` mirrors `renderSvg`'s `engine` parameter; `format` is the axis
`renderSvg` doesn't expose (`renderSvg` is hardcoded to `'svg'`). See
[Render to other formats](/guide/render-formats) and [Reference](/reference/)
for the full `OutputFormat` union and `RenderOptions` shape.

#### `inlineImages`

`RenderOptions.inlineImages` (default `false`) inlines external images as
`data:` URIs instead of the raw `xlink:href="src"` passthrough. It has no
effect unless a resolver is registered via `setImageResolver` (above) — and no
effect on non-SVG formats. Unset, output is byte-identical to before this
option existed.

```ts
import { setImageResolver } from '@knowvah/dot-engine';
import { render } from '@knowvah/dot-engine/render';
import { parse } from '@knowvah/dot-engine';

setImageResolver((src) => {
  // Return the bytes for any src your DOT source references via
  // `image="..."` or an HTML <IMG SRC="...">; null for anything else.
  if (src === 'logo.png') return fetchLogoBytesSync(); // Uint8Array
  return null;
});

const g = parse('digraph { a [image="logo.png" shape=none label=""]; }');
const svg = render(g, 'svg', { inlineImages: true });
// svg now embeds `xlink:href="data:image/png;base64,..."` for the `a` node
// instead of `xlink:href="logo.png"`.
```

See [Working with images](/guide/images) for the full guide, including
resolving from `fetch` in the browser and from the filesystem in Node.

### `renderAsync`

```ts
function renderAsync(
  g:      Graph,
  format: OutputFormat,
  opts?:  AsyncRenderOptions,
): Promise<{ output: string; fontIssues: FontIssue[] }>;

interface AsyncRenderOptions extends RenderOptions {
  imageSizer?: (src: string) => Promise<{ w: number; h: number } | null>;
  imageResolver?: (
    src: string,
  ) => Promise<{ bytes: Uint8Array; mime?: string } | Uint8Array | null>;
  fontTimeoutMs?: number; // default 3000
  fontSet?: FontSetLike;  // default document.fonts when present
}
```

Async counterpart of `render`: same formats and `engine`/`inlineImages` options,
plus per-call async image hooks and font prefetch. Each image hook runs at most
once per distinct `src`; a throw or reject is a miss. Output is unsanitized
markup for the markup formats; see the README "Security" section.

### `getDrawOps` / `DEFAULT_DRAW_ENGINE`

```ts
const DEFAULT_DRAW_ENGINE: EngineName; // 'dot'

function getDrawOps(g: Graph, opts?: { engine?: EngineName }): XdotOp[];
```

Lays out `g`, renders to xdot, and returns a flat, typed draw-op array — node
shapes, text spans, colors, and fonts as discriminated-union values (narrow on
`op.kind` in a `switch`) — for feeding a custom canvas/WebGL/PDF renderer
without touching SVG or xdot's string encoding. `opts.engine` defaults to
`DEFAULT_DRAW_ENGINE` (`'dot'`).

- **Throws** `ParseError` if the intermediate xdot output can't be re-parsed
  (a dot-engine bug; not expected in practice); `RenderError` on layout/render
  failure; `InternalError` on any other dot-engine bug; `TypeError` with a
  `code` for invalid arguments. See [Errors and exceptions](/guide/errors).

See [Custom rendering with xdot draw-ops](/guide/xdot-drawops) for the op-kind
list and a worked canvas example, and [Types](/guide/types) /
[Reference](/reference/) for the full `XdotOp` union and `Xdot`/`XdotColor`
shapes.
