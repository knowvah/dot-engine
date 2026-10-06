<!-- SPDX-License-Identifier: EPL-2.0 -->
# T26 — Translate the docs site into Turkish (`tr`, `tr-TR`)

Follow [T6](../batch-2/T6-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `tr`.
Subagents read the reviewed German page alongside the English source.
Unlike German, a lint failure that survives one re-dispatch **quarantines
this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/tr.ts`
and `site/tr/` for tone and formality.

## Write-set

`docs-site/tr/**`, `docs-site/.vitepress/locales/tr.ts`,
`docs-site/.vitepress/locales/goldens/tr.json`.

## Acceptance criteria

- Given T26, when `npm test` runs, then translation lint passes for `tr`.
- Given T26, when `npm run docs:build` runs, then `dist/tr/` has 22 pages
  plus `showcase/`.
- `npm run docs:i18n-status` reports `tr`: 0 missing, 0 stale, 0 missing
  golden ids.

## Observability / Rollback

N/A. Reversible — revert de-registers the locale.

## Commit

`feat(docs): translate the docs site into turkish` — glossary terms
in the body.
