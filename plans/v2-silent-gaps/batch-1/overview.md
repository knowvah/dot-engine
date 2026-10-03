# Batch 1: foundations and independent ports (parallel)

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Port `neatogen/poly.c` | typescript-pro (sonnet) | `src/layout/neato/poly.ts`, `src/layout/neato/poly.test.ts` | — | [x] |
| T2 | fdp `coords` declared graph-wide | typescript-pro (sonnet) | `src/layout/fdp/layout.ts`, `src/layout/fdp/coords-declared.test.ts` | — | [x] |
| T3 | Honour neato `mode`; verify sgd | typescript-pro (sonnet) | `src/layout/neato/index.ts`, `src/layout/neato/start.ts`, `src/layout/neato/sgd.ts` (only if Step 0 requires), `src/layout/neato/mode.test.ts` | — | [x] |
| T4 | Port KK (`kkNeato`) | typescript-pro (sonnet) | `src/layout/neato/kk.ts`, `src/layout/neato/kk.test.ts`, `src/layout/neato/init.ts` (shrink only) | — | [x] |
| T5 | Port `cAdjust` (ortho/portho) | typescript-pro (sonnet) | `src/layout/neato/constraint-adjust.ts`, `src/layout/neato/constraint-adjust.test.ts` | — | [x] |

T3 and T4 interact at runtime only (T3 makes `mode=KK` reachable; T4 supplies the
solver); write-sets are disjoint. Gate the batch after all five. Then the corpus
gate (batch-1 allowed list).
