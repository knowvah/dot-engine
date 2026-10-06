<!-- SPDX-License-Identifier: EPL-2.0 -->
# T5 — Translation lint

## Context

The locale batches produce ~500 pages written by subagents. These tests are
the mechanical half of review: what a non-reader of the language can still
verify. They run in `npm test` and are the per-locale gate.

## Task

`test/helpers/docs.ts`: list translated pages per registered locale, pair
each with its English source (`englishSourceFor`, T4), extract fenced code
blocks (info string + body), extract internal links, parse front matter.

`test/docs/translation-lint.test.ts`, for every `docs-site/<p>/**/*.md`
excluding generated `showcase/`:

1. Code fences: same count, same info strings, byte-identical bodies, same
   order as the English source.
2. Internal links: every `/…` link is `/<p>/…` unless it targets an
   English-only page (`TRANSLATABLE_EXCLUDES`, T1) or `/img/`.
3. Component strings: for each `EN_COMPONENTS` value appearing in the
   English source (case-sensitive, outside code), the page contains the
   locale's string and not the English one.
4. Front matter has `sourceHash` (64 hex chars).
5. `<Playground` / `<GoldenGallery` tags present iff present in English.

With no locales registered the suite passes trivially but must also run
against a small fixture locale under `test/docs/fixtures/` to prove each
check fails on a planted defect.

## Write-set

`test/docs/translation-lint.test.ts`, `test/helpers/docs.ts`,
`test/docs/fixtures/lint/**`.

## Read-set

T1 `i18n.ts`/`strings.ts` exports, T4 `scripts/i18n-hash.mjs` exports.

## Acceptance criteria

- Given a fixture page with one character changed inside a ```dot fence, then
  the fence check fails naming file and fence index.
- Given a fixture link `/guide/api` in locale `xx`, then the link check fails;
  `/parity` passes.
- Given a fixture page saying "Export SVG" where `xx.components.exportSvg`
  differs, then the component check fails.
- Given the current repo with no locales, `npm test` is green.

## Quality bar / Observability / Rollback

Gates per README. Observability N/A. Reversible.

## Commit

`test(docs): lint translated pages against their english source`
