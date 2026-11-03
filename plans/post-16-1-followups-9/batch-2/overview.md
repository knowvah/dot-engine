# Batch 2: independent fixes

Runs after T0, in parallel worktrees. Write-sets are disjoint. Land one at a time: cherry-pick,
gates, bytediff over `$BASE/smoke-ids.txt`, journal row.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-to-dist-type.md) | 109: `toDistType` saturates | typescript-pro (sonnet) | `src/layout/neato/dijkstra.ts`, `kkutils.artificial.test.ts` | T0 | [ ] |
| [T2](T2-component-attrs.md) | 111: components copy the root's attributes | typescript-pro (sonnet) | `src/layout/pack/ccomps.ts` (new), `pack/index.ts`, `neato/multi-component-attrs.test.ts` (new) | T0 | [ ] |
| [T3](T3-sfdp-warning.md) | 112: sfdp `start` warning | typescript-pro (sonnet) | `src/layout/sfdp/init.ts`, `init.branch.test.ts` | T0 | [ ] |
| [T4](T4-circo-root.md) | circo root lookup | typescript-pro (sonnet) | `src/layout/circo/blocktree.ts`, `blocks.ts`, `circular.ts`, `root.test.ts` (new) | T0 | [ ] |
| [T5](T5-remove-sizer.md) | 113: remove `getGlobalImageSizer` | typescript-pro (sonnet) | `src/gvc/usershape.ts`, `image-ft-null.test.ts` | T0 | [ ] |
