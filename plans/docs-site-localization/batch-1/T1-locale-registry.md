<!-- SPDX-License-Identifier: EPL-2.0 -->
# T1 — Locale registry, config locales, completeness gate

## Context

`docs-site/.vitepress/config.ts` hard-codes an English nav and sidebar. This
task ports dot-atlassian's locale registry so that adding a language is
adding one module, with no config edit. No locale module exists after this
task; the site must build exactly as today.

## Task

1. Record the baseline (see [overview](overview.md)) in the journal.
2. Create `docs-site/.vitepress/theme/strings.ts`: `ComponentStrings`
   interface and `EN_COMPONENTS` — every user-visible string in
   `Playground.vue` and `GoldenGallery.vue` (Engine label, Export SVG,
   Export PNG, DOT source, Rendered SVG, Render failed, Click to enlarge,
   rendering…, Close) plus the stale-banner text and link label T4 needs.
3. Create `docs-site/.vitepress/i18n.ts`: `DocsLocale { label, lang, ui,
   components }`, `LOCALES` discovered via `readdirSync` + dynamic import of
   `locales/*.ts` (copy the mechanism and its header rationale from
   dot-atlassian — no `import.meta.glob`). Tolerate a missing `locales/`
   directory (empty registry). Export `TRANSLATABLE_EXCLUDES`.
4. Refactor `config.ts`: `EN` ui labels; `navFor(prefix, ui)` and
   `sidebarFor(prefix, ui)` reproducing today's nav and sidebar exactly for
   `prefix=''`; English-only targets (`/parity`, `/engines`, `/perf`,
   `/reference/`, and the Conformance/Parity dashboards that resolve to
   them) stay unprefixed and append `ui.englishOnly` to their label for
   non-root locales; `locales:` block (root + registry); `assertLocaleComplete`
   per [decisions.md#completeness](../decisions.md#completeness). Keep the
   vite alias, markdown config, head, search unchanged.
5. Make `assertLocaleComplete` a pure function of (root dir, prefix,
   excludes) so the test can call it on a fixture tree.

## Write-set

`docs-site/.vitepress/i18n.ts`, `docs-site/.vitepress/config.ts`,
`docs-site/.vitepress/theme/strings.ts`, `test/docs/locale-complete.test.ts`
(+ fixture dir `test/docs/fixtures/site/**`).

## Read-set

- `docs-site/.vitepress/config.ts` (all — 150 lines)
- `~/git/knowvah/dot-atlassian/site/.vitepress/i18n.ts` (all)
- `~/git/knowvah/dot-atlassian/site/.vitepress/config.ts:1-130, 205-230`
- `docs-site/.vitepress/theme/Playground.vue:165-210`,
  `GoldenGallery.vue:40-60, 110-165` (string inventory only)
- [decisions.md](../decisions.md) #3, #4, #5

## Interface contracts (outputs)

```ts
// theme/strings.ts
export interface ComponentStrings { engineLabel: string; exportSvg: string;
  exportPng: string; dotSource: string; renderedSvg: string;
  renderFailed: string; clickToEnlarge: string; rendering: string;
  close: string; staleNotice: string; staleLink: string }
export const EN_COMPONENTS: ComponentStrings;
// i18n.ts
export interface DocsLocale { label: string; lang: string;
  ui: NavLabels; components: ComponentStrings }
export const LOCALES: Record<string, DocsLocale>;   // key = URL prefix
export const TRANSLATABLE_EXCLUDES: readonly string[];
export function stringsForLang(lang: string): ComponentStrings; // EN fallback
```

`NavLabels` has one field per nav/sidebar text in today's config plus
`englishOnly`. Field names are T1's choice; T2–T5 consume them by import.

## Acceptance criteria

- Given no `locales/` modules, when `npm run docs:build` runs, then it passes
  and the set of emitted `.html` paths under `dist/` equals `main`'s.
- Given a fixture tree where locale `xx` lacks `guide/api.md`, when
  `assertLocaleComplete` runs, then it throws naming `xx/guide/api.md`.
- Given a fixture tree where `xx` lacks only `parity.md` and `showcase/dot.md`,
  then it does not throw.
- Given a fixture locale module, when `navFor('/xx', ui)` runs, then
  `/xx/guide/getting-started` is prefixed, `/parity` is not, and the parity
  item's text ends with `ui.englishOnly`.
- `stringsForLang('zz-ZZ')` returns `EN_COMPONENTS`.

## Quality bar

Gates in [README](../README.md#quality-gates). Every new file carries
`// SPDX-License-Identifier: EPL-2.0`. Complexity hook limits apply
(30 NLOC functions). No `any`.

## Observability

N/A — no new observable operations. Baseline measurements go to the journal.

## Rollback

Reversible — revert restores the hard-coded English config.

## Commit

`feat(docs): add a locale registry and completeness gate to the site`
