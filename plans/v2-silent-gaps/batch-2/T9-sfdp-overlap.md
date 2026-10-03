# T9: sfdp non-prism overlap modes

## Context

C sfdp: when the overlap mode is not PRISM, `ctrl.overlap = -1` and after layout
`removeOverlapWith(g/sg, &am)` runs (`~/git/graphviz/lib/sfdpgen/sfdpinit.c:250-283`,
single component :272, each component :283). The port calls only
`adjustNodesScale` there (`src/layout/sfdp/index.ts` ~142 and the
single-component path), so voronoi, oscale, vpsc and ortho* are silent.

## Task

Step 0 (`overlap=scale` and `overlap=voronoi` under sfdp, native vs port). Call
`adjustNodesFull` (the port of `removeOverlapWith`) wherever C calls
`removeOverlapWith`, single and multi component. Prism (handled inside sfdp) and
the default must be byte-identical.

## Write-set

`src/layout/sfdp/index.ts`, `src/layout/sfdp/overlap-modes.test.ts` (new).

## Acceptance criteria

- Given sfdp with `overlap=voronoi` and overlapping nodes, then RenderError
  UNSUPPORTED_FEATURE.
- Given sfdp with `overlap=scale` (and a multi-component graph), then it matches
  native within ±0.5.
- Given `overlap=prism`, `overlap=false` or none, then output is byte-identical
  to before.

## Shared rules

Read the repo `CLAUDE.md`, `../decisions.md` and `../conventions.md` (Step 0,
oracle, quality bar, observability/rollback) first. Scratch files go in the
executor's scratchpad under `<task-id>/`. Write-set only; stop and report on
anything else (README stop conditions).
