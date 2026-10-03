# T4: port KK (`kkNeato`)

## Context

`mode=KK` reaches `runMajorization` with `maxi = 0` (`src/layout/neato/init.ts`
~333-350): zero-iteration stress majorization, not KK. C:
`kkNeato` (`~/git/graphviz/lib/neatogen/neatoinit.c:1244-1265`): `subset_model`
/ `circuit_model` (both stay loud via v2-fidelity `start.ts`, except KK's
disconnected-circuit shortpath fallback already ported there), else
`shortest_path`; then `initial_positions`, `diffeq_model`, `solve_model`.
`stuff.c`: `scan_graph_mode` KK branch (201-280: Epsilon = 0.0001·nV, Damping,
GD_dist/spring/sum_t/t allocation), `initial_positions` (318), `diffeq_model`
(341), `total_e` (390, Verbose only), `solve_model` (414), `update_arrays`
(434), `D2E` (461), `choose_node` (495), `move_node` (531), heap
(`heapup`/`heapdown`/`neato_enqueue`/`neato_dequeue`, 564-632),
`shortest_path`/`s1` (634-685), `make_spring` (685), `distvec`, `new_array`/
`new_3array`. ~460 C LOC → stop-4 budget ~1400 port LOC.

## Task

Step 0 (native mode=KK vs port, ≥2 graphs; T3 may not be merged yet — call
`solveModel(g, MODE_KK, model)` directly in your scratch script). Port the path
above into `src/layout/neato/kk.ts` (flat typed arrays for the n×n / n×n×dim
matrices). Reuse the port's existing pieces where they are the same C
(`checkStart`/`initRegular`/`randompos` in `start.ts`, `jitter`, `lenattr`/
`setEdgeLen` if ported) — import, do not edit. In `init.ts`, route `MODE_KK`
to `kkNeato` instead of `runMajorization` (init.ts is 503 lines: net shrink only).
Mind C's `Epsilon`/`MaxIter` defaults per mode and `drand48` usage order.

## Write-set

`src/layout/neato/kk.ts`, `src/layout/neato/kk.test.ts` (new),
`src/layout/neato/init.ts` (shrink only).

## Interface contract

Consumes T3's `parseMode`/`MODE_KK`. Exposes `kkNeato(g, nG, model): void`.

## Acceptance criteria

- Given `mode=KK` on ≥2 graphs (incl. one with `len=` and one with pinned
  `pos`), when neato renders, then positions match native within ±0.5.
- Given `mode=KK model=subset` (or connected `circuit`), then v2-fidelity's
  UNSUPPORTED_FEATURE still fires; disconnected circuit still warns and falls back.
- Given `mode=major` or no mode, then output is byte-identical to before.

## Shared rules

Read the repo `CLAUDE.md`, `../decisions.md` and `../conventions.md` (Step 0,
oracle, quality bar, observability/rollback) first. Scratch files go in the
executor's scratchpad under `<task-id>/`. Write-set only; stop and report on
anything else (README stop conditions).
