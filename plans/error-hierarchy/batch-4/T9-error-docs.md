# T9: error documentation

## Context

The owner wants the docs to say exactly which exceptions dot-engine can throw and
what each one means. After T8 the contract is final. Sources of truth, in order:
1. the code: `src/errors.ts` and the TSDoc `@throws` on the public functions (T8);
2. `../reclassification.md` (complete);
3. `../decisions.md`.

The docs must describe what the code does. Where they disagree, the code wins: report
the gap, and do not edit `src/`.

## Task

1. **New page `docs-site/guide/errors.md` ("Errors and exceptions"):**
   - **Two families, one rule.**
     - `instanceof DotEngineError` means "dot-engine failed on this input".
     - A standard `TypeError` / `RangeError` / `Error` with `code: 'ERR_…'` means
       "the call was wrong".
     - Branch on `.code`, not on message text: messages may change, codes are stable.
   - **Class reference.** One section per class (`DotEngineError` (abstract),
     `ParseError`, `HtmlParseError`, `RenderError`, `InternalError`) covering:
     - when it is thrown, and its `type`;
     - its codes;
     - its fields (`location`, `expected`, `tag`, `cause`);
     - what the caller should do (fix the DOT, avoid the feature, report a bug).
   - **Code reference table.** Every `GvErrorCode` and every `UsageErrorCode`, with:
     class, `type`, meaning, typical cause, caller action, and the public functions
     that can raise it.
   - **Per-function table.** Each public function (`renderSvg`, `tryRenderSvg`,
     `parse`, `render`, `getDrawOps`, `createGraph` + builder methods, `getLayout`,
     `addEdge`, the `GvcContext` constructor, `register`, `layout`, `freeLayout`,
     `bestRenderer`, `renderWithContext`, `set*` hooks) → what it can throw. Must
     match the TSDoc `@throws`. `renderWithContext` and the `GvcContext` methods do
     **not** wrap foreign throws: an engine bug reaches the caller unwrapped there.
     Say so plainly.
   - **`tryRenderSvg` vs `renderSvg`.** When to use which; `tryRenderSvg` returns for
     any DOT input and throws only for invalid arguments; result errors are plain
     data with no `cause` and no stack.
   - **Wrapped failures.** `InternalError.cause` holds the original error; how to log
     the chain; that `cause` is non-enumerable (`JSON.stringify` omits it).
   - **Cross-bundle checks.** Use `isGvError(e)` when two copies of the library may be
     loaded; `instanceof` works within one bundle.
   - **Examples.** One short, compile-checked TS example for: a `try/catch` that
     separates the two families; `tryRenderSvg` result handling; logging `cause`.
2. **`docs-site/.vitepress/config.ts`:** add "Errors and exceptions" to the guide
   sidebar next to "API reference (curated)". Touch nothing else.
3. **`README.md`:**
   - replace the error-handling section with a short summary that links to the
     guide page;
   - add a **"Migrating to 2.0"** section with the old → new table from
     `../reclassification.md`, public rows plus one summary line per C-port group;
   - include the engine-argument-checked-before-`layout=` behaviour change.
4. **`docs-site/guide/api.md`, `types.md`, `recipes.md`:** update every mention of
   `GvError` / `ParseError` / `RenderError` / `tryRenderSvg` to match, and link to the
   errors page.
5. **`plans/structured-errors/decisions.md`:** append an "Amended by error-hierarchy
   (2026-10)" note under ADR-2 and ADR-3, stating what changed and linking to
   `plans/error-hierarchy/decisions.md`.

## Write-set

`docs-site/guide/errors.md` (new), `docs-site/.vitepress/config.ts`, `README.md`,
`docs-site/guide/api.md`, `docs-site/guide/types.md`, `docs-site/guide/recipes.md`,
`plans/structured-errors/decisions.md`.

## Read-set

`src/errors.ts`; the TSDoc of the public functions (T8 files plus `src/api/*.ts`,
`src/gvc/context.ts`, `src/gvc/device.ts` `render` = `renderWithContext`, and the
three `set*` hooks); `../reclassification.md`; `../decisions.md`; the existing
README error section (search for `tryRenderSvg`); one existing guide page for
house style (e.g. `docs-site/guide/geometry.md`).

## Acceptance criteria

- Every class exported from `src/index.ts` and every member of `GvErrorCode` and
  `UsageErrorCode` appears in `errors.md`. Check this mechanically: grep the unions
  in `src/errors.ts` against the page.
- The per-function table agrees with each function's TSDoc `@throws`. Any mismatch is
  reported, not papered over.
- `npm run docs:build` succeeds, with no new dead-link warnings.
- The README migration table has every row of `../reclassification.md`'s public
  section.
- The examples type-check: put them in a scratch `.ts` file importing from `src/` and
  run `npx tsc --noEmit` on it; do not commit the scratch file.

## Quality bar

Plain, direct prose; tables over paragraphs; no marketing tone. SPDX comment header
on the new page, matching sibling pages.

## Observability

N/A — no new observable operations.

## Rollback

Reversible (revert commit). Docs only.

## Boundaries

Do not edit `src/`. Do not regenerate the typedoc output by hand.

## Commit

`docs(errors): document the error hierarchy and 2.0 migration`
