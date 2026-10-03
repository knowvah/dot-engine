# Batch 1: simple fixes (parallel)

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | `freeLayout` via `GD_cleanup` | typescript-pro (sonnet) | `src/gvc/context.ts`, `src/gvc/free-layout.test.ts` | — | [x] |
| T2 | `gvXmlEscape` UTF-8 from code points | typescript-pro (sonnet) | `src/util/xml.ts`, `src/util/xml.utf8.test.ts` | — | [x] |
| T3 | Pin `2723`; A4 note | typescript-pro (sonnet) | `src/layout/dot/flat-2723.test.ts`, `docs/known-divergences.md` | — | [x] |
| T4 | dot `nslimit` (`nsiter2`) | typescript-pro (sonnet) | `src/layout/dot/position.ts`, `src/layout/dot/nslimit.test.ts` | — | [x] |

Then the corpus gate (batch-1 allowed list).
