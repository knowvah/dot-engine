# T4: dot `nslimit` (`nsiter2`)

## Context

`src/layout/dot/position.ts:103-107` stubs `nsiter2` to `INT_MAX` ("nslimit
attribute not yet ported"). C (`~/git/graphviz/lib/dotgen/position.c:155-163`):
`maxiter = INT_MAX; if ((s = agget(g, "nslimit"))) maxiter =
scale_clamp(agnnodes(g), atof(s));`. The port already has `scaleClamp` for
`nslimit1` (`src/layout/dot/rank.ts:465-476`; reuse it, and if it is
module-private, read how it is shared before duplicating).

## Task

Port `nsiter2` exactly. Mind `agget`'s inheritance: compare how `nslimit1`
reads root defaults in `rank.ts:465-473` and do what C does for
`agget(g, "nslimit")` in the position phase.

## Oracle

Two inputs: corpus `~/git/graphviz/tests/1332.dot` (`nslimit=20`) and a
synthetic graph where a small `nslimit` (e.g. 0.01) truncates network simplex.
Compare node x-coordinates with native `dot -Tplain` ([../oracle.md](../oracle.md)).
Require ±0.01. For the synthetic graph, also show that the output *changed*
versus the stub, so the cap really bites.

## Write-set

`src/layout/dot/position.ts`, `src/layout/dot/nslimit.test.ts` (new).

## Acceptance criteria

- With `nslimit` unset, output is identical to today.
- With `nslimit=0.01` on the synthetic graph, x-coordinates match native within
  ±0.01 and differ from the uncapped output.
- `1332` stays conformant.

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

`feat(dot): honour the nslimit attribute in x-coordinate assignment`
