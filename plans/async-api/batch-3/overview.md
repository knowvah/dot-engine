# Batch 3: browser helper

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T6 | renderSvgInto + browser check | typescript-pro (sonnet) | `src/async/render-into.ts`, `src/async/render-into.test.ts`, `src/index.ts` | T4, T5 | [x] |

Then the corpus gate (final sync byte-identity check) and the browser check
(conventions.md#browser-check, executor runs it after the agent).
