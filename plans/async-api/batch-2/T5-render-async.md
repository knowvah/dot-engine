# T5: renderAsync and renderSvgAsync (ADR-1, 3, 4, 5, 7)

## Context
Sync entry points: `src/render/public.ts:109-131` (`render`) and
`src/index.ts:91-131` (`renderSvg`, `tryRenderSvg`): argument checks
(`checkRenderArgs`), `createDefaultContext()`, layout → device render →
freeLayout, `rethrowAtBoundary`. Batch 1 provides `ctx.imageSizer/imageResolver`
(T1), `collectResources` (T2), `loadFonts` (T3).

## Task
1. `renderAsync(g, format, opts?)`: validate exactly as `render` (rejections, ADR-5);
   `collectResources(g, {inlineImages})`; in parallel: `loadFonts(opts.fontSet ??
   globalThis.document?.fonts, fonts, opts.fontTimeoutMs ?? 3000)`, async sizer per
   sizeSrc, async resolver per bytesSrc (throw/reject → null; results in per-call
   Maps). Then a fresh `createDefaultContext()` (measurer created after fonts
   settle), set `ctx.imageSizer`/`ctx.imageResolver` to sync closures over the Maps
   only when the corresponding async hook was given (else the global hooks apply as
   in the sync API), run the same lifecycle as `render`, resolve `{output, fontIssues}`.
2. `renderSvgAsync(src, engine, opts?)`: validate as `renderSvg`, parse, delegate,
   resolve `{svg, fontIssues}`.
3. Exports per ADR-7 with TSDoc (security remark as `render`).
4. Share validation/lifecycle helpers by importing; if a sync helper is private,
   duplicate the minimum and journal it rather than editing `public.ts`.

## Write-set
`src/async/render-async.ts`, `src/async/render-async.test.ts` (new), `src/index.ts`,
`src/render/index.ts`.

## Interface contract (consumed by T6)
ADR-3 signatures; `AsyncRenderOptions`, `AsyncSvgOptions`, `FontIssue` exported.

## Acceptance criteria
- Given any golden input and no async options, when renderSvgAsync runs, then
  `svg` equals `renderSvg` byte-for-byte and fontIssues = [].
- Given an async sizer for an HTML `<IMG>`, then the node is sized from it; given
  one that rejects, then the C missing-image path (as with no sizer).
- Given inlineImages and an async resolver, then the SVG has the data URI.
- Given a fake fontSet that times out, then fontIssues has the timeout and the
  promise still resolves with output.
- Given a non-string source or unknown engine, then the promise rejects with the
  sync API's TypeError code; given bad DOT, then it rejects with ParseError.
- Given two concurrent calls with different resolvers, then each output uses its own.

## Shared rules

Read the repo `CLAUDE.md`, `../decisions.md`, `../conventions.md` and
`../DESIGN.md` first. Scratch files go in the executor scratchpad under
`<task-id>/`. Write-set only; stop and report on anything else (README stop
conditions). Observability: N/A. Rollback: Reversible.
