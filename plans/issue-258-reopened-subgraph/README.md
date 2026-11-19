# Mission: issue #258: a re-opened subgraph replaces the first one

## Objective

`graph G { subgraph p { a } cluster=true; subgraph p { b } }`: native 16.1.1
keeps one `p` holding `a` and `b`, not a cluster (`graph [cluster=""]`). The
port builds a second `p`, holding only `b`, with a fresh snapshot of the
parent's graph attributes, so `a` lands at the root and (since #183) `p`
becomes a cluster. Fixing this unblocks #242 (blocked by #258) and the #251
push hold.

**Mechanism (checked at planning against base `286912a4` and graphviz
16.1.1).**

- **C:** `opensubg` calls `agsubg(S->g, name, 1)` (`lib/cgraph/grammar.y:586-595`),
  which returns the existing subgraph when the parent already has one of that
  name (`agfindsubg_by_id`, `lib/cgraph/subg.c:52-60`, direct children only).
  The second body adds to it. Its attribute values were copied once when it
  opened (`agmakeattrs`, `lib/cgraph/attr.c:165`), so a parent value set
  between the openings never reaches it. An edge statement expands a subgraph
  endpoint through `agfstnode(subg)` in `endedge`/`edgerhs`
  (`grammar.y:449-530`), after the whole statement is parsed, so every node the
  subgraph holds by then is an endpoint.
- **Port:** `processSubgraph` (`src/parser/builder.ts:290-342`) builds
  `new Graph(sgName, …)` and replaces the old one in `graph.subgraphs`; only
  `seq` is carried over (`:311-316`). The first body's membership is lost and
  `graphDefaultsSnapshot` is retaken (`:320`). Subgraph endpoints expand from
  the endpoint's own body text (`NameCollector`, `:399-402`), resolved one at a
  time (`:281-284`).

**Fix (AD-1..AD-3).** Re-use the existing `Graph`: build the second body into
it, with no new seq, snapshot or seeding. A key the second body declares
leaves `seededAttrs`. Subgraph endpoints expand to the subgraph's node
membership in id order, read after every endpoint of the statement is
resolved. [harness/prototype.diff](harness/prototype.diff) is the prototype
(it lacks the comments and the tests).

**Evidence at planning ([harness/](harness/)).**

- **Probes** (15 inputs × 8 engines × dot, xdot, svg = 360 rows,
  [results/probes-planning.tsv](harness/results/probes-planning.tsv)): with
  the prototype, 172 rows equal native; 118 svg rows differ only in the 3
  generator-header lines (the port's fixed header); 64 rows (`reopen3`, `5`,
  `10`, `12` × 8 engines × dot, xdot) miss exactly one pinned `key=value`, the
  new follow-up #262; 6 sfdp rows on the cyclic probes `reopen11`, `reopen15`
  differ in positions only, #257. No row is further from native than on the
  base; 273 rows move.
