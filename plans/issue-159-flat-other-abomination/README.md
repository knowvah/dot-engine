# Mission: issue #159: flat_edges scans ND_other for the abomination rank

## Objective

Graphviz 16.1.1 (`4e50c9abd`, gitlab #2756) makes `flat_edges` add the rank -1
"abomination" when rank 0 has a labelled non-adjacent edge in `ND_other`, not
only in `ND_flat_in` (`~/git/graphviz-16.1.1/lib/dotgen/flat.c:274-291`). The
port scans only `flat_out`, has no gate (`GD_rank(g)[0].flat ||
GD_n_cluster(g) > 0`), and marks self-loops flat-adjacent where C never does.

Done means:

- The gate, the `flat_in` + `ND_other` scan and C's self-loop adjacency are
  ported ([AD-1](decisions.md#ad-1-the-gate-is-cs-with-rankflat-kept-after-mincross),
  [AD-2](decisions.md#ad-2-scan-flat_in-and-nd_other-per-rank-0-node-as-c-does),
  [AD-3](decisions.md#ad-3-a-self-loop-is-never-flat-adjacent-as-in-c)), with
  red-first branch tests and a regression file of five inputs equal to native
  `-Tplain` ([AD-5](decisions.md#ad-5-tdd-at-the-function-level-one-regression-file))
  (T1).
- Gates green; smoke bytediff 0 changed; the survey equals the planning table;
  the self-loop follow-up is filed (T2).

Type `fix`, a patch release.

**Out of scope** ([AD-7](decisions.md#ad-7-scope)): the `probe-g5.gv`
self-loop routing defect (filed, not fixed), #229, #185, #231, the corpus
records and the ledger.

## Evidence (measured at planning, base `d6636b15`)

"cf" = the base plus [harness/counterfactual.patch](harness/counterfactual.patch).
Native = 16.1.1 (`GVBINDIR=/tmp/ghl1611`, `config8` present).

- **Probes** (`harness/probe-*.gv`, `-Tplain`, diff lines against native,
  base → cf): `a` 0 → 0 (gate open by a cluster, empty rank -1); `b` 0 → 0
  (gate closed; the scan without the gate throws, #159 comment); `c` throws
  (`reading 'v'`) → 0 (unlabelled flat rep, labelled `other` edge; native
  exits 1 with `routesplines` + `lost a b edge` on stderr, the port prints only
  the second, #229); `h` (`ranksep` equally) 0 → 0; `d` 8 → 6 and `e` 14 → 4
  (loops with ports: AD-3 splits the group as C does; the rest is the `g5`
  defect, [AD-6](decisions.md#ad-6-how-equals-native-is-judged)); `g5` 4 → 4.
- **Issue ids:** `2723`, `2756`, `2756_1` already equal native on the base
  (#158, #160) in svg, xdot, plain, cmapx; json differs by #185 only. Unchanged
  on the cf.
- **Reach** ([harness/detector.sh](harness/detector.sh) +
  [detector.patch](harness/detector.patch), all 982 applicable ids, `-Tplain`,
  60 s cap, 3 lanes; [detector-hits.txt](harness/detector-hits.txt)):
  `P159ABOM new loop` on `2759`, `2759_1`, `2870_0`, `2870_1`; `P159ABOM both`
  on `2368_1`, `2723`, `2851`; `P159GATED` on 27 ids (labelled rank-0 loops
  the gate holds back). Never fired: `P159ABOM lost`, `P159INOUT`, `P159CROSS`,
  `P159GROUP`. 17 ids did not finish (16 capped, `1864` exit 1), as in #160:
  [detector-nonzero.txt](harness/detector-nonzero.txt).
- **Smoke reach:** no smoke id is in the hits or the unfinished list, so gate 5
  expects 0 changed jobs.
- **Survey** ([planning-survey.txt](harness/planning-survey.txt), 9 ids, 5
  formats, load 3): every job base = cf. The empty rank -1 changes no corpus
  output; the observable change is on hand-built inputs (`c`, `d`, `e`).
- **Unit tests on the cf:** 3 existing cases fail, all pins of the old
  behaviour T1 replaces (`rankHasNonAdjacentLabel` / `needsAbomination`
  "returns true" via `flat_out` with no gate; `cleanup2Ranks` "clears
  rank.flat"). Goldens unchanged.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline d6636b15..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `d6636b15` (tip at planning). If the tip moved, use the tip at
  execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-159 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`.
- **Finish (T2):** `git tag issue-159/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(dot): scan nd_other for the abomination rank as 16.1.1 does

  Graphviz 16.1.1 (upstream 4e50c9abd) adds rank -1 when rank 0 has a
  labelled non-adjacent edge in ND_other, behind C's gate on the rank's
  flat matrix or a cluster. Port the scan and the gate, keep the matrix
  after mincross as C's free_matrix does, and leave self-loops
  non-adjacent as C's checkFlatAdjacent does.

  Refs: #159
  ```

  Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR,
  or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; 4 expected fail, as the baseline |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T2](batch-1/T2-gates-finish.md#bytediff-gate-5) | 0 changed jobs |
| 6 | Targeted survey | see [T2](batch-1/T2-gates-finish.md#targeted-survey-gate-6) | equals the planning table |

Oracle: graphviz 16.1.1 (ADR-0002), `~/git/graphviz-16.1.1/build/cmd/dot/dot`,
`GVBINDIR=/tmp/ghl1611`. Run `oraclePreflight` (`test/corpus/oracle-env.ts`)
before trusting native output; if `config8` is missing, run
`GVBINDIR=/tmp/ghl1611 <dot> -c`. Check `uptime` before native renders; wait
while the load is above 12.

## Baseline (Phase 8)

Measured at planning on `d6636b15` (all green):

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 581 files, 13726 passed, 4 expected fail |
| `bash test/golden/gates.sh` | 5/5 PASS |
| `npx vitest run test/corpus test/docs` | 25 files, 2863 passed |

## Stop conditions

1. A file outside the task write-sets needs a change.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
3. A T1 red case passes before its edit is in (the case does not reach what it
   claims to: fix the test, and if it can't be built, stop).
4. A regression input's `-Tplain` on the head differs from its native capture.
5. A smoke job changes, or a survey line differs from the planning table, and
   it neither equals native nor passes a queue-rule exception.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong
   (e.g. a reader of `rank.flat` after cleanup2 besides `needsAbomination`, or a
   reader of a self-loop's `adjacent` besides `groupSize`).

## Push-forward (decide alone, journal it)

- Test names and where cases sit inside the two branch-test files.
- The private scan helper's name; wording of doc comments and provenance
  comments.
- Whether the regression file also pins `probe-h.gv`.
- The scratch-directory layout under `$TMPDIR`.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-7, rollback, readiness |
| [batch-1/overview.md](batch-1/overview.md) | the batch |
| [batch-1/T1-flat-other-scan.md](batch-1/T1-flat-other-scan.md) | gate, scan, self-loop adjacency, tests |
| [batch-1/T2-gates-finish.md](batch-1/T2-gates-finish.md) | gates, survey, follow-up, squash |
| [harness/counterfactual.patch](harness/counterfactual.patch) | AD-1..AD-3 as planned |
| [harness/probe-a.gv](harness/probe-a.gv) .. `probe-h.gv` | hand-built probes |
| [harness/native-compare.sh](harness/native-compare.sh), [normalize.mjs](harness/normalize.mjs), [toward.mjs](harness/toward.mjs) | port vs native per job (from #160, unchanged) |
| [harness/detector.sh](harness/detector.sh), [detector.patch](harness/detector.patch), [detector-hits.txt](harness/detector-hits.txt), [detector-nonzero.txt](harness/detector-nonzero.txt) | reach markers and the planning run |
| [harness/survey-ids.txt](harness/survey-ids.txt), [planning-survey.txt](harness/planning-survey.txt) | gate 6 ids and the planning result |
| [harness/followup-selfloop-ports.md](harness/followup-selfloop-ports.md) | the follow-up T2 files |
| [diagrams/data-flow.md](diagrams/data-flow.md), [diagrams/component-map.md](diagrams/component-map.md) | diagrams |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1-T2 | [x] |

## Session end

- One row in `plans/decision-journal.md`; `.agent-notes/issue-159.md` if novel.
- The comment on #159 and the follow-up issue (T2).
- The final message ends with the driver's status line.

## Summary (2026-11-16)

- **Tasks:** 2 of 2 (T1, T2). Base `d6636b15`, unchanged since planning.
- **Decisions:** AD-1 to AD-7 held; none turned out wrong. Journaled calls:
  `probe-h.gv` pinned too (six regression inputs); `src/model/rankEntry.ts`
  doc comment edited outside the write-set; the two gate-closed red cases
  rebuilt on a real flat edge so they are red on the base.
- **Gates:** typecheck 0; `npm test` 582 files, 13743 passed, 4 expected fail;
  goldens 5/5; corpus + docs 25 files, 2863 passed; smoke bytediff 1960 jobs,
  0 changed, 0 capped; survey equals `harness/planning-survey.txt`
  (`harness/execution-survey.txt`).
- **Accepted-row changes:** none. **Toward-native changes:** none (no smoke or
  survey job changed).
- **Hand-built probes:** c throws -> equals native; d 8 -> 6 and e 14 -> 4 diff
  lines against native (changed, not yet equal); g5 4 -> 4.
- **Follow-up:** #232, the d/e/g5 residual, now diagnosed: the port's
  `SELFNPEDGE`/`EDGETYPEMASK` values are not C's, so `edgecmp` orders ported
  loops before unported ones. With C's values in a scratch tree d, e and g5
  equal native.
- **Known issues:** none besides #232. #229 (stderr), #185 and #231 (json)
  are unchanged.
