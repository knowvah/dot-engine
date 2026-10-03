# T7: documentation

## Task
- `README.md`: Public API block gains the three async signatures and types; the
  Browser usage section gains a "Rendering into a page" example using
  `await renderSvgInto('graph', dot, 'dot')` with `fontIssues` handling, and a
  `renderSvgAsync` example with an async `imageSizer`. Security section: note the
  built-in scrubber, `sanitize`, `trusted`, and that CSP remains recommended.
- `docs-site/guide/browser.md`: web fonts (why prefetch matters, `fontTimeoutMs`,
  `failed` vs `timeout`, the system-font limitation), `renderSvgInto`.
- `docs-site/guide/images.md`: async sizer/resolver vs `setImageSizer`/
  `setImageResolver` (per-render vs global).
- `docs-site/guide/api.md`: the new entries.
Sources of truth: the code (`src/async/`), `../decisions.md`. Examples must match
the real signatures.

## Write-set
`README.md`, `docs-site/guide/browser.md`, `docs-site/guide/images.md`, `docs-site/guide/api.md`.

## Acceptance criteria
- Every example compiles against the exported types (executor spot-checks with a
  scratch `.ts` file and `tsc --noEmit`).
- `npm run docs:build` passes with no new dead links.

Observability: N/A. Rollback: Reversible.
