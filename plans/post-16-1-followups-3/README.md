# Mission: post-16.1 follow-ups, part 3 (items 25, 29–31, 35–37, 40–42)

## Objective

Close the remaining follow-ups in
[`plans/post-16.1-followups/README.md`](../post-16.1-followups/README.md): 25, 29, 30, 31,
35, 36, 37, 40, 41 and 42. Each item is fixed faithfully to the C (graphviz 16.1.0), closed as
documented-irreducible (30), or, for the diagnosis items (31, 35, 42, each item-29 site),
fixed or parked with a full diagnosis (AD-3). Nothing is pushed or signed: the user re-signs
the branch at the end (AD-1).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full
   (`rules/autonomous-execution.md` is a stub).
2. Read this README, [decisions.md](decisions.md), [decision-journal.md](decision-journal.md),
   then the current batch's `overview.md`. Check finished tasks with `git log --oneline main..`.
3. Read `.agent-notes/post-16-1-followups-mission.md` (harness technique, golden "logs
   nothing" allow-lists, worktree bundling), `.agent-notes/perf-2371-pointset.md` (plugin
   dirs, `BENCH_IDS` overwrites `perf.json`), `.agent-notes/html-entity-port-2026-10.md`
   (pooled-worker diffs are unconfirmed until re-run in their own process) and
   `.agent-notes/followup-14-flat-labeled-lost.md` (survey verdicts ignore stderr).

## Branch and commits

