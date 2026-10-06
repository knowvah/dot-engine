<!-- SPDX-License-Identifier: EPL-2.0 -->
# T7 — Translate the docs site into Czech (`cs`, `cs-CZ`)

Follow [T6](../batch-2/T6-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `cs`.
Subagents read the reviewed German page alongside the English source.
Unlike German, a lint failure that survives one re-dispatch **quarantines
this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/cs.ts`
and `site/cs/` for tone and formality.

## Write-set

`docs-site/cs/**`, `docs-site/.vitepress/locales/cs.ts`,
`docs-site/.vitepress/locales/goldens/cs.json`.

## Acceptance criteria

- Given T7, when `npm test` runs, then translation lint passes for `cs`.
- Given T7, when `npm run docs:build` runs, then `dist/cs/` has 22 pages
  plus `showcase/`.
- `npm run docs:i18n-status` reports `cs`: 0 missing, 0 stale, 0 missing
  golden ids.

## Observability / Rollback

N/A. Reversible — revert de-registers the locale.

## Commit

`feat(docs): translate the docs site into czech` — glossary terms
in the body.
