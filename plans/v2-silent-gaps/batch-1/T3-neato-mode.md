# T3: honour the neato `mode` attribute; verify sgd

## Context

`parseMode` (`src/layout/neato/index.ts:80`) reads `g.info.mode`, which nothing
assigns, so every `mode=` runs stress majorization (v2-fidelity Step 0: KK Δ93–322
pt, sgd Δ47–323 pt). `src/layout/neato/start.ts:effectiveMode` reads the
attribute for the v2-fidelity loud checks only. C: `neatoMode`
(`~/git/graphviz/lib/neatogen/neatoinit.c:634-662`: values KK/major/sgd/hier/
ipsep under their #ifdefs, case handling, default MODE_MAJOR, warning text for
unknown values), dispatched at `neatoinit.c:1295-1300`.

## Task

1. Step 0 for `mode=sgd` and `mode=KK` (native vs port, ≥2 graphs each).
2. `parseMode` reads the root attribute exactly as `neatoMode` and emits C's
   warning (`console.warn`, C text) for unknown values. Fold `effectiveMode`
   into it so loud checks and dispatch see one value; keep every v2-fidelity loud
   condition unchanged (`src/layout/neato/start.fidelity.test.ts` must stay green).
3. `mode=sgd` must now reach `sgdLayout`. Compare with native. If it diverges
   beyond ±0.5, diagnose per `~/.claude/rules/diagnosis.md` (known suspect: RNG
   seeding — C `sgd.c` uses drand48 via the neato seed; port uses MT19937) and
   port the fix in `sgd.ts` under stop condition 4 (budget: the C functions you
   name in the journal ×3).
4. Do NOT touch KK's solver: `mode=KK` routing is T4's (`init.ts`).

## Write-set

`src/layout/neato/index.ts`, `src/layout/neato/start.ts`,
`src/layout/neato/sgd.ts` (only if step 3 requires), `src/layout/neato/mode.test.ts` (new).

## Interface contract (consumed by T4)

`parseMode(g): number` returns C's `MODE_*` value for the root attribute
(`MODE_KK` for "KK"); `solveModel(g, mode, model)` receives it unchanged.

## Acceptance criteria

- Given `mode=sgd`, when neato renders, then sgd runs and matches native within
  ±0.5 on ≥2 graphs, or a diagnosis artifact is reported and the task stops.
- Given `mode=bogus`, then C's warning is printed once per render and major runs.
- Given no `mode`, then output is byte-identical to before.
- Given `mode=hier`, then v2-fidelity's UNSUPPORTED_FEATURE still fires.

## Shared rules

Read the repo `CLAUDE.md`, `../decisions.md` and `../conventions.md` (Step 0,
oracle, quality bar, observability/rollback) first. Scratch files go in the
executor's scratchpad under `<task-id>/`. Write-set only; stop and report on
anything else (README stop conditions).
