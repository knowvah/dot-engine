# T5: image sizing and drawing docs (item 93, AD-17)

**Context:** after part 5 T14 a node's `image=` is sized through the installed sizer, and
after T4 it is drawn in svg and xdot. The docs still say otherwise:
`docs-site/guide/browser.md:100` ("A node's `image=` attribute is not sized"),
`docs-site/guide/images.md:25` ("`image=` attribute is **not** sized by the sizer"), and
`docs-site/guide/api.md:133+` never states the sizer's unit. Each page has 23 locale copies
under `docs-site/<locale>/guide/`.

**Task:**
1. English pages: state that `setImageSizer` / `imageSizer` return **intrinsic pixels**;
   layout converts them to points at the graph `dpi` (default 96) plus 2 pt padding, and the
   renderer draws at the output's dpi (72 for svg/xdot unless `dpi` is set), as native.
   Node `image=` and HTML `<IMG>` are both sized and drawn; `imagescale`/`imagepos` apply.
   Remove every "not sized" statement. Verify each claim against the code
   (`src/gvc/usershape.ts`, `src/gvc/render-usershape.ts`) before writing it.
2. The same edits in the 23 locale copies of each page, in each page's language and
   register; set each locale page's `sourceHash` with `npm run docs:i18n-hashes` (or
   `node scripts/i18n-hash.mjs <english page>`).
3. `npm run docs:i18n-status` reports 0 stale, 0 missing.

**Write-set:** `docs-site/guide/{browser,images,api}.md`,
`docs-site/*/guide/{browser,images,api}.md`.
**Read-set:** the pages above, `src/gvc/usershape.ts`, `src/gvc/render-usershape.ts`,
`src/common/poly-init.ts:nodeImageSize`, `scripts/i18n-hash.mjs`.

**Acceptance criteria:**
- *Given* the English pages, *then* no sentence says `image=` is unsized or undrawn, and the
  unit and dpi conversion are stated once each.
- *Given* the locales, *then* `docs:i18n-status` reports 0 stale and the docs tests pass.

**Observability:** N/A. **Rollback:** reversible.
