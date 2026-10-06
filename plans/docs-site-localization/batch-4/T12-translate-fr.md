<!-- SPDX-License-Identifier: EPL-2.0 -->
# T12 — Translate the docs site into French (`fr`, `fr-FR`)

Follow [T6](../batch-2/T6-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `fr`.
Subagents read the reviewed German page alongside the English source.
Unlike German, a lint failure that survives one re-dispatch **quarantines
this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/fr.ts`
and `site/fr/` for tone and formality.

## Write-set

`docs-site/fr/**`, `docs-site/.vitepress/locales/fr.ts`,
`docs-site/.vitepress/locales/goldens/fr.json`.

## Acceptance criteria

- Given T12, when `npm test` runs, then translation lint passes for `fr`.
- Given T12, when `npm run docs:build` runs, then `dist/fr/` has 22 pages
  plus `showcase/`.
- `npm run docs:i18n-status` reports `fr`: 0 missing, 0 stale, 0 missing
  golden ids.

## Observability / Rollback

N/A. Reversible — revert de-registers the locale.

## Commit

`feat(docs): translate the docs site into french` — glossary terms
in the body.
