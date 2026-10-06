<!-- SPDX-License-Identifier: EPL-2.0 -->
# T18 — Translate the docs site into Dutch (`nl`, `nl-NL`)

Follow [T6](../batch-2/T6-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `nl`.
Subagents read the reviewed German page alongside the English source.
Unlike German, a lint failure that survives one re-dispatch **quarantines
this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/nl.ts`
and `site/nl/` for tone and formality.

## Write-set

`docs-site/nl/**`, `docs-site/.vitepress/locales/nl.ts`,
`docs-site/.vitepress/locales/goldens/nl.json`.

## Acceptance criteria

- Given T18, when `npm test` runs, then translation lint passes for `nl`.
- Given T18, when `npm run docs:build` runs, then `dist/nl/` has 22 pages
  plus `showcase/`.
- `npm run docs:i18n-status` reports `nl`: 0 missing, 0 stale, 0 missing
  golden ids.

## Observability / Rollback

N/A. Reversible — revert de-registers the locale.

## Commit

`feat(docs): translate the docs site into dutch` — glossary terms
in the body.
