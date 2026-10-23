# Batch 5: `mode=hier` wiring and the shared HTML line builder

Parallel worktrees after batch 4. Disjoint write-sets. T26 is the mission's only `feat`
commit (minor release, AD-2). T27 is a refactor with output unchanged. Batch gate: survey +
neato walk (T26) + walks of every engine for T27's HTML ids.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T26](T26-hier-wiring.md) | Item 43e: wire `mode=hier` into neato | typescript-pro | `src/layout/neato/{start,init}.ts`, their tests | T5, T22 | [ ] |
| [T27](T27-html-line-builder.md) | Item 67: one HTML line builder for sizing and placement | typescript-pro | `src/common/htmltable.ts`, `htmltable-pos-runs.ts` | T7, T23 | [ ] |
