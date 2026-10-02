# T6: `/api` entry points

## Context

Read the repo `CLAUDE.md` and `../decisions.md` (ADR-3, ADR-4, ADR-5). The
`@knowvah/dot-engine/api` surface (`createGraph`, the builder and its handles,
`getLayout`, `addEdge`) has no argument checks today:
- `getLayout(null)` and `addEdge(null, …)` throw raw TypeErrors with no `code`;
- `getLayout` on a graph that hasn't been laid out throws
  `RenderError GENERIC_ERROR`;
- builder creation failures throw `RenderError GENERIC_ERROR`.

## Task

1. **Argument checks (ADR-3) at every public function and builder/handle method:**
   - `createGraph(opts?)`: `opts` is `undefined` or an object; check the documented
     fields' types.
   - `GvGraphBuilder.addNode/addEdge/addSubgraph/setAttr/setHtmlAttr/getAttr`,
     `GvNode`/`GvEdge` `setAttr`/`setHtmlAttr`/`getAttr`: names and keys are
     strings, values are strings, `attrs` is `undefined` or a plain object of
     strings, node refs are a string or a handle from this library.
   - `getLayout(g, opts?)`: `g` is a non-null object; `opts.yAxis` ∈ `'up'|'down'`,
     otherwise `invalidArgValue`.
   - `addEdge(g, tail, head, name?)`: non-null objects; `name` is `undefined` or a
     string.

   Use T1's `invalidArgType` / `invalidArgValue`. Keep the checks cheap: `typeof`
   and `null` only, no deep validation.
2. `getLayout` before layout → `invalidState('getLayout requires a laid-out graph; …')`
   (keep the current message text), replacing `RenderError GENERIC_ERROR`.
3. Builder `agnode`/`agsubg` returning `null` (`builder.ts` ~152, ~207, ~237) →
   `InternalError` with the same messages. With `create=true` those calls cannot fail
   for valid input, so a `null` is an invariant breach.

## Write-set

`src/api/geometry.ts`, `src/api/edge-ops.ts`, `src/api/builder.ts`,
`src/api/errors.test.ts` (new).

## Read-set

- `src/errors.ts` (T1 output)
- `src/api/builder.ts:20-110` (interfaces) and `:140-280`
- `src/api/geometry.ts:400-430`
- `src/api/edge-ops.ts:60-115`
- the existing `src/api/*.test.ts`: assertions on the old `RenderError` for
  "not laid out" need updating. Those tests are outside the write-set, so **report
  which tests break, and do not edit them**. If any break, that is stop condition 1
  and the executor decides.

## Interface contract (input from T1)

`invalidArgType`, `invalidArgValue`, `invalidState`, `InternalError`.

## Acceptance criteria

- `getLayout(null as never)` throws a `TypeError` with `code === 'ERR_INVALID_ARG_TYPE'`.
- `getLayout` on a parsed but not laid-out graph throws an `Error` with
  `code === 'ERR_INVALID_STATE'`, and `e instanceof DotEngineError` is false.
- `getLayout(g, { yAxis: 'sideways' as never })` throws `ERR_INVALID_ARG_VALUE`.
- `createGraph().addNode(42 as never)` throws `ERR_INVALID_ARG_TYPE`.
- Valid builder flows and `addEdge` behaviour are unchanged; existing tests are green
  except any pre-reported "not laid out" assertion.

## Quality bar

TDD; strict TS; ADR-2 syntax; both type-checks; ≥90% coverage of changed lines.

## Observability

N/A — no new observable operations.

## Rollback

Reversible (revert commit). Contract changes are listed in `../reclassification.md`.

## Boundaries

No changes to geometry math, builder semantics or strict-graph edge dedup.

## Commit

`feat(errors): validate /api arguments and classify state misuse`
