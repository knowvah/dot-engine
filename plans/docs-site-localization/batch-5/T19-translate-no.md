<!-- SPDX-License-Identifier: EPL-2.0 -->
# T19 — Translate the docs site into Norwegian (`no`, `no-NO`)

Follow [T6](../batch-2/T6-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `no`.
Subagents read the reviewed German page alongside the English source.
Unlike German, a lint failure that survives one re-dispatch **quarantines
this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/no.ts`
and `site/no/` for tone and formality.

## Locale notes

Bokmål — dot-atlassian's `site/no/` pages are written in Bokmål.

## Write-set

`docs-site/no/**`, `docs-site/.vitepress/locales/no.ts`,
`docs-site/.vitepress/locales/goldens/no.json`.

## Acceptance criteria

- Given T19, when `npm test` runs, then translation lint passes for `no`.
- Given T19, when `npm run docs:build` runs, then `dist/no/` has 22 pages
  plus `showcase/`.
- `npm run docs:i18n-status` reports `no`: 0 missing, 0 stale, 0 missing
  golden ids.

## Observability / Rollback

N/A. Reversible — revert de-registers the locale.

## Commit

`feat(docs): translate the docs site into norwegian` — glossary terms
in the body.
