<!-- SPDX-License-Identifier: EPL-2.0 -->
# T6 — Translate the docs site into German (worked example)

## Context

The first locale. Every later locale copies its conventions, so it is
reviewed by the user before batch 3 (stop condition 4). Follow
[translation-spec.md](../translation-spec.md) in full; it is the subagent
prompt's core.

## Procedure (orchestrator)

1. Decide the `de` `ui` labels, `components` strings, and `englishOnly`
   marker. Cross-check tone against
   `~/git/knowvah/dot-atlassian/site/.vitepress/locales/de.ts` (formal *Sie*).
   Fill the German glossary column in `translation-spec.md` (the only locale
   that edits the table).
2. Dispatch three Sonnet subagents in one message — parts a, b, c from
   [the page split](../translation-spec.md#page-split). Each prompt =
   translation-spec.md + the decided `ui`/`components`/glossary + its
   write-set + "Return only the list of files written and any rule you could
   not satisfy — no preamble, no trailing summary."
3. When all three return: write `docs-site/.vitepress/locales/de.ts`, run the
   gates. A lint failure inside one part → re-dispatch that subagent once
   with the failing assertions; a second failure → stop condition 8 rules
   (quarantine) — for German, quarantine means the mission stops.
4. Commit (one commit), then **stop for user review**. Report: page count,
   glossary, any wording judgment calls, `docs:i18n-status` output, build
   time vs baseline.

## Write-set

`docs-site/de/**` (22 pages), `docs-site/.vitepress/locales/de.ts`,
`docs-site/.vitepress/locales/goldens/de.json`,
`plans/docs-site-localization/translation-spec.md` (glossary column only).

## Read-set

English sources per the page split; `docs/conformance.md`,
`docs/known-divergences.md`; `test/golden/manifest.json`;
dot-atlassian `site/de/` for register only.

## Acceptance criteria

- Given T6, when `npm test` runs, then the translation lint passes for `de`
  with zero exceptions.
- Given T6, when `npm run docs:build` runs, then it passes and `dist/de/`
  contains the 22 pages plus `showcase/` (9 pages).
- Given `/de/playground`, then the export buttons show the `de.components`
  strings and the prose names the same strings.
- `npm run docs:i18n-status` reports `de`: 0 missing, 0 stale, 0 missing
  golden ids.

## Observability / Rollback

Observability N/A. Reversible — revert de-registers German.

## Commit

`feat(docs): translate the docs site into german`
