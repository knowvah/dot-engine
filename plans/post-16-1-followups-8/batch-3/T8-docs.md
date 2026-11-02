# T8: docs for items 103, 106 and 108 (+23 locales, AD-10)

**Context:** part-5 AD-17: locale edits are done by `documentation-engineer`. Each guide page
has 23 locale copies under `docs-site/<locale>/`. `npm run docs:i18n-status` judges staleness
by each locale page's `sourceHash:` front matter, which must equal
`node scripts/i18n-hash.mjs <english page>` (`.agent-notes/post-16-1-followups-5.md`).

**Task:**
1. `docs-site/guide/errors.md`: remove the `model=subset` and `model=circuit` rows (they no
   longer refuse on any mode). If the page lists warnings, add `model=mds` without `len` and
   unknown `model` values as native warnings (text from T1's fixtures, byte-exact).
2. `docs/known-divergences.md` (included by `docs-site/divergences.md`): one bullet —
   native VPSC (`overlap=vpsc|ipsep`, constrained `mode=ipsep`) orders `std::set<Block*>`
   and position ties by heap address, so native output can vary run to run on ties; the
   port breaks ties by creation order (follow-up 106, T3).
3. `docs-site/guide/images.md` §3: give the `imagepath` lead sentence its colon, and state
   that the unsafe pair's second line is `No or improper shapefile="<name>"` for a
   shapefile (native) and `No or improper image=` for an image. Remove the "not printed
   yet (follow-up 104)" note once T4 has landed; check before committing.
4. Mirror into 23 locales in each locale's language; code spans and warning text in
   English, byte-exact; refresh each `sourceHash`.

**Write-set:** `docs-site/guide/errors.md`, `docs-site/guide/images.md`,
`docs/known-divergences.md`, `docs-site/*/guide/errors.md`, `docs-site/*/guide/images.md`,
`docs-site/*/divergences.md`.
**Read-set:** decisions.md AD-8, AD-9, AD-10; the T1, T3, T4 and T6 journal rows.

**Acceptance criteria:**
- *Given* the docs, *when* `npm run docs:i18n-status` runs, *then* 0 stale in all 23 locales.
- *Given* `npx vitest run test/docs`, *then* green.
- *Given* each warning text in the docs, *then* it matches a native fixture byte for byte.

**Commit:** `docs(T8): document neato models, vpsc tie order and image warnings`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
