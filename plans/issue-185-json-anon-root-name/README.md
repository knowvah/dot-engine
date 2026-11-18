# Mission: issue #185: json prints a nameless root's name as `%1`

## Objective

Native `-Tjson` and `-Tjson0` print `"name": "%1"` for a root graph with no
name (`digraph { a -> b }`); the port prints `"name": ""`. Anonymous subgraphs
already print native's `%3` etc. A root named `""` prints `""` on both sides.

**Mechanism (checked at planning against base `9336a55c` and graphviz
16.1.1).** C's `write_hdr` prints `agnameof(g)`
(`plugin/core/gvrender_core_json.c:364-370`), and `agnameof` returns
`%<AGID>` for an anonymous graph (`lib/cgraph/id.c:145-169`): `%1` for a
nameless root. The port keeps `name: ''` with `anonymous: true` for a nameless
root (so the dot writer prints `digraph {`), and `buildGraphObject` copies
`g.name` (`src/render/json.ts:581-582`). The port already has the mapping:
`agNameOf` (`src/model/cgraph-ops.ts:45-47`), used by the neato warnings.

**Fix (AD-1, AD-2).** `o.name = agNameOf(g)`, with the file kept at its
734-line Gate 4 cap ([harness/prototype.diff](harness/prototype.diff) is the
prototype, one line over).

**Evidence ([harness/](harness/)).**

- **Probes** (5 inputs × 8 engines × json, json0): head root name equals
  native in 80 of 80 rows (base: 32, the two controls).
- **Smoke bytediff** (49 ids, default formats): 96 of 1960 outputs change, all
  `-Tjson`, on the 12 ids with nameless roots × 8 engines. Each changes only
  line 2, `""` → `"%1"`, native's line in every row (toward-native changes).
- **Targeted survey** (139 corpus ids with nameless, `""`-named or unparsed
  root headers; dot; json,
  [harness/results/survey-planning.tsv](harness/results/survey-planning.tsv)):
  128 rows move `""` → `"%1"`, equal to native; 8 named or `""`-named roots
  stay equal and unchanged; 3 `skip` (`1864` and `2475_1` native `TIMEOUT`,
  `share-b545` not DOT); no `NE`, no stderr change.
- `npm test` passes on the prototype with no test edited.

Done means the issue's criterion: the port's json and json0 root `name` equals
native on the repro and on the smoke ids' nameless roots. Type `fix`, a patch
release.

**Out of scope:**

- `%`-prefixed root names (`digraph "%foo" {}`), #194;
- `compareJson` comparing the root name (AD-3: a `follow-up` issue);
- json key order (#184's notes).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 9336a55c..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `9336a55ce158c738d532ceaea5d6eb51157a313f` (the tip at
  planning). If the tip has moved, use the tip at execution start as the base,
  rebuild the base bundle from it, and journal it.
