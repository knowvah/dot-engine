# T1: error foundation (`src/errors.ts`)

## Context

dot-engine is a faithful TypeScript port of Graphviz (read the repo `CLAUDE.md`).
Its structured-error contract lives in `src/errors.ts`: the `GvError` interface,
`GvErrorCode`, `FRIENDLY_MESSAGES` and `RenderError`. This task builds the hierarchy
every later task uses. **No caller changes in this task.** Locked design:
`../decisions.md` (read ADR-1…ADR-6 before starting).

## Task

In `src/errors.ts`:

1. `export abstract class DotEngineError extends Error implements GvError`:
   - abstract (or constructor-supplied) `type` and `code`; `friendlyMessage`;
   - constructor accepts `(message: string, options?: ErrorOptions)` and forwards to
     `super(message, options)`.
2. `export class InternalError extends DotEngineError`: `type 'render'`, code
   `INTERNAL_ERROR`, `this.name = 'InternalError'`, `(message, options?)`.
3. `RenderError` now extends `DotEngineError`:
   - keep its current call shape `(message, code = 'RENDER_ERROR')` working;
   - add `options?: ErrorOptions` as the last parameter;
   - allow `UNKNOWN_LAYOUT` and `UNSUPPORTED_FEATURE` with `type 'semantic'`
     (ADR-4, ADR-4a). The shape is your choice within ADR-2, e.g. derive `type` from
     `code`.
4. Add `INTERNAL_ERROR`, `UNKNOWN_LAYOUT` and `UNSUPPORTED_FEATURE` (ADR-4a) to
   `GvErrorCode` and `FRIENDLY_MESSAGES`; `UNKNOWN_LAYOUT` and `UNSUPPORTED_FEATURE`
   are type `semantic`.
   `INTERNAL_ERROR`'s friendly text says it is a dot-engine bug and asks for a report.
5. Usage errors (ADR-3), not `DotEngineError`, not `GvError`:
   - export the type `UsageErrorCode = 'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE'
     | 'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE'`;
   - add internal subclasses of `TypeError` / `RangeError` / `Error` with a
     `readonly code`, keeping the standard `name`;
   - export these factories:
     - `invalidArgType(param: string, expected: string, actual: unknown): TypeError`
       (message names `param`, `expected`, and a short description of `actual`'s
       type/value: `null`, `undefined`, `number 42`, …);
     - `invalidArgValue(param: string, value: unknown, allowed: readonly string[]): TypeError`;
     - `outOfRange(param: string, range: string, value: number): RangeError`;
     - `invalidState(message: string): Error`;
     - `isUsageError(e: unknown): boolean` (an instance with one of the four codes).
6. `export function isGvError(e: unknown): e is GvError`: object with string `type`
   and string `code`. This becomes the one shared guard (ADR-6). Do not touch the
   existing `isGvErrorLike` copies elsewhere; T8 removes them.

## Write-set

`src/errors.ts`, `src/errors.test.ts` (create if absent; if a test file for
errors exists under another name, extend that one instead and journal it).

## Read-set

- `src/errors.ts` (whole, ~100 lines)
- `../decisions.md` ADR-1…6
- `src/parser/index.ts:20-55` and `src/common/htmltable-types.ts:10-35`: the
  current subclasses; their constructors must stay compatible for T2.

## Interface contract (output, consumed by T2–T8)

```ts
export abstract class DotEngineError extends Error implements GvError { /* ADR-1 */ }
export class InternalError extends DotEngineError { constructor(message: string, options?: ErrorOptions) }
export class RenderError extends DotEngineError {
  constructor(message: string, code?: GvErrorCode, options?: ErrorOptions)
}
export type UsageErrorCode = 'ERR_INVALID_ARG_TYPE' | 'ERR_INVALID_ARG_VALUE' | 'ERR_OUT_OF_RANGE' | 'ERR_INVALID_STATE';
export function invalidArgType(param: string, expected: string, actual: unknown): TypeError;
export function invalidArgValue(param: string, value: unknown, allowed: readonly string[]): TypeError;
export function outOfRange(param: string, range: string, value: number): RangeError;
export function invalidState(message: string): Error;
export function isUsageError(e: unknown): boolean;
export function isGvError(e: unknown): e is GvError;
```

Factories return values typed as the standard class and carry `code` at runtime;
`code` is visible to TS callers through the internal subclass type if you export it
as a type.

## Acceptance criteria

- Given `new InternalError('x', { cause: c })`, then:
  - `instanceof InternalError`, `DotEngineError` and `Error` are all true;
  - `name === 'InternalError'`, `code === 'INTERNAL_ERROR'`, `type === 'render'`;
  - `cause === c`.
- Given `invalidArgType('dotSource', 'string', null)`, then `instanceof TypeError`,
  `name === 'TypeError'`, `code === 'ERR_INVALID_ARG_TYPE'`, the message contains
  `dotSource` and `null`, and it is not `instanceof DotEngineError`.
- Given `invalidArgValue('engine', 'nope', ['dot','neato'])`, then `instanceof TypeError`,
  `code === 'ERR_INVALID_ARG_VALUE'`, and the message lists the allowed names.
- Given a plain object `{ type: 'syntax', code: 'SYNTAX_ERROR', message: 'm' }`, then
  `isGvError` is true; for `new TypeError('x')` it is false.
- `new RenderError('m')` still gives `code === 'RENDER_ERROR'` and is
  `instanceof DotEngineError`.
- A `// @ts-expect-error` test line proves `new DotEngineError(...)` does not compile.

## Quality bar

TDD (tests first). Strict TS, no `any`. SPDX header kept. ADR-2 syntax rules. ≥90%
coverage of `errors.ts`. Must pass `npm run typecheck` **and** `npm run typecheck:ts7`.
Complexity hook limits apply.

## Observability

N/A — no new observable operations.

## Rollback

Reversible (revert commit). Additive at this stage; nothing calls the new symbols yet.

## Boundaries

Never edit files outside the write-set. Do not export new symbols from
`src/index.ts` (T8 does). Do not change `RenderResult` or the existing codes' text.

## Commit

`feat(errors): add DotEngineError hierarchy and usage-error factories`
