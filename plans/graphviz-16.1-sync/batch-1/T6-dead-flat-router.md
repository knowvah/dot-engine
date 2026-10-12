# T6 — Delete dead `routeFlatEdgeFaithful`

**Agent:** typescript-pro (model: sonnet). **Depends on:** —. **Rollback:** Reversible.
**Observability:** N/A.

## Context

AD-7. `src/layout/dot/splines-flat.ts:581` `routeFlatEdgeFaithful` has no
production caller. It was kept on purpose after `nonadjacent-flat-multi` T3 "as the
cnt=1 reference; removable in a follow-up" (`plans/nonadjacent-flat-multi/README.md:133`).
C has no single-edge function. `make_flat_edge` loops `cnt`, and the port's
`routeFlatEdgeGroupFaithful` (`splines-flat-multi.ts`) mirrors that. Live
references: `splines-flat.branch.test.ts:37,423-467` (direct tests), plus
comments in `edge-route.ts:380`, `splines-flat-multi.ts:11,156`,
`splines-flat-oracle.test.ts:8`, `splines-flat.ts:424-429`.

## Task

1. `git grep -n routeFlatEdgeFaithful -- src test` and confirm no runtime
   caller. Stop if one exists.
2. Delete the function and any helpers only it uses. Before deleting a helper,
   find its references; "looks unused" is not proof.
3. Delete its direct tests. If any test checks the group router's cnt=1 output
   *against* `routeFlatEdgeFaithful`, re-pin that output to native instead
   (`~/git/graphviz/build/cmd/dot/dot`, `GVBINDIR=/tmp/ghl`).
4. Rewrite the comments to name `routeFlatEdgeGroupFaithful` and
   `make_flat_edge` instead.
5. Coverage of `splines-flat.ts` must not fall below 90/90/90.

## Acceptance

- Given the change, when `git grep routeFlatEdgeFaithful -- src test` runs, then it returns nothing.
- Given the full vitest run and gates.sh, then both are green, and the fresh survey has 0 regressions.

## Write-set

`src/layout/dot/splines-flat.ts`, `src/layout/dot/splines-flat.branch.test.ts`,
`src/layout/dot/edge-route.ts` (comment), `src/layout/dot/splines-flat-multi.ts`
(comment), `src/layout/dot/splines-flat-oracle.test.ts` (comment).

## Commit

`refactor(dot): remove the unused single-edge flat router`
