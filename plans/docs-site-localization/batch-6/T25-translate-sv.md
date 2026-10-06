<!-- SPDX-License-Identifier: EPL-2.0 -->
# T25 — Translate the docs site into Swedish (`sv`, `sv-SE`)

Follow [T6](../batch-2/T6-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `sv`.
Subagents read the reviewed German page alongside the English source.
Unlike German, a lint failure that survives one re-dispatch **quarantines
this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/sv.ts`
and `site/sv/` for tone and formality.

## Write-set

`docs-site/sv/**`, `docs-site/.vitepress/locales/sv.ts`,
`docs-site/.vitepress/locales/goldens/sv.json`.

## Acceptance criteria

- Given T25, when `npm test` runs, then translation lint passes for `sv`.
- Given T25, when `npm run docs:build` runs, then `dist/sv/` has 22 pages
  plus `showcase/`.
- `npm run docs:i18n-status` reports `sv`: 0 missing, 0 stale, 0 missing
  golden ids.

## Observability / Rollback

N/A. Reversible — revert de-registers the locale.

## Commit

`feat(docs): translate the docs site into swedish` — glossary terms
in the body.
