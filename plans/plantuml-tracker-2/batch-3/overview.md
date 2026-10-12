# Batch 3 — A8 contraction, then ledgers

Sequential: T7 changes `route.ts` (after T5) and moves sweep results; T8 records
the final sweep's verdicts.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T7 | Mirror contraction in `points2coeff` / `solve3` (A8, 2646) | typescript-pro (model: opus) | `src/pathplan/route.ts`, `src/pathplan/solvers.ts`, `src/pathplan/route.branch.test.ts`, `src/pathplan/pathplan.test.ts` | T1, T5 | [x] |
| T8 | Update divergence ledgers from the final sweep | documentation-engineer | `test/corpus/accepted-divergences*.json`, `docs/known-divergences.md` | T5, T6, T7 | [x] |

Specs: [T7](T7-points2coeff-contraction.md) · [T8](T8-ledgers.md)
