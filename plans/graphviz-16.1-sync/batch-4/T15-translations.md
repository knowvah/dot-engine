# T15 — Re-translate `divergences.md` into 23 locales

**Agent:** 4 × technical-writer in parallel, ~6 locales each (disjoint files).
**Depends on:** T13. **Rollback:** Reversible.
**Observability:** N/A. `npm run docs:i18n-status` reports stale pages.

## Context

AD-8. `docs-site/divergences.md` includes `docs/known-divergences.md`. Each
`docs-site/<locale>/divergences.md` is a full translation with `sourceHash:`
front matter (SHA-256 of the English source; `node scripts/i18n-hash.mjs <path>`).
The translation lint (`test/docs/translation-lint.test.ts`) requires the same
code fences (count, info strings, bodies), the same heading structure, and
valid internal links. Since the last translation, the English source changed in
§A3/§A8 (closed in plantuml-tracker-2, `ba8a5ee0`) and in everything T13 changed.
Rules: `plans/docs-site-localization/translation-spec.md` (read in full: register,
glossary, what stays English). Locales: `ls docs-site/.vitepress/locales/` (23).

## Task (per agent, for its locales)

1. Diff the English source since the locale's `sourceHash` was computed (find the
   commit whose English bytes hash to it), and re-translate only the changed
   sections, keeping untouched translated prose.
2. Follow the spec's hard rules exactly: fences byte-identical to English,
   anchors per the spec, glossary terms.
3. Set `sourceHash` to the current English hash.
4. Run `npx vitest run test/docs` for the agent's locales.

Assignment: sort the locale prefixes and split them into 4 contiguous groups.
The orchestrator lists them in the journal before dispatch.

## Acceptance

- Given all 23 locales, when `npx vitest run test/docs` runs, then it is green.
- Given `npm run docs:i18n-status`, then 0 stale `divergences.md` pages.
- Given a locale, then only the sections the English changed differ from the
  previous translation (spot-check 3 locales).

## Write-set

`docs-site/<locale>/divergences.md` for the agent's assigned locales only.

## Commit

One commit by the orchestrator after all 4 agents return:
`docs(i18n): re-translate divergences for graphviz 16.1 and closed A3/A8`
