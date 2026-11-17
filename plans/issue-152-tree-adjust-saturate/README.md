# Mission: issue #152: saturate tree_adjust's rank addition at int32

## Objective

Graphviz 16.1.1 (upstream `516002930`, issue 2758) changes `tree_adjust`
(`~/git/graphviz-16.1.1/lib/common/ns.c:599`) from `ND_rank(v) += delta` to
`ND_rank(v) = sadd_saturate(ND_rank(v), delta)`. `sadd_saturate`
(`lib/util/overflow.h:49-62`) clamps an int sum to `[INT_MIN, INT_MAX]`. The
port's `treeAdjust` (`src/layout/dot/ns-subtree.ts:273`) adds doubles, so a
rank can pass int32.

The port needs:

1. A new `src/util/overflow.ts` with `saddSaturate`, a line-for-line port of
   `sadd_saturate`, and its unit tests
   ([AD-1](decisions.md#ad-1-saddsaturate-lives-in-a-new-srcutiloverflowts)).
2. `treeAdjust` assigns `saddSaturate(n.info.rank ?? 0, delta)`, applied to the
   port's values as they are, with no int32 wrap of the inputs
   ([AD-2](decisions.md#ad-2-saturate-the-ports-values-as-they-are)).

Done means:

- `saddSaturate` and `treeAdjust` are unit-tested at both bounds, at the exact
  edges (`INT_MAX - b == a`), and on a tree where every node clamps.
- Every gate is green. The smoke bytediff is identical on every job.
- On the targeted survey, only `1314` and `2758` change, and on each their
  diff against native does not grow (AD-3).

Type `fix`, a patch release.

**Out of scope:**

- #162 (`make_aux_edge` fails the layout on an edge longer than `INT_MAX`).
  Every input known to reach the new clamp is an #162 input; native 16.1.1
  fails those layouts before `rank()` runs
  ([AD-3](decisions.md#ad-3-1314-and-2758-change-and-stay-diverged-until-162)).
- Wrapping the port's other int arithmetic (`initRank`, `nsSlack`, `update`) at
  int32. C's overflow there is undefined behavior, not a port target (AD-2).
- `test/corpus/*` records and `docs/known-divergences.md`
  ([AD-4](decisions.md#ad-4-the-corpus-records-stay-as-they-are)).

## Evidence (measured at planning, base `ca32ce6a`)

- **Reach (port):** [harness/detector.sh](harness/detector.sh) logs each time
  `treeAdjust` would clamp (`sat`) or sees a rank or delta already outside int32
  (`pre`). On the 49 smoke ids: 0 and 0
  ([harness/detector-smoke.txt](harness/detector-smoke.txt)). On the #162
  inputs, `pre` only ([harness/detector-hits.txt](harness/detector-hits.txt)):
  `1314`, `2758`, `2781`, `2781_1`, `2776_1`. A rank-phase probe
  ([harness/probes/chain-4.gv](harness/probes/chain-4.gv), `nodesep=20000000`):
  0 and 0.
- **Native 16.1.1** on `1314` and `2758`: `Error: Edge length … larger than
  maximum 2147483647 allowed.`, exit 1, and an unpositioned graph (every node at
  x 0). It never reaches `tree_adjust` in `dot_position`.
- **Scratch head** (the saturating add, applied to a `$TMPDIR` copy), base vs
  head, dot, 5 formats on the 5 #162 inputs: 25 jobs, identical 17, diffs 8
  (`1314` and `2758`, svg/xdot/plain/json). `2781`, `2781_1` and `2776_1` stay
  identical: their sums fall inside the formula's pass-through.
- **Head vs native** on the 2 changed ids: diff lines against native are equal
  on base and head (`2758` xdot 33/33, plain 13/13; `1314` xdot 17/17, plain
  7/7; cmapx 1/1 on both), and no line that equalled native on the base is lost
  on the head (svg, xdot, plain).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with this
   brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline ca32ce6a..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, and never merge `main` into it.
- **Base sha:** `ca32ce6aad23a01138a7458b8eb8d37121938375` (tip at planning). If
  the tip moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-152 brief` (this
  directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T1's last step):** `git tag issue-152/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(dot): saturate tree_adjust's rank addition at int32

  Graphviz 16.1.1 clamps tree_adjust's rank + delta to [INT_MIN, INT_MAX]
  with sadd_saturate (upstream 2758) where the port added doubles. Port
  sadd_saturate into src/util/overflow.ts, as lib/util/overflow.h holds
  it, and use it in treeAdjust. No smoke input reaches the clamp; 1314 and
  2758 change but wait on #162, which fails their layout first.

  Refs: #152
  ```

  Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR,
  or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; 13564 + new passed, 18 expected fail |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-tree-adjust-saturate.md#bytediff) | identical on every job |
| 6 | Targeted survey | see [T1](batch-1/T1-tree-adjust-saturate.md#targeted-survey) | the table in T1 |

The oracle is graphviz 16.1.1 (ADR-0002): `~/git/graphviz-16.1.1/build/cmd/dot/dot`,
with `/tmp/ghl1611` for dot. Run `oraclePreflight` (`test/corpus/oracle-env.ts`)
for `dot` before trusting native output. If `config8` is missing, run
`GVBINDIR=<dir> <dot> -c`. Check `uptime` before gate 6, and wait if the load is
above 12.

The baseline was green at planning: see [decisions.md](decisions.md#baseline).

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
3. Gate 5 shows any changed output. No smoke input reached the clamp at
   planning; a change means an unexpected path. Diagnose it, and halt per the
   queue rules unless it equals native.
4. In gate 6, an id other than `1314` and `2758` changes, or either of them has
   a diff against native that grows, or loses a line that equalled native on the
   base.
5. An existing test fails because of the change.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong. One
   example: a 16.1.1 caller of `tree_adjust` or `sadd_saturate` in `ns.c` that
   AD-2's reading missed.

## Push-forward (decide alone, journal it)

- Test names, their order, and whether `saddSaturate`'s tests are table-driven.
- Whether `ns-range.test.ts`'s recursive reference `refTreeAdjust` also uses
  `saddSaturate` (it should if a test there feeds it a clamping value).
- The wording of `treeAdjust`'s doc comment, which must stop calling the
  mutation `rank += delta`.
- Whether `saddSaturate` is also re-exported from `src/util/index.ts` (only if
  another `src/util` helper of its kind is; `d2i` is).

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-tree-adjust-saturate.md](batch-1/T1-tree-adjust-saturate.md) | the task |
| [harness/detector.sh](harness/detector.sh) | reach check: clamps and out-of-int32 inputs per id |
| [harness/detector-smoke.txt](harness/detector-smoke.txt) | detector output at planning |
| [harness/detector-hits.txt](harness/detector-hits.txt) | the DETECT152 lines per id |
| [harness/survey-ids.txt](harness/survey-ids.txt) | gate 6 ids |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where the clamp sits |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (the project journal): mechanism, files,
  gates.
- Write `.agent-notes/issue-152.md` only for something novel. Otherwise, say in
  the journal row that nothing was novel.
- Comment on #152 with the outcome: no smoke change, `1314` and `2758` changed
  and still waiting on #162, and that #162's mission should re-measure whether
  `2758` reaches `treeAdjust` once the layout fails earlier.
- The final message ends with the driver's status line.

## Summary (2026-11-16)

- **Tasks:** 1 of 1 done (T1).
- **Decisions:** 4 push-forward calls, journalled; one worth a look: `saddSaturate`
  is not re-exported from `src/util/index.ts` (nothing imports that barrel).
- **Gates:** typecheck 0; `npm test` 579 files, 13584 passed, 18 expected fail;
  goldens 5/5; corpus + docs 2863 passed; smoke bytediff 1960 jobs, all
  identical; survey 30 jobs, 8 diffs (`1314`, `2758`), `2646` identical on svg
  with a longer cap.
- **For review (AD-3):** `1314` and `2758` change and stay unequal to native,
  with the same number of diff lines on base and head and no native-equal line
  lost. They wait on #162.
- **Follow-ups:** none filed. #162's mission should re-run
  [harness/detector.sh](harness/detector.sh) on the five #162 ids.
