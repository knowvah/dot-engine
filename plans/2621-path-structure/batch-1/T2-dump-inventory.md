<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Stage-dump hook inventory

## Context

The honda mission localized a spline divergence with a 4-stage dump pair:
`GV_XDUMP` env-gated dumps in the native tree (routespl.c / dotsplines.c)
vs `__XDUMP` in the port (splines-routespl.ts / edge-route-chain.ts). See
`.agent-notes/honda-samehead-shared-port.md`. This mission reuses that
infrastructure; the stages must cover, for a regular rank-spanning edge:
(1) corridor boxes (maximal_bbox output, PRE-routeSplines — routeSplines
MUTATES boxes, memory `edge-routing-order-done`), (2) port/endpoint
assignment, (3) fitter input polyline+barriers, (4) fitted spline
(pre-clip), plus clip_and_install output.

## Task

PRE-FLIGHT FINDING (2026-07-28): NO dump hooks currently exist on either side
— `grep GV_XDUMP` is empty in the native tree and `grep __XDUMP` is empty in
the port (the honda-era hooks were session-local and are gone; the port module
was also renamed to `edge-route-faithful.ts` in the CCN refactors). This task
therefore (re-)instruments BOTH sides, guided by the honda RCA's stage list:

1. Derive the stage list and dump shapes from
   `.agent-notes/honda-samehead-shared-port.md` (its 4-stage recipe) and the
   current code structure.
2. Instrument the C side: temporary env-gated printf at each stage in
   `routespl.c`/`dotsplines.c`, with an EDGE-NAME FILTER env (dumping every
   edge of a 3,670-node graph would be GBs). Record the patch in the journal
   for reverting at T7.
3. Instrument the port likewise (env-gated, off by default, edge-name
   filtered) in `edge-route-faithful.ts` / `edge-route-chain.ts` / peers.

## Write-set

- Port: none expected; else env-gated additions in
  `src/layout/dot/edge-route-faithful.ts` / `edge-route-chain.ts` (committed
  with T5 if kept, since they are debug-gated and browser-safe guards must
  hold — no bare `process.env` in library code; follow the existing gate
  pattern).
- Native tree: temporary patch only, tracked in the journal, reverted by T7.

## Read-set

- `.agent-notes/honda-samehead-shared-port.md`
- `~/git/graphviz/lib/common/routespl.c`, `lib/dotgen/dotsplines.c`
  (grep GV_XDUMP)
- `src/layout/dot/edge-route-faithful.ts`, `src/layout/dot/edge-route-chain.ts`
  (grep __XDUMP)

## Interface out (consumed by T3)

Journal section listing: stage name → env var → payload fields → edge filter
mechanism, per side.

## Acceptance criteria

- Given the inventory, when compared to the 5 stages above, then each stage
  has a dump on both sides or the gap is closed.
- Given an edge-name filter, when set, then dump volume for the target edge
  is MBs not GBs.

## Observability: N/A. ## Rollback: Reversible.
