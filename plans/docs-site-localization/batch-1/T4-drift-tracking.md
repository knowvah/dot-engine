<!-- SPDX-License-Identifier: EPL-2.0 -->
# T4 — Drift tracking: sourceHash, stale banner, status report

## Context

[decisions.md#drift](../decisions.md#drift): translated pages record the
SHA-256 of their English source; a mismatch shows a localized banner and is
listed by `npm run docs:i18n-status`. The build never fails on staleness.

## Task

1. `scripts/i18n-hash.mjs`: `englishSourceFor(localePagePath)` (maps
   `docs-site/<p>/conformance.md` → `docs/conformance.md`,
   `<p>/divergences.md` → `docs/known-divergences.md`, else
   `docs-site/<rel>`) and `hashSource(path)` → sha256 hex of file bytes. CLI:
   `node scripts/i18n-hash.mjs <path>` prints the hash.
2. Stale detection at build time: expose a per-page `stale` flag to the
   client. Preferred: a `transformPageData` hook **inside T4's own module**
   that `config.ts` would need to call — `config.ts` is T1's file, so instead
   compute staleness in a VitePress data loader or in `StaleBanner.vue` from
   a generated `.vitepress/i18n-hashes.json` written by the status script
   at `docs:build` time. Pick the approach that stays inside this
   write-set; journal the choice.
3. `StaleBanner.vue` registered in `theme/index.ts` via a layout slot
   (`doc-before`); renders `staleNotice` + link (`staleLink`) to the English
   page when stale; nothing on root locale.
4. `scripts/docs-i18n-status.mjs` + `package.json` scripts
   `docs:i18n-status`; also hook the hashes file into `docs:build`/`docs:dev`.
   Reports per locale: missing pages, stale pages, missing golden ids (via
   T3's `localizeGoldens`). Exit 0 always.

## Write-set

`scripts/i18n-hash.mjs`, `scripts/docs-i18n-status.mjs`,
`docs-site/.vitepress/theme/StaleBanner.vue`,
`docs-site/.vitepress/theme/index.ts`, `package.json`,
`test/docs/i18n-status.test.ts`. (`.gitignore` for the generated
`i18n-hashes.json` is T3's — see T3 task 4.)

## Read-set

`package.json:55-90`, `theme/index.ts`, `theme/strings.ts`, `i18n.ts` (T1),
T3's `localizeGoldens` export.

## Interface contracts (outputs)

`hashSource(path: string): string` (lowercase hex, 64 chars);
`englishSourceFor(localePath: string): string` — consumed by T5 and the
translation subagents' CLI usage.

## Acceptance criteria

- Given a fixture page whose `sourceHash` equals `hashSource(english)`, when
  status runs, then it is not listed as stale; after editing the English
  fixture, it is.
- Given `docs-site/xx/divergences.md`, then `englishSourceFor` returns
  `docs/known-divergences.md`.
- Given a stale page on a registered locale, when the site builds, then the
  rendered HTML contains the localized notice and a link to the English URL.
- `npm run docs:i18n-status` exits 0 with stale pages present.

## Quality bar / Observability / Rollback

Gates per README. Observability N/A (the status script *is* the signal).
Reversible.

## Commit

`feat(docs): flag translations that lag their English source`
