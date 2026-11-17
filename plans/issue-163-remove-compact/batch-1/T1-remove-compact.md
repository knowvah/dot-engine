# T1: delete the weak/strong cluster machinery, test-first

## Context

[decisions.md](../decisions.md) AD-1..AD-3. The planned source change is
[harness/counterfactual.patch](../harness/counterfactual.patch) (src only, no
tests). Port it test-first. Do not just apply it: each red test must fail on the
base for the stated reason.

## Write-set

- `src/layout/dot/rank-dot2.ts`: AD-1, plus the two stale comments (the
  `makeXnode` doc comment and the F7 audit note).
- `src/layout/dot/rank-dot2.branch.test.ts`: AD-3 tests 1-2, the deleted tests,
  imports and `makeSt`.
- Optional new `src/layout/dot/rank-dot2.compact.test.ts`, if test 2 needs its
  own file (push-forward).
- `test/golden/known-failing.json`: AD-3 test 3 (`"goldens": []`).

## Read-set

- C: `~/git/graphviz-16.1.1/lib/dotgen/rank.c:672-748` (`makeXnode`,
  `compile_nodes`, `merge`, `strong`, `compile_edges`), `:893-913`
  (`connect_components`), `dot2_rank` (`compile_clusters` call gone). The removal
  diff: `git -C ~/git/graphviz-16.1.1 show -w d5061e47c 731f7c560 -- lib/dotgen/rank.c`.
- Port: `src/layout/dot/rank-dot2.ts` (whole file, 528 lines),
  `src/layout/dot/rank-dot2.branch.test.ts:1-60` (helpers `makeXg`, `makeSt`,
  `makeRankGraph`, `makeSubg`, `addRankEdge`), `test/helpers/known-failing.ts`
  (the `test.fails` ratchet), `test/helpers/dot-position.ts`.
- Golden: `test/golden/inputs/dot-newrank-compact-three.dot` (test 2's topology).

## Steps

1. Commit the brief: `docs(mission): add issue-163 brief`.
2. **Red.** Write AD-3 tests 1 and 2 against the base and run them. Test 1 must
   fail because `_weak_0` exists / no `Xt -> Xh` edge. Test 2 must fail with the
   base ranks (`c` 0, `d` 1, `z` 2 …). Remove the two ids from
   `known-failing.json` and run `npx vitest run test/golden/suite.test.ts
   test/golden/xdot-suite.test.ts -t compact`: the two un-listed goldens fail
   (SVG and xdot), the other three pass. Journal each red with its failure line.
3. **Green.** Make the AD-1 change in `rank-dot2.ts`. Delete the tests of the
   deleted functions, their imports, `weakId` in `makeSt`, and the end-to-end
   test at `:894` that AD-3 test 2 replaces. Update the two comments.
4. Run the touched tests, the compact goldens (step 2's command, now 10 green
   with 0 known-failing), and `npm run typecheck`.
5. Check the source against the counterfactual: `git diff 03dc6365 --
   src/layout/dot/rank-dot2.ts` must match the patch in behaviour. Journal any
   departure in form.
6. Commit `fix(T1): delete weak and strong clusters from the dot2 ranker`.

## Interface contracts

`XgState` becomes `{ lastNode: Node | undefined }`. Its only users are
`rank-dot2.ts` and `rank-dot2.branch.test.ts` (`grep -rn XgState src test` at
planning). The deleted exports (`xgWeakExists`, `xgWeakSetWeights`, `xgWeak`,
`isAStrongCluster`, `ccProcessNode`, `ccStrongCluster`, `compileClusters`) have
no importer outside those two files. They are not on the public API
(`src/index.ts`, `src/api/index.ts`).

## Acceptance criteria

- Given an edge from a node in a `compact=true` cluster to a node outside it,
  when `compileEdgeItem` runs, then Xg gains one edge `Xt -> Xh` with the
  original's `minlen` and `weight`, and no `_weak_*` node.
- Given golden `three`'s graph with `compact=true` on all three clusters, when
  `dot2Rank` runs, then the ranks are a 0, b 0, c 1, d 2, e 3, f 3, z 4.
- Given `known-failing.json` with `"goldens": []`, when the golden suites run,
  then all five `dot-newrank-compact-*` SVG and xdot tests pass.
- Given the head, when `grep -n "compact\|weak\|TOPNODE\|BOTNODE\|STRONG_CLUSTER"
  src/layout/dot/rank-dot2.ts` runs, then it finds no reference to the removed
  machinery.

## Observability

N/A.

## Rollback

Reversible: revert the commit.
