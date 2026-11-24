# Mission: issue #199: json walks a graph's nodes in sequence order

## Objective

C's json writer walks nodes with `agfstnode`/`agnxtnode` (AGSEQ: creation
order, in a subgraph too). The port walks `Graph.nodes`, which for a
subgraph is the order the subgraph first named its nodes. So
`digraph { a; b; subgraph s { b; a } }` prints `"nodes": [2, 1]` for `s`
where native prints `[1, 2]`, under every engine, in json and json0. The same
walk numbers nodes and edges, which shows when a subgraph is rendered alone
(API). The diagnosis, with what was ruled out, is in
[decisions.md](decisions.md#mechanism-plannings-diagnosis).

Planning reproduced it against the carried oracle and tried the fix
([harness/prototype.diff](harness/prototype.diff)): probe matrix base 48/160
equal native, prototype 156/160 (the 4 others are sfdp coordinate drift
that predates this mission); the subgraph render moves `out` → `eq`; smoke
bytediff 1915/1960 identical, the 45 changed jobs all json on 6 reach ids,
39 now equal to native and 6 toward it (`harness/results/smoke-toward.tsv`).

Done means the issue's criterion: a subgraph's `nodes` list is in sequence
order, as native, and the issue's "not checked" edge list is checked (it was
right: `edges` is sorted by seq). AD-1 does it at all three walks, AD-2's
test pins it, AD-3 keeps `json.ts` under the hook. Type `fix`.

**Out of scope:** the model's `Graph.nodes` order (AD-1, rejected option);
every writer other than json and json0.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md) and
   [decision-journal.md](decision-journal.md), then
   [batch-1/T1-json-node-seq.md](batch-1/T1-json-node-seq.md). Check finished
   work with `git log --oneline 1f1e7961..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree.
  Create no branch, and never merge `main` into it.
- **Base sha:** `1f1e7961ab992908b74c5d661cce88089d1d125b` (the tip at
  planning). If the tip has moved, the tip at execution start is the base:
  re-run the probe matrix on it (T1 step 5) and journal it.
- Per-task commits while working: first `docs(mission): add issue-199 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-199/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(render): walk json's nodes in sequence order

  <two or three lines: C's json writer walks agfstnode/agnxtnode (AGSEQ);
  the port walked each graph's node map, which for a subgraph is the order
  it named its nodes, so member lists and a subgraph render's gids differed>

  Refs: #199
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never push,
  rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; 617 files, 15784 tests |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0; 27 files, 2887 tests |
