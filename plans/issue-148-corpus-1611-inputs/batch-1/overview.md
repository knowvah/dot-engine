# Batch 1: the root constant and the manifest

T1 moves every default to one constant; T2 re-enumerates the manifest from the
new root. T2 needs T1 (`enumerate.ts` reads the constant), so they run in order,
one agent, no parallelism. Both are test-tree only.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | `ORACLE_CORPUS_ROOT`, 19 script defaults, fitness test, dashboard label, README | executor | see [T1](T1-root-constant.md#write-set) | — | [x] |
| T2 | Re-enumerate the manifest; quarantine native crashes; README totals | executor | see [T2](T2-manifest.md#write-set) | T1 | [x] |

Exit: gates 1, 2 and 4 green after T2 (run gate 3 in T4).
