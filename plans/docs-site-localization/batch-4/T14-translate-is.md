<!-- SPDX-License-Identifier: EPL-2.0 -->
# T14 — Translate the docs site into Icelandic (`is`, `is-IS`)

Follow [T6](../batch-2/T6-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `is`.
Subagents read the reviewed German page alongside the English source.
Unlike German, a lint failure that survives one re-dispatch **quarantines
this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/is.ts`
and `site/is/` for tone and formality.

## Write-set

`docs-site/is/**`, `docs-site/.vitepress/locales/is.ts`,
`docs-site/.vitepress/locales/goldens/is.json`.

## Acceptance criteria

- Given T14, when `npm test` runs, then translation lint passes for `is`.
- Given T14, when `npm run docs:build` runs, then `dist/is/` has 22 pages
  plus `showcase/`.
- `npm run docs:i18n-status` reports `is`: 0 missing, 0 stale, 0 missing
  golden ids.

## Observability / Rollback

N/A. Reversible — revert de-registers the locale.

## Commit

`feat(docs): translate the docs site into icelandic` — glossary terms
in the body.
