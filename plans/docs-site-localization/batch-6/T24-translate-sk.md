<!-- SPDX-License-Identifier: EPL-2.0 -->
# T24 — Translate the docs site into Slovak (`sk`, `sk-SK`)

Follow [T6](../batch-2/T6-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `sk`.
Subagents read the reviewed German page alongside the English source.
Unlike German, a lint failure that survives one re-dispatch **quarantines
this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/sk.ts`
and `site/sk/` for tone and formality.

## Write-set

`docs-site/sk/**`, `docs-site/.vitepress/locales/sk.ts`,
`docs-site/.vitepress/locales/goldens/sk.json`.

## Acceptance criteria

- Given T24, when `npm test` runs, then translation lint passes for `sk`.
- Given T24, when `npm run docs:build` runs, then `dist/sk/` has 22 pages
  plus `showcase/`.
- `npm run docs:i18n-status` reports `sk`: 0 missing, 0 stale, 0 missing
  golden ids.

## Observability / Rollback

N/A. Reversible — revert de-registers the locale.

## Commit

`feat(docs): translate the docs site into slovak` — glossary terms
in the body.
