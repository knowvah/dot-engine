# T5: port `cAdjust` (overlap=ortho*/portho*)

## Context

C `cAdjust` (`~/git/graphviz/lib/neatogen/constraint.c:538-604`) removes overlaps
by building horizontal/vertical constraint graphs and solving them with network
simplex. Helpers in the same file: `cmpitem` (40), `distY`/`distX` (61-66),
`intersectX0`/`intersectY0`/`intersectY`/`intersectX` (76-118), `mapGraphs`
(123), `mkNConstraintG` (208), `mkConstraintG` (266), `closeGraph` (367),
`constrainX`/`constrainY` (380-416), `overlaps` (465), `initItem` (483). ~560 C
LOC → stop-4 budget ~1700. `scAdjust` (same file, 767) is already ported in
`src/layout/neato/sc-adjust.ts` — import shared pieces if any, do not edit it.

## Task

Port `cAdjust` and the helpers into `src/layout/neato/constraint-adjust.ts`,
with the eight modes (AM_ORTHO, AM_ORTHO_YX, AM_ORTHOXY, AM_ORTHOYX,
AM_PORTHO, AM_PORTHO_YX, AM_PORTHOXY, AM_PORTHOYX; constants from adjust.h).
Use the port's cdt (`src/cdt`) where C uses `Dt_t`, and the port's network
simplex (`src/layout/dot/ns.ts` `rank`) on constraint graphs built the way the
port's dot builds auxiliary graphs (read how dot calls `rank`). Do not wire it
into the overlap dispatch (T7 does).

## Write-set

`src/layout/neato/constraint-adjust.ts`, `src/layout/neato/constraint-adjust.test.ts` (new).

## Interface contract (consumed by T7)

```ts
export const AM_ORTHO …; // all eight mode constants, values as adjust.h
export function cAdjust(g: Graph, mode: number): number; // C return value
```

## Oracle

Native end-to-end: `neato -n2`-style pinned inputs (positions already
laid out, `overlap=<mode>`) so only cAdjust moves nodes; compare `-Tplain`.
Optionally instrument a scratch copy for constraint-graph ranks.

## Acceptance criteria

- Given overlapping boxes and each of the eight modes, when `cAdjust` runs on
  native's pre-adjust positions, then output positions match native within ±0.5.
- Given no overlaps, when `cAdjust` runs, then it returns 0 and moves nothing
  (`overlaps()` short-circuit).
- Given `sep` margins, then `initItem` inflation matches C.

## Shared rules

Read the repo `CLAUDE.md`, `../decisions.md` and `../conventions.md` (Step 0,
oracle, quality bar, observability/rollback) first. Scratch files go in the
executor's scratchpad under `<task-id>/`. Write-set only; stop and report on
anything else (README stop conditions).
