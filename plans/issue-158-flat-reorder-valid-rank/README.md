# Mission: issue #158: flat_reorder skips a rank whose incoming flat edges are constrained

## Objective

Graphviz 16.1.1 (upstream `9fb21f570`, fixing upstream #2368 and #2854) adds
`valid_rank` to `flat_reorder`
(`~/git/graphviz-16.1.1/lib/dotgen/mincross.c:1327-1390`): when the walk meets a
node with a constraining incoming flat edge, the rank keeps mincross's order and
its "nonconstraint flat edges must be made LR" loop does not run. The port
(`src/layout/dot/mincross-flat.ts:153-201`) has 16.1.0's code.

Done means:

- `flatReorderBuildTemprank`/`flatReorderRank` follow C, `break` included
  ([AD-1](decisions.md#ad-1-port-valid_rank-as-c-has-it)), with branch tests;
  the 12 known-failing goldens and pt-issue fixtures it fixes leave
  `test/golden/known-failing.json` (T1).
- The unit tests that pin native **16.1.0** output on the inputs it changes pin
  native 16.1.1 instead, each re-captured and equal to the head byte for byte
  ([AD-2](decisions.md#ad-2-re-capture-only-the-native-fixtures-ad-1-turns-red-and-only-when-the-head-equals-them),
  [AD-3](decisions.md#ad-3-the-issue-130-aux-ranks-come-from-an-instrumented-1611-plugin));
  2723's stderr gap is diagnosed and filed (T2).
- A non-adjacent flat group is routed in C's edgecmp order, so `700813` equals
  native too
  ([AD-4](decisions.md#ad-4-a-non-adjacent-flat-group-is-routed-in-edgecmp-order-seq-not-left-tail-first))
  (T3).
- Gates green; every changed smoke and survey job equals native or meets a
  stated exception
  ([AD-6](decisions.md#ad-6-how-equals-native-is-judged)) (T4).

Type `fix`, a patch release.

**Out of scope:** #159 (its measured ids move here; T4 comments there), #162
(`1314`), #163 (the `dot-newrank-compact-*` goldens), #185, #199, the corpus
records and the ledger ([AD-5](decisions.md#ad-5-corpus-records-the-ledger-and-its-locale-pages-stay-as-they-are)).

## Evidence (measured at planning, base `f939503d`)

"cf" = the base plus [harness/counterfactual.patch](harness/counterfactual.patch)
(AD-1 alone). Native = 16.1.1, preflight passed.

- **The issue's ids** ([harness/planning-survey.txt](harness/planning-survey.txt),
  `native-compare.sh`, 5 formats): of the 35, 32 equal native on the cf in svg,
  xdot, plain and cmapx; json differs only by #185 (`1444`, `1444-2`, `2592`)
  or #199 (`1453`, `tree-graphs-directed-sdh`). `2239`: three arrowhead points
  off by one last digit, lines the base has too (AD-6, toward-native; the
  survey's 0.01 comparator calls it conformant, as #147 counted it).
  `700813`: every node equals native; the flat 2-cycle `B -> C`/`C -> B` routes are swapped (T3; native's lines are
  `edge B C 10 0.48648 1.5843 … 0.36598 0.51884` and `edge C B 10 0.46327
  0.39846 … 0.33101 1.5126`). `1314`: unchanged (#162). `2854_1`, `2855`:
  unchanged, already equal.
- **Throws that stop:** `2723`, `2756`, `2756_1` threw on the base; on the cf
  they equal native in every format (json: #185). `2723`'s stderr differs (T2).
- **Unit tests:** `npm test` on the cf: 41 failed, 13665 passed, 4 expected
  fail. 14 are the known-failing ids flipping to pass. The other 27, in seven
  files, all pin native 16.1.0; each equals a fresh 16.1.1 capture on the cf
  (rerender 122/122 with the 14 re-captured files; the #169, #170, #171 probes
  and V8-V11 byte-equal native in dot/xdot/plain; T2 lists them).
  `mincross-flat.test.ts`'s "A before B" in `121.dot` is wrong at 16.1.1
  (native puts `B` first).
- **Smoke reach:** of the 49 smoke ids, `2521`, `2592` and `graphs-shells` are
  issue ids; all equal native on the cf (T4).
- **Detector** ([harness/detector.sh](harness/detector.sh), all 982 applicable
  ids, `-Tplain`, 60 s cap; 18 did not finish, none a smoke id): `P158MOVE`
  (AD-1's reach) on 42 ids, the issue's 34 plus `1472`, `2723`, `2756`,
  `2756_1`, `2759`, `2759_1`, `2781`, `2781_1`. `2759`/`2759_1` render
  identically on base and cf. `1472` moves closer to native's rank order (#207
  keeps its x off); `2781`/`2781_1` are native failures (#162) (AD-6).
  `P158SORT` (AD-4's reach): none on the base, `700813` alone with AD-1 in.
- **Native I130 trace** ([harness/native-i130-1611.txt](harness/native-i130-1611.txt)):
  the rebuilt 16.1.1 plugin, unpatched, equals the oracle on all 11 variants;
  with the trace, V8/V9/V11 differ from the test's 16.1.0 values and the cf
  matches every value (44/44).
- **Planned head** (cf + T3's sort): `700813` equals native in every format
  (json: #199). The full 45-id table is
  [harness/planning-survey.txt](harness/planning-survey.txt); T4 must
  reproduce it.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline f939503d..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `f939503d` (tip at planning). If the tip moved, use the tip at
  execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-158 brief`
  (this directory), then `fix(T1): ...`, `test(T2): ...`, `fix(T3): ...`.
  Commit with `git -c commit.gpgsign=false commit -F <msgfile>`.
- **Finish (T4):** `git tag issue-158/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(dot): skip flat_reorder on a rank with a constrained flat edge

  Graphviz 16.1.1 gives up on a rank in flat_reorder when its walk meets
  a node with a constraining incoming flat edge, leaving mincross's order
  and the flat edges as they are (upstream 9fb21f570). Port valid_rank,
  re-capture the native 16.1.0 fixtures it changes from 16.1.1, and route
  a non-adjacent flat group in C's edgecmp order, which the new rank
  order exposed on 700813.

  Refs: #158
  ```

  Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR,
  or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; 4 expected fail (was 18) |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T4](batch-1/T4-gates-finish.md#bytediff-gate-5) | changed jobs equal native |
| 6 | Targeted survey | see [T4](batch-1/T4-gates-finish.md#targeted-survey-gate-6) | as T4 states |

Oracle: graphviz 16.1.1 (ADR-0002), `~/git/graphviz-16.1.1/build/cmd/dot/dot`,
`GVBINDIR=/tmp/ghl1611`. Run `oraclePreflight` (`test/corpus/oracle-env.ts`)
before trusting native output; if `config8` is missing, run
`GVBINDIR=/tmp/ghl1611 <dot> -c`. Check `uptime` before native renders and the
plugin build; wait while the load is above 12.

The baseline was green at planning: see [decisions.md](decisions.md#baseline).

## Stop conditions

1. A file outside the task write-sets needs a change.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
3. A T2 fixture's 16.1.1 capture differs from the head, or `native-i130.sh`
   reports that the unpatched rebuild differs from the oracle (or cannot be
   built in two attempts).
4. A changed smoke or survey job neither equals native nor meets an exception
   T4 names; or a job that equalled native on the base no longer does.
5. T3's red test passes on the T1 commit (the rules agree on `700813` again:
   find out why before going on).
6. The gate 6 table differs from the planning table in a way that neither
   equals native nor meets an exception.
7. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test names and where new cases sit in their files.
- Wording of doc comments and fixture provenance comments.
- Whether a stderr mechanism found in T2 is one follow-up issue or two.
- The scratch-directory layout under `$TMPDIR`.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-6, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the batch |
| [batch-1/T1-valid-rank.md](batch-1/T1-valid-rank.md) | port valid_rank |
| [batch-1/T2-recapture-fixtures.md](batch-1/T2-recapture-fixtures.md) | re-capture fixtures |
| [batch-1/T3-flat-group-order.md](batch-1/T3-flat-group-order.md) | flat group order |
| [batch-1/T4-gates-finish.md](batch-1/T4-gates-finish.md) | gates, survey, squash |
| [harness/counterfactual.patch](harness/counterfactual.patch) | AD-1 as planned |
| [harness/native-compare.sh](harness/native-compare.sh), [normalize.mjs](harness/normalize.mjs), [toward.mjs](harness/toward.mjs) | port vs native per job, toward-native check |
| [harness/rankorder.py](harness/rankorder.py) | `1472`'s rank-order check |
| [harness/planning-survey.txt](harness/planning-survey.txt) | planning results (planned head) |
| [harness/issue-ids.txt](harness/issue-ids.txt) | the issue's 37 ids |
| [harness/survey-ids.txt](harness/survey-ids.txt) | gate 6 ids |
| [harness/detector.sh](harness/detector.sh), [detector-base.patch](harness/detector-base.patch), [detector-status-base.txt](harness/detector-status-base.txt), [detector-status-cf.txt](harness/detector-status-cf.txt) | reach markers and the planning runs |
| [harness/recapture-rerender.sh](harness/recapture-rerender.sh), [rerender-files.txt](harness/rerender-files.txt) | T2 item 1 |
| [harness/native-i130.sh](harness/native-i130.sh), [native-i130-trace.patch](harness/native-i130-trace.patch), [native-i130-1611.txt](harness/native-i130-1611.txt) | T2 item 5 and its planning run |
| [diagrams/data-flow.md](diagrams/data-flow.md), [diagrams/component-map.md](diagrams/component-map.md) | diagrams |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1-T4 | [x] |

## Session end

- One row in `plans/decision-journal.md`; `.agent-notes/issue-158.md` if novel.
- Comments on #158 and #159 (T4).
- The final message ends with the driver's status line.

## Summary (2026-11-16)

- **Tasks:** 4 of 4 done (T1-T4). Base `f939503d`; per-task history under tag
  `issue-158/pre-squash`.
- **Decisions:** AD-1..AD-6 held. Journalled judgment calls: one extra #169
  probe (`BAD_SUBGRAPH_DEFAULT`), because at 16.1.1 the two re-captured
  drawings equal the "default ignored" drawing; `2592` changing under all eight
  engines in the bytediff is its `layout=dot` (not another engine); native
  prints 2723's `lost` line once, not twice.
- **Gates:** typecheck exit 0; `npm test` 13712 passed, 4 expected fail (was
  18); goldens 5/5; corpus + docs 2863 passed; smoke bytediff 1920/1960
  identical, the 40 changed jobs are `2521`, `2592`, `graphs-shells` (dot) and
  equal native (`2592` json: #185's line, on the base too); targeted survey
  equals the planning table line for line
  ([harness/execution-survey.txt](harness/execution-survey.txt)).
- **For review:** #230 (`needs-ruling`): `1472`, `2781`, `2781_1` and the json
  of `2723`, `2756`, `2756_1` change without a usable native reference.
- **Follow-ups:** #229 (routesplines returns silently where C reports
  `illegal values of prev and next`). AD-5's list for the maintainer's survey
  is in the #158 comment.
