# Batch 1 — builder + measurer wiring

Sequential (T2 consumes T1's function). One Sonnet agent, one commit per task.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | `canvasFont()` builder | typescript-pro (sonnet) | `src/common/css-font.ts`, `src/common/css-font.test.ts` | — | [x] |
| T2 | Wire `CanvasTextMeasurer` + cache + rejection guard | typescript-pro (sonnet) | `src/common/textmeasure.ts`, `src/common/textmeasure.canvas.test.ts` | T1 | [x] |

Specs: [T1-canvas-font.md](T1-canvas-font.md) · [T2-wire-measurer.md](T2-wire-measurer.md)