| 5 | Smoke bytediff | [T1 step 6](batch-1/T1-json-node-seq.md#steps) | 1915/1960 identical, 45 json diffs as planning's (journal row 2) |
| 6 | Targeted survey | [T1 steps 5, 7](batch-1/T1-json-node-seq.md#steps) | probe rows as planning's; survey per [harness/survey.md](harness/survey.md#re-running) |

Oracle: the carried build (ADR-0003, the newest accepted ADR), from
`test/corpus/oracle-paths.mjs`: `~/git/sseely/graphviz-carried/build/cmd/dot/dot`
with `GVBINDIR=/tmp/ghl1611-carried` (dot) and `/tmp/ghl1611-carried-all`
(the other engines). `harness/probe.ts` and `harness/toward-native.ts` run
`oraclePreflight` per engine; `harness/recapture.sh` regenerates a missing
`config8`. Check `uptime` before gates 5 and 6 and the matrix; wait if it is
above 12.

## Stop conditions

1. A non-test file other than `src/render/json.ts` and
   `src/render/json-cluster-edge.ts` must change, or `json.ts` must grow past
   734 lines. Journal why and stop.
2. On the base (T1 step 3), the test's failures differ from
   `harness/results/tests-on-base.txt`: journal and stop.
3. A probe row (T1 step 5) differs from planning's prototype row, the
   subgraph render is not `eq`, or gates 5 and 6 show an `AWAY`, a
   `+STDERR`, a member list unequal to native, or a one-sided cap. Diagnose
   it to a mechanism and stop.
4. The recaptured fixtures (T1 step 2) differ from `harness/native/` or
   `harness/subrender/native/`: the oracle has moved. Journal and stop.
5. The same gate check fails twice in a row after fix attempts. Diagnose it,
   journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Comment wording, provided every `@see` and C reference stays.
- More probes in `harness/probes/` for a path the matrix does not reach: run
  them on base and head, recapture their fixtures, bump `PROBE_COUNT`. A new
  head row not equal to native that is also unequal on the base with the
  same diff predates this mission: file a `follow-up` issue and leave it out
  of the test. Any other new non-equal row is stop 3.
- A survey row whose only remaining difference from native predates the
  mission (layout drift, a port throw) is not a stop when its member lists
  equal native's on the head: list it under toward-native changes.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | mechanism, AD-1..3, rollback, auto-confirmed table |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-json-node-seq.md](batch-1/T1-json-node-seq.md) | fixtures, test, fix, matrix, gates, squash |
| [harness/survey.md](harness/survey.md) | reach, probe and corpus selection, gate 6 commands |
| [harness/probe.ts](harness/probe.ts), [harness/probes/](harness/probes/) | the matrix and its inputs |
| [harness/recapture.sh](harness/recapture.sh), [harness/native/](harness/native/) | the test's native fixtures |
| [harness/subrender/](harness/subrender/) | subgraph-render C harness (`build.sh`), port runner (`port.ts`), refs |
| [harness/reach.ts](harness/reach.ts), [harness/survey-ids.tsv](harness/survey-ids.tsv) | the 42 corpus ids the change can reach |
| [harness/toward-native.ts](harness/toward-native.ts) | gate 5 and 6 check of changed jobs against native |
| [harness/results/](harness/results/) | planning TSVs, tallies, smoke JSON and diff index; the test's failures on the base |
| [harness/prototype.diff](harness/prototype.diff) | the fix with its test, reverted |
| [diagrams/data-flow.md](diagrams/data-flow.md) | node order into ids and member lists |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): the
  mechanism, origin, fix, files, gates, matrix counts, accepted-row changes
  and toward-native changes (gate 5's 6 rows, gate 6's).
- Write `.agent-notes/issue-199.md` only for a novel finding; otherwise say
  in the report that there was none.
- On #199, comment with the matrix counts. The issue closes when the branch
  merges.
- The final message ends with the driver's status line.

## Summary (execution, 2026-11-23)

- **Tasks:** 1 of 1 (T1). Base `1f1e7961`, unchanged since planning.
- **Fix:** as `harness/prototype.diff` (AD-1, AD-3): `jsonNodes`, `assignIds`
  and `canonicalRootEdges` walk `nodesInSeq(g)`; `json.ts` stays at 734 lines.
- **Gates:** typecheck 0; `npm test` 617 files, 15784; `gates.sh` 5/5; corpus
  + docs 27 files, 2887. Probe matrix 156/160 (base 48/160), the planning
  rows exactly; subgraph render `out` → `eq`. Smoke bytediff 1915/1960
  identical, the 45 json diffs as planning's (39 native, 3 toward, 3 SHAPE).
  Survey (42 ids × 8 engines × json, json0, plus `2621` × dot, circo, fdp
  re-run with a long cap): 614 changed jobs, 519 equal native, 87 toward,
  8 SHAPE, 0 AWAY, 0 capped.
- **Decisions:** journal rows 5-17; one flagged for review (row 15: `2621` ×
  dot keeps `null` members from a defect that predates the mission, read as a
  toward-native change under the queue rules, filed as #308).
- **Harness changes outside the write-set:** `toward-native.ts` (row 10),
  new `one-row.mjs`, `survey.md`'s executor section.
- **Follow-ups filed:** #308 (newrank fill nodes stay in their cluster),
  #309 (`%.5g` exponent threshold), #310 (json `width` text); a comment on
  #231 (`1581` × fdp, osage, patchwork).
- **Notes:** `.agent-notes/issue-199.md`.
