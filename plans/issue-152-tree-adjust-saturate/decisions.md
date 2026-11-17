# Decisions: issue #152

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-16. #152 is the lowest-numbered open `queue:ready` issue. Its one
blocker, #147, is closed. No issue is `queue:planned`. Nobody confirmed these
decisions. Each one names the rejected options and the evidence, so the
maintainer can audit it.

### AD-1: saddSaturate lives in a new src/util/overflow.ts

- **Decision:** create `src/util/overflow.ts` (SPDX header, `@see
  lib/util/overflow.h`) with:

  ```ts
  /** @see lib/util/overflow.h:sadd_saturate */
  export function saddSaturate(a: number, b: number): number {
    // overflow?
    if (b > 0 && INT_MAX - b < a) return INT_MAX;
    // underflow?
    if (b < 0 && INT_MIN - b > a) return INT_MIN;
    return a + b;
  }
  ```

  `INT_MAX`/`INT_MIN` are module constants (`2_147_483_647`,
  `-2_147_483_648`). `src/util/math.ts` keeps its own private copies; do not
  export or move them in this mission (write-set).
- **Why:** CLAUDE.md keeps C's function and file boundaries. C keeps
  `sadd_saturate` in `overflow.h`, not `gv_math.h` (which `math.ts` ports). #154
  will port `fdiv_overflow` from the same header, so the file has a second
  tenant coming.
- **Rejected:**
  - Adding it to `src/util/math.ts`. That file ports `gv_math.h`; mixing headers
    blurs the `@see` map.
  - Inlining the clamp in `treeAdjust`. C names the helper; the port keeps the
    name, and the helper is testable alone.
- **Tests:** C has no unit test for `sadd_saturate` (`lib/util/test_overflow.c`
  at 16.1.1 covers the other helpers only). Write
  `src/util/overflow.test.ts` from the C's branches: both clamps, both exact
  edges (`a = INT_MAX - b` passes; `a = INT_MAX - b + 1` clamps; the same at
  `INT_MIN`), `b = 0`, and an in-range sum.

### AD-2: saturate the port's values as they are

- **Decision:** in `treeAdjust`, replace
  `n.info.rank = (n.info.rank ?? 0) + delta;` with
  `n.info.rank = saddSaturate(n.info.rank ?? 0, delta);`. Do not wrap `rank` or
  `delta` to int32 first, and do not touch `mergeTrees`, `nsSlack`, `initRank`
  or `update`.
- **Why:** 16.1.1 changes only this one statement (`git show 516002930` in
  `~/git/graphviz`: `ns.c` one line, `overflow.h` the helper). In C, ranks and
  `delta` are `int`, so an out-of-int32 value never reaches `sadd_saturate`. In
  the port it can, but only where C has already overflowed elsewhere (undefined
  behavior) or failed the layout (#162). The detector found this on the 5 #162
  inputs only. Porting C's formula unchanged is the faithful reading;
  modelling the earlier UB is not.
- **Order:** the port's `treeAdjust` visits nodes in a different order from
  16.1.1's iterative `tree_adjust` (`ns.c:583-620`, pre-order). Each node is
  visited once and its new rank depends only on its own rank and `delta`, so
  the saturating add is as order-independent as the plain one was.
- **Rejected:**
  - Wrapping `rank` and `delta` with `| 0` before the add. That models C's
    two's-complement wrap in `SLACK`, which is undefined behavior and not what
    upstream changed. It would also change outputs on inputs the detector did
    not see.
  - Saturating every rank write in `ns.ts`. Upstream did not.
- **Evidence:** the 16.1.1 callers of `tree_adjust` are `merge_trees`
  (`ns.c:644`, `:648`) only, matching the port's `mergeTrees`. `sadd_saturate`'s
  other callers in 16.1.1 (`grep -rn sadd_saturate lib`): none.

### AD-3: 1314 and 2758 change and stay diverged until #162

- **Decision:** accept that `1314` and `2758` change. Do not special-case them.
- **Why:** both are #162 inputs. Native 16.1.1 fails them in `make_aux_edge`
  (`Edge length … larger than maximum 2147483647 allowed.`, exit 1, nodes
  unpositioned) before `rank()` runs in `dot_position`. The port has no #162
  yet, so it carries on and reaches `treeAdjust` with a rank or `delta` already
  past int32. The new clamp moves one node: `2758` node `0` from x 2.9826e+07 to
  9.4785e+06 (plain, inches); `1314` node `n0` from 3.8205e+09 to 7.5516e+09.
  Native has x 0 in both. Diff lines against native are unchanged in count on
  every format, and no line that equalled native on the base is lost.
- **Not a halt under the queue rules:** neither id is in the smoke list. In the
  maintainer's full survey, `1314` stays `diverged` (its `maxDelta` will move);
  `2758` is new at 16.1.1 and tracked under #148/#162.
- **For #162's mission:** once the layout fails at `make_aux_edge`, neither id
  should reach `treeAdjust` in position. Re-measure with the detector then.

### AD-4: the corpus records stay as they are

- **Decision:** do not edit `test/corpus/parity.json` (1314's `maxDelta`),
  `docs/known-divergences.md`, or any other corpus record.
- **Why:** records are rewritten by the maintainer's full survey over the queue
  branch, not per mission. Gate 4 reads the records, and no record pins a value
  this change moves (checked at planning: 1314 appears in `parity.json`,
  `perf.json` and `native-timings.json` only, with verdicts, not coordinates;
  2758 appears in no record).

## Baseline

Measured at planning on `ca32ce6a`, load 5-17:

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 578 files, 13564 passed, 18 expected fail |
| `bash test/golden/gates.sh` | 5/5 PASS |
| `npx vitest run test/corpus test/docs` | 25 files, 2863 passed |

## Rollback

Reversible: revert the squashed commit. No data, API or format change.
`saddSaturate` is internal (not exported from `src/index.ts`).
