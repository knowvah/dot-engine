# Batch 2: confirmed bugs

Runs after T0, in parallel worktrees. Write-sets are disjoint. Land one at a time: cherry-pick, gates, bytediff over
`$BASE/smoke-ids.txt`, journal row. T1 and T2 both touch dot routing, so land T1 first and rebase T2's worktree on it if
their diagnoses meet; a write outside either set is stop 1.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-w4-recursion.md) | 128: `w4.gv` recurses without end | debugger (opus) | `src/layout/dot/splines-flat*.ts`, `src/layout/dot/init.ts`, a new test | T0 | [ ] |
| [T2](T2-w5-ll.md) | 128: `w5.gv` reads `.ll` of undefined | debugger (opus) | `src/layout/dot/edge-route-faithful.ts`, `edge-route-chain*.ts`, a new test | T0 | [ ] |
| [T3](T3-xdot-wrap.md) | 127, 135: long strings wrap as `write.c` does | typescript-pro (sonnet) | `src/render/map.ts`, `src/render/dot/xdot-ops.ts`, `src/render/dot/agwrite*.ts`, tests | T0 | [ ] |
| [T4](T4-fdp-json.md) | 133: fdp `json` undoes cluster-edge proxies | typescript-pro (sonnet) | `src/render/json*.ts`, `src/render/dot/write-back.ts`, tests | T0 | [ ] |
| [T5](T5-conjgrad.md) | 131: conjgrad's error on one line | typescript-pro (sonnet) | `src/layout/neato/conjgrad.ts`, its test | T0 | [ ] |
