# Batch 4: constrained majorization, missing images, colorscheme pens, HTML gradients

Parallel worktrees after batch 3. Write-sets are disjoint (T23 owns `htmltable.ts` and
`poly-init.ts` this batch; T24 owns `device-cluster.ts`). T22 → T26. Batch gate: survey +
walks (T23–T25 can change output; T22 is unwired).

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T22](T22-constrained-majorization.md) | Item 43d: `stress_majorization_with_hierarchy` | typescript-pro (high effort) | `src/layout/neato/constrained-majorization.ts` (new) | T15, T16, T17 | [x] |
| [T23](T23-missing-images.md) | Item 60: missing image messages | typescript-pro | `src/gvc/usershape.ts`, `src/common/poly-init.ts`, `src/common/htmltable.ts` | T5, T7 | [x] |
| [T24](T24-colorscheme-transparent.md) | Item 63: `transparent` pen under a colorscheme | typescript-pro | `src/gvc/device-cluster.ts`, node pen emit | T14 | [x] |
| [T25](T25-html-gradient-parsesegs.md) | Item 64: HTML gradients via `parseSegs`/`findStopColor` | typescript-pro | `src/common/htmltable-emit-fill.ts` | T6 | [x] |
