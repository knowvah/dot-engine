<!-- SPDX-License-Identifier: EPL-2.0 -->
# T11 — Translate the docs site into Finnish (`fi`, `fi-FI`)

Follow [T6](../batch-2/T6-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `fi`.
Subagents read the reviewed German page alongside the English source.
Unlike German, a lint failure that survives one re-dispatch **quarantines
this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/fi.ts`
and `site/fi/` for tone and formality.

## Write-set

`docs-site/fi/**`, `docs-site/.vitepress/locales/fi.ts`,
`docs-site/.vitepress/locales/goldens/fi.json`.

## Acceptance criteria

- Given T11, when `npm test` runs, then translation lint passes for `fi`.
- Given T11, when `npm run docs:build` runs, then `dist/fi/` has 22 pages
  plus `showcase/`.
- `npm run docs:i18n-status` reports `fi`: 0 missing, 0 stale, 0 missing
  golden ids.

## Observability / Rollback

N/A. Reversible — revert de-registers the locale.

## Commit

`feat(docs): translate the docs site into finnish` — glossary terms
in the body.
