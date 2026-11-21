# Mission: issue #188: remove `EdgeInfo.lost`, a port-only flag no path reads

## Objective

`EdgeInfo.lost` (`src/model/edgeInfo.ts:174-181`) is port-only bookkeeping;
C has no such field. It was added so the post-loop `routeDotEdges` backstop
would not route a lost edge a second time (`.agent-notes/followup-14-flat-labeled-lost.md`).
Part 11 T8 removed the backstop. What is left is seven writers, one clear
per routing pass (`beginRoutingPass`, `src/layout/dot/edge-route-rank.ts:133`)
and one reader: `routeLoneEdge`'s skip (`src/layout/dot/edge-route.ts:479`).
The issue asks the maintainer to keep the field (pinning it with a fixture)
or remove it. Planning chose **remove** (AD-1), on this evidence:

- **Never taken.** #137's marker (base `9466ec3f`) saw the skip fire 0 times
  over 1184 corpus and golden inputs. Planning's marker (base `cf38d077`,
  [harness/marker.patch](harness/marker.patch)) logs every write, the skip,
  and any lost edge offered again to `routeParallelEdgeGroup` or
  `routeEntryRun`. Inputs: every corpus input on which native loses an edge
  (15 found by [harness/native-scan.mjs](harness/native-scan.mjs)), 2765,
  2765_1, 10 probes and #137's 8 fixtures: 35 inputs. Five of the seven
  writers fire, 39 writes in all. The skip and the re-offer markers fire 0 times
  ([results/marker-planning.tsv](harness/results/marker-planning.tsv)).
- **Unreachable by construction.** Every writer marks only the edge it was
  handed, except `routeParallelEdgeGroup`, which marks every member. The
  skip can fire only when one original edge is handed to `routeLoneEdge`
  twice in one pass, and the port's collection, which mirrors C's, never
  does that. The argument is in
  [harness/survey.md](harness/survey.md#why-the-skip-cannot-fire).
- **Removal changes nothing.** The prototype
  ([harness/prototype.diff](harness/prototype.diff)) compared with base,
  stdout and stderr byte for byte, over the reach set and the probes in dot,
  xdot and svg: 105 of 105 jobs identical
  ([results/compare-planning.tsv](harness/results/compare-planning.tsv)).
  `npm test`: 608 files, 15191 tests passing. The only test edits are the
  two dead-end assertions on the field itself.

Every writer keeps its control flow and return value. Only the assignment
goes. The `'lost'` return value of `routeRegularEdgeFaithful`,
`routeMultiRankEdgeFaithful` and `baseSplineForGroup` stays: it is a
routing outcome, not the field.

Done means: the field, its seven writes, its clear and its reader are gone;
the comments that cite them are corrected; a new `routing-failure-once` case
pins the side-port writer's path to native; the smoke and reach comparisons
show 0 diffs. Type `refactor`, no release.

**Out of scope:** #278 (the reduced 2796 fixture takes a different native
path under 16.1.1; filed at planning). Leave that test case's input and
expectations as they are.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline cf38d077..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `cf38d077cca7db7f22506eb840901047eaf3ef2b` (the tip at
  planning). If the tip has moved, use the tip at execution start as the
  base, rebuild the base and marker bundles from it, re-run the marker
  (T1 step 1), and journal it.
