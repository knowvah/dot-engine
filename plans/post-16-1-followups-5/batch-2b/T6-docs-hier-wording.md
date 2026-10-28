# T6: `mode=hier` errors-table wording (AD-17, item 86)

**Context:** `docs-site/guide/errors.md:127` says the hier throw happens "after the graph
has 2+ nodes and `maxiter` is not negative"; C returns before the model check when
`maxiter` is 0, so "positive" is exact. `README.md:153` carries the short form of the row.
23 locale copies (`docs-site/<locale>/guide/errors.md`) carry translations; the i18n status
tool hashes the English source.

**Task:** (1) Change "is not negative" to "is positive" in `docs-site/guide/errors.md`; check
`README.md:153` and adjust only if it states the condition. (2) Make the equivalent change
in each of the 23 locale pages, in that language (the row is identifiable by `mode=hier`).
(3) `npm run docs:i18n-hashes`; `npm run docs:i18n-status` → 0 stale.

**Write-set:** `README.md`, `docs-site/guide/errors.md`, `docs-site/*/guide/errors.md`,
the i18n hash file the tool writes.
**Read-set:** `lib/neatogen/neatoinit.c:majorization` (the `maxiter` early return),
`scripts/docs-i18n-status.mjs` header.

**Acceptance criteria:**
- *Given* each of the 24 pages, *then* the `mode=hier` row states the positive-`maxiter`
  condition in that page's language.
- *Given* `npm run docs:i18n-status`, *then* 0 stale.
- *Given* `npx vitest run test/docs`, *then* green.

**Observability:** N/A. **Rollback:** reversible.
