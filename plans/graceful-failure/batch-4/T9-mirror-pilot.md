<!-- SPDX-License-Identifier: EPL-2.0 -->
# T9: Mirror pilot. Structured, contextual throws

## Context

The public error contract is in `src/errors.ts`: `GvError`, `GvErrorCode`
(a closed union), `FRIENDLY_MESSAGES`, `RenderError(message, code)` and
`InternalError`. `tryRenderSvg` (`src/index.ts`) returns
`{ errors: [GvError] }`. The maintainer ruled (structured-errors mission)
that thrown-error wording may diverge from C. D3 says `agerr` and stderr
text stays verbatim, because sweeps compare it.
`plans/graceful-failure/batch-4/mirror-sites.md` (from T7) lists the sites,
codes, messages, context fields, inputs and test files.

## Task

For each row in `mirror-sites.md`, **test first** (red, then green):
1. A test renders the row's triggering DOT input through `tryRenderSvg` and
   asserts `errors[0].code`, `errors[0].message` and the context fields.
2. Change the throw at the site to produce that structured error.
   - Context goes in an optional `context?: Record<string, string>` field
     on `GvError` **only if** the table uses context. If so, add it to
     `GvError`, `DotEngineError`, `RenderError`'s constructor options and
     `classifyError` (`src/index.ts`) in this task, and record it in the
     journal as the one interface change.
   - Keep `@see` tags, and keep every `agerr` call and its text exactly as
     it is.
3. Each new `GvErrorCode` gets a `FRIENDLY_MESSAGES` entry, a comment on
   the union member, and a release-note line in the journal:
   "exhaustive switches over GvErrorCode must add a case".
4. Targeted sweep: a fresh run of the engines and formats the sites touch,
   against the carried oracle. 0 regressions, and stderr byte-identical on
   those ids.

## Write-set

`src/errors.ts`, `src/errors.test.ts`, and exactly the files in
`mirror-sites.md`. **If `context` needs `src/index.ts` and it is not in the
table, that is stop 1.** T7 should list it.

## Read-set

- `plans/graceful-failure/batch-4/mirror-sites.md`
- `src/errors.ts`
- `src/index.ts:30-60`
- `src/error-contract.test.ts` (the existing contract tests; extend that
  style)

## Acceptance criteria

- Given each site's triggering input, when `tryRenderSvg` runs, then
  `errors[0].code`, the message and the context equal the table's values.
- Given the same inputs, when stderr is compared with the carried oracle,
  then it is byte-identical.
- Given any new code, when `FRIENDLY_MESSAGES` is checked, then it has an
  entry, and the release-note line is in the journal.
- Given the targeted sweep, when run, then there are 0 regressions.

## Quality bar

- TypeScript strict, no `any`.
- 90% coverage holds on `src/errors.ts`.
- Browser-safe: no Node APIs.
- Lizard limits apply.

## Observability

N/A: there is no logging in library code. Error codes are the observable
surface.

## Rollback

Reversible.

## Commit

`feat(errors): structured contextual errors at mirror pilot sites`, with a
body listing the sites and any new codes.
