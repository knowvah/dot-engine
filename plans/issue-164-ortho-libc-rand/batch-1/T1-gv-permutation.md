# T1: order ortho segments with gvPermutation, test-first

## Context

[decisions.md](../decisions.md) AD-1..AD-3. The planned source change is
[harness/counterfactual.patch](../harness/counterfactual.patch) (src only, no
tests). Port it test-first: each red test must fail on the base for the stated
reason before the source changes.

## Write-set

- `src/ortho/partition.ts`: AD-1 (ordering, no seed, `SEED` gone, header and
  draw comments).
- `src/ortho/index.ts`: drop `export { SEED } from "./partition.js";` (`:26`).
- `src/ortho/partition.test.ts`: AD-3 red 1, the re-pinned permutations, the
  `csrand(1)` resets, the deleted `SEED` test and `genOrder`, the header comment.
- `src/ortho/ortho-failure.test.ts`: AD-3 reds 2 and 3, the `csrand(1)` reset,
  the header comment.
- `src/ortho/ortho.test.ts`: delete the `SEED` test, its import and AC1 in the
  header list.

## Read-set

- C: `~/git/graphviz-16.1.1/lib/ortho/partition.c:134-143`
  (`generateRandomOrdering`), `:587-655` (`monotonate_trapezoids`), `:657-725`
  (`partition`); `lib/util/random.c` (`gv_permutation`, `gv_random`).
  The change: `git -C ~/git/graphviz-16.1.1 show -w b99490ece`.
- Port: `src/ortho/partition.ts` (318 lines), `src/common/crand.ts` (85 lines),
  the three test files above.
- Evidence: [harness/partition-1611.out](../harness/partition-1611.out) (expected
  values), [harness/port-cases.ts](../harness/port-cases.ts).

## Steps

1. Commit the brief: `docs(mission): add issue-164 brief` (this directory).
2. **Red.** Write AD-3 reds 1-3 on the base, with `csrand(1)` before each
   `partition` call. Run `npx vitest run src/ortho`. Expected failures:
   - red 1: `expected 16807 to be 1264817709` (and 1954899097 for the
     3-node fixtures);
   - red 2: `partition(...)` is `null` where 4 rectangles are expected (stderr
     has the segment and horizontal failure lines);
   - red 3: 19 rectangles where `null` is expected.
   Journal each with its failure line.
3. **Green.** Apply AD-1 to `partition.ts` and `index.ts`. Re-pin the fixture
   permutations (AD-3), delete the two `SEED` tests and `genOrder`, and update
   the three header comments.
4. Run `npx vitest run src/ortho`: all green. Then `npm run typecheck`.
5. Check the port against the C once more: from
   `plans/issue-164-ortho-libc-rand/harness`, `npx tsx port-cases.ts | diff -
   partition-1611.out` is empty. (The C side needs no rebuild; rebuild with
   `build-c.sh` only if the output file is in doubt. Its `emptyrects` case is
   native UB and varies by run, AD-5.)
6. `git diff <base> -- src/ortho/partition.ts src/ortho/index.ts` against the
   counterfactual: the same change, plus any comment wording. Journal any
   departure. Commit `fix(T1): ...`.

## Interface contracts

`generateRandomOrdering(n): number[]` keeps its shape: a 1-based permutation of
`1..n`. `partition(cells, bb): OrthoBox[] | null` is unchanged. `SEED` no longer
exists; nothing outside the three test files imports it.

## Acceptance criteria

- Given `csrand(1)`, when `partition` runs on `f2pair`, then the next `crand()`
  is 1264817709 (red on the base: 16807).
- Given `csrand(1)`, when `partition` runs on the single point cell, then it
  returns the four rectangles of AD-3 and writes nothing to `console.error`
  (red on the base: null and two lines).
- Given `csrand(1)`, when `partition` runs on silentA, then it returns null and
  writes nothing (red on the base: 19 rectangles).
- Given the head, when `port-cases.ts` runs, then its output equals
  `partition-1611.out` byte for byte.
- Given the head, when `grep -rnE "random\.js|\bSEED\b|drand48\(" src/ortho`
  runs, then it prints nothing.

## Observability

N/A (library; the ortho failure lines are C's own, unchanged).

## Rollback

Reversible: revert the commit.
