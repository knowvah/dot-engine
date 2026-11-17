# T1: saturate treeAdjust's rank addition

## Context

`tree_adjust` (`~/git/graphviz-16.1.1/lib/common/ns.c:583-620`) shifts every
node of a tight subtree by `delta` when `merge_trees` (`:636-652`) joins two
subtrees in `feasible_tree`. 16.1.1 changed its add to
`sadd_saturate(ND_rank(top->v), delta)` (`:599`; helper at
`lib/util/overflow.h:49-62`). The port's `treeAdjust`
(`src/layout/dot/ns-subtree.ts:273-290`) still adds plainly. See
[AD-1](../decisions.md#ad-1-saddsaturate-lives-in-a-new-srcutiloverflowts) and
[AD-2](../decisions.md#ad-2-saturate-the-ports-values-as-they-are).

## Task (TDD)

1. **Red.** Write `src/util/overflow.test.ts` importing `saddSaturate` from
   `./overflow.js` (fails: module missing). Cases, each asserting the exact
   number:
   - `saddSaturate(1, 2)` is `3`; `saddSaturate(5, 0)` is `5`;
     `saddSaturate(-5, -7)` is `-12`.
   - Overflow edge: `saddSaturate(2147483647 - 10, 10)` is `2147483647` (passes
     through); `saddSaturate(2147483647 - 9, 10)` is `2147483647` (clamps);
     `saddSaturate(2147483000, 1000)` is `2147483647`.
   - Underflow edge: `saddSaturate(-2147483648 + 10, -10)` is `-2147483648`
     (passes through); `saddSaturate(-2147483648 + 9, -10)` is `-2147483648`
     (clamps); `saddSaturate(-2147483000, -1000)` is `-2147483648`.
   - Mixed signs never clamp: `saddSaturate(2147483647, -1)` is `2147483646`;
     `saddSaturate(-2147483648, 1)` is `-2147483647`.
2. Add to `src/layout/dot/ns-range.test.ts` (it already builds tight trees with
   `buildTree`) a `describe('treeAdjust — saturates at int32 (ns.c:599)')`:
   - a 4-node tree with ranks `2147483640..2147483643`, `delta = 10`: every
     rank becomes `2147483647`;
   - ranks `-2147483640..-2147483643`, `delta = -10`: every rank becomes
     `-2147483648`;
   - ranks `0, 5, 2147483637, 2147483638`, `delta = 10`: `10, 15, 2147483647,
     2147483647` (only the nodes at the edge clamp; `2147483637 + 10` is
     exactly `INT_MAX` and passes).
   Run `npx vitest run src/util/overflow.test.ts src/layout/dot/ns-range.test.ts`
   and journal the red failures.
3. **Green.** Create `src/util/overflow.ts` per AD-1 (SPDX header, file
   docblock `@see lib/util/overflow.h`, `@see lib/util/overflow.h:sadd_saturate`
   on the function, C's two comments kept). In `treeAdjust`, import it and
   replace the add per AD-2. Update `treeAdjust`'s doc comment: the mutation is
   now `rank = sadd_saturate(rank, delta)`, still order-independent because
   each node's result depends only on its own rank. If the existing
   iterative-vs-recursive test's `refTreeAdjust` would see a clamping value,
   make it use `saddSaturate` too (push-forward).
4. Re-run the two test files, then gates 1-6 (README). Journal each.
5. **Finish:** the README's squash step.

## Write-set

- `src/util/overflow.ts` (create)
- `src/util/overflow.test.ts` (create)
- `src/layout/dot/ns-subtree.ts` (modify: import, one statement, doc comment)
- `src/layout/dot/ns-range.test.ts` (modify: new describe block; optionally
  `refTreeAdjust`)
- `src/util/index.ts` (modify, only if the push-forward re-export is taken)
- `plans/issue-152-tree-adjust-saturate/decision-journal.md`, the README's
  batch status, `plans/decision-journal.md`, `.agent-notes/issue-152.md`
  (only if novel)

## Read-set

- `~/git/graphviz-16.1.1/lib/common/ns.c:583-652`
- `~/git/graphviz-16.1.1/lib/util/overflow.h:40-62`
- `src/layout/dot/ns-subtree.ts:260-305`
- `src/layout/dot/ns-range.test.ts` (helpers `buildTree`, `snapshot`,
  `refTreeAdjust`; the treeAdjust blocks at `:150-196`)
- `src/util/math.ts:1-15`, `:70-85` (`d2i`'s style and constants)

## Interface contracts

`saddSaturate(a: number, b: number): number`. Inputs are the port's numbers;
no integer check (AD-2). Output is `INT_MAX`, `INT_MIN` or `a + b` exactly as
C's three branches. Consumer: `treeAdjust` only.

## Acceptance criteria

- Given `a = 2147483638`, `b = 10`, when `saddSaturate(a, b)`, then
  `2147483647`; given `a = 2147483637`, then `2147483647` by pass-through.
- Given `a = -2147483639`, `b = -10`, when `saddSaturate`, then `-2147483648`.
- Given a tight tree whose ranks sit 7..4 below `INT_MAX`, when
  `treeAdjust(root, undefined, 10)`, then every rank is `2147483647`.
- Given the 49 smoke ids, when bytediffing base and head bundles, then every
  job is identical.
- Given the survey ids, when bytediffing base and head, then only `1314` and
  `2758` differ, with the line counts in the table below.

## Bytediff

`src/` changes, so gate 5 applies. Build the head with `npm run build:js` and copy
`dist/index.js` to `$TMPDIR/issue152-head.mjs`. Build the base from
`git archive <base>`, extracted under `$TMPDIR`, with `node_modules` symlinked and
`npm run parser:regen`, and copy its bundle to `$TMPDIR/issue152-base.mjs`. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue152-base.mjs $TMPDIR/issue152-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue152-bytediff.json
```

Expected: identical on every job. At planning,
[harness/detector.sh](../harness/detector.sh) saw no clamp and no out-of-int32
input on the 49 smoke ids ([harness/detector-smoke.txt](../harness/detector-smoke.txt)).

## Targeted survey

**How the ids were chosen** ([harness/survey-ids.txt](../harness/survey-ids.txt)):
the change is reachable only where `treeAdjust` sees `rank + delta` outside
int32. That needs ranks near 2^31 in the position phase (the rank phase would
build ~2^31 virtual nodes first). The ids are every corpus input the detector
flagged (`2758`, `1314`, `2781`, `2781_1`, `2776_1`, the #162 family from the
#147/#148 classification), plus `2646` as a control: the deep tight tree that
made `treeAdjust` iterative.

```
BD_ENGINES=dot BD_FORMATS=svg,xdot,plain,cmapx,json npx tsx test/tools/bytediff.ts \
  $TMPDIR/issue152-base.mjs $TMPDIR/issue152-head.mjs \
  plans/issue-152-tree-adjust-saturate/harness/survey-ids.txt $TMPDIR/issue152-survey.json
```

Expected, from the planning run: 30 jobs, diffs 8 (`1314` and `2758`:
svg, xdot, plain, json), identical 22, capped 0. (Planning measured the 5 #162
ids, 25 jobs; `2646` is expected identical. If `2646` caps on time, journal it
and compare it on svg alone.)

**Head vs native** on `1314` and `2758`: run
`GVBINDIR=/tmp/ghl1611 ~/git/graphviz-16.1.1/build/cmd/dot/dot -T<fmt>` and
`node test/tools/bd-job.ts $TMPDIR/issue152-<base|head>.mjs <file> dot <fmt>`
(output cut at `--stderr--`). Count `diff` lines against native for base and
head, and check that no line in both base and native is missing from head.

| id | fmt | vs native, base | vs native, head |
|---|---|---|---|
| 2758 | xdot | 33 | 33 |
| 2758 | plain | 13 | 13 |
| 2758 | cmapx | 1 | 1 |
| 1314 | xdot | 17 | 17 |
| 1314 | plain | 7 | 7 |
| 1314 | cmapx | 1 | 1 |

Native-equal lines lost on head: 0 for svg, xdot and plain on both ids. These
two ids do not move toward native, so they do not belong under "toward-native
changes": list them in the report under "for review", citing AD-3.

## Observability

N/A. C prints nothing when it saturates.

## Rollback

Reversible: revert the commit. No format, data or API change.
