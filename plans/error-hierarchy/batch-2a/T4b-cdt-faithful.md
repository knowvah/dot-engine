# T4b: port GTS behaviour at the two divergent CDT sites

Added 2026-10-02 by owner decision (option B) after T4 hit stop condition 5.
Executed directly by the executor (faithfulness-critical, small).

## Context

`src/layout/neato/cdt-surface.ts` ports GTS 0.7.6 `src/cdt.c`. At two sites the
port threw where C continues:
- `addVertex`: `gts_delaunay_add_vertex` returns `v` unadded when `point_locate`
  finds no face (`cdt.c:668-680`); `tri()` (`lib/neatogen/delaunay.c:185-194`)
  ignores that return.
- `removeIntersectedEdge`: a crossed constraint is collected into the returned
  list, kept even when it loses its triangles (`!constraint &&` guard on destroy),
  and the walk continues (`cdt.c:863-905`, `NEXT_CUT` macro `cdt.c:839-848`).
  `gts_delaunay_add_constraint` returns the list (`cdt.c:1056`); `tri()` ignores it.

## Change

- `addVertex` returns `v` instead of throwing.
- `removeIntersectedEdge` returns `CEdge[]` (C's GSList), applies the
  `!constraint` destroy guard, and concatenates in C order.
- `removeIntersectedVertex` returns `{ ref, constraints }` (C: GSList + `*ref`).
- `addConstraint` returns the conflicting constraints.
- Missing `g_assert`s in `remove_intersected_edge` ported as `InternalError`:
  `cdt.c:887` (`o2 == 0.` at terminal) and `cdt.c:895` (`o2 <= 0.` when `o1 > 0`).

## Oracle

Graphviz `lib/neatogen/delaunay.c` compiled against Homebrew GTS 0.7.6 with a
small `mkSurface` driver (scratchpad `gts/oracle.c`; run under bash: zsh does not
word-split arguments). 500 random inputs (square boundary plus random interior
constraints; 405 with crossings): identical face sets on every case C completes
(491); `InternalError` on every case C aborts (9, all at `cdt.c:887`).

## Write-set

`src/layout/neato/cdt-surface.ts`, `src/layout/neato/cdt-surface.crossing.test.ts`
(new), `src/layout/neato/cdt-surface.branch.test.ts` (one test asserted the old
throw; now asserts C's one-face result).

## Commit

`fix(cdt): continue past crossing constraints and hull misses like GTS`
