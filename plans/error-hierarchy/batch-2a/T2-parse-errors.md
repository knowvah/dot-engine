# T2: parse errors extend `DotEngineError`

## Context

Read the repo `CLAUDE.md` and `../decisions.md` (ADR-1, ADR-2, ADR-3). T1 added
`DotEngineError` and the usage-error factories to `src/errors.ts`. `ParseError`
(`src/parser/index.ts`) and `HtmlParseError` (`src/common/htmltable-types.ts`) still
extend `Error` directly.

## Task

1. `ParseError extends DotEngineError`. Keep its constructor signature, fields,
   `line`/`column` getters and `name = 'ParseError'`. Add an optional trailing
   `options?: ErrorOptions` forwarded to `super`.
2. `HtmlParseError extends DotEngineError`. Keep the `(tag)` constructor, message,
   `tag` field and `name`. Add optional `options?: ErrorOptions`.
3. In `parse()`: a non-string `dotSource` currently throws `ParseError` with
   `GENERIC_ERROR` ("DOT source must be a string"). It now throws
   `invalidArgType('dotSource', 'string', value)`. Find the check (search for
   "must be a string").
4. If either class redeclares `message` as a field, remove it (ADR-2).

## Write-set

`src/parser/index.ts`, `src/parser/index.test.ts`, `src/common/htmltable-types.ts`,
`src/common/htmltable-types.test.ts`

## Read-set

- `src/errors.ts` (T1 output)
- `src/parser/index.ts:1-60` and the "must be a string" check
- `src/common/htmltable-types.ts:1-35`
- `../decisions.md` ADR-1…3

## Interface contract (input from T1)

`DotEngineError`, `invalidArgType(param, expected, actual): TypeError`.

## Acceptance criteria

- `parse('digraph{')` throws a `ParseError` that is `instanceof DotEngineError`, with
  `code === 'SYNTAX_UNEXPECTED_EOF'` and the same `location` as before (existing
  tests stay green unchanged).
- `parse(null as unknown as string)` throws a `TypeError` with
  `code === 'ERR_INVALID_ARG_TYPE'` that is not a `DotEngineError`.
- `new HtmlParseError('i')` is `instanceof DotEngineError` with
  `code === 'HTML_PARSE_ERROR'` and message `Unknown HTML element <i>`.
- `new ParseError(m, c, loc, undefined, { cause: x }).cause === x`.

## Quality bar

TDD; strict TS; ADR-2 syntax; both type-checks; ≥90% coverage of changed lines.

## Observability

N/A — no new observable operations.

## Rollback

Reversible (revert commit). Contract change for `parse(non-string)`; recorded in
`../reclassification.md`.

## Boundaries

Do not change grammar, peggy output handling, edge-op validation, or any message
text other than the non-string check.

## Commit

`feat(errors): derive parse errors from DotEngineError`
