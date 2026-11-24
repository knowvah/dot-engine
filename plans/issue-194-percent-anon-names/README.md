# Mission: issue #194: a `%`-prefixed graph or subgraph name is anonymous

## Objective

On `digraph "%foo" { subgraph "%bar" { a } subgraph "%baz" { node [color=red]; b } }`,
native prints `<map id="%1" name="%1">` and json names `%1`, `%3`, `%5`. The
port prints `%foo`, `%bar`, `%baz`. cgraph's `agmapnametoid`
(`lib/cgraph/id.c:104-131`) gives a name that starts with `%` an anonymous id
and records it for the rest of the parse. `endgraph`
(`lib/cgraph/grammar.y:580-584`) then drops the string, so `agnameof` prints
`%<id>`. The port's parser keeps the string and takes no id
(`src/parser/builder.ts:267`, `:451-452`). The full diagnosis, with what was
ruled out, is in [decisions.md](decisions.md#mechanism-planning-s-diagnosis).

Planning reproduced it against the carried oracle and tried the fix
([harness/prototype.diff](harness/prototype.diff)):

- **Probe matrix** (13 in-scope probes × dot, neato × 7 formats, stdout and
  stderr): base 104/182 equal native, prototype 175/182. The 7 left are each
  one missing stderr line, which #285 covers
  ([harness/survey.md](harness/survey.md)).
- **Smoke bytediff** (49 ids × 8 engines × `svg,xdot,json,plain,cmapx,dot`):
  2352/2352 identical. No corpus input has a `%` graph name (0 of 1007).
- `npm test` passes on the prototype with no test edited.

Done means the issue's criterion: the port's cmapx/imap map name and the
json/json0 root and subgraph names equal native on the repro, and anonymous
ids after a `%`-named graph or subgraph are numbered as native numbers them.
That is AD-1, pinned by AD-2's test. Type `fix`.

**Out of scope:** `%` node names (#284), `getCluster`'s warning (#285), API-built
`%` clusters (#286). All three were filed at planning (AD-4).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md) and
   [batch-1/T1-local-names.md](batch-1/T1-local-names.md). Check finished work
   with `git log --oneline cbd6ba50..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `cbd6ba504e1152ca96b7abe209bcfcf3254afedf` (the tip at
  planning). If the tip has moved, use the tip at execution start as the
  base, re-run the probe matrix on it (T1 step 1), and journal it.
- Per-task commits while working: first `docs(mission): add issue-194 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-194/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(parser): treat a graph name starting with % as anonymous

  <two to four lines: agmapnametoid gives a %-prefixed graph name an
  anonymous id, found again on reuse in the parse; endgraph drops the
  string, so agnameof prints %<id>; the parser kept the string and took
  no id, so map, json and warning names and later %N numbering differed>

  Refs: #194
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never push,
  rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; the new file passes |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | [T1 step 7](batch-1/T1-local-names.md#steps) | 0 diffs, 0 capped |
| 6 | Targeted survey | [T1 steps 5, 8](batch-1/T1-local-names.md#steps) | probe tally as planning's; corpus grep 0 |

Oracle: the carried build (ADR-0003, the newest accepted ADR), from
`test/corpus/oracle-paths.mjs`: `~/git/sseely/graphviz-carried/build/cmd/dot/dot`
with `GVBINDIR=/tmp/ghl1611-carried` (dot) and `/tmp/ghl1611-carried-all`
(neato). `harness/probe.ts` runs `oraclePreflight` for both. A missing
`config8` is fixed with `GVBINDIR=<dir> <dot> -c`. The issue has no
`upstream-16.1.1` label. Check `uptime` before gate 5 and the matrix, and wait
if it is above 12.

Baseline at planning: typecheck and `npm test` (15213) green on `cbd6ba50`
and on the prototype ([decision-journal.md](decision-journal.md) row 0).

## Stop conditions

1. A non-test file outside [T1's write-set](batch-1/T1-local-names.md#write-set)
   must change. Journal why and stop.
2. On the base, the new test's failures differ from AD-2's consequences. The
   test does not reach the defect: journal and stop.
3. The probe matrix (T1 step 5) differs from the planning prototype's in any
   row, or gate 5 shows a diff or a job capped twice. Diagnose it and stop.
4. The recaptured fixtures (T1 step 2) differ from `harness/native/`. The
   oracle has moved: journal it and stop.
5. The same gate check fails twice in a row after fix attempts. Diagnose it
   to a stated mechanism, journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong,
   or a criterion looks as if it needs #284, #285 or #286 fixed (a brief
   error).

## Push-forward (decide alone, journal it)

- Comment wording, provided every `@see` and C reference stays.
- Test names and structure inside `builder-local-names.test.ts`, provided
  AD-2's five checks are all there.
- Trimming comments in `builder.ts` to stay ≤ 500 lines.
- More probes in `harness/probes/` for a path the matrix does not reach. Run
  them on base and head. A new non-equal head row that is also non-equal on
  the base, with the same diff, predates this mission: file a `follow-up`
  issue. Any other new row is stop 3.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | mechanism, AD-1..AD-4, baseline, rollback, auto-confirmed table |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-local-names.md](batch-1/T1-local-names.md) | fixtures, tests, fix, matrix, gates, squash |
| [harness/survey.md](harness/survey.md) | reach, probe selection, planning results |
| [harness/probe.ts](harness/probe.ts), [harness/probes/](harness/probes/) | the 182-row matrix and its inputs |
| [harness/recapture.sh](harness/recapture.sh), [harness/native/](harness/native/) | the test's native fixtures; planning's copies |
| [harness/results/](harness/results/) | planning TSVs (base, prototype) |
| [harness/prototype.diff](harness/prototype.diff) | the prototype, reverted |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where a `%` name goes, parse to output |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  origin, fix, files, gates, matrix counts, accepted-row changes (expected:
  none) and toward-native changes (expected: none on the corpus; the probe
  rows only).
- Write `.agent-notes/issue-194.md` (novel): cgraph forgets a parsed `%` name
  at `endgraph` (`aginternalmapclearlocalnames`), so for DOT input a `%x`
  graph prints `%<id>` everywhere, but an API-built one keeps `%x` (#286); one
  `%` name under two parents is two subgraphs with one id; `"%a"` and `<%a>`
  get two ids. In `.agent-notes/issue-139.md`, add a line to the first
  observation saying the parser half is fixed by #194.
- On #194, reply to the #182 note: for parsed input `clust-map.ts`'s prefix
  test is right after the fix (native prints `Two clusters named %5`), and the
  API case is #286.
- The final message ends with the driver's status line.

## Summary (execution, 2026-11-21)

- Tasks: 1 of 1 (T1).
- Decisions: 7 journal rows (5-11). One is flagged for review: row 6 amends
  AD-1 for the root only. An html-like root name `<%x>` is recorded as text,
  as `agopen` records it, so `subgraph "%x"` finds the root's id and
  `subgraph <%x>` does not. The prototype had it the other way round.
- Nine probes were added (row 7). The matrix is 308 in-scope rows, 301 equal
  to native. The 182 planning rows equal the prototype's. The 7 left are
  `clusters -Kdot`, one stderr line each (#285).
- Gates: typecheck exit 0; `npm test` 612 files, 15272 tests; `gates.sh` 5/5;
  corpus and docs 27 files, 2887 tests; smoke bytediff 2352 identical, 0
  diffs, 0 capped; corpus grep 0.
- Known issues and follow-ups: none new. #284, #285 and #286 stay open.
