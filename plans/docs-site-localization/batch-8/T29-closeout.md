<!-- SPDX-License-Identifier: EPL-2.0 -->
# T29 — Closeout

## Task

1. `test/docs/goldens-i18n.test.ts`: add a hard assertion that every
   registered locale's `goldens/<p>.json` covers every id in
   `test/golden/manifest.json` **as of this commit** (decision 2 — later
   additions fall back; the assertion compares against a frozen id list
   written into the test, not the live manifest).
2. Measure and journal: `docs:build` wall-clock and per-locale search-index
   size vs the T1 baseline (stop condition 6 thresholds).
3. Create `docs-site/README.md` "Localization" section: adding an English
   page fails every locale until translated (or the locale module is
   removed); how `sourceHash` + `npm run docs:i18n-status` work; how to add
   a locale (module + pages + goldens file); English-only pages.
4. Journal any quarantined locale (with a comparison of the failing lint
   output) — the mission is not complete while one exists without an entry.
5. Tick every batch in the README; run all gates on a clean tree; push
   `feature/docs-site-i18n`; open a PR to `main` (never push `main`).
   PR body: locales shipped, quarantines, measurements, the review stop.

## Acceptance criteria

- Given a registered locale missing one frozen golden id, then
  `npm test` fails naming locale and id.
- Given the final tree, all gates pass and `docs:i18n-status` reports 0
  missing / 0 stale for every registered locale.
- A PR exists from `feature/docs-site-i18n` to `main`.

## Observability / Rollback

Measurements are the journal entries. Reversible.

## Commit

`test(docs): require complete golden translations for shipped locales`
(README and journal in a separate `docs(docs-site): …` commit if the write
reads cleaner split.)
