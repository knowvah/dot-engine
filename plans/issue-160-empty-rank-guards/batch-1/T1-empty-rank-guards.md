# T1: port the 16.1.1 empty-rank guards

## Context

Graphviz 16.1.1 guards five reads of `GD_rank(g)[r].v[0]` against an empty rank
(upstream #2759: `ca3353d80`, `1a77ac9df`, `8e06a6261`, `9fca64d0f`,
`d49e3a529`; read them with `git -C ~/git/graphviz show -w <sha> -- lib/`). The
port has 16.1.0's unguarded reads, so `2759` and `2759_1` throw `InternalError`
where native renders them. [AD-1](../decisions.md#ad-1-port-the-five-upstream-guards-in-place-as-c-has-them)
says what each guard is. [harness/counterfactual.patch](../harness/counterfactual.patch)
is the planning version: the starting point, not the deliverable (it has no
`@see` lines and no tests).

## Steps (TDD)

1. **Red.** Add the branch tests
   [AD-2](../decisions.md#ad-2-tdd-at-the-function-level-one-corpus-regression-test)
   lists, each asserting a value, never just "does not throw":
   - `computeSizey`, three cases: rank `r + 1` empty with `r` not max (gives
     the max-rank value: `rank[r-1].y - n.y`, or `ND_ht` if no leader above);
     rank `r - 1` empty with `r` not min (gives `n.y - rank[r+1].y`); `r` at max
     with rank `r - 1` empty (gives `ND_ht(n)`).
   - `dotComputeBb`, min rank empty: `bb.ur.y` is the next non-empty rank's
     leader y plus `ht2`.
   - `setYcoordsInitial`, with an empty rank between two non-empty ones: the
     rank above the empty one keeps its prior y, and `maxht` still includes
     every `delta`.
   - `makeLrRankConstraints` with `v[0]` null and with `v` empty: no aux edges,
     no `mval`/`rank` writes.

   Run them and journal the failure counts.
2. **Green.** Port the guards as AD-1 says, one `@see` per site naming the
   upstream sha and the 16.1.1 line (e.g. `@see lib/dotgen/position.c:dot_compute_bb
   (16.1.1, 8e06a6261)`). Keep each function's existing structure. Edit no
   other function.
3. **Regression.** Capture native 16.1.1 `-Tplain` for `tests/2759.dot` and
   `tests/2759_1.dot` (`GVBINDIR=/tmp/ghl1611`, oracle preflight first; exit 0
   and two `already in a rankset` warnings expected). Write
   `src/layout/dot/empty-rank-2759.test.ts` with the verbatim sources and the
   captures, after `flat-2723.test.ts`. Header: what native does, why stderr
   isn't pinned (#225). It must pass on the head and throw on the base (journal
   that you checked).
4. `npx vitest run src/layout/dot` and `npm run typecheck`; journal both.

## Write-set

- `src/layout/dot/self-loop.ts`, `src/layout/dot/self-loop.branch.test.ts`
- `src/layout/dot/position-bbox.ts`, and `src/layout/dot/position.test.ts` or a
  new `src/layout/dot/position-bbox.branch.test.ts` (push-forward)
- `src/layout/dot/position-ycoords.ts`, `src/layout/dot/position-ycoords.branch.test.ts`
- `src/layout/dot/position-aux.ts`, `src/layout/dot/position-aux.branch.test.ts`
- `src/layout/dot/empty-rank-2759.test.ts` (new)

## Read-set

- `~/git/graphviz-16.1.1/lib/dotgen/dotsplines.c` (the self-loop `sizey`
  block), `position.c:240-243`, `:742-836`, `:845-898`
- `src/layout/dot/flat-2723.test.ts` (regression-test pattern)
- the four source files above

## Acceptance criteria

- Given a node on rank `r` with an empty rank `r + 1` and `r < maxrank`, when
  `computeSizey` runs, then it returns the max-rank branch's value (as C at
  `dotsplines.c`'s `r == GD_maxrank(g) || … v[0] == NULL`).
- Given a root whose min rank is empty, when `dotComputeBb` runs, then
  `bb.ur.y` is the first non-empty rank's leader y plus `ht2`.
- Given a rank whose lower neighbour is empty, when `setYcoordsInitial` runs,
  then that rank's leader y isn't written and nothing throws.
- Given a rank with `v[0]` null or absent, when `makeLrRankConstraints` runs,
  then it makes no aux edge and writes no node field.
- Given `tests/2759.dot` and `tests/2759_1.dot`, when rendered `-Tplain`, then
  the output equals native 16.1.1's capture byte for byte.

## Interface contracts

None: no signature changes. A private helper (e.g. `rankHasLeader`) in
`self-loop.ts` is fine if it is not exported.

## Observability

N/A (library; C prints nothing here).

## Rollback

Reversible: revert the commit. Only inputs that threw before change behaviour.

## Commit

`fix(T1): guard empty ranks as graphviz 16.1.1 does`, with a body naming the
five upstream shas and `Refs: #160`.
