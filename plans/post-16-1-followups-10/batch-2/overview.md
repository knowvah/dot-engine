# Batch 2: independent work

Runs after T0, in parallel worktrees. Write-sets are disjoint. Land one at a time: cherry-pick, gates, bytediff over
`$BASE/smoke-ids.txt`, journal row. T1's interface is what batch 3a reads, so land T1 before starting 3a. T2 lands before T13.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-neato-dim-plumbing.md) | 114: read `dim`, `dimen`, `z`; 3-D pins; print n coordinates | typescript-pro (sonnet) | `src/layout/neato/init.ts`, `init-dim.ts` (new), `src/render/dot/{write-back,attrs}.ts`, `src/render/json.ts`, tests | T0 | [ ] |
| [T2](T2-sfdp-drift.md) | 121: trace sfdp to the first differing value | typescript-pro (opus) | `harness/T2/`; `src/layout/sfdp/{spring-electrical,spring-driver,multilevel,quadtree,sparse-*}.ts` only for a fix | T0 | [ ] |
| [T3](T3-cc-reuse.md) | 115: `ccomps` reuses a user's `_cc_N` | typescript-pro (sonnet) | `src/layout/pack/ccomps.ts`, `src/layout/twopi/` only for native's message, tests | T0 | [ ] |
| [T4](T4-draw-input.md) | 122: golden input with `_draw_` and `_background` | typescript-pro (sonnet) | `test/golden/inputs/`, a new golden test, `test/tools/bytediff.ts` | T0 | [ ] |
| [T5](T5-native-variance.md) | 124: why native's `graphs-b56` varies | typescript-pro (sonnet) | `harness/T5/` | T0 | [ ] |
