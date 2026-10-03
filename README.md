<!-- SPDX-License-Identifier: EPL-2.0 -->

# @knowvah/dot-engine

A faithful TypeScript port of [Graphviz](https://graphviz.org/) — the
graph-visualization toolkit that originated at AT&T Bell Labs (a foundational
technical report dates to 1991). It parses the
[DOT language](https://graphviz.org/doc/info/lang.html), runs Graphviz's layout
engines, and emits SVG. Ported line-by-line from the canonical
[C source](https://gitlab.com/graphviz/graphviz); see
[Graphviz on Wikipedia](https://en.wikipedia.org/wiki/Graphviz) for background.

The defining property: **pure TypeScript — no C.** No compiled Graphviz binary, no WASM build of it, no native dependencies.
It runs in a browser or in Node with zero external dependencies at runtime. The
goal is the closest achievable fidelity to the C implementation, which is treated
as the canonical specification (see [`CLAUDE.md`](./CLAUDE.md)). In practice the
`dot` engine is **conformant** with the C binary on the golden corpus: numeric
coordinates agree to a tight deterministic tolerance (±0.01) and non-numeric
content is exactly equal. This is the measured "match" bar, not a claim of
literal byte-for-byte SVG output — see [Conformance](./docs/conformance.md) for
the exact definition and the comparison code, and
[known divergences](./docs/known-divergences.md) for the documented exceptions.

> **Status: published and semver-stable from 1.0.0.** The public API —
> `renderSvg`, `/api`, `/render` — follows semver: a breaking change gets a
> major bump. The version line does **not** track C feature coverage, and the
> two are independent signals.
>
> The rendering surface is settled: parsing, all eight layout engines, SVG,
> and the `json` / `xdot` / `dot` / `plain` / imagemap text formats. It does
> not cover the whole C feature surface, and the remainder is **out of scope
> rather than pending** — the unported C areas stay inventoried in the
> [port catalog](./plans/port-catalog/README.md) so you can check a specific
> feature before depending on it. The `dot` engine is the primary fidelity
> target. See [Status & coverage](#status--coverage) below.

## Why this exists

Existing ways to render DOT in a JS environment shell out to a Graphviz
binary, a rendering server, or a WASM build — none of which run everywhere a
browser does, and all of which add deployment friction. @knowvah/dot-engine removes
that dependency entirely: the layout engine *is* TypeScript.

## Install

```bash
npm i @knowvah/dot-engine
```

Ships as ESM bundles with TypeScript declarations, zero runtime dependencies.
Entry points: `@knowvah/dot-engine` (core), `@knowvah/dot-engine/api` (graph-building API),
`@knowvah/dot-engine/render` (renderers).

To build from source instead: clone, `npm install`, `npm run build`
(esbuild bundles + `.d.ts` declarations into `dist/`).

## Quick start

```ts
import { renderSvg } from '@knowvah/dot-engine';

const dot = `
  digraph {
    a -> b;
    b -> c;
    a -> c;
  }
`;

const svg = renderSvg(dot, 'dot');
console.log(svg); // <svg ...>...</svg>
```

`renderSvg(dotSource, engine)` parses the DOT source, runs the named layout
engine, renders to SVG, and returns the SVG string. On failure it throws a
structured error — see [Error handling](#error-handling).

## Error handling

dot-engine raises two kinds of error:

- `err instanceof DotEngineError` — dot-engine failed on this input: bad DOT
  (`ParseError`), a layout/render failure (`RenderError`, including
  `UNKNOWN_LAYOUT` and `UNSUPPORTED_FEATURE`), or a dot-engine bug
  (`InternalError`).
- A standard `TypeError` / `RangeError` / `Error` with `code: 'ERR_…'` — the call
  was wrong (bad argument type, unregistered engine, wrong call order).

Branch on `.code`, not on message text. For a result-style alternative that does
not throw for bad DOT, use `tryRenderSvg`:

```ts
import { tryRenderSvg } from '@knowvah/dot-engine';

const result = tryRenderSvg('digraph { a ->', 'dot');
if (result.svg !== undefined) {
  // success
} else {
  const err = result.errors?.[0];
  console.error(err?.code, err?.friendlyMessage, err?.location);
  // 'SYNTAX_UNEXPECTED_EOF' · 'The DOT source ended unexpectedly …' · { line, column, offset }
}
```

`tryRenderSvg` returns for any DOT input and throws only for invalid arguments.
Each entry in `errors` is plain data (`type`, `code`, `message`,
`friendlyMessage`, plus `location` / `expected` when present) with no `cause` and
no stack.

Every code, class, and the exceptions each public function can throw:
[Errors and exceptions](https://dot-engine.knowvah.com/guide/errors).

## Migrating to 2.0

2.0 changes which errors are thrown. Code that branches on `.code` keeps working
for DOT errors; the changes below are the ones that can affect callers.

| Situation | Before | After |
|-----------|--------|-------|
| `parse(non-string)` / `renderSvg(non-string, …)` | `ParseError` `GENERIC_ERROR` | `TypeError` `ERR_INVALID_ARG_TYPE` |
| Engine argument not registered | `RenderError` `RENDER_ERROR` | `TypeError` `ERR_INVALID_ARG_VALUE` |
| `tryRenderSvg` with invalid arguments (non-string source, unregistered engine) | Returned `{ errors: [...] }` (`GENERIC_ERROR` / `RENDER_ERROR`) | Throws `TypeError` (`ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE`) |
| Engine argument not registered, but the DOT sets a valid `layout=` | Rendered with the attribute's engine | `TypeError` `ERR_INVALID_ARG_VALUE` (the argument is checked first) |
| Format argument not registered (`render(g, 'pdf')`) | `RenderError` `RENDER_ERROR` | `TypeError` `ERR_INVALID_ARG_VALUE` |
| DOT `layout="foo"` unknown | `RenderError` `RENDER_ERROR` | `RenderError` `UNKNOWN_LAYOUT` (`type: 'semantic'`) |
| `render(null)` / `getDrawOps(null)` | `RenderError` ("Cannot read properties of null") | `TypeError` `ERR_INVALID_ARG_TYPE` |
| `getLayout(null)` / `addEdge(null, …)` | Raw `TypeError` (no code) | `TypeError` `ERR_INVALID_ARG_TYPE` |
| `getLayout` before layout | `RenderError` `GENERIC_ERROR` | `Error` `ERR_INVALID_STATE` |
| Builder fails to create a node or subgraph | `RenderError` `GENERIC_ERROR` | `InternalError` `INTERNAL_ERROR` |
| `ctx.layout` / `freeLayout` with a non-object `g` or non-string engine; `bestRenderer` with a non-string format | Incidental `TypeError` / generic `Error` | `TypeError` `ERR_INVALID_ARG_TYPE` |
| `getLayout(g, { yAxis: 'other' })` | Silently treated as y-up | `TypeError` `ERR_INVALID_ARG_VALUE` |
| `createGraph`, builder methods and handles with wrong argument types; `addEdge` with a non-string `name` | Accepted or coerced | `TypeError` `ERR_INVALID_ARG_TYPE` |
| `setImageSizer` / `setImageResolver` / `setTextMeasurer` with a wrong value | Accepted; failed later inside layout | `TypeError` `ERR_INVALID_ARG_TYPE` |
| Foreign throw inside layout or render (a bug) | `RenderError` `RENDER_ERROR`, original stack lost | `InternalError` `INTERNAL_ERROR`, `cause` is the original error |

Internal throw sites ported from Graphviz C keep the same condition and message;
only the class changes:

| Group | Before | After |
|-------|--------|-------|
| C `assert` / uncaught C++ `throw` sites (neato gts triangulation and multispline router, vpsc solver, ortho, label index, pack-components, fdp ports, twopi circle, gvc job) | `Error` | `InternalError` `INTERNAL_ERROR` |
| C `agerr` + `exit` sites (label rectangle-tree overflow, XML escape of malformed UTF-8) | `Error` | `RenderError` `RENDER_ERROR` |
| Graphviz features the port has not implemented (fdp overlap modes, sfdp `smoothing=` / `rotation=`, special shapes) | `Error` | `RenderError` `UNSUPPORTED_FEATURE` (`type: 'semantic'`) |
| gts constrained-Delaunay paths where C continues instead of failing | `Error` | No throw; behaviour now matches C |

Attributes that rendered an approximation in 1.x and now throw
`RenderError` `UNSUPPORTED_FEATURE`. The conditions are exact; the full list,
with every message, is the table in
[Errors and exceptions](./docs-site/guide/errors.md#unsupported-feature-reference):

| Engine | Attribute | Throws when |
|--------|-----------|-------------|
| neato | `mode=hier` | Always |
| neato | `mode=ipsep` | Only when Graphviz builds constraints (`diredgeconstraints`, `overlap=ipsep`, or a top-level cluster); otherwise unchanged |
| neato | `start=self` | `mode` is `major` or `ipsep` |
| neato | `model=subset` | `mode` is `major` or `KK` |
| neato | `model=circuit` | `mode` is `major`, or `KK` on a connected graph |
| neato, twopi, circo, sfdp | `overlap=voronoi` | 2+ nodes and Graphviz's own overlap count (node polygons, not bounding boxes) is above 0. circo: single-component graphs; sfdp: new in 2.0 (the mode was previously ignored); only when `overlap` is not a prism mode |
| fdp | `splines=compound` | Always |
| fdp | `overlap=` `voronoi`, `oscale`, `vpsc`, `ipsep`, `ortho*`, `portho*` | The mode is reached after the force-iteration tries |
| sfdp | `label_scheme=1`..`4` | A `\|edgelabel\|` node exists and Graphviz takes the edge-label path |
| sfdp | `quadtree=none` or `quadtree=fast` | Always |

Behaviour fixes. These render differently from 1.x because 1.x did not match
Graphviz; no code change is needed:

| Area | Before | After |
|------|--------|-------|
| dot `nslimit` | Ignored; network simplex ran to convergence | Caps the x-coordinate iterations, as Graphviz does |
| neato `start=regular` | Treated as random | Nodes start on a regular polygon, as Graphviz does |
| neato `start=randomN` | Only digit-led values were seeded | `N` seeds the generator, as Graphviz does |
| neato and fdp `inputscale` | Ignored | Divides user `pos` values (and fdp cluster `coords`); `0` or a negative value means 72, absent means no scaling |
| neato `mode=KK` | Ran stress majorization | Runs Kamada-Kawai, as Graphviz. A disconnected graph without `pack` or `packmode` is laid out whole, not packed |
| neato `mode=sgd` | Ran stress majorization | Runs stochastic gradient descent, as Graphviz; honours edge `len` and seeds from `start`. Graphviz seeds from the clock when `start` is unset, so set `start=<n>` for reproducible output |
| neato unknown `mode` value | Ignored without a message | Warns `Illegal value X for attribute "mode" in graph G - ignored` and runs `major`, as Graphviz |
| neato, twopi, circo, sfdp `overlap=oscale`, `ortho*`, `portho*` | Ignored; overlaps left in place | Removed, as Graphviz (`oscale` scales, the others run constraint-based removal) |
| neato `overlap=vpsc` | Gap of `nodesep/2` between nodes | Gap of `2*sep` (additive) or 2 x 4 pt, as Graphviz; output changes on every graph using this mode |
| sfdp `overlap=` any non-prism mode other than `voronoi` | Ignored except `scale` | Runs Graphviz's removal after layout (`voronoi` with overlapping nodes is now an error; see above) |
| fdp cluster `coords` set only on a subgraph | Ignored | Honoured, as Graphviz |
| `overlap=voronoi` with nodes that only touch by bounding box | `UNSUPPORTED_FEATURE` | Renders: the overlap test now uses node polygons, as Graphviz |
| `ctx.freeLayout(g, engine)` | Cleaned up with the engine argument | Cleans up with the engine that ran the layout |
| XML escaping in UTF-8 mode (no public API sets this mode) | Decoded UTF-16 units as UTF-8 bytes, so a character such as U+00FF raised `RENDER_ERROR` | Escapes by code point (`&#x1f600;`), matching Graphviz; a lone surrogate still raises `RENDER_ERROR` |
| fdp edges to cluster endpoints under spline routing (for example `splines=true`) | Drew line segments silently | Also prints the Graphviz warning (`splines and cluster edges not supported - using line segments`) |

New exports: `DotEngineError`, `InternalError`, `isGvError`, and the type
`UsageErrorCode`. `GvErrorCode` gains `INTERNAL_ERROR`, `UNKNOWN_LAYOUT` and
`UNSUPPORTED_FEATURE`.

## Layout engines

All eight Graphviz layout engines are registered. Pass the name as the second
argument to `renderSvg`:

| Engine       | Layout style                                  |
|--------------|-----------------------------------------------|
| `dot`        | Hierarchical / layered directed graphs        |
| `neato`      | Spring-model (Kamada–Kawai)                   |
| `fdp`        | Force-directed                                |
| `sfdp`       | Multiscale force-directed (large graphs)      |
| `circo`      | Circular                                      |
| `twopi`      | Radial                                        |
| `osage`      | Clustered                                     |
| `patchwork`  | Squarified treemap                            |

`dot` receives the most fidelity attention because the primary consumer is
DOT-centric. Per-engine coverage against the C source is tracked in the
[port catalog](./plans/port-catalog/README.md).

## Browser usage

The library uses no Node-only APIs and is safe to bundle for the browser. One
caller-supplied hook may be required:

- **Image sizing.** When a graph references external images (e.g.
  `node [image="foo.png"]`), Graphviz needs each image's intrinsic dimensions.
  Because the library cannot read the filesystem, provide a sizer via
  `setImageSizer`:

  ```ts
  import { setImageSizer } from '@knowvah/dot-engine';

  setImageSizer((src) => ({ w: 64, h: 64 })); // return null if unknown
  ```

### Rendering into a page

`renderSvgInto` renders DOT, **waits for the web fonts the graph uses**, and
replaces the children of an element with the resulting `<svg>`. Insertion goes
through `DOMParser` + `importNode` (never `innerHTML`) and the SVG is scrubbed by
default (see [Security](#security)).

```html
<div id="graph"></div>
<script type="module">
  import { renderSvgInto } from '@knowvah/dot-engine';

  const dot = 'digraph { node [fontname="JetBrains Mono"]; a -> b }';
  const { element, fontIssues } = await renderSvgInto('graph', dot, 'dot');

  for (const { face, reason } of fontIssues) {
    // reason is 'failed' (the face errored) or 'timeout' (not loaded within
    // fontTimeoutMs, default 3000). Layout used a fallback font for this face.
    console.warn(`font ${face}: ${reason}`);
  }
</script>
```

Fonts only need prefetching when they are declared with `@font-face`; an unloaded
face is measured as the fallback font and the labels come out the wrong size.
`fontIssues` never causes a rejection — it reports what could not be loaded.

To get the SVG string instead of inserting it, use `renderSvgAsync`. It also
accepts an **async** `imageSizer` (and `imageResolver`), awaited once per distinct
image before layout:

```ts
import { renderSvgAsync } from '@knowvah/dot-engine';

const { svg, fontIssues } = await renderSvgAsync(
  'digraph { a [label=<<TABLE><TR><TD><IMG SRC="logo.png"/></TD></TR></TABLE>>] }',
  'dot',
  {
    imageSizer: async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode(); // a rejection counts as "unknown size" (a miss)
      return { w: img.naturalWidth, h: img.naturalHeight };
    },
    fontTimeoutMs: 5000,
  },
);
```

### Text measurement

Layout needs to know how wide each label is. By default this uses a **built-in,
deterministic metric model** — no font files, identical output on every platform.
In the **browser** the library automatically measures with the page's own canvas
(the same font the browser renders the SVG with).

For **host-faithful** Node measurement (real kerning/shaping, matching the local
fonts the SVG will be rendered with), install the optional `canvas` peer and wire
it once via `setTextMeasurer`:

```ts
import { setTextMeasurer, CanvasTextMeasurer } from '@knowvah/dot-engine';
import { createCanvas } from 'canvas'; // optional peer: `npm i canvas`

setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d')));
```

Trade-off: the built-in model is reproducible across machines; the host-faithful
path matches the rendering font but is platform-dependent (as native graphviz is).
See the Text measurement guide for the full contract.

`CanvasTextMeasurer` accepts **any** 2D context that implements `font` +
`measureText().width` — the `canvas` package is one provider, not a requirement.
`@napi-rs/canvas` (prebuilt N-API binaries, no `prebuild-install`) works too:

```ts
import { createCanvas } from '@napi-rs/canvas';
setTextMeasurer(new CanvasTextMeasurer(createCanvas(0, 0).getContext('2d') as unknown as CanvasRenderingContext2D));
```

Pick the engine you **render** with: the two libraries resolve system fonts
differently (measured on macOS: `bold` Helvetica and Times/Courier substitution
diverge by 4–14% between them, while regular-weight Helvetica/Arial agree to
&lt;0.2%). "Host-faithful" means measuring with the same font stack that later
draws the text — mixing engines reintroduces the mismatch you opted in to avoid.

## Security

**Treat rendered output as attacker-controlled markup whenever the DOT source is
untrusted.** The SVG and image-map strings this library produces embed graph
attribute values (labels, `id`, `class`, `href`/`URL`, `image`, `stylesheet`,
tooltips) directly. All such values are XML-escaped exactly as native Graphviz
does, so they cannot break out of an element or attribute — but, **matching
upstream Graphviz, the library does not filter URL schemes or validate resource
origins.** A DOT source you did not author can therefore contain:

- `href="javascript:…"` / `URL="javascript:…"` on a node or edge (executes on
  click),
- `image="…"` (usershape) or an image-map `href` pointing at an arbitrary
  external origin,
- a `stylesheet="…"` referencing an external CSS origin.

This is deliberate — scheme/origin policy belongs to the page embedding the
output, not to the layout library. If you render untrusted DOT and embed the
result inline (`innerHTML`, `dangerouslySetInnerHTML`, an inline `<svg>`), apply
a **Content-Security-Policy** on the host page as the control point:

- `script-src` (without `'unsafe-inline'`) — neutralizes `javascript:` hrefs and
  any inline event handlers,
- `img-src` — constrains `<image>` / usershape origins,
- `style-src` — constrains the `stylesheet` processing instruction.

If you cannot set a CSP, sanitize the returned markup (e.g. DOMPurify with an
SVG profile) before inserting it, or render from trusted DOT only.

### `renderSvgInto` and the built-in scrubber

`renderSvgInto` sanitizes by default, so inserting untrusted DOT does not need
extra work for the common vectors. The built-in scrubber **removes**:

- `<script>` and `<foreignObject>` elements (with their subtrees),
- every `on*` event-handler attribute,
- `href` / `xlink:href` values using `javascript:` or `vbscript:`, and `data:`
  hrefs other than `data:image/*` on `<image>`,
- SMIL animations (`set`, `animate`, `animateMotion`, `animateTransform`) that
  target `href` or an event handler,
- `xml-stylesheet` processing instructions.

It **keeps** `http(s)` hrefs and image origins (they are normal, working links
and images) and `data:image/*` on `<image>`. Origin policy is therefore still
yours: it is a deny-list for the vectors this library's own output can carry,
**not** a replacement for a Content-Security-Policy, which remains recommended.

Options, in precedence order:

- `trusted: true` — insert exactly as rendered, no sanitizing. Only for DOT you
  authored.
- `sanitize: (svg: string) => string` — replace the built-in scrubber with your
  own, e.g. DOMPurify:

  ```ts
  import DOMPurify from 'dompurify';
  import { renderSvgInto } from '@knowvah/dot-engine';

  await renderSvgInto('graph', dot, 'dot', {
    sanitize: (svg) => DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } }),
  });
  ```

- neither — the built-in scrubber runs.

`renderSvgAsync` and `renderAsync` return raw markup and do **not** sanitize;
the caveats above apply to their output exactly as for `renderSvg`.

## Public API

```ts
// Primary entry point. Throws a DotEngineError (ParseError / RenderError /
// InternalError) for bad input, or a TypeError with a code for a bad call.
function renderSvg(dotSource: string, engine: string): string;

// Result-style entry point: returns { svg } or { errors: [GvError] } for any DOT
// input; throws only for invalid arguments.
function tryRenderSvg(dotSource: string, engine: string): RenderResult;

// Structured error contract (see "Error handling").
interface GvError { type; code; message; friendlyMessage; location?; expected?; }
interface RenderResult { svg?: string; errors?: GvError[]; }
type GvErrorType = 'syntax' | 'semantic' | 'render';
type GvErrorCode = 'SYNTAX_ERROR' | 'SYNTAX_UNEXPECTED_EOF' | /* …10 total */ 'GENERIC_ERROR';
type UsageErrorCode = 'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE' | 'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE';
abstract class DotEngineError extends Error implements GvError {}
class ParseError extends DotEngineError { /* type:'syntax' */ }
class RenderError extends DotEngineError { /* type:'render' | 'semantic' */ }
class InternalError extends DotEngineError { /* type:'render' */ }
function isGvError(e: unknown): e is GvError;

// Parse DOT into the in-memory graph model (without laying it out).
function parse(dotSource: string): Graph;

// Supply intrinsic dimensions for external image references (browser/Node).
function setImageSizer(sizer: ImageSizer | null): void;
type ImageSizer = (src: string) => { w: number; h: number } | null;

// Async counterparts: prefetch web fonts and image data, then render. Font
// problems never reject; they are returned in `fontIssues`.
function renderSvgAsync(
  dotSource: string,
  engine: EngineName,
  opts?: AsyncSvgOptions,
): Promise<{ svg: string; fontIssues: FontIssue[] }>;
function renderAsync(
  g: Graph,
  format: OutputFormat,
  opts?: AsyncRenderOptions,
): Promise<{ output: string; fontIssues: FontIssue[] }>;

// Render and insert into the element with the given id (browser; sanitizes by
// default).
function renderSvgInto(
  id: string,
  src: string,
  engine: EngineName,
  opts?: RenderSvgIntoOptions,
): Promise<{ element: SVGSVGElement; fontIssues: FontIssue[] }>;

type FontIssue = { face: string; reason: 'failed' | 'timeout' };
interface AsyncRenderOptions extends RenderOptions {
  imageSizer?: (src: string) => Promise<{ w: number; h: number } | null>;
  imageResolver?: (src: string) => Promise<{ bytes: Uint8Array; mime?: string } | Uint8Array | null>;
  fontTimeoutMs?: number; // default 3000
  fontSet?: FontSetLike;  // default document.fonts
}
type AsyncSvgOptions = Omit<AsyncRenderOptions, 'engine'>;
interface RenderSvgIntoOptions extends AsyncSvgOptions {
  sanitize?: (svg: string) => string;
  trusted?: boolean;
  document?: Document;
}

// Multi-format render + structured xdot draw-ops (from `@knowvah/dot-engine/render`,
// also re-exported from the root package).
function render(g: Graph, format: OutputFormat, opts?: { engine?: string }): string;
function getDrawOps(g: Graph, opts?: { engine?: string }): XdotOp[];

// Programmatic graph construction and computed-geometry readback (from
// `@knowvah/dot-engine/api`, also re-exported from the root package) — build a graph
// without writing DOT source, or read back node/edge/bbox coordinates after
// layout.
function createGraph(opts?: CreateGraphOptions): GvGraphBuilder;
function addEdge(g: Graph, tail: Node, head: Node, name?: string): Edge;
function getLayout(g: Graph, opts?: { yAxis?: 'up' | 'down' }): LayoutSnapshot;

// Lower-level orchestration, for callers that need engine/render control.
class GvcContext { /* register engines/renderers, layout, render */ }
function renderWithContext(ctx: GvcContext, graph: Graph, format: string): string;
```

Most callers only need `renderSvg` (or `tryRenderSvg` for result-style error
handling). `parse`, `GvcContext`, and `renderWithContext` are exposed for
advanced use — e.g. inspecting the parsed model, or driving layout and
rendering as separate steps. `createGraph`/`addEdge`, `getLayout`, `render`,
and `getDrawOps` are the graph-building, geometry-readback, multi-format
render, and structured-draw-op surfaces respectively — see the
[API guide](https://dot-engine.knowvah.com/guide/api) for full
walkthroughs of each.

## Development

```bash
npm test            # run the test suite (vitest)
npm run coverage    # run with coverage (v8)
npm run typecheck   # tsc --noEmit, strict mode, zero errors required
npm run build       # bundle to dist/index.js
```

The test suite verifies port fidelity by comparing generated SVG against output
from the canonical C Graphviz. New behavior is pinned to the C source — see
[`CLAUDE.md`](./CLAUDE.md) for the porting rules and the
[port catalog](./plans/port-catalog/README.md) for status.

## Status & coverage

- **What works:** parsing, all eight layout engines, SVG output, and the
  intermediate `json` / `xdot` / `dot` / `plain` / imagemap text formats.
- **Conformance bar:** a render is **conformant** when it matches the C oracle
  within a ±0.01 deterministic tolerance (`dot`, `circo`, `twopi`, `osage`,
  `patchwork`) or is characterized at a looser ±0.5 tolerance for the
  iterative force-directed engines (`neato`, `fdp`, `sfdp`) — never literal
  byte equality. Full definition: [Conformance](./docs/conformance.md).
- **Current parity:** `dot` SVG 910/927 conformant (0 unaccepted tracked gaps —
  every remaining non-conformant graph is a documented, accepted divergence);
  `dot` xdot 905/905; `patchwork` xdot 905/905; `osage` xdot 897/905; `circo`
  xdot 902/907; `twopi` xdot 893/910 (all deterministic, ±0.01). Denominators
  leave out inputs the C oracle itself cannot render; port errors and
  timeouts stay in as failures. `neato`/`fdp`/`sfdp` (826/910, 703/907,
  619/910) are characterized at ±0.5 rather than gated at the deterministic
  bar, per the tolerance split above. These figures are a
  snapshot of one row each from [`test/corpus/PARITY.md`](./test/corpus/PARITY.md),
  which is generated by `test/corpus/parity-report.ts` and covers every
  engine × surface track (SVG, xdot, json, plain, imagemap); read it, or the
  [docs-site parity pages](https://dot-engine.knowvah.com/engines),
  rather than this bullet for current counts.
- **What's tracked:** every C algorithm and its port status is inventoried in
  the [port catalog](./plans/port-catalog/README.md). Items marked `[ ]` there
  are genuinely unported — not footnotes, and not a roadmap either. Treat the
  catalog as the authoritative answer to "is feature X in?".
- **Known behavioral divergences from C** (differences investigated,
  root-caused, and deliberately not chased) are listed in
  [`docs/known-divergences.md`](./docs/known-divergences.md).

## Known limitations

- **The feature surface is narrower than C's, by design.** The C source
  defines completeness, and this port does not reach it. The uncovered areas
  are listed in the [port catalog](./plans/port-catalog/README.md) rather than
  hidden — check it before depending on a specific C feature. They are not a
  backlog; absence from the shipped surface is a scope decision, not a
  pending item.
- **Very large graphs are impractical to lay out at runtime.** Graphs beyond
  roughly 10k nodes or a few MB of DOT source hit a scale ceiling — layout
  (mincross, ranking, spline routing) is superlinear. This is **shared with
  upstream Graphviz, not a port-specific defect**: on such inputs native `dot`,
  the WASM builds (`@hpcc-js/wasm-graphviz`), and this engine all time out or
  run out of memory alike (see the large-source note in
  [`test/corpus/PERF.md`](test/corpus/PERF.md)). This engine does **not** leak —
  its per-render heap is flat; the limit is strictly graph size.

  For graphs at that scale, **pre-render to SVG once at build time and serve the
  static `.svg`** rather than laying out in the browser on every view. The
  build-time site adapters in
  [knowvah/dot-plugins](https://github.com/knowvah/dot-plugins) (published on
  NPM) do exactly this — e.g. `@knowvah/vitepress-plugin-dot`,
  `@knowvah/eleventy-plugin-dot`, `@knowvah/docusaurus-plugin-dot`, and the
  framework-agnostic `@knowvah/dot-markdown-it`.

## License

[Eclipse Public License v2.0](https://www.eclipse.org/legal/epl-2.0/) (EPL-2.0),
matching [upstream Graphviz](https://gitlab.com/graphviz/graphviz). Every source file carries an
`SPDX-License-Identifier: EPL-2.0` header.
