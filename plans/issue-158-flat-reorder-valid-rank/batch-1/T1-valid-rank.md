# T1: port flat_reorder's valid_rank

## Context

Graphviz 16.1.1 (upstream `9fb21f570`, fixes upstream #2368 and #2854) makes
`flat_reorder` give up on a rank as soon as the reverse-topological walk meets a
node that is neither free (no constraining flat edge) nor an unmarked source
(`~/git/graphviz-16.1.1/lib/dotgen/mincross.c:1340-1366`). An invalid rank skips
both the reorder and the "nonconstraint flat edges must be made LR" loop
(`:1368-1389`). The port (`src/layout/dot/mincross-flat.ts:153-201`) has
16.1.0's code. See [AD-1](../decisions.md#ad-1-port-valid_rank-as-c-has-it).

## Task (TDD)

1. **Red.** In `src/layout/dot/mincross-flat.branch.test.ts`, in the
   `flatReorderBuildTemprank` block (`:553-617`):
   - assert the return value of every existing case: `true` for the two flip
     cases and the postorder case, `false` for "drops a node with nonzero inCnt"
     and "skips postorder when v.info.mark is already set" (rename those two to
     say the rank is invalid);
   - add a case that pins C's `break`: rank `[s, v, w]` walked with
     `flip=true`, `v` has a constraining in-edge, `w` is free. The call returns
     `false` and `temprank` holds only what was pushed before `v` (`[s]`); `w` is
     never pushed.
   In the `flatReorderRank` block (`:678-744`) add: a rank `[a, b]` with a
   constraining flat edge `a -> b` (via `markInCluster`, `weight = 1`), `b`'s
   order before `a`'s, `flip=false`: the rank array and both orders are unchanged
   after the call, and `rootRank[0].valid` is `false`. Add a second case where a
   non-constraint flat edge (weight 0) points right-to-left on a rank that also
   has a constraining edge: `flatReorderFixEdges` must not reverse it (its
   `flat_out` keeps the edge). Run the file; journal the failures.
2. **Green.** Apply AD-1 (the hunk in
   [harness/counterfactual.patch](../harness/counterfactual.patch) is the
   planned change). Doc comment on `flatReorderBuildTemprank`: returns C's
   `valid_rank`; cite upstream `9fb21f570` and keep the `@see`.
3. **Known-failing ratchet.** Remove from `test/golden/known-failing.json`:
   goldens `dot-newrank-cluster-ranksame`, `dot-pack-flat-label`; ptIssue
   `21-boseba`, `23-nugecu`, `23-w12`, `23-w20`, `23-w30`, `23-w5`, `23-w9`,
   `26-cobumi`, `28-deroxu`, `30-sokevu` (keep the sort). The two
   `dot-newrank-compact-*` goldens stay (#163).
4. **The RC1 test.** `src/layout/dot/mincross-flat.test.ts:57-67` asserts `A`
   before `B` in `121.dot`'s `cluster_G1`. Native 16.1.1 `-Tplain` on
   `tests/121.dot` puts `B` at x 0.59722 and `A` at 1.5972 (cf: the same).
   Re-point the assertion at native 16.1.1's order, quote those two lines in the
   comment, and keep the two no-crash cases.
5. Run `npx vitest run src/layout/dot`, journal it, and commit
   (`fix(T1): ...`). Tests still red at this commit are T2's list only; name
   them in the journal.

## Write-set

- `src/layout/dot/mincross-flat.ts` (`flatReorderBuildTemprank`,
  `flatReorderRank`, their doc comments)
- `src/layout/dot/mincross-flat.branch.test.ts`, `src/layout/dot/mincross-flat.test.ts`
- `test/golden/known-failing.json`
- `plans/issue-158-flat-reorder-valid-rank/decision-journal.md`

## Read-set

- `~/git/graphviz-16.1.1/lib/dotgen/mincross.c:1297-1390`
- `src/layout/dot/mincross-flat.ts:125-213`
- `src/layout/dot/mincross-flat.branch.test.ts:1-65` (helpers), `:438-770`
- `test/helpers/known-failing.ts`

## Interface contracts

`flatReorderBuildTemprank(g, rk, temprank, flip): boolean` (was `void`). Its
only callers are `flatReorderRank` and the branch tests; `mincross-build.ts:43`
re-exports it by name only.

## Acceptance criteria

- Given a rank whose walk meets a node with a constraining in-edge, when
  `flatReorderBuildTemprank` runs, then it returns `false` and pushes no node
  after that one.
- Given a rank holding a constraining flat edge, when `flatReorderRank` runs,
  then the rank's order is unchanged, no flat edge is reversed, and
  `rootRank[r].valid` is `false`.
- Given a rank with no constraining flat edge, when `flatReorderRank` runs, then
  it reorders and fixes edges exactly as before (existing cases stay green).
- Given the 12 known-failing ids above, when `npm test` runs, then they pass as
  ordinary tests.

## Observability

N/A. C prints nothing on this path.

## Rollback

Reversible with the squashed commit.
