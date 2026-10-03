# Batch 2: overlap machinery and engine wiring (parallel)

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T6 | `adjust.c` Info_t machinery + `sAdjust` (oscale) | typescript-pro (sonnet) | `src/layout/neato/adjust-info.ts`, `src/layout/neato/adjust-info.test.ts` | T1 | [x] |
| T8 | circo multi-component overlap removal | typescript-pro (sonnet) | `src/layout/circo/circular.ts`, `src/layout/circo/circo-components-overlap.test.ts` | batch 1 | [x] |
| T9 | sfdp non-prism overlap modes | typescript-pro (sonnet) | `src/layout/sfdp/index.ts`, `src/layout/sfdp/overlap-modes.test.ts` | batch 1 | [x] |

T8 and T9 call the existing `adjustNodesFull`; T7 (batch 3) extends what it
dispatches. Then the corpus gate (batch-2 allowed list).
