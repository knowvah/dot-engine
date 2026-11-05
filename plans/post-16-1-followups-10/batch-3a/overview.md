# Batch 3a: `dim` in the solvers (114)

Runs after T1 lands; T13 also waits for T2. Parallel worktrees, disjoint write-sets, and parallel with batch 3b. All read
`root.info.ndim` from T1 and do not change `neato/init.ts`. Land one at a time, as in batch 2.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T6](T6-kk-dim.md) | KK's `NDIM` becomes state | typescript-pro (opus) | `src/layout/neato/kk.ts`, its tests | T1 | [x] |
| [T7](T7-stress-dim.md) | Stress, hier, ipsep and sgd under `dim` | typescript-pro (opus) | `src/layout/neato/{stress,stress-kernel,stress-cola,stress-models,start,sgd}.ts`, split files, tests | T1 | [ ] |
| [T8](T8-overlap-dim.md) | `overlap` under `dim` | typescript-pro (sonnet) | `src/layout/neato/{adjust-info,sc-adjust,vpsc-adjust,simple-scale,fdp-adjust,overlap-prism}.ts`, tests | T1 | [x] |
| [T13](T13-sfdp-dim.md) | sfdp `dim` and `dimen` | typescript-pro (sonnet) | `src/layout/sfdp/{init,index,spring-driver}.ts`, tests | T1, T2 | [ ] |
