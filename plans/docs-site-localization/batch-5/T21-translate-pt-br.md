<!-- SPDX-License-Identifier: EPL-2.0 -->
# T21 — Translate the docs site into Brazilian Portuguese (`pt-br`, `pt-BR`)

Follow [T6](../batch-2/T6-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `pt-br`.
Subagents read the reviewed German page alongside the English source.
Unlike German, a lint failure that survives one re-dispatch **quarantines
this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/pt-br.ts`
and `site/pt-br/` for tone and formality.

## Write-set

`docs-site/pt-br/**`, `docs-site/.vitepress/locales/pt-br.ts`,
`docs-site/.vitepress/locales/goldens/pt-br.json`.

## Acceptance criteria

- Given T21, when `npm test` runs, then translation lint passes for `pt-br`.
- Given T21, when `npm run docs:build` runs, then `dist/pt-br/` has 22 pages
  plus `showcase/`.
- `npm run docs:i18n-status` reports `pt-br`: 0 missing, 0 stale, 0 missing
  golden ids.

## Observability / Rollback

N/A. Reversible — revert de-registers the locale.

## Commit

`feat(docs): translate the docs site into brazilian portuguese` — glossary terms
in the body.
