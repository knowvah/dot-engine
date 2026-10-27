# Batch 2a: primitives

Parallel worktrees after T0 (alongside 2b). Each task owns a seam a batch-3 task consumes:
T1 → T11, T2 → T13, T3 → T15, T4 → T10, T5 → T11/T12. Write-sets are disjoint from 2b.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-agerr-partial.md) | AD-7: agerr partial-line buffer | typescript-pro | `src/common/agerr.ts` | T0 | [x] |
| [T2](T2-splines-state.md) | AD-5, item 87: `State == GVSPLINES` | typescript-pro | `src/common/postproc.ts`, new `src/common/layout-state.ts`, the four spline-site ports | T0 | [x] |
| [T3](T3-fma-nonfinite.md) | AD-15, item 84: `fma` non-finite operands | typescript-pro | `src/common/fma.ts`, `src/layout/neato/matrix-ops.ts` | T0 | [x] |
| [T4](T4-agnameof.md) | AD-11, item 74: `agNameOf` | typescript-pro | `src/model/cgraph-ops.ts`, `src/render/map.ts`, neato message sites | T0 | [x] |
| [T5](T5-style-tokenizer.md) | AD-8, item 80: `style_token`/`parse_style` port | typescript-pro | `src/common/style-resolve.ts`, `src/gvc/gvrender-set-style.ts`, `src/gvc/device.ts` (edge section) | T0 | [x] |
