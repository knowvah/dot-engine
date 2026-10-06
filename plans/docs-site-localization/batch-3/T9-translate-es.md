<!-- SPDX-License-Identifier: EPL-2.0 -->
# T9 — Translate the docs site into Spanish (`es`, `es-ES`)

Follow [T6](../batch-2/T6-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `es`.
Subagents read the reviewed German page alongside the English source.
Unlike German, a lint failure that survives one re-dispatch **quarantines
this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/es.ts`
and `site/es/` for tone and formality.

## Write-set

`docs-site/es/**`, `docs-site/.vitepress/locales/es.ts`,
`docs-site/.vitepress/locales/goldens/es.json`.

## Acceptance criteria

- Given T9, when `npm test` runs, then translation lint passes for `es`.
- Given T9, when `npm run docs:build` runs, then `dist/es/` has 22 pages
  plus `showcase/`.
- `npm run docs:i18n-status` reports `es`: 0 missing, 0 stale, 0 missing
  golden ids.

## Observability / Rollback

N/A. Reversible — revert de-registers the locale.

## Commit

`feat(docs): translate the docs site into spanish` — glossary terms
in the body.
