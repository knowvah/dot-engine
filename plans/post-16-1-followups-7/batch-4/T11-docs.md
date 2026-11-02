# T11: docs for items 96, 101 and 102 (+23 locales)

**Context:** part-5 AD-17: locale edits are done by `documentation-engineer`. Every guide
page has 23 locale copies under `docs-site/<locale>/`. `npm run docs:i18n-status` must
show 0 stale, refreshed with `npm run docs:i18n-hashes`.

**Task:**
1. `docs-site/guide/errors.md`:
   - remove the `mode=ipsep` row (128);
   - update the `start=self` row (129) to T10's decision.
2. `docs-site/guide/images.md` (193–205 says `imagepath` is not implemented), stating
   what each case now does:
   - `imagepath`: the port uses it only to choose which warning prints (`Filename "<name>"
     is unsafe`); the host still receives the raw name;
   - the image type comes from resolver bytes (magic sniff);
   - unknown magic warns `was not found as a file or as a shape library member` and draws
     nothing;
   - json warns `No loadimage plugin for "png:json"`, as native does.
3. `docs/known-divergences.md` and `docs-site/divergences.md`: sizer-only images carry no
   type, so they print no loadimage warning (AD-5).
4. Mirror all of it into the 23 locales in each locale's language. Keep code spans and
   warning text in English, byte-exact.

**Write-set:** `docs-site/guide/errors.md`, `docs-site/guide/images.md`,
`docs/known-divergences.md`, `docs-site/divergences.md`, their locale copies
(`docs-site/*/guide/errors.md`, `docs-site/*/guide/images.md`, `docs-site/*/divergences.md`)
and the i18n hash file.
**Read-set:** decisions.md AD-5 and AD-6, the T6 and T9 journal rows, T10's start-guard
decision.

**Acceptance criteria:**
- *Given* the docs, *when* `npm run docs:i18n-status` runs, *then* 0 stale.
- *Given* `npx vitest run test/docs`, *then* green.
- *Given* each warning text in the docs, *then* it matches the native fixture byte for
  byte.

**Commit:** `docs(T11): document ipsep constraints, image types and imagepath`.
**Observability:** N/A. **Rollback:** reversible.
