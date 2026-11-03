# Batch 3: component names and sort ties

Runs after batch 2, in parallel worktrees. Write-sets are disjoint.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T6](T6-ccomps-names.md) | 112: `ccomps` names | typescript-pro (sonnet) | `src/layout/pack/ccomps.ts`, `index.branch.test.ts`, `twopi/index.ts`, `sfdp/index.ts`, `circo/circular.ts` | T2, T4 | [x] |
| [T7](T7-sort-ties.md) | 110: `compareEvents` ties | typescript-pro (opus) | `src/vpsc/SweepLine.ts`, `SweepLine.test.ts`, `src/util/libcxx-sort.ts` and test (if needed), `harness/T7/` | T0 | [x] |
