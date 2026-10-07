<!-- SPDX-License-Identifier: EPL-2.0 -->
# Docs site: localization

English is served at the root (`/guide/…`); every other language lives
under its prefix (`/de/guide/…`). This file is for maintainers. It sits in
`.vitepress/` so that VitePress does not publish it and the completeness
check does not treat it as a page every locale must translate.

## How a language is registered

A language exists when `docs-site/.vitepress/locales/<prefix>.ts` exists.
`i18n.ts` discovers those modules at build time (`readdirSync` + native
`import()`, never `import.meta.glob` — see the header of `i18n.ts`), and
`config.ts` generates that language's nav, sidebar and switcher entry from
the module's `ui` labels. A locale module is data only: `label`, `lang`,
`ui` (nav/sidebar labels, including `englishOnly`) and `components`
(Playground, gallery and stale-banner strings). Import nothing from it but
types — Node loads it directly.

## Adding a language

1. Translate every page of the English tree into `docs-site/<prefix>/…`
   (same relative paths). `conformance.md` and `divergences.md` are full
   translations of `docs/conformance.md` and `docs/known-divergences.md`,
   not `@include` wrappers.
2. Write `docs-site/.vitepress/locales/goldens/<prefix>.json`: a
   `"$showcase"` block (titles, intro and engine blurbs — see the key list in
   `copy-goldens.mjs`) plus one translated description per golden id.
3. Write `docs-site/.vitepress/locales/<prefix>.ts` **last**. Any file in
   `locales/` is registered immediately.
4. `npm test` lints every page of every registered locale
   (`test/docs/translation-lint.test.ts`): byte-identical code fences,
   prefixed internal links, a well-formed `sourceHash`, the same
   `<Playground>`/`<GoldenGallery>` tags, the locale's control names on
   pages that embed a component, and complete golden descriptions.

The prefix must be one of `ALL_LOCALE_PREFIXES` in `i18n.ts`.

## Adding or removing an English page

The English page set is the `docs-site/` tree minus dot-directories,
`public/`, the locale directories and `TRANSLATABLE_EXCLUDES`. A new
hand-written English page therefore **fails the build for every
registered locale** until it is translated, because VitePress does not fall
back to English for a missing page — the language switcher would link to a
404. Either translate the page into every locale in the same change, or
delete a locale's module until it catches up.

## English-only pages

Generated reports (`parity*.md`, `engines.md`, `perf.md`) and the TypeDoc
`reference/` stay English. Every locale links to them unprefixed, and the
nav marks them with the locale's `englishOnly` label ("(Englisch)").
`showcase/` is generated per locale by `copy-goldens.mjs`.

## Keeping translations current

Each translated page carries front matter
`sourceHash: <sha256 of its English source>` (for `conformance.md` and
`divergences.md` the source is the file in `docs/`). Compute it with
`node scripts/i18n-hash.mjs <english path>`.

When the English source changes, the hash no longer matches: the build
still passes, and the page shows a banner linking to the current English
page. `npm run docs:i18n-status` lists, per locale, missing pages, stale
pages, pages without a hash, pages whose English source is gone, and golden
descriptions still in English. It always exits 0. To refresh a page,
re-translate it and update its `sourceHash`.

Golden ids added to `test/golden/manifest.json` after a locale shipped
fall back to English in that locale's gallery until translated;
`test/docs/goldens-i18n.test.ts` only requires the ids frozen when the
translations were completed.
