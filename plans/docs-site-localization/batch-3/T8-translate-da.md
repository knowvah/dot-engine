<!-- SPDX-License-Identifier: EPL-2.0 -->
# T8 — Translate the docs site into Danish (`da`, `da-DK`)

Follow [T6](../batch-2/T6-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `da`.
Subagents read the reviewed German page alongside the English source.
Unlike German, a lint failure that survives one re-dispatch **quarantines
this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/da.ts`
and `site/da/` for tone and formality.

## Write-set

`docs-site/da/**`, `docs-site/.vitepress/locales/da.ts`,
`docs-site/.vitepress/locales/goldens/da.json`.

## Acceptance criteria

- Given T8, when `npm test` runs, then translation lint passes for `da`.
- Given T8, when `npm run docs:build` runs, then `dist/da/` has 22 pages
  plus `showcase/`.
- `npm run docs:i18n-status` reports `da`: 0 missing, 0 stale, 0 missing
  golden ids.

## Observability / Rollback

N/A. Reversible — revert de-registers the locale.

## Commit

`feat(docs): translate the docs site into danish` — glossary terms
in the body.
