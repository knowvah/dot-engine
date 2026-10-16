# Mission: post-16.1 follow-ups

## Objective

Close every open item in [`plans/post-16.1-followups/README.md`](../post-16.1-followups/README.md)
(items 7–11, the neato 2371 drift, and item 13, the stale `GVBINDIR` defaults), and refresh
the architecture docs. Each item is fixed faithfully to the C or, for the two diagnosis
items, either fixed or parked with a full diagnosis (AD-3). Nothing is pushed until the
user has re-signed every commit (AD-1).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full
   (`rules/autonomous-execution.md` is a stub).
2. Read this README, [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md),
   then the current batch's `overview.md`. Check finished tasks with
   `git log --oneline main..`.
3. Read `.agent-notes/perf-2371-pointset.md` (bench on a quiet machine; `BENCH_IDS`
   overwrites `perf.json`; the plugin-dir baseline trap) and
   `.agent-notes/attribution-16-1.md` (fdp 2471's native nondeterminism).

## Branch and commits

- Branch `chore/post-16-1-followups` off `main` (`2983eea8`).
- One commit per task. Subject `<type>(TN): <desc>`, ≤72 chars, lowercase, no period;
  lines ≤80; no attribution of any kind.
- **Commit unsigned, locally only (AD-1):**
  `git -c commit.gpgsign=false commit -F <msgfile>`. Never push, open a PR, or
  touch `main` before the user re-signs (T14).
- The journal cites task IDs, not SHAs; T14 maps task IDs to signed SHAs.
- Only the orchestrator writes `decision-journal.md`. Subagents report findings in
  their hand-back.

## Quality gates (every task, before its commit)

| Gate | Command | Pass | On fail |
|---|---|---|---|
| Types | `npm run typecheck` | exit 0 | fix and re-run |
| Unit | `npm test` | exit 0 | fix and re-run |
| Goldens | `bash test/golden/gates.sh` | 5/5 PASS | fix and re-run |
| Corpus and docs | `npx vitest run test/corpus test/docs` | exit 0 | fix and re-run |
| Port byte-identity (`src/` tasks) | re-render against T0's baseline (see [batch-1/T0](batch-1/T0-baselines.md)) | identical, or every change explained | diagnose |
| Survey (T8 if output changed, T12, T13, T14) | `rm -f test/corpus/parity-mission-probe.json && GVBINDIR=/tmp/ghl PARITY_OUT=parity-mission-probe.json npx tsx test/corpus/survey.ts && npx tsx test/corpus/rules-gate.ts test/corpus/parity-mission-probe.json test/corpus/parity.json` | `GATE PASS`, 0 regressions | revert, STOP |
| Engine walk (engine-affecting tasks) | `GVBINDIR=/tmp/ghl npx tsx test/corpus/engine-walk.ts <engine> <scratch>.jsonl`, compared by id with the committed `parity-<engine>.jsonl` | no pass→worse | revert, STOP |

- The survey takes about 3 hours. Never edit `src/` while a survey or walk runs:
  run it in the task's worktree or wait for it to finish.
- Speed measurements only when `uptime` load is below 8; otherwise defer them to T14.
  Save `perf.json` before any `BENCH_IDS` run and restore it afterwards.
- Oracle: `~/git/graphviz/build/cmd/dot/dot` (16.1.0) with `GVBINDIR=/tmp/ghl`.
  If `/tmp/ghl` is gone, rebuild it per `docs/adr/0001-graphviz-16.1-oracle.md`.

## Stop conditions

1. A task needs to write a file outside its write-set.
2. The same gate check fails twice in a row after fix attempts. Keep investigating,
   but stop editing.
3. The same code location or approach fails the same check three times in a row.
4. A change would contradict AD-1 to AD-6, or evidence shows one of them is wrong.
5. A verdict regression on any track that can't be explained as a move toward the oracle.
   A newly accepted divergence is allowed only under AD-4 (1855).
6. Porting bit-exact libm `sin`/`cos` looks necessary (AD-4 option C).
7. A fix would optimize, reorder or simplify C behaviour, or needs `any` or a
   Node-only API in `src/`.
8. The oracle is missing or `dot -V` does not report 16.1.0.
9. Anything would push, open a PR, publish, or touch `main` before the re-sign.
10. **Planned stop:** T14 is done. Hand the user the re-sign command.

## Push forward (decide alone; record each decision in the journal)

- Park a diagnosis item (T12, T13) once its ~2 h budget is spent, with the full
  ruled-out / next-instrument write-up (AD-3). Then continue the mission.
- Choose `perf` vs `fix` for T8–T10 based on whether any output changed.
- Defer a speed measurement to T14 when load ≥ 8. Skip heavy ids whose native render
  exceeds the probe cap, and report the skip.
- Wording of test names, journal rows and README status lines.
- Restore `position-arith.test.ts.saved` under its real name in T12.
- Temporary instrumentation gated by an environment variable, removed before the commit.
- `.agent-notes/` entries for new findings.
- T11 with no observable difference: a journal row only, no commit.
- 1–3-line pre-existing fixes in files you are already editing. Log anything larger
  to `.agent-notes/`.

## Batches

| Batch | Tasks | Mode | Done |
|---|---|---|---|
| [1](batch-1/overview.md) | T0 baselines · T1 `GVBINDIR` defaults · T2 follow-ups README + brief · T3 architecture docs | T0 first; T1–T3 parallel | [ ] |
| [2](batch-2/overview.md) | T4 pathplan warnings · T5 multispline warnings · T6 HTML lexer errors · T7 HTML size warnings | parallel worktrees | [ ] |
| [3](batch-3/overview.md) | T8 poly-pack · T9 htmltable · T10 ortho on `PointSet` · T11 `PointMap` + speed | T8–T10 parallel, then T11 | [ ] |
| [4](batch-4/overview.md) | T12 circo FMA / 1855 → T13 label-placement flips | sequential | [ ] |
| [5](batch-5/overview.md) | T14 final verification, then the re-sign stop | sequential | [ ] |

## Documents

- [decisions.md](decisions.md): AD-1 to AD-6 (locked)
- [decision-journal.md](decision-journal.md): append-only execution log
- [diagrams/component-map.md](diagrams/component-map.md),
  [diagrams/data-flow.md](diagrams/data-flow.md)
- Global journal: T14 appends a mission-summary row to `plans/decision-journal.md`.

## Conventions

- Diagnosis mode (`~/.claude/rules/diagnosis.md`) for every discrepancy. Each fix's
  journal row carries mechanism / origin / causal chain / ruled out.
- Every ported symbol keeps `/** @see lib/...:fn */`.
- Each task's tests come first (TDD).
- Parallel tasks develop in separate git worktrees. The orchestrator lands them one at
  a time: cherry-pick, run the gates, write the journal row, commit.
