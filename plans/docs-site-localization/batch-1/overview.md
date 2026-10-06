<!-- SPDX-License-Identifier: EPL-2.0 -->
# Batch 1 — infrastructure

No translated content. At the end, the site builds identically to `main`
(English only, same URLs) and every mechanism the locale batches rely on
exists and is tested against a fixture locale.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-locale-registry.md) | Locale registry, config locales, completeness gate, `strings.ts` | typescript-pro | `.vitepress/i18n.ts`, `.vitepress/config.ts`, `.vitepress/theme/strings.ts`, `test/docs/locale-complete.test.ts` | — | [x] |
| [T2](T2-playground-strings.md) | Playground resolves its strings from the locale | typescript-pro | `.vitepress/theme/Playground.vue`, `test/docs/playground-strings.test.ts` | T1 | [x] |
| [T3](T3-localized-goldens.md) | Per-locale showcase pages and golden descriptions | typescript-pro | `copy-goldens.mjs`, `.vitepress/theme/GoldenGallery.vue`, `.gitignore`, `test/docs/goldens-i18n.test.ts` | T1 | [x] |
| [T4](T4-drift-tracking.md) | `sourceHash`, stale banner, `docs:i18n-status` | typescript-pro | `scripts/i18n-hash.mjs`, `scripts/docs-i18n-status.mjs`, `.vitepress/theme/StaleBanner.vue`, `.vitepress/theme/index.ts`, `package.json`, `test/docs/i18n-status.test.ts` | T3 | [x] |
| [T5](T5-translation-lint.md) | Translation lint tests | typescript-pro | `test/docs/translation-lint.test.ts`, `test/helpers/docs.ts` | T1, T4 | [x] |

Paths in the Writes column without a top-level directory are under
`docs-site/`.

Order: **T1 → (T2 ∥ T3) → T4 → T5.** T4 consumes T3's `localizeGoldens`;
T5 consumes T4's `hashSource`/`englishSourceFor`. Only T2 and T3 run
concurrently; their write-sets are disjoint.

**Baseline (T1 records it in the journal before changing anything):**
`time npm run docs:build` wall-clock, and the byte size of the English
local-search index chunk in `docs-site/.vitepress/dist/assets/`
(`@localSearchIndexroot*.js`).
