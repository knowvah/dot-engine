# T1: `freeLayout` uses the cleanup recorded at layout time

## Context

Read the repo `CLAUDE.md` and `../decisions.md` ADR-5. C's `gvLayoutJobs` stores
the engine's cleanup on the graph after layout (`GD_cleanup(g) = gvle->cleanup`,
`~/git/graphviz/lib/gvc/gvlayout.c:88`). `gvFreeLayout` calls and clears it
(`:105-118`). The port's `GvcContext.freeLayout(g, engineName)` instead
cleans up with the *argument's* engine, which is wrong when the graph's
`layout=` attribute overrode it in `layout()`. The model field already exists:
`g.info.cleanup` (`src/model/graphInfo.ts:148-152`).

## Task

- In `layout()`, after `engine.layout(g)` succeeds, set `g.info.cleanup =
  (x) => engine.cleanup(x)` (if `g.info` exists, as the existing `laidOut` line
  does).
- In `freeLayout()`, keep the argument checks. Then, if `g.info?.cleanup` is
  set, call it and set it to `undefined`. Do not look up the argument's
  engine for cleanup any more.
- Check how C's `graph_cleanup(g)` (`gvlayout.c:117`) maps to the port. If the
  port's engine `cleanup` already covers it, journal that; otherwise report it
  and do not port it here.

## Write-set

`src/gvc/context.ts`, `src/gvc/free-layout.test.ts` (new).

## Read-set

`src/gvc/context.ts:260-330`, `src/model/graphInfo.ts:140-155`,
`~/git/graphviz/lib/gvc/gvlayout.c:50-120`.

## Acceptance criteria

- With two test engines registered and a graph setting `layout=b`,
  `layout(g, 'a')` then `freeLayout(g, 'a')` calls **b**'s cleanup once and
  a's never.
- After `freeLayout`, `g.info.cleanup` is `undefined`; a second
  `freeLayout` calls nothing.
- `freeLayout` on a graph that was never laid out calls no cleanup and does
  not throw (argument checks still apply).
- The existing `context.test.ts` and `context-args.test.ts` stay green.

## Quality bar

TDD (tests first). Strict TS, no `any`, SPDX header on new files, `@see` C
references on every ported symbol. Complexity limits: ≤30 NLOC/function,
CCN ≤10, ≤5 params. Run `npx tsc --noEmit --stableTypeOrdering`, `npx tsgo
--noEmit` and your own tests only; do not run npm scripts (pre-scripts race
with parallel agents). Do not git commit, push, stash or checkout.

## Observability

N/A — no new observable operations.

## Rollback

Reversible (revert commit); irreversible in practice once 2.0.0 publishes.

## Commit

`fix(gvc): free layout with the engine that actually ran`
