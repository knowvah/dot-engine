# T1: port `lib/neatogen/poly.c`

## Context

C counts node overlaps with polygons (`adjust.c:countOverlap` → `polyOverlap`).
The port has no `poly.c`; v2-fidelity T7 approximated it with inflated bounding
boxes in `src/layout/neato/fdp-adjust.ts` (`anyNodesOverlap`). ADR-2: port the
whole file so T6/T7 can use the exact test.

## Task

Port `~/git/graphviz/lib/neatogen/poly.c` (440 lines; `poly.h`) faithfully as
`src/layout/neato/poly.ts`: `Poly` record (origin, corner, verts, kind with
BOX/CIRCLE), `bbox`, `inflatePts`, `isBox`, `makeScaledTransPoint`,
`makeScaledPoint`, `genRound`, `makeAddPoly`, `makePoly`, `breakPoly` (no-op
or omit with a note: GC), `edgesIntersect` and its helpers, `inPoly`, `inBox`,
`transCopy`, `polyOverlap`. Read how the port stores node shape polygons
(`src/common/` shapes / `poly-shapes.ts`, ND_shape_info equivalent) and use the
same vertex data C reads (`ND_shape(n)->polygon`, sides, peripheries, samples).
Do not wire it into any caller (T6/T7 do).

## Write-set

`src/layout/neato/poly.ts`, `src/layout/neato/poly.test.ts` (new).

## Read-set

`~/git/graphviz/lib/neatogen/poly.c`, `poly.h`, `geometry.h`;
`src/layout/neato/fdp-adjust.ts:108-160` (current approximation);
the port's node shape polygon storage.

## Interface contract (consumed by T6, T7)

```ts
export interface Poly { origin: Point; corner: Point; verts: Point[]; kind: number }
export function makePoly(n: Node, xmargin: number, ymargin: number): Poly | null;
export function makeAddPoly(n: Node, xmargin: number, ymargin: number): Poly | null;
export function polyOverlap(p: Point, pp: Poly, q: Point, qp: Poly): boolean;
```
(`null` where C returns non-zero on failure; keep C's units: inches.)

## Oracle

Instrument a scratch copy of poly.c (or a small C driver linked against the
build's libneatogen objects) to dump `makePoly`/`makeAddPoly` output and
`polyOverlap` verdicts for: box, ellipse, circle, polygon (sides=5, skew,
distortion), record, point, plaintext; margins add vs scale. Port output must
match within 1e-9 on vertices and exactly on verdicts.

## Acceptance criteria

- Given two ellipses whose bounding boxes touch but outlines do not, when
  `polyOverlap` runs, then it returns false (C `edgesIntersect`/`inPoly`).
- Given box-shaped nodes, when `makePoly` runs, then `kind` has BOX and verts/bbox
  equal C's dump.
- Given `sep="+4"` vs `sep="1.2"`, when `makeAddPoly`/`makePoly` build polygons,
  then they equal C's dumps.
- Given circles, when `polyOverlap` runs, then the CIRCLE distance test decides,
  as in C.

## Shared rules

Read the repo `CLAUDE.md`, `../decisions.md` and `../conventions.md` (Step 0,
oracle, quality bar, observability/rollback) first. Scratch files go in the
executor's scratchpad under `<task-id>/`. Write-set only; stop and report on
anything else (README stop conditions).
