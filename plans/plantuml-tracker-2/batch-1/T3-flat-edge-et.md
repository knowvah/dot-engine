# T3 — Issue 28: flat edges honour `splines=line` / `splines=polyline`

**Agent:** typescript-pro. **Depends on:** T0. **Rollback:** Reversible.
**Observability:** N/A — no new observable operations.

## Context

plantuml-ts issue 28 (`unknown/deroxu-29-gude369`): a flat edge between
non-neighbours on one rank is routed with the smooth spline router for every
`splines` value. C `lib/dotgen/dotsplines.c:make_flat_edge` (1502-1620):

- `et == EDGETYPE_LINE` → `makeSimpleFlat(...)` (1535-1537, defined 1075);
- top corridor: `et == EDGETYPE_SPLINE ? routesplines : routepolylines` (1603-1607);
- same choice in `make_flat_bottom_edges` (~1479) and
  `make_flat_labeled_edge` (~1405 — the port already honours it in
  `splines-flat-labeled.ts:105,131`).

Port sites found during planning (verify each):

- `src/layout/dot/splines-flat-multi.ts:154` `routeFlatEdgeGroupFaithful(g, edges, cnt)`
  — no `et` parameter; the non-adjacent group router (top/bottom corridor).
- `src/layout/dot/splines-flat.ts:579` `routeFlatEdgeFaithful` — `routeSplines(P)` unconditional.
- `src/layout/dot/edge-route.ts:365` — `makeFlatAdjEdges(g, group, n, EDGETYPE_SPLINE)`
  hard-codes the type; C passes the graph's `et` (`make_flat_adj_edges(g, edges, cnt, e, et)`),
  and `makeFlatAdjEdges` (`splines-flat.ts:366`) ignores its `_et` arg.
- `edgeType(g)` exists in `src/layout/dot/splines.ts` (imported by splines-flat-labeled.ts).

Measured on main (native 15.x): with `splines=polyline` native `a->b` is
`M50.03,-36.42C61.1,-45.28 72,-54 72,-54 72,-54 126,-54 126,-54 126,-54 131.88,-49.3 139.39,-43.29`
and canvas height 58; with `splines=line` native is the straight
`M54.28,-18C80.35,-18 106.41,-18 132.47,-18`, canvas height 40. The port draws the
spline arc (height 63.96) for both.

## Task

TDD: `test/golden/pt-issue-28.test.ts` comparing `pt-issue-28-polyline` and
`pt-issue-28-line` against their refs (fails first). Thread `et` through every
flat path above exactly as C does, porting `makeSimpleFlat` for `et == LINE` if
the port lacks it (check `splines-flat-labeled.ts` / `splines-flat.ts` first —
reuse, don't duplicate). In `makeFlatAdjEdges`, honour `et` as C does; if the
`make_flat_adj_edges` `et` use requires more than threading the value (aux graph
`splines` attr), port it and note it for T6.

## Acceptance

- Given `splines=polyline` and a non-adjacent flat edge, when rendered, then the
  SVG matches `pt-issue-28-polyline.svg` within 0.01.
- Given `splines=line`, then it matches `pt-issue-28-line.svg` within 0.01.
- Given default `splines`, then all existing flat-edge tests and goldens are
  unchanged.
- Given a fresh survey, then 0 regressions vs T0 baseline.

## Read-set

`~/git/graphviz/lib/dotgen/dotsplines.c:1075-1170,1400-1410,1470-1490,1502-1620`,
`src/layout/dot/splines-flat-multi.ts:80-200`, `src/layout/dot/splines-flat.ts:360-440,570-598`,
`src/layout/dot/edge-route.ts:340-440`, `src/layout/dot/splines-flat-labeled.ts:90-140`.

## Write-set

`src/layout/dot/splines-flat.ts`, `src/layout/dot/splines-flat-multi.ts`,
`src/layout/dot/edge-route.ts`, `src/layout/dot/splines-flat-multi.test.ts`,
`src/layout/dot/splines-flat.branch.test.ts`, `test/golden/pt-issue-28.test.ts`.

## Commit

`fix(dot): honour splines=line and polyline on flat edges`
