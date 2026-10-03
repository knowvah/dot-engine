# Architecture decisions (locked)

Approved by the owner 2026-10-03 (DESIGN.md "Owner decisions" + plan-mission Phase 3).

## ADR-1: Core stays synchronous; prefetch then run (DESIGN D1, D2)
- **Decision:** async entry points parse, collect resources, await fonts and
  images, then run the existing `layout → render → freeLayout`. No ported C
  function changes. `renderSvg` / `render` are untouched and byte-identical.

## ADR-2: Per-render hooks on the context, not global swaps (DESIGN D3)
- **Decision:** `GvcContext` gains optional `imageSizer` and `imageResolver`,
  consulted before the process-global hooks. HTML `<IMG>` sizing reaches the
  context sizer through `makeAnyLabel` (graph → `root.info.gvc`); SVG inlining
  reaches the context resolver through the render job (same module-augmentation
  pattern as `inlineImages`). No module-level state; every cache is a per-call `Map`.

## ADR-3: API surface — both, structured results (owner 1, 3)
- `renderAsync(g, format, opts?) → Promise<{ output: string; fontIssues: FontIssue[] }>`
- `renderSvgAsync(src, engine, opts?) → Promise<{ svg: string; fontIssues: FontIssue[] }>`
- `FontIssue = { face: string; reason: 'failed' | 'timeout' }` (`face` = the CSS
  font string loaded).
- `opts`: `RenderOptions` fields (`engine` for renderAsync, `inlineImages`) plus
  `imageSizer?: (src) => Promise<{w,h}|null>`, `imageResolver?: (src) =>
  Promise<{bytes,mime?}|Uint8Array|null>`, `fontTimeoutMs?: number` (default 3000),
  `fontSet?: FontFaceSet-like` (default `globalThis.document?.fonts`).

## ADR-4: Font semantics (owner 2 + Phase 3)
- Warn and proceed: unsettled by `fontTimeoutMs` → `timeout`; `load()` rejected
  or a matching FontFace with status `error` → `failed`. Each issue also
  `console.warn`s naming the face. A family with no `@font-face` (system or
  unknown) is not an issue — the FontFace API cannot tell them apart (documented).
- No `fontSet` (Node, Worker without `fonts`) → skip font prefetch, no issues.

## ADR-5: Errors reject (Phase 3)
- Every failure, including `TypeError` usage errors, is a promise rejection with
  the same classes/codes as the sync API. An async sizer/resolver that throws or
  rejects counts as a miss (`null`), as the sync hooks' miss path.

## ADR-6: renderSvgInto and sanitizing (owner 4 + Phase 3 "Both")
- `renderSvgInto(id, src, engine, opts?) → Promise<{ element: SVGSVGElement; fontIssues }>`.
- Order: `opts.trusted === true` → no sanitizing; else `opts.sanitize(svg)` if
  given; else the built-in scrubber. Insert via `DOMParser('image/svg+xml')` +
  `replaceChildren`, never `innerHTML`. Missing element → `TypeError`
  `ERR_INVALID_ARG_VALUE`; no `document` → `TypeError` `ERR_INVALID_STATE`.
- Built-in scrubber removes: `<script>`, `<foreignObject>`, `<set>`/`<animate*>`
  targeting `href`/`xlink:href`, every `on*` attribute, `href`/`xlink:href` with
  `javascript:` (any case/whitespace) or non-image `data:`, the `xml-stylesheet`
  processing instruction. Keeps `data:image/*` on `<image>` (inlineImages).

## ADR-7: Exports
- Root (`src/index.ts`): `renderAsync`, `renderSvgAsync`, `renderSvgInto`, types.
- `./render` (`src/render/index.ts`): `renderAsync` and its types.
