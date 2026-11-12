# Batch 1

Three tasks, run in order in the main session. Their write-sets do not overlap, but each
is small, and T2's test reads more easily once T3's token reader exists, so no subagent
is used.

| Task | Writes | Depends on |
|---|---|---|
| [x] [T1](T1-strtod-parse-real.md) | `src/xdot/parse.ts`, `src/xdot/parse-strtod.test.ts` | — |
| [x] [T2](T2-json-nonfinite-tokens.md) | `src/render/json.ts` (+ helper), its test | T1 (for the end-to-end case) |
| [x] [T3](T3-compare-json-nonfinite.md) | `test/golden/compare-json.ts`, its test | — |

Exit: each task's acceptance criteria hold, each task is committed, and gates 1-2 are
green after T3.
