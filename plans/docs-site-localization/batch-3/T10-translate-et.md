<!-- SPDX-License-Identifier: EPL-2.0 -->
# T10 — Translate the docs site into Estonian (`et`, `et-EE`)

Follow [T6](../batch-2/T6-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `et`.
Subagents read the reviewed German page alongside the English source.
Unlike German, a lint failure that survives one re-dispatch **quarantines
this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/et.ts`
and `site/et/` for tone and formality.

## Write-set

`docs-site/et/**`, `docs-site/.vitepress/locales/et.ts`,
`docs-site/.vitepress/locales/goldens/et.json`.

## Acceptance criteria

- Given T10, when `npm test` runs, then translation lint passes for `et`.
- Given T10, when `npm run docs:build` runs, then `dist/et/` has 22 pages
  plus `showcase/`.
- `npm run docs:i18n-status` reports `et`: 0 missing, 0 stale, 0 missing
  golden ids.

## Observability / Rollback

N/A. Reversible — revert de-registers the locale.

## Commit

`feat(docs): translate the docs site into estonian` — glossary terms
in the body.
