# T8: public boundaries

## Context

Read the repo `CLAUDE.md` and `../decisions.md` (all ADRs). After batch 2 every
library-originated throw is a `DotEngineError` and the registry raises usage errors.
Three boundaries still carry their own `isGvErrorLike` copy and wrap foreign throws
as `RenderError RENDER_ERROR`, dropping the original stack:
- `src/index.ts`: `renderSvg`, `tryRenderSvg`, `classifyError`;
- `src/render/public.ts`: `render`;
- `src/render/xdot-public.ts`: `getDrawOps`, `rethrowAsRender`.

## Task

1. **Argument checks before each `try` (ADR-5):**
   - `renderSvg(dotSource, engine)` and `tryRenderSvg(...)`: `dotSource` is a string
     (`invalidArgType`); `engine` is a string (`invalidArgType`). Unknown engine names
     are rejected by the registry (T3).
   - `render(g, format, opts?)`: `g` is a non-null object; `format` is a string;
     `opts` is `undefined` or an object.
   - `getDrawOps(g, opts?)`: same pattern.
2. **Boundary `catch`, identical in all three files:**
   - `isUsageError(err)` → re-throw unchanged;
   - `isGvError(err)` → re-throw unchanged;
   - anything else → `throw new InternalError(messageOf(err), { cause: err })`.
3. Delete the three local `isGvErrorLike` copies, plus `rethrowAsRender` and
   `renderErrorFromUnknown` if they become unused. Use T1's shared `isGvError`.
4. `tryRenderSvg`: returns `{ errors: [classifyError(e)] }` for `GvError`s; lets usage
   errors propagate.
   - `classifyError` keeps emitting plain JSON-serializable data with **no** `cause`
     and no stack. `cause` is non-enumerable, and the result data stays lean.
   - If a value that is neither a GvError nor a usage error reaches the result catch,
     wrap it as `InternalError` first, then classify.
5. **Exports from `src/index.ts`.** `src/errors.ts` exports `UsageTypeError`,
   `UsageRangeError` and `UsageStateError` (the factories need them); do **not**
   re-export those.
   - values: `DotEngineError`, `InternalError`, `isGvError`;
   - type: `UsageErrorCode`;
   - keep `ParseError`, `RenderError` and the existing types.
   - Do **not** export the usage-error subclasses or factories as values.
6. **TSDoc on every public function in these three files:**
   - `@throws` lists exactly what each one can throw (class + codes);
   - rewrite the `renderSvg` / `tryRenderSvg` contract text:
     - `renderSvg`: throws a `DotEngineError` for any problem with the input, and a
       `TypeError` with a `code` for invalid arguments;
     - `tryRenderSvg`: returns for any DOT input and throws only for invalid
       arguments.
7. Write `src/error-contract.test.ts`: the end-to-end contract suite (acceptance
   criteria below), table-driven, one row per entry point × error category.

## Write-set

`src/index.ts`, `src/render/public.ts`, `src/render/xdot-public.ts`,
`src/error-contract.test.ts` (new).

## Read-set

- `src/errors.ts` (T1 output)
- `src/index.ts:15-160`
- `src/render/public.ts:60-135`
- `src/render/xdot-public.ts:80-165`
- `../reclassification.md` (complete after batch 2)
- `../decisions.md`

## Interface contract (inputs)

From T1: `DotEngineError`, `InternalError`, `isGvError`, `isUsageError`,
`invalidArgType`, `UsageErrorCode`. From T3: the registry throws `TypeError`
`ERR_INVALID_ARG_VALUE` for unknown engines and formats.

## Acceptance criteria

- `tryRenderSvg('digraph{', 'dot')` returns `{ errors: [{ code: 'SYNTAX_UNEXPECTED_EOF', … }] }`.
- `tryRenderSvg('digraph{a}', 'nope')` **throws** a `TypeError` with
  `code === 'ERR_INVALID_ARG_VALUE'`.
- `renderSvg(null as never, 'dot')` throws a `TypeError` with `ERR_INVALID_ARG_TYPE`.
- `render(null as never, 'svg')` and `getDrawOps(null as never)` throw
  `ERR_INVALID_ARG_TYPE`, not "Cannot read properties of null".
- A foreign throw forced inside layout (register a test engine whose `layout` throws
  `new TypeError('boom')`) surfaces from `renderSvg` as an `InternalError` with
  `code === 'INTERNAL_ERROR'` whose `cause` is that `TypeError`. From
  `tryRenderSvg` it surfaces as `{ errors: [{ code: 'INTERNAL_ERROR' }] }` with no
  `cause` key in the data.
- `renderSvg('graph{rotation=45; a--b}', 'sfdp')` yields `UNSUPPORTED_FEATURE`
  (no unported special shape is reachable from DOT, per T5), and `layout=nope` in DOT
  yields `UNKNOWN_LAYOUT`, through every public boundary (`renderSvg`,
  `tryRenderSvg`, `render`, `getDrawOps`).

## Quality bar

TDD; strict TS; ADR-2 syntax; both type-checks; ≥90% coverage of changed lines; the
full `npm test` green. Then run the corpus gate.

## Observability

N/A — no new observable operations.

## Rollback

Reversible until 2.0.0 is published; irreversible in practice afterwards (ADR-7).

## Boundaries

Do not change rendering, layout or `RenderResult`'s shape. Do not edit README or docs
(T9).

## Commit

```
feat(errors)!: narrow public error contracts to the new hierarchy

<why: one base class for input failures, standard TypeError for misuse,
causes preserved>

BREAKING CHANGE: renderSvg throws TypeError (code ERR_INVALID_ARG_*) for
invalid arguments; tryRenderSvg now throws for invalid arguments instead of
returning them. GvErrorCode gains INTERNAL_ERROR, UNKNOWN_LAYOUT and
UNSUPPORTED_FEATURE; several failures are reclassified (see README migration).
```
