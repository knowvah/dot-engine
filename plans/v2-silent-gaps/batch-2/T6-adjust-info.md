# T6: `adjust.c` Info_t machinery and `sAdjust` (overlap=oscale)

## Context

C's Voronoi and oscale adjusters share a module-static node-info array built by
`makeInfo` (`~/git/graphviz/lib/neatogen/adjust.c:122`, polygons via T1's
`makePoly`/`makeAddPoly` chosen by `sepFactor`), the bounding-box state
(`setBoundBox` 58, `chkBoundBox` 88), `scomp`/`sortSites` (164-180),
`geomUpdate` (200), `rmEquality` (227), `countOverlap` (273), `rePos` (462),
`sAdjust` (472) and `updateGraph` (498). ~300 C LOC → stop-4 budget ~900.
Voronoi-only functions (`vAdjust`, `newPos`, `addCorners`, `newpos`,
`increaseBoundBox`, `nextOne`) stay unported.

## Task

Port those functions into `src/layout/neato/adjust-info.ts`. C's file-static
state (nodeInfo, nsites, pxmin… ) becomes one per-call state object (no module
`let`). Expose an exact overlap count and the oscale adjuster. Do not wire them
into `fdp-adjust.ts` (T7 does).

## Write-set

`src/layout/neato/adjust-info.ts`, `src/layout/neato/adjust-info.test.ts` (new).

## Interface contract (consumed by T7)

```ts
export function countOverlapIn(g: Graph): number;  // makeInfo + countOverlap(0); 0 if makeInfo fails
export function sAdjustGraph(g: Graph): number;    // makeInfo + chkBoundBox + sAdjust + updateGraph; C return
```

## Acceptance criteria

- Given native's pre-adjust positions and `overlap=oscale`, when `sAdjustGraph`
  runs, then positions match native within ±0.5 (≥2 graphs, boxes and ellipses).
- Given rounded shapes whose boxes touch but outlines do not, when
  `countOverlapIn` runs, then it returns 0.
- Given coincident nodes, then `rmEquality` separates them as C does.

## Shared rules

Read the repo `CLAUDE.md`, `../decisions.md` and `../conventions.md` (Step 0,
oracle, quality bar, observability/rollback) first. Scratch files go in the
executor's scratchpad under `<task-id>/`. Write-set only; stop and report on
anything else (README stop conditions).