- Per-task commits while working: first `docs(mission): add issue-188 brief`
  (this directory), then `refactor(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-188/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  refactor(dot): drop the port-only lost flag from edge routing

  <two to four lines: the flag kept the removed routeDotEdges backstop
  from routing a lost edge twice; with the backstop gone its one reader,
  routeLoneEdge's skip, is never taken (no original is offered twice per
  pass); C has no such field>

  Refs: #188
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never push,
  rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-remove-lost.md#bytediff) | 0 diffs |
| 6 | Targeted survey | see [T1](batch-1/T1-remove-lost.md#targeted-survey) | 105/105 identical; marker 0 skips |

Oracle: the carried build (ADR-0003, the newest accepted ADR), from
`test/corpus/oracle-paths.mjs`: `~/git/sseely/graphviz-carried/build/cmd/dot/dot`
with `GVBINDIR=/tmp/ghl1611-carried`. Run
`npx tsx plans/issue-188-edgeinfo-lost/harness/preflight.ts` before trusting
native output. A missing `config8` is fixed with `GVBINDIR=<dir> <dot> -c`
or `test/corpus/build-carried-oracle.sh`. The issue has no `upstream-16.1.1`
label. Native is needed only for the new test's expected text (T1 step 2).
Check `uptime` before gates 5 and 6; above 12, wait.

Baseline at planning: typecheck and `npm test` green on `cf38d077`
([decision-journal.md](decision-journal.md) row 0).

## Stop conditions

1. A non-test file outside [T1's write-set](batch-1/T1-remove-lost.md#write-set)
   must change. Journal why and stop.
2. The marker (T1 step 1) shows `ISSUE188_LOSTSKIP` or `ISSUE188_LOSTREOFFER`
   on any input. That means AD-1's premise is false. Journal the input and
   the marker lines, comment them on #188, and stop.
3. Gate 5 or gate 6 shows any diff, or a job capped twice. Diagnose it and
   stop.
4. The same gate check fails twice in a row after fix attempts. Diagnose it
   to a stated mechanism, journal it, and stop.
5. An architecture decision in [decisions.md](decisions.md) turns out wrong.
6. A criterion looks as if it needs #278 fixed. That is a brief error:
   journal it and stop.

## Push-forward (decide alone, journal it)

- Comment wording, provided every `@see` and C reference stays.
- Whether a writer site keeps a one-line `// C: edge lost, no spline` note.
- The new test case's name, and the fixture's file name under
  `src/layout/dot/__fixtures__/`.
- More probes in `harness/probes/` for a path the current set does not
  reach. Run them through the marker and the comparison. A skip marker is
  stop 2, a diff is stop 3.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-3, baseline, rollback, auto-confirmed notes |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-remove-lost.md](batch-1/T1-remove-lost.md) | marker re-check, test, removal, gates, squash |
| [harness/survey.md](harness/survey.md) | reach selection, the reachability argument |
| [harness/native-scan.mjs](harness/native-scan.mjs), [results/native-scan.tsv](harness/results/native-scan.tsv) | corpus inputs native loses an edge on |
| [harness/reach-ids.txt](harness/reach-ids.txt) | gate 6 corpus ids |
| [harness/probes/](harness/probes/), [harness/native/](harness/native/) | 10 probes and native `-Tdot` stdout, stderr, exit |
| [harness/marker.patch](harness/marker.patch), [harness/marker-run.sh](harness/marker-run.sh) | the marker and its runner |
| [harness/compare.sh](harness/compare.sh) | base vs head, stdout + stderr, dot/xdot/svg |
| [harness/prototype.diff](harness/prototype.diff) | the prototype, reverted |
| [harness/preflight.ts](harness/preflight.ts) | oracle preflight |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where `lost` is written and read, base and head |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): what
  was removed and why, files, gates, accepted-row and toward-native changes
  (expected: none).
- Write `.agent-notes/issue-188.md` (novel): the reachability argument in
  three lines, and that no original edge reaches `routeLoneEdge` twice per
  pass. Update `.agent-notes/issue-137.md` (the `lost` observation),
  `.agent-notes/followup-14-flat-labeled-lost.md` and
  `.agent-notes/issue-161.md:14-15` to say the field is gone (#188).
- The final message ends with the driver's status line.

## Summary (2026-11-21)

- **Tasks:** 1 of 1 (T1).
- **Decisions:** 12 journal rows at execution (3-14). One flagged for
  review: row 10, `harness/compare.sh` now refuses to count a capped pair as
  identical.
- **Gates:** typecheck 0; `npm test` 608 files, 15192 passed; goldens 5/5;
  corpus + docs 2887 passed; smoke bytediff 1960/1960 identical, 0 capped;
  reach 105/105 identical, 0 capped. Accepted-row changes: none.
  Toward-native changes: none.
- **Known limits and follow-ups:** the reachability argument is from the
  collection rules, not a proof over every `edgecmp` grouping
  ([harness/survey.md](harness/survey.md)); the maintainer's full `--all`
  bytediff compares stderr on every id. #278 (the reduced 2796 fixture under
  16.1.1) is untouched.
- **History:** per-task commits under tag `issue-188/pre-squash`.
