# T7: one `removeOverlapWith` dispatch

## Context

`adjustNodesFull` (`src/layout/neato/fdp-adjust.ts:166`) is the port of
`removeOverlapWith` (`~/git/graphviz/lib/neatogen/adjust.c:898-997`) used by
neato, twopi, circo and (after T9) sfdp. Today it handles prism, the scale
family and a loud voronoi with a bounding-box overlap test; `oscale`, ortho*,
portho* and `vpsc` fall through silently (vpsc only works in neato via
`src/layout/neato/index.ts:maybeRemoveOverlap` ~120-160). C's default branch
warns "Unhandled adjust option %s".

## Task

1. Step 0 for oscale, one ortho and one portho mode, vpsc (twopi or circo), and
   voronoi on rounded non-overlapping shapes.
2. Mirror `removeOverlapWith`'s switch in `adjustNodesFull`, in C's order:
   ortho*/portho* → T5 `cAdjust`; vpsc → the VPSC adjuster moved verbatim from
   `index.ts` into new `vpsc-adjust.ts` (index.ts then calls the shared dispatch
   for every mode, as C does); `AM_SCALE` (oscale) → T6 `sAdjustGraph`; voronoi →
   `countOverlapIn` (T6) replaces `anyNodesOverlap`/`inflatedHalfSize`, throw
   only if > 0; default → C's warning. Remove the bbox approximation.
3. Check VPSC is compiled into the native build (`IPSEPCOLA`); if not, mirror C's
   behaviour for that build and journal it.

## Write-set

`src/layout/neato/fdp-adjust.ts`, `src/layout/neato/vpsc-adjust.ts` (new),
`src/layout/neato/index.ts`, `src/layout/neato/overlap-dispatch.test.ts` (new),
`src/layout/neato/overlap-voronoi.test.ts` (update the rounded-shape expectation).

## Acceptance criteria

- Given `overlap=voronoi` with ellipses whose boxes touch but outlines do not,
  then nothing is thrown (exact countOverlap).
- Given oscale, ortho*, portho* or vpsc on neato, twopi, circo and sfdp, then
  output matches native within ±0.5 (≥1 graph per mode family per engine).
- Given an unhandled mode reaching the default branch, then C's warning is printed.
- Given prism, scale family, `overlap=false` or none, then output is
  byte-identical to before.

## Shared rules

Read the repo `CLAUDE.md`, `../decisions.md` and `../conventions.md` (Step 0,
oracle, quality bar, observability/rollback) first. Scratch files go in the
executor's scratchpad under `<task-id>/`. Write-set only; stop and report on
anything else (README stop conditions).
