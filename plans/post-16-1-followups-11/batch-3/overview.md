# Batch 3: diagnosis first

Runs after batch 2 has landed, in parallel worktrees off its head. Write-sets are disjoint by engine; each task's `src/`
write is conditional on its diagnosis finding the cause in the port. A diagnosis pointing outside the task's set is stop 1.
Budgets: T6 3 h, T8 2 h, then park with the artifact.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T6](T6-sgd-drift.md) | 132: 2-D `mode=sgd` drift to its first differing value | debugger (opus) | `harness/T6/`; `src/layout/neato/sgd*.ts` only for a fix | batch 2 | [ ] |
| [T7](T7-native-variance.md) | 137: subgraph/root renders on fdp, osage vs address-free native | debugger (opus) | `harness/T7/`; `src/layout/{fdp,osage}/` only for a fix | batch 2 | [ ] |
| [T8](T8-nestedclust.md) | 129: `nestedclust.gv` no-free renders 2 and 3 | debugger (opus) | `harness/T8/`; the layout dir T0 records for it and `src/gvc/` only for a fix | batch 2 | [ ] |
| [T9](T9-svg-subgraph-id.md) | 136: svg graph id on a subgraph render | typescript-pro (sonnet) | `src/render/svg-graph.ts`, a new test | batch 2 | [ ] |
