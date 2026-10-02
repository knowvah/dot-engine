# T7: host-hook argument checks

## Context

Read the repo `CLAUDE.md` and `../decisions.md` ADR-3. Three process-global setters
accept host callbacks with no runtime check. A wrong value fails much later, deep in
layout, with a confusing TypeError:
- `setImageSizer` (`src/gvc/usershape.ts:26`): `null` clears it;
- `setImageResolver` (`src/gvc/image-resolver.ts:39`): `null` clears it;
- `setTextMeasurer` (`src/common/textmeasure-factory.ts:35`): `undefined` clears it.

## Task

- `setImageSizer(x)`: `x` must be a function or `null`; otherwise
  `invalidArgType('sizer', 'function or null', x)`.
- `setImageResolver(x)`: a function or `null`.
- `setTextMeasurer(x)`: `undefined` or an object with a `measure` function;
  otherwise `invalidArgType('measurer', 'TextMeasurer or undefined', x)`.
- Do not change the clearing semantics or the resolution order.

## Write-set

`src/gvc/usershape.ts`, `src/gvc/image-resolver.ts`,
`src/common/textmeasure-factory.ts`, `src/gvc/hooks-errors.test.ts` (new).

## Read-set

- `src/errors.ts` (T1 output)
- the three setters ±10 lines
- `src/common/textmeasure.ts:44-55` (the `TextMeasurer` interface)

## Interface contract (input from T1)

`invalidArgType(param, expected, actual): TypeError`.

## Acceptance criteria

- `setImageSizer('x' as never)` throws a `TypeError` with `code === 'ERR_INVALID_ARG_TYPE'`.
- `setImageSizer(null)` and `setTextMeasurer(undefined)` still clear (existing
  behaviour; assert by a subsequent lookup).
- `setTextMeasurer({} as never)` throws `ERR_INVALID_ARG_TYPE`.
- Tests restore global state in `afterEach` (these are process-global).

## Quality bar

TDD; strict TS; ADR-2 syntax; both type-checks; ≥90% coverage of changed lines.

## Observability

N/A — no new observable operations.

## Rollback

Reversible (revert commit).

## Boundaries

Do not touch `createMeasurer`, the env hook, or image byte handling.

## Commit

`feat(errors): validate host hook arguments`
