# Batch 4: numerics and the cluster window

Parallel worktrees after batch 3. T15 owns the neato kernel files and `init.ts` (after
T10); T16 owns `device.ts`'s cluster section and `device-cluster.ts` (after T9/T12).
Survey after the batch lands.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T15](T15-fused-kernel.md) | AD-4, item 85: fused stress kernel, `cgStep`, `OPT_SMART_INIT`, `checkExp` | typescript-pro (debugger on drift) | `src/layout/neato/{stress-kernel,conjgrad-mkernel,init,stress}.ts` | T3, T10 | [x] |
| [T16](T16-colorscheme-window.md) | AD-16, item 81: colorscheme window spans box and label | typescript-pro | `src/gvc/device.ts` (cluster section), `src/gvc/device-cluster.ts` | T9, T12 | [x] |
