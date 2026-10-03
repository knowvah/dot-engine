# T6: renderSvgInto (ADR-6)

## Context
Owner decision 4: an exported, DOM-coupled helper. T5 provides `renderSvgAsync`,
T4 `scrubSvgDocument`. README "Security" explains why sanitizing matters.

## Task
`renderSvgInto(id, src, engine, opts?)`, `opts = AsyncSvgOptions & { sanitize?:
(svg: string) => string; trusted?: boolean; document?: Document }`:
1. `const doc = opts.document ?? globalThis.document`; none → reject TypeError
   `ERR_INVALID_STATE`. `id` not a string → `ERR_INVALID_ARG_TYPE`; no element →
   `ERR_INVALID_ARG_VALUE` (use the helpers in `src/errors.ts`). Check the element
   before rendering.
2. `renderSvgAsync`; then trusted → as is; sanitize → its return value; else parse
   with `new DOMParser()` (from the document's window, or `opts`-supplied parser for
   tests) as `image/svg+xml`, `scrubSvgDocument`, use the root element.
3. Import the root `<svg>` into `doc` (`importNode`) and `el.replaceChildren(svg)`;
   never `innerHTML`. A parser error document → reject RenderError.
4. Resolve `{ element, fontIssues }`. Export from `src/index.ts`.

## Write-set
`src/async/render-into.ts`, `src/async/render-into.test.ts` (new), `src/index.ts`.

## Acceptance criteria
- Given an xmldom document with `<div id="graph">`, when renderSvgInto runs, then
  the div's only child is the `<svg>` and `element` is it.
- Given a hostile DOT `URL="javascript:alert(1)"`, then no `javascript:` href
  remains; with `trusted: true`, it does.
- Given `sanitize`, then it receives the SVG string and its result is inserted;
  the scrubber is not used.
- Given a missing id, then rejection ERR_INVALID_ARG_VALUE and nothing rendered;
  given no document, then ERR_INVALID_STATE.

## Shared rules

Read the repo `CLAUDE.md`, `../decisions.md`, `../conventions.md` and
`../DESIGN.md` first. Scratch files go in the executor scratchpad under
`<task-id>/`. Write-set only; stop and report on anything else (README stop
conditions). Observability: N/A. Rollback: Reversible.
