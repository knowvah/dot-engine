<!-- SPDX-License-Identifier: EPL-2.0 -->
# T20 — Translate the docs site into Polish (`pl`, `pl-PL`)

Follow [T6](../batch-2/T6-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `pl`.
Subagents read the reviewed German page alongside the English source.
Unlike German, a lint failure that survives one re-dispatch **quarantines
this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/pl.ts`
and `site/pl/` for tone and formality.

## Write-set

`docs-site/pl/**`, `docs-site/.vitepress/locales/pl.ts`,
`docs-site/.vitepress/locales/goldens/pl.json`.

## Acceptance criteria

- Given T20, when `npm test` runs, then translation lint passes for `pl`.
- Given T20, when `npm run docs:build` runs, then `dist/pl/` has 22 pages
  plus `showcase/`.
- `npm run docs:i18n-status` reports `pl`: 0 missing, 0 stale, 0 missing
  golden ids.

## Observability / Rollback

N/A. Reversible — revert de-registers the locale.

## Commit

`feat(docs): translate the docs site into polish` — glossary terms
in the body.
