<!-- SPDX-License-Identifier: EPL-2.0 -->
# T13 — Translate the docs site into Hungarian (`hu`, `hu-HU`)

Follow [T6](../batch-2/T6-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `hu`.
Subagents read the reviewed German page alongside the English source.
Unlike German, a lint failure that survives one re-dispatch **quarantines
this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/hu.ts`
and `site/hu/` for tone and formality.

## Write-set

`docs-site/hu/**`, `docs-site/.vitepress/locales/hu.ts`,
`docs-site/.vitepress/locales/goldens/hu.json`.

## Acceptance criteria

- Given T13, when `npm test` runs, then translation lint passes for `hu`.
- Given T13, when `npm run docs:build` runs, then `dist/hu/` has 22 pages
  plus `showcase/`.
- `npm run docs:i18n-status` reports `hu`: 0 missing, 0 stale, 0 missing
  golden ids.

## Observability / Rollback

N/A. Reversible — revert de-registers the locale.

## Commit

`feat(docs): translate the docs site into hungarian` — glossary terms
in the body.
