# Batch 2: warnings, fill name, ipsep verdict

Parallel worktrees after T0. Write-sets are disjoint: T1 owns `poly-init.ts`/`nodeinit.ts`,
T2 owns the fill sites in `poly-gencode.ts` and `device-cluster.ts`, T3 owns
`stress-kernel.ts` (and `conjgrad-mkernel.ts` only for a cola variant). No survey after
this batch: bytediff decides (AD-7).

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-image-warnings-layout.md) | AD-1, item 90: missing-image and shapefile warnings once per layout | typescript-pro | `src/common/poly-init.ts`, `src/common/nodeinit.ts` (+ tests) | T0 | [x] |
| [T2](T2-empty-fill-name.md) | AD-5, item 92: empty colour name in node and cluster fills | typescript-pro | `src/common/poly-gencode.ts` (fill resolution), `src/gvc/device-cluster.ts` (+ tests) | T0 | [x] |
| [T3](T3-cola-rightmult.md) | AD-6, item 94: ipsep right-multiply from the disassembly | debugger | `src/layout/neato/stress-kernel.ts`, `src/layout/neato/conjgrad-mkernel.ts` (variant only) (+ tests) | T0 | [x] parked (fused verdict; follow-up 95) |
