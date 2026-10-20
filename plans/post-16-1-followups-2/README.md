# Mission: post-16.1 follow-ups, part 2 (items 15–23)

## Objective

Close follow-ups 15–22 in [`plans/post-16.1-followups/README.md`](../post-16.1-followups/README.md)
("New follow-ups found by the mission") plus item 23 (DOT syntax errors in C's `aagerror`
format). Each item is fixed faithfully to the C, or, for the diagnosis items (17, 18, the
item-20 sites), fixed or parked with a full diagnosis (AD-3). Nothing is pushed or signed:
the user re-signs the branch at the end (AD-1).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full
   (`rules/autonomous-execution.md` is a stub).
2. Read this README, [decisions.md](decisions.md), [decision-journal.md](decision-journal.md),
   then the current batch's `overview.md`. Check finished tasks with `git log --oneline main..`.
3. Read `.agent-notes/post-16-1-followups-mission.md` (2168_3 harness technique, makeGraphData,
   golden "logs nothing" allow-lists, worktree bundling), `.agent-notes/perf-2371-pointset.md`
   (plugin dirs, `BENCH_IDS` overwrites `perf.json`) and
   `.agent-notes/followup-14-flat-labeled-lost.md` (survey verdicts ignore stderr).

## Branch and commits

- Branch `chore/post-16-1-followups-2` off `main` (`4d173ec3`, PR #95 merged).
- **First run only:** create the branch, append item 23 ("DOT syntax errors print Peggy's
  message, not `aagerror`'s; see this brief") to the follow-ups README list, and commit the
  brief, that README and `.claude/settings.autonomous.json` as
  `docs(mission): add post-16.1 follow-ups part 2 brief` (unsigned, AD-1).
- One commit per task. Subject `<type>(TN): <desc>`, ≤72 chars, lowercase, no period;
  lines ≤80; body when >3 files change; no attribution of any kind.
- **Commit unsigned, locally only (AD-1):** `git -c commit.gpgsign=false commit -F <msgfile>`.
  The key needs a PIN plus a touch, which this shell cannot give: a signing `git commit`
  hangs. Never push, open a PR, sign, or touch `main`.
- The journal cites task IDs, not SHAs. Only the orchestrator writes `decision-journal.md`
  and `.agent-notes/`; subagents report findings in their hand-back.

## Quality gates (every task, before its commit)

| Gate | Command | Pass | On fail |
|---|---|---|---|
| Types | `npm run typecheck` | exit 0 | fix, re-run |
| Unit | `npm test` | exit 0 | fix, re-run |
| Goldens | `bash test/golden/gates.sh` | 5/5 PASS | fix, re-run |
| Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 | fix, re-run |
| Byte-identity (`src/` tasks) | previous head's bundle vs this task's, every applicable id on the task's engines: SVG sha1 + captured console ([T0](batch-1/T0-baselines.md)) | identical, or every change explained | diagnose |
| Stderr parity (warning tasks) | port vs T0 native stderr, per id | count of each added message == native | diagnose |
| Survey (a batch with any SVG change; T14) | `rm -f test/corpus/parity-mission-probe.json && GVBINDIR=/tmp/ghl PARITY_OUT=parity-mission-probe.json npx tsx test/corpus/survey.ts && npx tsx test/corpus/rules-gate.ts test/corpus/parity-mission-probe.json test/corpus/parity.json` | `GATE PASS`, 0 regressions, `counts.oracle-error` == 14 | revert, STOP |
| Engine walk (engine-affecting tasks) | `GVBINDIR=<full plugin dir> npx tsx test/corpus/engine-walk.ts <engine> <scratch>.jsonl`, compared by id with the committed `parity-<engine>.jsonl` | no pass→worse | revert, STOP |
| Speed (T11, T12) | `BENCH_IDS=…` on the dot + neato subsets vs T0 | p50 ≤ 1.05× | STOP (stop 7) |

- The survey takes about 3 hours. Never edit `src/` while a survey or walk reads it: run it
  in a worktree of the commit under test.
- Speed only when `uptime` load is below 8, else defer to T14. Save `perf.json` before any
  `BENCH_IDS` run and restore it afterwards.
- Oracle: `~/git/graphviz/build/cmd/dot/dot` (16.1.0) with `GVBINDIR=/tmp/ghl` (dot only).
  Non-dot engines: the full plugin dir in `.agent-notes/perf-2371-pointset.md`. After T1,
  every survey/walk preflights the oracle and stops with the `dot -c` command if it fails.

## Stop conditions

1. A task needs to write a file outside its write-set.
2. The same gate check fails twice in a row after fix attempts. Stop editing; keep
   investigating until the cause can be named, then log the diagnosis artifact.
3. The same code location or approach fails the same check three times in a row.
4. A change would contradict AD-1 to AD-7, or evidence shows one is wrong.
5. A verdict regression on any survey or walk not explainable as a move toward the oracle.
6. The oracle fails preflight, or `dot -V` does not report 16.1.0.
7. Item 20's speed gate exceeds p50 1.05× at any site. Report; never unfuse to recover speed.
8. A fix would optimize, reorder or simplify C behaviour, or needs `any` or a Node-only API
   in `src/`.
9. Anything would push, open a PR, publish, sign, or touch `main`.
10. Item 23 cannot match native without changing `ParseError.message` or `.expected` (AD-4).
11. An instrumented native build (T13) would touch `~/git/graphviz/build` or `/tmp/ghl`.
12. **Planned stop:** T14 is done. Hand the user the re-sign command.

## Push forward (decide alone; record each decision in the journal)

- Park a diagnosis item (T5, T13, a T10 site) after its ~2 h budget, with the full
  mechanism / origin / ruled-out / next-instrument write-up (AD-3), then continue.
- Commit type (`fix` / `perf` / `test` / `chore`) by whether output changed.
- Skip a batch's survey when byte-identity shows 0 SVG diffs across the batch.
- Defer a speed measurement to T14 when load ≥ 8. Skip heavy ids above the probe cap; report.
- Mark a C branch unreachable (T4's `Nop == 2`, T5's `haveWt`) with grep/trace evidence
  rather than porting dead code.
- Add native-matching warnings to golden "logs nothing" allow-lists.
- Wording of test names, journal rows and README status lines.
- Temporary instrumentation gated by an environment variable, removed before the commit.
- `.agent-notes/` entries; 1–3-line pre-existing fixes in files already being edited
  (log anything larger).
- Re-run a walk id that timed out under load once before calling it a regression.

## Batches

| Batch | Tasks | Mode | Done |
|---|---|---|---|
| [1](batch-1/overview.md) | T0 baselines · T1 oracle preflight + cache (22) · T2 2516 test (16) · T3 world json re-walk (21) | T0 first; T1 ∥ T2; T3 after T1, concurrent with batch 2 | [ ] |
| [2](batch-2/overview.md) | T4 neato ortho dedup (15) · T5 makeGraphData (18) · T6 aagerror (23) · T7 fonttable (19a) · T8 attr warnings (19b) · T10 Bezier inventory (20a) | parallel worktrees | [ ] |
| [3](batch-3/overview.md) | T9 HTML lexer errors (19c) · T11 shared fused Bezier (20b) · T13 sfdp 2168_3 (17) | parallel worktrees | [ ] |
| [4](batch-4/overview.md) | T12 other Bezier-like sites (20c) → T14 final verification, re-sign stop | sequential | [ ] |

## Documents

- [decisions.md](decisions.md): AD-1 to AD-7 (locked)
- [decision-journal.md](decision-journal.md): append-only execution log
- [diagrams/component-map.md](diagrams/component-map.md), [diagrams/data-flow.md](diagrams/data-flow.md)
- Global journal: T14 appends a mission-summary row to `plans/decision-journal.md`.

## Conventions

- Diagnosis mode (`~/.claude/rules/diagnosis.md`) for every discrepancy; each fix's journal
  row carries mechanism / origin / causal chain / ruled out.
- Every ported symbol keeps `/** @see lib/...:fn */`. Tests first (TDD).
- Parallel tasks develop in separate git worktrees; the orchestrator lands them one at a
  time (cherry-pick, gates, journal row, commit).
- Model routing: implementation `typescript-pro` (sonnet); diagnosis `debugger` (opus).
