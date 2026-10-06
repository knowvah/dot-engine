<!-- SPDX-License-Identifier: EPL-2.0 -->
# T15 — Translate the docs site into Italian (`it`, `it-IT`)

Follow [T6](../batch-2/T6-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `it`.
Subagents read the reviewed German page alongside the English source.
Unlike German, a lint failure that survives one re-dispatch **quarantines
this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/it.ts`
and `site/it/` for tone and formality.

## Write-set

`docs-site/it/**`, `docs-site/.vitepress/locales/it.ts`,
`docs-site/.vitepress/locales/goldens/it.json`.

## Acceptance criteria

- Given T15, when `npm test` runs, then translation lint passes for `it`.
- Given T15, when `npm run docs:build` runs, then `dist/it/` has 22 pages
  plus `showcase/`.
- `npm run docs:i18n-status` reports `it`: 0 missing, 0 stale, 0 missing
  golden ids.

## Observability / Rollback

N/A. Reversible — revert de-registers the locale.

## Commit

`feat(docs): translate the docs site into italian` — glossary terms
in the body.