- Branch `chore/post-16-1-followups-3` off `main` (`21991640`, PR #104 merged).
- **First run only:** create the branch, add "Being closed by
  `plans/post-16-1-followups-3/`" to the follow-ups README's open-work line, and commit the
  brief and that README as `docs(mission): add post-16.1 follow-ups part 3 brief`
  (unsigned, AD-1).
- One commit per task. Subject `<type>(TN): <desc>`, ≤72 chars, lowercase, no period;
  lines ≤80; body when >3 files change; no attribution of any kind.
- **Commit unsigned, locally only (AD-1):** `git -c commit.gpgsign=false commit -F <msgfile>`.
  A signing `git commit` hangs on the YubiKey PIN. Never push, open a PR, sign, or touch `main`.
- The journal cites task IDs, not SHAs. Only the orchestrator writes `decision-journal.md`,
  `plans/post-16.1-followups/README.md` and `.agent-notes/`; subagents report findings in
  their hand-back.

## Quality gates (every task, before its commit)

| Gate | Command | Pass | On fail |
|---|---|---|---|
| Types | `npm run typecheck` | exit 0 | fix, re-run |
| Unit | `npm test` | exit 0 | fix, re-run |
| Goldens | `bash test/golden/gates.sh` | 5/5 PASS | fix, re-run |
| Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 | fix, re-run |
| i18n (docs tasks) | `npm run docs:i18n-status` | 0 stale | update `sourceHash` (`node scripts/i18n-hash.mjs docs/known-divergences.md`) |
| Byte-identity (`src/` tasks) | T0's `bytediff` tool: previous head's bundle vs this task's, **one process per job**, the ids the task can reach, engines × {svg, xdot, json, plain, cmapx} + console | identical, or every change explained; timeouts/OOMs listed separately, never counted identical | diagnose |
| Stderr parity (warning tasks) | T0's `probe` tool vs native, per case | lines equal native's | diagnose |
| Survey (batch with any output change; T14) | `rm -f test/corpus/parity-mission-probe.json && GVBINDIR=/tmp/ghl PARITY_OUT=parity-mission-probe.json npx tsx test/corpus/survey.ts && npx tsx test/corpus/rules-gate.ts test/corpus/parity-mission-probe.json test/corpus/parity.json` | `GATE PASS`, 0 regressions, `counts.oracle-error` == 14 | revert, STOP |
| Engine walk (engine-affecting tasks; T14) | `GVBINDIR=<full plugin dir> npx tsx test/corpus/engine-walk.ts <engine> <scratch>.jsonl`, compared by id with the committed `parity-<engine>.jsonl` | no pass→worse | revert, STOP |
| Speed (T1, T6–T9; T14) | `BENCH_IDS=…` dot + neato subsets vs T0's `timings-T0.json` | p50 ≤ 1.05× | STOP (stop 7) |

- The survey takes about 3 hours. Never edit `src/` while a survey or walk reads it: run it
  in a worktree of the commit under test (`ln -s <repo>/node_modules node_modules`,
  `npm run parser:regen`).
- Speed only when `uptime` load is below 8, else defer to T14. Save `perf.json` before any
  `BENCH_IDS` run and restore it afterwards.
- Oracle: `~/git/graphviz/build/cmd/dot/dot` (16.1.0), `GVBINDIR=/tmp/ghl` (dot only); other
  engines use the full plugin dir in `.agent-notes/perf-2371-pointset.md`. A nightly `/tmp`
  clean deletes `config8` (symptom `Format "svg" not recognized`): fix with
  `GVBINDIR=<dir> dot -c`.

## Stop conditions

1. A task needs to write a file outside its write-set (T13's write-set is open).
2. The same gate check fails twice in a row after fix attempts. Stop editing; keep
   investigating until the cause can be named, then log the diagnosis artifact.
3. The same code location or approach fails the same check three times in a row.
4. A change would contradict AD-1 to AD-10, or evidence shows one is wrong.
5. A verdict regression on any survey or walk not explainable as a move toward the oracle.
6. The oracle fails preflight, `dot -V` is not 16.1.0, or `counts.oracle-error` ≠ 14.
7. The speed gate exceeds p50 1.05× for an FMA site (T6–T9) or the per-render reset (T1).
   Report; never unfuse or drop resets to recover speed.
8. A fix would optimize, reorder or simplify C behaviour, or needs `any` or a Node-only API
   in `src/`.
9. Anything would push, open a PR, publish, sign, or touch `main`.
10. An instrumented native build would touch `~/git/graphviz/build` or `/tmp/ghl`.
11. AD-4's reset would change a public API signature, or reset caller-owned hooks
    (`setTextMeasurer`, `setImageSizer`, `setImageResolver`).
12. T13 finds that fixing 1864 means restructuring a C algorithm (park instead, AD-8).
13. **Planned stop:** T14 is done. Hand the user the re-sign command.

## Push forward (decide alone; record each decision in the journal)

- Park a diagnosis item (T1's carry-over mechanism, T12, T13, a T6–T9 site) after its ~2 h
  budget with mechanism / origin / ruled-out / next-instrument (AD-3), then continue.
- Mark a 29-site "no fusion" from disassembly evidence and leave its code unchanged.
- Classify each console site in T5 as agerr vs `fprintf(stderr)` from the C source.
- Commit type (`fix` / `perf` / `test` / `chore` / `docs`) by whether output changed.
- Skip a batch's survey when byte-identity shows 0 output diffs across the batch (T14's
  fresh survey always runs).
- Defer a speed measurement to T14 when load ≥ 8. Re-run a walk id that timed out under
  load once before calling it a regression.
- Add native-matching warnings to golden "logs nothing" allow-lists.
- Temporary instrumentation gated by an environment variable, removed before the commit.
- 1–3-line pre-existing fixes in files already being edited; log anything larger as a new
  follow-up in the follow-ups README (not in this mission's scope).
- Wording of test names, journal rows, README status lines and `.agent-notes/` entries.

## Batches

| Batch | Tasks | Mode | Done |
|---|---|---|---|
| [1](batch-1/overview.md) | T0 baselines and shared tooling | orchestrator | [x] |
| [2](batch-2/overview.md) | T1 per-render state (42) · T2 MaxIter (25) · T3 HTML invalid token (40) · T4 close 2168_3 (30) | parallel worktrees | [x] |
| [3](batch-3/overview.md) | T5 agerr writer (36) · T6–T9 FMA sites (29a–d) | parallel worktrees | [x] |
| [4](batch-4/overview.md) | T10 unknown color (37) · T11 width warnings (41) · T12 `<BR/>` in font style (35) | parallel worktrees | [x] (T12 parked) |
| [5](batch-5/overview.md) | T13 1864 OOM (31) | single, open write-set | [x] (T13 parked) |
| [6](batch-6/overview.md) | T14 final verification, close-out, re-sign stop | orchestrator | [ ] |

## Documents

- [decisions.md](decisions.md): AD-1 to AD-10 (locked)
- [decision-journal.md](decision-journal.md): append-only execution log
- [diagrams/component-map.md](diagrams/component-map.md), [diagrams/data-flow.md](diagrams/data-flow.md)
- Global journal: each task's row also goes to `plans/decision-journal.md` (the project
  journal), as items 26–39 did; T14 adds a mission-summary row.

## Conventions

- Diagnosis mode (`~/.claude/rules/diagnosis.md`) for every discrepancy; each fix's journal
  row carries mechanism / origin / causal chain / ruled out.
- Every ported symbol keeps `/** @see lib/...:fn */`. Tests first (TDD).
- Parallel tasks develop in separate git worktrees; the orchestrator lands them one at a
  time (cherry-pick, gates, journal row, commit).
- Model routing: implementation `typescript-pro` (sonnet); diagnosis `debugger` (opus);
  T13 heap profiling `performance-engineer`; T4 `technical-writer`.
