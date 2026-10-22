# Batch 3: agerr writer and FMA sites

Parallel worktrees after batch 2. T5's write-set (28 files with console sites) is disjoint
from T6–T9's geometry files; verify with `git diff --name-only` before landing. T5's
interface is consumed by T10–T13. T6–T9 each need T0's disassembly dumps. Survey for this
batch if any byte-identity run shows output changes.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T5](T5-agerr-writer.md) | Item 36: one agerr writer with `\ooo` escaping | typescript-pro | `src/common/agerr.ts` (new) + console-site files | T1, T2 | [ ] |
| [T6](T6-fma-pttoline2.md) | Item 29a: `ptToLine2` fusion | typescript-pro | `src/gvc/anchor.ts`, `src/common/splines-geom.ts` | T0 | [ ] |
| [T7](T7-fma-arrows.md) | Item 29b: `arrow_type_curve` fusion, `arrowEndClip` port | typescript-pro | `src/common/arrows-types.ts`, `arrows-shapes-poly.ts`, `src/layout/dot/edge-route-clip.ts` | T0 | [x] |
| [T8](T8-fma-dist.md) | Item 29c: `DIST` in `approxLen` and `addTriEdge` | typescript-pro | `src/render/svg-edge-split.ts`, `src/layout/neato/multispline-router.ts` | T0 | [x] |
| [T9](T9-cdt-face-order.md) | Item 29d: CDT face vertex order vs GTS | debugger → typescript-pro | `src/layout/neato/cdt-surface.ts` | T0 | [ ] |
