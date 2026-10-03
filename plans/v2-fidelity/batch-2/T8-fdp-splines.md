# T8: fdp splines dispatch

## Context

Port `fdpSplines` (`src/layout/fdp/index.ts:55-64`) collapses C's dispatch into
one `splineEdges(g)` call. C (`~/git/graphviz/lib/fdpgen/layout.c:1034-1060`):
`et > EDGETYPE_ORTHO` → if COMPOUND: `splineEdges(g, compoundEdges, ...)`, set
Nop; then if `HAS_CLUST_EDGE(g)`: warn "splines and cluster edges not supported -
using line segments" and use LINE, else `spline_edges1(g, et)`; finally `if
(State < GVSPLINES) spline_edges1(g, et)`. Native output changes with
`splines=compound` on a 2-cluster graph (journal row 1).

## Task

1. Port the dispatch faithfully (branch order, Nop/State handling as far as the
   port models them; journal any mapping).
2. The `EDGETYPE_COMPOUND` branch → loud (`compoundEdges` is unported). Loud check: `throw new RenderError(`<attr>=<value>: <what> is not supported yet`, 'UNSUPPORTED_FEATURE')` from `src/errors.ts`, placed where C branches into the feature (ADR-3). Step 0 (ADR-4): first confirm on a discriminating fixture that native output differs from the port; journal the Δ.
3. Port the `HAS_CLUST_EDGE` warning + LINE fallback (`console.warn`, C text).
4. Oracle: graphs with `splines=true` / `ortho` / `line` / none, with and
   without clusters, must be unchanged from today **and** match native where
   they matched before.

## Write-set

`src/layout/fdp/index.ts`, `src/layout/fdp/splines-dispatch.test.ts` (new).

## Acceptance criteria

- `splines=compound` with clusters → `UNSUPPORTED_FEATURE` naming it.
- A graph with a cluster-endpoint edge and `splines=true` emits C's warning and
  routes straight lines, matching native.
- All existing fdp tests are green; outputs for non-compound graphs are
  byte-identical to before.

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

`feat(fdp)!: port the splines dispatch; fail loudly on splines=compound`
