# T7: neato `overlap=voronoi` loud

## Context

`src/layout/neato/fdp-adjust.ts` `adjustNodesFull` (~115) dispatches overlap
modes: prism and the scale family are ported. `voronoi` falls through without
removing overlaps (Δ 4.97 against native with 3×2 boxes, journal row 1). C:
`~/git/graphviz/lib/neatogen/adjust.c:removeOverlapWith` / `adjustNodes`
(`AM_VOR`). The fdp path already throws for unported modes
(`src/layout/fdp/xlayout.ts:~336`); keep the two consistent.

## Task

Loud check: `throw new RenderError(`<attr>=<value>: <what> is not supported yet`, 'UNSUPPORTED_FEATURE')` from `src/errors.ts`, placed where C branches into the feature (ADR-3). Step 0 (ADR-4): first confirm on a discriminating fixture that native output differs from the port; journal the Δ.
Throw only when C would actually run the Voronoi adjuster: mirror C's
short-circuits (fewer than 2 nodes; an already overlap-free layout if C checks
that first; read `adjustNodes`). Also check which other `overlap=` values map
to AM_VOR in C's `getAdjustMode` table (e.g. `true`? `false`?), and only
make loud those that select an **unported** mode; journal the mapping table you
find.

## Write-set

`src/layout/neato/fdp-adjust.ts`, `src/layout/neato/overlap-voronoi.test.ts` (new).

## Acceptance criteria

- Overlapping boxes with `overlap=voronoi` → `UNSUPPORTED_FEATURE` naming it.
- Every `overlap=` value that maps to a ported mode is unchanged (existing
  overlap tests green).
- A 1-node graph with `overlap=voronoi` does not throw (C short-circuits).

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

`feat(neato)!: fail loudly on overlap=voronoi`
