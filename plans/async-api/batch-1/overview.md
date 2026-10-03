# Batch 1: seams and pure building blocks (parallel)

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Per-context image sizer/resolver | typescript-pro (sonnet) | `src/gvc/context.ts`, `src/gvc/image-resolver.ts`, `src/gvc/device.ts`, `src/render/svg.ts`, `src/common/make-label.ts`, `src/gvc/context-image-hooks.test.ts` | — | [x] |
| T2 | Resource collector | typescript-pro (sonnet) | `src/async/collect.ts`, `src/async/collect.test.ts` | — | [x] |
| T3 | Font prefetch | typescript-pro (sonnet) | `src/async/fonts.ts`, `src/async/fonts.test.ts` | — | [x] |
| T4 | Built-in SVG scrubber | typescript-pro (sonnet) | `src/async/sanitize.ts`, `src/async/sanitize.test.ts` | — | [x] |

Then the corpus gate (T1 touches the sync render path: must be byte-identical).
