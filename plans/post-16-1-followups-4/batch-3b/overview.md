# Batch 3b: `mode=hier` building blocks and lazy virtual attrs

Parallel worktrees after batch 2 (alongside 3a, 3c). T15–T17 add new, unwired modules
(AD-6); nothing calls them until T22/T26, so they cannot change output. Each is pinned by
clang `-O2` harness vectors built from the C sources in a scratchpad (never in
`~/git/graphviz/build`, stop 10). T21 is the lazy-attrs change (AD-12).

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T15](T15-compute-hierarchy.md) | Item 43a: `kkutils`, `opt_arrangement`, `compute_hierarchy` | typescript-pro | `src/layout/neato/{kkutils,opt-arrangement,compute-hierarchy}.ts` (new) | T0 | [x] |
| [T16](T16-quad-prog-solve.md) | Item 43b: `quad_prog_solve` | typescript-pro | `src/layout/neato/quad-prog-solve.ts` (new) | T0 (lands after T15) | [x] |
| [T17](T17-smart-ini-x.md) | Item 43c: `smart_ini_x` `IMDS_given_dim` | typescript-pro | `src/layout/neato/smart-ini-x.ts` (new) | T0 | [x] |
| [T21](T21-lazy-virtual-attrs.md) | Item 68: lazy `attrs` on dot virtual nodes/edges | typescript-pro | `src/model/{node,edge}.ts`, `src/layout/dot/fastgr.ts`, direct writers | T0 | [x] |
