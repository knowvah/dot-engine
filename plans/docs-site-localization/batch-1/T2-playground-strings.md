<!-- SPDX-License-Identifier: EPL-2.0 -->
# T2 — Playground resolves its strings from the locale

## Context

`Playground.vue` hard-codes "Engine:", "Export SVG", "Export PNG" and aria
labels. `playground.md` tells readers to use **Export SVG**, so a German page
must name the German button — which only exists if the component is
localized ([decisions.md#components](../decisions.md#components)).

## Task

Replace every user-visible English literal in `Playground.vue` with
`stringsForLang(useData().lang.value)` lookups (T1). Error text from the
engine (`friendlyMessage`) stays as produced by the library. Extract the
lookup into a small pure function if that makes it testable without
mounting the SFC.

## Write-set

`docs-site/.vitepress/theme/Playground.vue`,
`test/docs/playground-strings.test.ts`.

## Read-set

`Playground.vue` (all), `theme/strings.ts`, `i18n.ts` (T1 outputs).

## Interface contracts

Inputs: `ComponentStrings`, `stringsForLang` from T1.

## Acceptance criteria

- Given `lang = 'de-DE'` and a registered `de` fixture with
  `exportSvg: 'SVG exportieren'`, when the strings resolve, then the export
  button text is `SVG exportieren`.
- Given the root locale, when the Playground renders, then every label equals
  today's English (no visible change on `/playground`).
- Given an unregistered `lang`, then English is used.

## Quality bar / Observability / Rollback

Gates per README. Observability N/A. Reversible.

## Commit

`feat(docs): localize the playground's controls`
