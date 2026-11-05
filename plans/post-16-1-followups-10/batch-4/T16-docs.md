# T16: docs and locales

**Task:** in `docs/` and every locale page, per the journal:
1. `dim`, `dimen` and `z` now work on neato and sfdp: any page saying layout is 2-D only. Note that fdp, circo, twopi, osage and patchwork stay 2-D as C forces, and that `GVRENDER_DOES_Z` is unported because no device needs it (AD-4).
2. `known-divergences.md`, section A1: T2's outcome. On a libm origin, name it. On a fix, the new sfdp counts from the re-walk, in the table at `known-divergences.md:199-203` and the prose at `:114`.
3. T5's trace of `graphs-b56` if it changes what a page claims, and any new known divergence the tasks recorded.

Set each locale `sourceHash` so `npm run docs:i18n-status` shows 0 stale. Locale pages have had no native-speaker pass; do not imply one.

**Write-set:** `docs/known-divergences.md`, the `dim` attribute docs, `docs-site/*/divergences.md`, other `docs-site/*/` pages that repeat the same claims.

**Acceptance criteria:**
- *Given* `npm run docs:i18n-status`, *then* 0 stale × 23.
- *Given* `npx vitest run test/docs`, *then* it passes.
- *Given* the A1 table, *then* its sfdp row equals `test/corpus/PARITY.md`'s.

**Commit:** `docs(T16): document dim and the sfdp drift outcome`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
