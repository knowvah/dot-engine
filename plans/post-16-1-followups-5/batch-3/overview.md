# Batch 3: consumers of the batch-2 seams

Parallel worktrees after batches 2a and 2b. Write-sets are disjoint; `device.ts` belongs to
T12 here (T5 finished its edge section in 2a; T16 takes the cluster section in batch 4).
Survey after the batch lands (T10, T11, T12, T14 can change output).

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T10](T10-edge-len.md) | Item 73: `setEdgeLen` on every neato mode | typescript-pro | `src/layout/neato/{init,make-graph-data,edge-len}.ts` | T4 | [x] |
| [T11](T11-findstopcolor.md) | Items 75, 77, 82: `findStopColor`/`parseSegs` diagnostics and `:red` fill | typescript-pro | `src/common/multicolor.ts`, `src/common/style-resolve.ts` (findStopColor), `src/render/color-resolve.ts`, `src/common/htmltable-emit-fill.ts` | T1, T5 | [x] |
| [T12](T12-layerselect.md) | AD-9, item 79: `layerselect`/`layerlist` (feat) | typescript-pro | `src/common/layers.ts`, `src/gvc/first-layer.ts`, `src/gvc/device.ts` (layer loop), `src/gvc/emit-walk.ts` | T5 | [x] |
| [T13](T13-cleanup-labels.md) | AD-12, item 72: labels freed by engine cleanup | typescript-pro | the `cleanup` functions in `src/layout/*/index.ts` | T2 | [x] |
| [T14](T14-image-sizing.md) | AD-10, item 83: image sizing through the sizer | typescript-pro | `src/common/{htmltable,make-label,poly-sizing,poly-init}.ts`, `src/gvc/usershape.ts` | T0 | [x] |
