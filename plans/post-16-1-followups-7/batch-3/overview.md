# Batch 3: cola driver, imagepath

Runs after batches 2a and 2b, in parallel worktrees, with disjoint write-sets.

- T8 builds the `stress_majorization_cola` driver and the ipsep option setup on T1, T5 and
  T7. Tests call it directly; T10 wires it into layout.
- T9 takes `shapes.ts` after T2 and `usershape.ts` after T6.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T8](T8-cola-driver.md) | Item 96b: `stress_majorization_cola` and `neatoinit` ipsep options | typescript-pro (opus) | `src/layout/neato/stress-cola.ts`, `ipsep-opts.ts` (new) (+ tests) | T1, T5, T7 | [ ] |
| [T9](T9-imagepath.md) | Item 102: `Gvimagepath`, `safefile`, the `unsafe` warning | typescript-pro | `src/common/graph-init.ts`, `src/common/safefile.ts` (new), `src/common/shapes.ts`, `src/gvc/usershape.ts` (+ tests) | T2, T6 | [ ] |
