# Mission: issue #162: fail the dot layout when an aux edge is too long

## Objective

Graphviz 16.1.1 (`f86899fcc` plus eight plumbing commits; upstream 2781, 2776)
no longer clamps an aux edge longer than `INT_MAX`. `make_aux_edge` prints
`Edge length %f larger than maximum 2147483647 allowed.` / `Check for overwide
node(s).`, returns `NULL`, and `make_LR_constraints`/`make_edge_pairs` →
`create_aux_edges` → `dot_position` → `dotLayout` → `doDot` fail the layout.
Native exits 1 and writes the unpositioned graph. The port clamps silently
(`src/layout/dot/position-aux.ts:109-115`) and lays the graph out at 1e12-1e26 pt.

Done means:

- AD-1: `makeAuxEdge` refuses as 16.1.1 does, with native's message (`%f` via
  `printfFixed`); unchecked callers keep ignoring it.
  ([AD-1](decisions.md#ad-1-makeauxedge-refuses-as-1611-does))
- AD-2: status returns along C's checked chain to `dotPosition`, plus the pack
  arm's `dotPosition` rc.
  ([AD-2](decisions.md#ad-2-return-codes-through-the-checked-chain-nothing-more))
- AD-3: `GD_nodesep` saturates at int32, so 2758's message value equals native's.
  ([AD-3](decisions.md#ad-3-gd_nodesep-saturates-at-int32-2758))
- AD-4: red-first tests and `-Tplain` pins of `1314`, `2781_1`, `2776_1`, `2758`.
  ([AD-4](decisions.md#ad-4-tdd-tests-and-corpus-pins))
- T2: gates green; the smoke bytediff is unchanged; the survey equals the
  planning table, with the head's stderr equal to native's
  ([AD-5](decisions.md#ad-5-how-equals-native-is-judged)).

Type `fix`, a patch release.

**Out of scope** ([AD-6](decisions.md#ad-6-scope)): #187, #235 (pack arm's
`dotMincross` rc), #236 (`poly_gencode` fma), the other `POINTS` sites, `2776`'s
pathplan failure, #185, corpus records and the ledger.

## Evidence (measured at planning, base `31f9122f`)

"cf" = the base plus [harness/counterfactual.patch](harness/counterfactual.patch)
(AD-1..AD-3, src only). Native = 16.1.1 (`GVBINDIR=/tmp/ghl1611`, `config8`
present).

- **Reach, both sides** ([harness/detector-hits.txt](harness/detector-hits.txt)):
  over all 982 applicable dot ids (`-Kdot -Tplain`, 60 s cap), native 16.1.1
  prints `Edge length …` on exactly `1314`, `2758`, `2776_1`, `2781` and `2781_1`,
  once each. The cf plus markers ([harness/detector.sh](harness/detector.sh),
  [detector.patch](harness/detector.patch)) prints the same message, with the
  same value, on the same five ids and nowhere else. Every port refusal is at
  `lrRankPair` (the adjacent-pair edge, C `position.c:269`) and fails
  `dotPosition`. No unchecked caller and no other checked site refuses on the
  corpus. Ids that did not finish are listed in
  [harness/detector-nonzero.txt](harness/detector-nonzero.txt) (a 180 s re-run
  included); none is a smoke id.
- **Output** ([harness/planning-survey.txt](harness/planning-survey.txt)): on the
  five reach ids the cf's svg, xdot, plain and cmapx equal native, and the base's
  did not (6-74 diff lines). The residue: json's root `"name"` (#185, all five),
  and on `2781`/`2781_1` one svg/xdot/json line for node `00`'s ellipse centre,
  which is native's fma contraction in `poly_gencode` (#236; exact-arithmetic
  replay in [harness/fma-ellipse.mjs](harness/fma-ellipse.mjs)). The control
  `2776` is unchanged.
- **Stderr:** the cf prints native's two `Edge length` lines on all five ids. On
  `2758` that needs AD-3: without it the port reported `2880000054.000000`
  against native's `2147483701.000000` (= `INT_MAX` + 54, the saturated
  `GD_nodesep` plus two half-widths).
- **Pack arm** ([harness/pack-probe.dot](harness/pack-probe.dot)): the base runs
  out of heap packing 1e25-pt components; the cf fails the first component and
  stops before packing. Native prints the error and segfaults (exit 139), so the
  probe is a control-flow test, not a pin (decisions AD-2).
- **Smoke reach:** no smoke id is a reach id, so gate 5 expects 0 changed jobs.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 31f9122f..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `31f9122f` (tip at planning). If the tip moved, use the tip at
  execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-162 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`.
- **Finish (T2):** `git tag issue-162/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(dot): fail the layout when an aux edge is too long, as 16.1.1 does

  Graphviz 16.1.1 no longer clamps an aux edge longer than INT_MAX:
  make_aux_edge prints its error and returns NULL, and make_LR_constraints
  and make_edge_pairs fail create_aux_edges, dot_position and the layout
  (upstream f86899fcc, 73c1fd4d1, f0d837f19, d3f55476c, 92ef8d508,
  e62e35be5, eee08edc1, f1e5ad67d, f444e5192). Port the refusal and its
  return codes, including the pack arm's dot_position check. Saturate
  nodesep at int32 as the native int field does, so 2758 reports native's
  length. 1314, 2758, 2776_1, 2781 and 2781_1 now fail as native does.

  Refs: #162
  ```

  Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR,
  or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; expected-fail count as the baseline |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T2](batch-1/T2-gates-finish.md#bytediff-gate-5) | 0 changed jobs |
| 6 | Targeted survey | see [T2](batch-1/T2-gates-finish.md#targeted-survey-gate-6) | equals the planning table; stderr as native |

Oracle: graphviz 16.1.1 (ADR-0002), `~/git/graphviz-16.1.1/build/cmd/dot/dot`,
`GVBINDIR=/tmp/ghl1611`. Run `oraclePreflight` (`test/corpus/oracle-env.ts`)
before trusting native output; if `config8` is missing, run
`GVBINDIR=/tmp/ghl1611 <dot> -c`. Check `uptime` before native renders; wait
while the load is above 12. Do not drop the `a -> b` edge from
`harness/pack-probe.dot`: without it every component holds one node, nothing
fails, and native hangs packing 1e25-pt components (seen at planning).

## Baseline (Phase 8)

Measured at planning on `31f9122f` (all green):

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 585 files, 13758 passed, 4 expected fail |
| `bash test/golden/gates.sh` | 5/5 PASS |
| `npx vitest run test/corpus test/docs` | 25 files, 2863 passed |

Oracle preflight: `/tmp/ghl1611/config8` present; the 16.1.1 binary rendered all
six survey ids (exit 1, as expected) this session. Gate 2's expected-fail count
stays 4: no known-failing entry covers a reach id. Tests that pin the clamp
(`position-aux.branch.test.ts:168`) change by design (AD-4).

## Stop conditions

1. A file outside the task write-sets needs a change.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
3. A T1 red test passes on the base, or a corpus pin cannot equal native's
   `-Tplain` byte for byte. Rebuild the test; if it can't be built, stop with
   the mechanism.
4. A reach id's stderr on the head differs from native's `Edge length` line, or
   a refusal fires at a site other than `lrRankPair` on the survey ids (the
   planning detector saw none).
5. A smoke job changes, or a survey line differs from the planning table, and
   it does not equal native.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test names and file placement; how the status-return tests build their
  graphs (`test/helpers/dot-position.ts` or hand-built ranks).
- Whether `lrRankPair` signals failure with `null` or a separate status (keep
  `v.info.rank` unwritten on failure either way).
- Wording of doc comments, the `!` reason in `classify.ts`, and fixture
  provenance comments.
- The scratch-directory layout under `$TMPDIR`.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | background, AD-1..AD-6, rollback, readiness, auto-confirmed table |
| [batch-1/overview.md](batch-1/overview.md) | the batch |
| [batch-1/T1-aux-edge-failure.md](batch-1/T1-aux-edge-failure.md) | port the refusal |
| [batch-1/T2-gates-finish.md](batch-1/T2-gates-finish.md) | gates, survey, comments, squash |
| [harness/counterfactual.patch](harness/counterfactual.patch) | AD-1..AD-3 as planned (src only) |
| [harness/detector.sh](harness/detector.sh), [detector.patch](harness/detector.patch) | port reach |
| [harness/detector-native.sh](harness/detector-native.sh) | native reach |
| [harness/detector-hits.txt](harness/detector-hits.txt), [detector-nonzero.txt](harness/detector-nonzero.txt) | both planning runs |
| [harness/native-compare.sh](harness/native-compare.sh), [normalize.mjs](harness/normalize.mjs), [toward.mjs](harness/toward.mjs) | port vs native per job (from #160, unchanged) |
| [harness/survey-ids.txt](harness/survey-ids.txt), [planning-survey.txt](harness/planning-survey.txt) | gate 6 ids and the planning result |
| [harness/fma-ellipse.mjs](harness/fma-ellipse.mjs) | the #236 residue, replayed |
| [harness/pack-probe.dot](harness/pack-probe.dot) | the pack-arm probe |
| [diagrams/data-flow.md](diagrams/data-flow.md), [diagrams/component-map.md](diagrams/component-map.md) | diagrams |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1-T2 | [x] |

## Session end

- One row in `plans/decision-journal.md`; `.agent-notes/issue-162.md` if novel.
- Comments on #162 and #148.
- The final message ends with the driver's status line.

## Summary (2026-11-16)

- **Tasks:** 2 of 2 done (T1, T2). Base `31f9122f` (unchanged since planning);
  per-task history under tag `issue-162/pre-squash`.
- **Decisions:** AD-1..AD-6 held. Journalled judgment calls: the new tests live
  in `position-aux.too-long.test.ts` rather than the 817-line branch test; the
  unchecked caller tested is `containNodesRank` (`connectGraph` passes the
  constant 0 and cannot be driven past INT_MAX); `test/helpers/dot-position.ts`
  gains `layoutToMincross` (outside the planned write-set); the source departs
  from the counterfactual in form only (an `INT_MAX` constant, named status
  locals, doc comments).
- **Gates:** typecheck exit 0; `npm test` 589 files, 13802 passed, 4 expected
  fail (was 13758; +44 new tests); goldens 5/5; corpus + docs 2863 passed;
  smoke bytediff 1960/1960 identical; targeted survey equals the planning
  table line for line, and the head's stderr equals native's on all five reach
  ids ([harness/execution-survey.txt](harness/execution-survey.txt)).
- **Toward-native changes** (diff lines against native, base → head):
  `1314`, `2758`, `2776_1` json 58 → 2, 98 → 2, 160 → 2 (`toward:ok`; the two
  lines are #185's root `"name"`). `2781`, `2781_1` svg 48 → 2, xdot 74 → 2,
  json 494 → 4: `toward:FAIL a=1 b=0`, one line per format (node `00`'s ellipse
  centre, `0` against native's `2147483648`) changed and still differs. That is
  native's fma contraction in `poly_gencode` (#236), not the position failure.
- **For review:** #230 (`needs-ruling`) now also lists those six rows (svg,
  xdot, json of `2781` and `2781_1`), which do not meet the toward-native test
  in so many words.
- **Equal to native on the head** (were not on the base): svg, xdot and plain
  of `1314`, `2758`, `2776_1`; plain of `2781`, `2781_1`. cmapx was equal on
  both.
- **Follow-ups (already filed at planning):** #235 (the pack arm drops
  `dotMincross`'s status), #236 (`poly_gencode` fma). None new.
