# T7 — Mirror clang contraction in `points2coeff` / `solve3` (A8, 2646)

**Agent:** typescript-pro, model `opus`. Opus compensation: implement exactly the
T1 table rows for these functions; no speculative abstractions; return only the
structured result — no preamble, no trailing summary.
**Depends on:** T1, T5. **Rollback:** Reversible.
**Observability:** perf SLI — 2646 and graphs-b100 ≤ 1.10× T0 baseline (cumulative
with T5).

## Context

A8 (`docs/known-divergences.md:774-`; full diagnosis
`plans/residual-cleanup/analysis/2646-fp-contract.md`): on 3 of 21,216 edges of
`2646` the final smode leg is tangent to its barrier; `points2coeff`'s
`v3 + 3*v1 - (v0 + 3*v2)` cancels catastrophically and clang's FMA contraction
flips `solve3`'s discriminant sign. A `-ffp-contract=off` C harness reproduced
the port bit-exactly; `on` reproduced the oracle. An earlier hand-contraction of
`points2coeff` alone fixed 2 of 3 edges — the third flips inside `solve3`'s own
contraction. T1's table covers both.

Port: `src/pathplan/route.ts:40` `points2coeff`, `:109` `splineIntersectsLine`,
`src/pathplan/solvers.ts` `solve3`/`solve2`/`solve1`.

## Task

1. TDD: a test in `src/pathplan/pathplan.test.ts` replaying one 2646 edge's
   captured `points2coeff`/`solve3` inputs (from the 2646 analysis doc or a fresh
   instrumented capture) and asserting the oracle's root count and roots bitwise.
2. Apply T1's rows for `points2coeff`, `splineintersectsline`, `solve1/2/3`
   (comment each site with its C line).
3. Gates, perf, fresh sweep; report whether 2646 is conformant.

## Interface output (consumed by T8)

`{ conformantNow: string[], stillDivergent: { id, maxDelta, note }[], perfMs }`
in the journal row (cumulative with T5's).

## Acceptance

- Given the replayed 2646 edge inputs, when solved, then root count and roots
  equal the oracle's bitwise.
- Given a fresh survey, then 2646 is conformant (or its residual is recorded
  with bisection evidence) and 0 regressions vs the post-T6 baseline.
- Given the bench, then ≤ 1.10× T0 baseline.

## Read-set

`src/pathplan/route.ts:40-140`, `src/pathplan/solvers.ts`,
`~/git/graphviz/lib/pathplan/route.c` (points2coeff, splineintersectsline),
`~/git/graphviz/lib/pathplan/solvers.c`, `.agent-notes/pathplan-fma-contraction-map.md`,
`plans/residual-cleanup/analysis/2646-fp-contract.md`.

## Write-set

`src/pathplan/route.ts`, `src/pathplan/solvers.ts`,
`src/pathplan/route.branch.test.ts`, `src/pathplan/pathplan.test.ts`.

## Commit

`fix(pathplan): mirror clang fma contraction in spline intersection`
