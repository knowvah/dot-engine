<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data Flow — Sequence Diagrams

The five most important flows in dot-engine. All are in-process and
dependency-free. Layout and render are synchronous; the async flows (4 and 5)
only `await` a font and image prefetch in front of that same synchronous core.

## 1. DOT string → SVG (the primary flow)

`renderSvg(dotSource, engine)` is the headline entry point. The internal
pipeline mirrors C Graphviz: parse → model → layout → render.

```mermaid
sequenceDiagram
    participant Caller
    participant Index as index.ts (renderSvg)
    participant Parser as parser/
    participant Engine as layout/<engine>
    participant Gvc as gvc/ context + device
    participant Svg as render/ (svg)

    Caller->>Index: renderSvg(dot, "dot")
    Index->>Index: checkRenderArgs, createDefaultContext()
    Index->>Parser: parse(dot)
    Parser-->>Index: Graph (cgraph model)
    Index->>Gvc: ctx.layout(graph, "dot")
    Gvc->>Engine: layout(graph)
    Note over Engine: dot: acyclic → rank (network simplex)<br/>→ mincross → position → splines
    Engine-->>Gvc: graph annotated with geometry
    Index->>Gvc: deviceRender(ctx, graph, "svg")
    Gvc->>Svg: emit walk
    Svg-->>Index: SVG string
    Index->>Gvc: ctx.freeLayout(graph, "dot")
    Index-->>Caller: SVG string
```

A fresh `GvcContext` is created per call and `freeLayout` runs after the
render, as C's `gvFreeLayout` runs after `gvRenderJobs`. Any throw is
normalized at the boundary (`rethrowAtBoundary`) into `ParseError`,
`RenderError` or `InternalError`. `tryRenderSvg` wraps the same flow and
returns a `RenderResult` (`{ svg }` or `{ errors: [one] }`) instead of
throwing; only invalid arguments still throw.

## 2. Programmatic graph → geometry snapshot

For callers that build graphs in code and want raw coordinates (e.g. to render
with their own backend). `getLayout()` requires `render()` to have run first —
there is no standalone layout pass; geometry is a side effect of rendering.

```mermaid
sequenceDiagram
    participant Caller
    participant Api as api/ (createGraph, addEdge)
    participant Render as render/ (render)
    participant Engine as layout/<engine>
    participant Geom as api/ (getLayout)

    Caller->>Api: createGraph(); addEdge(a, b)
    Api-->>Caller: Graph handle
    Caller->>Render: render(graph, "svg")
    Render->>Engine: layout(graph)
    Engine-->>Render: graph + geometry
    Render-->>Caller: rendered output
    Caller->>Geom: getLayout(graph)
    Note over Geom: reads computed geometry,<br/>flips Y-axis to screen coords,<br/>expands edge control points
    Geom-->>Caller: geometry snapshot (nodes, edges, points)
```

## 3. Layout → xdot draw operations

`getDrawOps()` exposes per-object draw operations so a downstream consumer
can paint with a custom renderer instead of the built-in SVG emitter. This is
the integration seam by which dot-engine can replace a consumer's in-house
dot engine.

```mermaid
sequenceDiagram
    participant Caller as Consumer
    participant Render as render/ (getDrawOps)
    participant Engine as layout/<engine>
    participant Xdot as xdot/ + render device

    Caller->>Render: getDrawOps(graph, opts)
    Render->>Engine: layout(graph)
    Engine-->>Render: graph + geometry
    Render->>Xdot: emit draw-ops (ellipse, polyline, text, color)
    Xdot-->>Render: Xdot draw-op tree
    Render-->>Caller: per-object XdotOp[] for custom painting
```

## 4. DOT string → SVG, async with prefetch (`renderSvgAsync`)

`renderSvgAsync(dot, engine, opts?)` parses first, then delegates to
`renderAsync(graph, "svg", { ...opts, engine })`. Before any layout runs,
`collectResources` walks the parsed graph and lists the fonts and image sources
the synchronous pipeline will request (node, edge, xlabel, head/tail and
cluster labels, HTML-like label items, `<IMG SRC>` and `image=`). `prefetchAll`
then awaits three things in parallel: `loadFonts` (via a `FontFaceSet`-like,
one shared deadline, `fontTimeoutMs` default 3000), the caller's async
`imageSizer` for `<IMG>` dimensions, and (only with `inlineImages`) the async
`imageResolver` for image bytes. Each distinct source is looked up once and a
rejected or throwing hook counts as a miss.

```mermaid
sequenceDiagram
    participant Caller
    participant Async as async/ (renderSvgAsync, renderAsync)
    participant Collect as async/collect
    participant Fonts as async/fonts + hooks
    participant Gvc as gvc/ (default context)
    participant Core as layout + device (sync)

    Caller->>Async: renderSvgAsync(dot, "dot", opts)
    Async->>Async: parse(dot)
    Async->>Collect: collectResources(graph, inlineImages)
    Collect-->>Async: fonts, sizeSrcs, bytesSrcs
    par prefetch (Promise.all)
        Async->>Fonts: loadFonts(fontSet, fonts, timeout)
        Async->>Fonts: imageSizer(src) per distinct src
        Async->>Fonts: imageResolver(src) per distinct src
    end
    Fonts-->>Async: fontIssues, size Map, bytes Map
    Async->>Gvc: createDefaultContext() after fonts settle
    Note over Gvc: ctx.imageSizer / ctx.imageResolver<br/>are sync closures over the Maps
    Async->>Core: ctx.layout, deviceRender, ctx.freeLayout
    Core-->>Async: SVG string
    Async-->>Caller: { svg, fontIssues }
```

Font problems never reject: a failed or timed-out face is returned in
`fontIssues` and logged with `console.warn`. All other failures, including
argument `TypeError`s, are promise rejections with the same classes and codes
as the sync API. `renderAsync` (exported from `/render` and the root) is the
multi-format form of the same flow.

## 5. DOT string → DOM element (`renderSvgInto`)

`renderSvgInto(id, dot, engine, opts?)` is browser-only. It resolves the
document (`opts.document` or `globalThis.document`) and the target element by
`id` before doing any work, then calls `renderSvgAsync` and inserts the result
without `innerHTML`.

```mermaid
sequenceDiagram
    participant Caller
    participant Into as async/render-into
    participant Async as renderSvgAsync
    participant San as async/sanitize
    participant Dom as Document + target element

    Caller->>Into: renderSvgInto("host", dot, "dot", opts)
    Into->>Dom: getElementById("host")
    Into->>Async: renderSvgAsync(dot, "dot", opts)
    Async-->>Into: { svg, fontIssues }
    alt trusted === true
        Note over Into: use svg as rendered
    else custom sanitize given
        Into->>Into: opts.sanitize(svg)
    end
    Into->>Dom: DOMParser.parseFromString(svg, image/svg+xml)
    opt neither trusted nor custom sanitize
        Into->>San: scrubSvgDocument(parsed)
        Note over San: drop script, foreignObject, SMIL,<br/>on* attributes, script URL schemes
    end
    Into->>Dom: importNode, target.replaceChildren(svg)
    Into-->>Caller: { element, fontIssues }
```

A missing document or `DOMParser` is an `ERR_INVALID_STATE` rejection, an
unknown `id` is `ERR_INVALID_ARG_VALUE`, and an SVG that does not parse is a
`RenderError`.
