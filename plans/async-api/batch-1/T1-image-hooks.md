# T1: per-context image sizer and resolver (ADR-2)

## Context
HTML `<IMG>` sizing already accepts a per-call sizer (`src/common/htmltable.ts:222-251`
`env.imageSizer`, else global `findImageSize`) but no caller sets it. SVG
inlining (`src/render/svg.ts:268-292` usershape) reads only the process-global
`findImageBytes` (`src/gvc/image-resolver.ts:84-95`). The async API (T5) needs
per-render hooks so concurrent renders never race on globals.

## Task
1. `GvcContext` (`src/gvc/context.ts:195-215`): optional public fields
   `imageSizer?: ImageSizer` and `imageResolver?: ImageResolver` (undefined by default).
2. `makeAnyLabel` (`src/common/make-label.ts:170-184`): pass
   `imageSizer: obj?.root.info.gvc?.imageSizer` (or the equivalent graph lookup)
   into `makeHtmlLabel`'s finfo; with no context sizer the global path is unchanged.
3. `findImageBytes(src, resolver?)`: a given resolver is consulted instead of the
   global; same normalization. Render job carries the context resolver via the
   module augmentation used for `inlineImages` (`src/gvc/device.ts:59-72, 545-550`);
   `usershape` passes `job.imageResolver`.
4. Unset fields → byte-identical output (save port output for a few HTML-IMG and
   image= fixtures before editing; compare after).

## Write-set
`src/gvc/context.ts`, `src/gvc/image-resolver.ts`, `src/gvc/device.ts`,
`src/render/svg.ts`, `src/common/make-label.ts`, `src/gvc/context-image-hooks.test.ts` (new).

## Interface contract (consumed by T5)
`ctx.imageSizer = (src) => {w,h}|null` and `ctx.imageResolver = (src) =>
{bytes,mime?}|Uint8Array|null` take precedence over `setImageSizer`/`setImageResolver`.

## Acceptance criteria
- Given a context sizer and a global sizer, when an HTML `<IMG>` label is sized,
  then the context sizer's dimensions are used.
- Given a context resolver and `inlineImages`, when SVG renders `image=`, then the
  data URI comes from the context resolver; global resolver not called.
- Given two contexts with different resolvers, then each render uses its own.
- Given no context hooks, then output equals the global-hook path byte-for-byte.

## Shared rules

Read the repo `CLAUDE.md`, `../decisions.md`, `../conventions.md` and
`../DESIGN.md` first. Scratch files go in the executor scratchpad under
`<task-id>/`. Write-set only; stop and report on anything else (README stop
conditions). Observability: N/A. Rollback: Reversible.
