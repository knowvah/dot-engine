<!-- SPDX-License-Identifier: EPL-2.0 -->
# T23 — Translate the docs site into Russian (`ru`, `ru-RU`)

Follow [T6](../batch-2/T6-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `ru`.
Subagents read the reviewed German page alongside the English source.
Unlike German, a lint failure that survives one re-dispatch **quarantines
this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/ru.ts`
and `site/ru/` for tone and formality.

## Write-set

`docs-site/ru/**`, `docs-site/.vitepress/locales/ru.ts`,
`docs-site/.vitepress/locales/goldens/ru.json`.

## Acceptance criteria

- Given T23, when `npm test` runs, then translation lint passes for `ru`.
- Given T23, when `npm run docs:build` runs, then `dist/ru/` has 22 pages
  plus `showcase/`.
- `npm run docs:i18n-status` reports `ru`: 0 missing, 0 stale, 0 missing
  golden ids.

## Observability / Rollback

N/A. Reversible — revert de-registers the locale.

## Commit

`feat(docs): translate the docs site into russian` — glossary terms
in the body.
