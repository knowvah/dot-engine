# T3: `GvcContext` registry errors

## Context

Read the repo `CLAUDE.md` and `../decisions.md` (ADR-3, ADR-4, ADR-5).
`src/gvc/context.ts` throws bare `Error`s for:
- an unregistered renderer format (`bestRenderer`, ~line 212);
- an unknown `layout` graph attribute (`layout`, ~line 232);
- an unregistered engine name (`layout` ~238, `freeLayout` ~256).

C reference for the attribute case: `lib/gvc/gvlayout.c:66-73` (gvLayoutJobs).

## Task

1. **Unknown engine argument** (`engineName` not in `this.layouts`):
   `invalidArgValue('engine', name, [...registered names])`.
   - This check now runs **before** the `layout` attribute override.
   - Consequence: `ctx.layout(g, 'nope')` fails even when the graph's `layout=`
     attribute names a valid engine. That is intended (misuse) and listed in
     `../reclassification.md`. Add a test for it.
2. **Unknown `layout=` attribute:**
   `new RenderError('Layout type: "<attr>" not recognized', 'UNKNOWN_LAYOUT')`
   (type `semantic`).
3. **Unknown format** in `bestRenderer`:
   `invalidArgValue('format', format, [...registered format prefixes])`.
4. `freeLayout` unknown engine: same as (1).
5. Argument type checks on `layout`, `freeLayout`, `bestRenderer`:
   - `g` must be a non-null object (the existing test doubles pass partial graphs;
     check `typeof g === 'object' && g !== null` only);
   - names must be strings.
6. **Do not fix, journal only:** `freeLayout` cleans up with the *argument's* engine
   even when the `layout=` attribute overrode it in `layout()`. That looks like a
   pre-existing defect; record it in the journal as a follow-up.

## Write-set

`src/gvc/context.ts`, `src/gvc/context.test.ts`

## Read-set

- `src/gvc/context.ts:180-262`
- `src/errors.ts` (T1 output)
- `~/git/graphviz/lib/gvc/gvlayout.c:50-90`
- `../decisions.md` ADR-3…5

## Interface contract (input from T1)

`invalidArgType`, `invalidArgValue`, `RenderError(message, code?, options?)`.

## Acceptance criteria

- `ctx.layout(g, 'nope')` throws a `TypeError` with `code === 'ERR_INVALID_ARG_VALUE'`
  whose message lists the registered engines, even if `g` has `layout=dot`.
- A graph with `layout=nope` laid out with `'dot'` throws `RenderError` with
  `code === 'UNKNOWN_LAYOUT'` and `type === 'semantic'`.
- A graph with `layout=neato` laid out with `'dot'` still uses neato (C behaviour
  unchanged).
- `ctx.bestRenderer('pdf')` throws a `TypeError` `ERR_INVALID_ARG_VALUE`.
- Existing `context.test.ts` tests stay green; update only assertions on the old
  bare-`Error` messages and journal each.

## Quality bar

TDD; strict TS; ADR-2 syntax; both type-checks; ≥90% coverage of changed lines.

## Observability

N/A — no new observable operations.

## Rollback

Reversible (revert commit).

## Boundaries

Do not change plugin sorting, registration, or the attribute-override semantics
beyond check order (1). Do not edit callers (`src/index.ts` etc.; T8).

## Commit

`feat(errors): classify GvcContext registry failures`