- **Reach** ([results/reach-planning.txt](harness/results/reach-planning.txt)):
  the parsed model of all 1320 corpus inputs (oracle `tests/`, `graphs/`,
  `share/`, `doc/`; this repository's `test/`, `docs/`) is identical on base
  and prototype. No corpus output can change.
- `npm test` passes on the prototype with no test edited (602 files, 15041
  tests).

Done means: the re-open probes equal native except the #262 and #257 rows,
which match [results/residual-planning.tsv](harness/results/residual-planning.tsv);
no corpus model changes. Type `fix`, a patch release.

**Out of scope:** the non-empty pin line (#262); sfdp on cyclic inputs (#257);
json subgraph node order (#199); #242's general inheritance (next mission).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 286912a4..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `286912a43282eae78d1384f1a708894697691b64` (the tip at
  planning). If the tip has moved, use the tip at execution start as the base,
  rebuild the base bundle from it, and journal it.
- Per-task commits while working: first `docs(mission): add issue-258 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-258/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(parser): add a re-opened subgraph's body to it as agsubg does

  <two to four lines: agsubg returns the existing subgraph, so a second
  body adds to it and keeps its first-open attribute values; the builder
  replaced it with a new Graph and a fresh snapshot; edge endpoints now
  read the subgraph's nodes after the statement, as endedge does>

  Refs: #258
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
| 5 | Smoke bytediff | see [T1](batch-1/T1-merge-reopened-subgraph.md#bytediff) | 0 diffs |
| 6 | Targeted survey | see [T1](batch-1/T1-merge-reopened-subgraph.md#targeted-survey) | reach 0 of 1320; probe and residual TSVs equal planning |

Oracle (ADR-0002, the newest accepted ADR):
`~/git/graphviz-16.1.1/build/cmd/dot/dot` with `GVBINDIR=/tmp/ghl1611` (dot)
or `/tmp/ghl1611-all` (other engines), as `test/corpus/oracle-paths.mjs` says.
Run `npx tsx plans/issue-258-reopened-subgraph/harness/preflight.ts` (the
corpus scripts' `oraclePreflight`, dot and sfdp) before trusting native output.
A missing `config8` is fixed with `GVBINDIR=<dir> <dot> -c`. The issue has no
`upstream-16.1.1` label. Check `uptime` before gates 5 and 6; above 12, wait.

Baseline at planning: typecheck and `npm test` green on `286912a4`
([decision-journal.md](decision-journal.md) row 0).

## Stop conditions

1. A non-test file outside [T1's write-set](batch-1/T1-merge-reopened-subgraph.md#write-set)
   must change. Journal why and stop.
2. A probe row that differs from
   [probes-planning.tsv](harness/results/probes-planning.tsv), or a residual
   row that differs from
   [residual-planning.tsv](harness/results/residual-planning.tsv). Write the
   diagnosis artifact and stop.
3. Gate 5 shows any diff, or gate 6's reach shows any corpus input whose model
   changes. Diagnose and stop.
4. The same gate check fails twice in a row after fix attempts. Diagnose it to
   a stated mechanism, journal it, and stop.
5. An architecture decision in [decisions.md](decisions.md) turns out wrong.
6. Fixing #262's pin line or #257 looks needed to meet a criterion: that is a
   brief error; journal it and stop.

## Push-forward (decide alone, journal it)

- Test names and layout within the write-set; comment wording.
- Splitting `processSubgraph` into helpers to stay within the complexity hook
  (30 NLOC, CCN 10 per function); `builder.ts` must not grow past its 506
  lines at the base (the prototype shrinks it).
- An existing test that pinned replace-on-reopen: update it to native's
  behaviour and journal it, with native's output as evidence.
- More probes in `harness/extra/` for a path the 15 do not reach (compare
  head with native; a row away from native is stop 2).

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-5, baseline, rollback, auto-confirmed notes |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-merge-reopened-subgraph.md](batch-1/T1-merge-reopened-subgraph.md) | red tests, fix, gates, squash |
| [harness/survey.md](harness/survey.md) | probe design, reach selection |
| [harness/probes/](harness/probes/) | the 15 inputs |
| [harness/native/](harness/native/) | native 16.1.1 `-Kdot -Tdot` per probe |
| [harness/compare.mjs](harness/compare.mjs) | native, base, head per probe × engine × format |
| [harness/residual.mjs](harness/residual.mjs) | key=value pairs head misses or adds against native |
| [harness/model-reach.mjs](harness/model-reach.mjs) | parsed-model equality, base vs head |
| [harness/preflight.ts](harness/preflight.ts) | oracle preflight |
| [harness/prototype.diff](harness/prototype.diff) | the prototype, reverted |
| [harness/results/](harness/results/) | planning TSVs |
| [diagrams/data-flow.md](diagrams/data-flow.md) | `processSubgraph` base and head |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  files, gates, toward-native changes.
- Write `.agent-notes/issue-258.md` (novel): a re-opened subgraph is one
  `Graph`; edge endpoints read subgraph membership after the statement; the
  parse-model reach harness. Update `.agent-notes/issue-183.md`'s "re-opened
  subgraph is replaced" observation to point at this fix.
- Comment on #242 that #258 is on the branch (the queue driver labels it).
- The final message ends with the driver's status line.

## Summary (execution, 2026-11-18)

- **Tasks:** 1 of 1 (T1). Base `286912a4` (the tip at execution start, equal to
  the planning base).
- **Change:** `src/parser/builder.ts` (AD-1..AD-3 as decided; 481 lines, 506 at
  the base; `NameCollector` deleted) and the new
  `src/parser/builder-reopen.test.ts` (38 cases). No file outside the write-set
  changed.
- **Decisions:** 10 journal rows ([decision-journal.md](decision-journal.md)
  rows 2-11); one flagged for review (row 8: `extra6` under sfdp is #257's, shown
  by a no-re-open control).
- **Gates:** typecheck 0; `npm test` 603 files / 15079; goldens 5/5; corpus +
  docs 25 files / 2863; smoke bytediff 1960 jobs, 1960 identical, 0 diffs,
  0 capped; reach 0 of 1320; `probes-head.tsv` and `residual-head.tsv`
  byte-identical to planning's (172 of 360 rows equal native, 118 svg rows on
  the 3-line header floor, 64 #262 rows, 6 #257 rows; 273 rows moved toward
  native, none away).
- **Extra probes** ([harness/extra/](harness/extra/)): 11 inputs × 8 engines ×
  3 formats = 264 rows; every dot and xdot row equals native except `extra6`
  under sfdp (#257, control `extra/extra6-control.gv`); svg rows on the header
  floor.
- **Accepted-row changes:** none. **Toward-native changes (gate 5):** none (no
  smoke output changes; no corpus input re-opens a named subgraph).
- **Open:** #262 (non-empty pin line, 64 probe rows), #257 (sfdp on cyclic
  inputs), #199 (json subgraph node order), all out of scope. #242 is unblocked.
- **Notes:** `.agent-notes/issue-258.md`; `.agent-notes/issue-183.md` updated.