- Per-task commits while working: first `docs(mission): add issue-185 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-185/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(json): print a nameless root's name as agnameof does

  <two to four lines: write_hdr prints agnameof(g), which is %1 for a
  nameless root; the port copied the stored '' (kept so the dot writer
  prints "digraph {"); agNameOf restores %1 as the neato warnings do>

  Refs: #185
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never push,
  rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4: `json.ts` ≤ 734 lines) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-agnameof-root.md#bytediff) | only the 96 planned json rows change, each toward native |
| 6 | Targeted survey | see [T1](batch-1/T1-agnameof-root.md#targeted-survey) | no `NE`, no `err` `DIFF`, columns equal planning |

Oracle (ADR-0002, the newest accepted ADR):
`~/git/graphviz-16.1.1/build/cmd/dot/dot` with `GVBINDIR=/tmp/ghl1611` (dot)
or `/tmp/ghl1611-all` (other engines), as `test/corpus/oracle-paths.mjs` says.
Both harness scripts import it and run `oraclePreflight`
(`test/corpus/oracle-env.ts`) for dot and sfdp before trusting native output.
A missing `config8` is fixed with `GVBINDIR=<dir> <dot> -c`. The issue has no
`upstream-16.1.1` label. Check `uptime` before gates 5 and 6; above 12, wait.

Baseline at planning: typecheck and `npm test` green on `9336a55c`
([decision-journal.md](decision-journal.md) row 0).

## Stop conditions

1. A non-test file outside [T1's write-set](batch-1/T1-agnameof-root.md#write-set)
   must change, or `json.ts` cannot stay at 734 lines without changing
   behaviour. Journal why and stop.
2. A probe row whose head root name differs from native. Write the diagnosis
   artifact and stop.
3. In gate 5: any changed output that is not `json`, any id outside the planned
   12, or any row of `toward-native-head.tsv` not `y`. Diagnose and stop.
4. In gate 6: any `NE` row, any `err` `DIFF`, or a `native`/`verdict`/`moved`
   column that differs from the planning TSV. Diagnose and stop.
5. The same gate check fails twice in a row after fix attempts. Diagnose it to
   a stated mechanism, journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test names and layout within the write-set; the exact wording of the folded
  `write_hdr` comment.
- An existing test that pinned the empty root name: update it to native's
  value and journal it, with native's output as evidence.
- More probes in `harness/extra/` for a path the 5 do not reach.
- A survey row native cannot produce (`TIMEOUT`, `SEGV`, `FAIL` → `skip`):
  compare head with base only, and journal it.
- The follow-up issue's wording (AD-3).

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback, auto-confirmed notes |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-agnameof-root.md](batch-1/T1-agnameof-root.md) | red tests, fix, gates, squash |
| [harness/probes/](harness/probes/) | the 5 inputs |
| [harness/native-root-names.tsv](harness/native-root-names.tsv) | native 16.1.1 root name per probe, engine, format |
| [harness/root-name-survey.ts](harness/root-name-survey.ts) | base and head root names against native |
| [harness/toward-native.ts](harness/toward-native.ts) | gate 5 diff-line counts against native |
| [harness/prototype.diff](harness/prototype.diff) | the prototype, reverted |
| [harness/survey.md](harness/survey.md) | probe design, survey selection |
| [harness/survey-ids.txt](harness/survey-ids.txt) | the 139 survey ids |
| [harness/results/](harness/results/) | planning TSVs |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where the name comes from, base and head |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  files, gates, toward-native changes.
- Write `.agent-notes/issue-185.md` (novel): `json.ts` is at its Gate 4 cap
  (734), so any growth needs a compensating line; `compareJson` never compares
  the root name (the follow-up's number). Update `.agent-notes/issue-184.md:33`,
  which says the root name differs (`%1`, #185).
- The final message ends with the driver's status line.

## Summary (2026-11-18)

- **Tasks:** 1 of 1 (T1). Mission base `9e7a736a` (the tip had moved one docs
  commit past the planning base `9336a55c`; journal row 1).
- **Change:** `buildGraphObject` prints `agNameOf(g)`
  (`src/render/json.ts`, still 734 lines). Tests: new
  `src/render/json-root-name.test.ts` (87 cases), tightened
  `src/render/dot/empty-graph-name.test.ts` and `src/gvc/rerender.test.ts`.
- **Decisions:** 12 journal rows, none flagged for review. No stop condition
  met; no file outside the write-set changed.
- **Gates:** typecheck 0; `npm test` 602 files / 15041 tests; goldens 5/5;
  corpus + docs 25 files / 2863 tests; smoke bytediff 1960 jobs, 1864
  identical, 96 diffs, 0 capped; probes 80 of 80 equal native (48 moved);
  survey 139 rows: 128 moved to native, 8 unchanged and equal, 3 `skip`, no
  `NE`, no `err` `DIFF`. Probe, toward-native and survey TSVs are
  byte-identical to planning's.
- **Accepted-row changes:** none.
- **Toward-native changes** (96 rows, all `json`; diff lines against native,
  base→head; each row changes only line 2, `"name": ""` → `"name": "%1"`,
  native's line; [harness/results/toward-native-head.tsv](harness/results/toward-native-head.tsv)):

| id | dot | neato | fdp | circo | twopi | osage | sfdp | patchwork |
|---|---|---|---|---|---|---|---|---|
| `1514` | 435→433 | 417→415 | 415→413 | 452→450 | 530→528 | 430→428 | 446→444 | 582→580 |
| `2458` | 176→174 | 166→164 | 154→152 | 174→172 | 222→220 | 164→162 | 166→164 | 216→214 |
| `2572` | 280→278 | 280→278 | 258→256 | 280→278 | 358→356 | 280→278 | 280→278 | 350→348 |
| `2592` | 743→741 | 743→741 | 743→741 | 743→741 | 743→741 | 743→741 | 743→741 | 743→741 |
| `2613` | 1429→1427 | 1429→1427 | 1429→1427 | 1429→1427 | 995→993 | 1429→1427 | 1429→1427 | 1429→1427 |
| `2639` | 1025→1023 | 1025→1023 | 1037→1035 | 1025→1023 | 1060→1058 | 1025→1023 | 1025→1023 | 747→745 |
| `2643` | 211→209 | 211→209 | 211→209 | 209→207 | 253→251 | 211→209 | 211→209 | 236→234 |
| `2682` | 623→621 | 507→505 | 615→613 | 615→613 | 726→724 | 507→505 | 615→613 | 543→541 |
| `2683` | 702→700 | 702→700 | 702→700 | 690→688 | 581→579 | 702→700 | 690→688 | 731→729 |
| `graphs-flatedge` | 4488→4482 | 4488→4482 | 4488→4482 | 4488→4482 | 1920→1918 | 4488→4482 | 4488→4482 | 4265→4259 |
| `graphs-sides` | 402→400 | 402→400 | 402→400 | 402→400 | 438→436 | 402→400 | 402→400 | 422→420 |
| `tree-graphs-directed-arr_none` | 2548→2546 | 2548→2546 | 2548→2546 | 2548→2546 | 2548→2546 | 2548→2546 | 2548→2546 | 1472→1470 |

- **Follow-ups:** #261 (`compareJson` skips the root graph name). Out of scope
  and unchanged: #194 (`%`-prefixed root names).
- **Not compared:** `1864` (port out of memory) and `2475_1` (port past 300 s)
  give no json on base or head, and native times out on both (journal row 9).
