# Mission: post-16.1 follow-ups, part 5 (items 72–87, 89)

## Objective

Close every open follow-up in
[`plans/post-16.1-followups/README.md`](../post-16.1-followups/README.md) found by part 4,
items 72–87 and 89 (88 is done): layout/label state (72, 73, 83, 85), diagnostics parity
(74, 75, 77, 78, 80, 82, 87), parser (76), feature port (79 `layerselect`), render fidelity
(81, 89), numerics (84) and docs (86). Each item is fixed faithfully to the C
(graphviz 16.1.0) or parked with a full diagnosis (AD-3). Nothing is pushed or signed (AD-1).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full
   (`rules/autonomous-execution.md` is a stub).
2. Read this README, [decisions.md](decisions.md), [decision-journal.md](decision-journal.md),
   then the current batch's `overview.md`. Check finished tasks with `git log --oneline main..`.
3. Read `.agent-notes/post-16-1-followups-4.md` (fused reductions per call site, `fma` NaN,
   `-Tjson` nested render, subagents cannot commit, walk budgets, staleness normalizer,
   `technical-writer` cannot edit locale pages) and `.agent-notes/post-16-1-followups-3.md`
   (clang harness, lldb on native statics, native stderr details).

## Branch and commits

- Branch `chore/post-16-1-followups-5` off `main` (`94d5b707`, PR #113 merged).
- **First run only:** create the branch, add "Being closed by
  `plans/post-16-1-followups-5/`" after the part-4 line in the follow-ups README header,
  and commit the brief and that README as
  `docs(mission): add post-16.1 follow-ups part 5 brief`.
- One commit per task. Subject `<type>(TN): <desc>`, ≤72 chars, lowercase, no period;
  lines ≤80; body when >3 files change; no attribution of any kind. Only T12 is `feat`.
- **Commit unsigned, locally only (AD-1):** `git -c commit.gpgsign=false commit -F <msgfile>`.
  Never push, open a PR, sign, rebase, or touch `main`.
- The journal cites task IDs, not SHAs. Only the orchestrator writes `decision-journal.md`,
  `plans/decision-journal.md`, `plans/post-16.1-followups/README.md` and `.agent-notes/`;
  subagents report findings in their hand-back.

## Quality gates (every task, before its commit)

| Gate | Command | Pass | On fail |
|---|---|---|---|
| Types | `npm run typecheck` | exit 0 | fix, re-run |
| Unit | `npm test` | exit 0 | fix, re-run |
| Goldens | `bash test/golden/gates.sh` | 5/5 PASS | fix, re-run |
| Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 | fix, re-run |
| i18n (T6) | `npm run docs:i18n-status` | 0 stale | `npm run docs:i18n-hashes` |
| Byte-identity (`src/` tasks) | `npx tsx test/tools/bytediff.ts` (T0 usage): previous head's bundle vs this task's, **one process per job**, the ids the task can reach, engines × {svg, xdot, json, plain, cmapx} + console | identical, or every change explained; capped jobs listed apart, never counted identical | diagnose |
| Stderr parity (warning tasks) | `npx tsx test/tools/probe.ts <bundle> <engine> <case>` vs native, per case | lines equal native's (`<stdin>: ` normalized) | diagnose |
| Survey (after batches 3 and 4; batch 2 only if bytediff shows output changes; T17 always) | `rm -f test/corpus/parity-mission-probe.json && GVBINDIR=/tmp/ghl PARITY_OUT=parity-mission-probe.json npx tsx test/corpus/survey.ts && npx tsx test/corpus/rules-gate.ts test/corpus/parity-mission-probe.json test/corpus/parity.json` | `GATE PASS`, 0 regressions, `counts.oracle-error` == 14 | revert, STOP |
| Engine walk (T10, T13, T15, T17) | `GVBINDIR=<full plugin dir> npx tsx test/corpus/engine-walk.ts <engine> <scratch>.jsonl`, compared by id with the committed `parity-<engine>.jsonl` | no pass→worse (`oracle-nondeterministic` neutral) | revert, STOP |
| Speed (T5, T15; T17) | dot + neato A/B timing (`test/tools/speed.sh`) vs `timings-T0.json` | p50 ≤ 1.05× | STOP (stop 7) |

- The survey takes about 3 hours. Never edit `src/` while a survey or walk reads it: run it
  in a worktree of the commit under test (`ln -s <repo>/node_modules node_modules`,
  `npm run parser:regen`).
- Speed only when `uptime` load is below 8, else defer to T17.
- Oracle: `~/git/graphviz/build/cmd/dot/dot` (16.1.0). `GVBINDIR=/tmp/ghl` for dot; other
  engines use the full plugin dir
  `/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/dfc80e32-d4b2-43d1-a20b-4d2c1be89946/scratchpad/ghl16-all`
  (walk caches are keyed on that path). A nightly `/tmp` clean deletes `config8`
  (`Format "svg" not recognized` or `no layout engine support`): fix with
  `GVBINDIR=<dir> dot -c`.
- Native fdp/sfdp/neato/twopi output is nondeterministic on some ids: the walk labels them
  `oracle-nondeterministic` (part-4 AD-13); bytediff port base vs head before calling a
  flip a regression.

## Stop conditions

1. A task needs to write a file outside its write-set (T17's is open; T2 and T13 confirm
   their engine-file sites first).
2. The same gate check fails twice in a row after fix attempts. Stop editing; keep
   investigating until the cause can be named, then log the diagnosis artifact.
3. The same code location or approach fails the same check three times in a row.
4. A change would contradict AD-1 to AD-18, or evidence shows one is wrong.
5. A survey or walk verdict regression not explainable as a move toward the oracle.
6. The oracle fails preflight, `dot -V` is not 16.1.0, or `counts.oracle-error` ≠ 14.
7. Speed exceeds p50 1.05× for the fused kernel (T15) or the tokenizer (T5). Report; never
   unfuse or drop the change to recover speed.
8. A fix would optimize, reorder or simplify C behaviour, or needs `any` or a Node-only API
   in `src/`.
9. Anything would push, open a PR, publish, sign, rebase, or touch `main`.
10. A T9 per-key probe disagrees with the snapshot rule (AD-6), or a T8 probe shows expat
    rejecting something outside the content set that one regex cannot express.
11. T13 would need a label rebuilt at render time (AD-12 keeps the early return).
12. T14 would add filesystem access or a new public hook.
13. **Planned stop:** T17 is done. Hand the user the re-sign command.

## Push forward (decide alone; record each decision in the journal)

- Park a diagnosis item after its ~2 h budget with the full artifact (AD-3), then continue:
  a T15 id that drifts the wrong way, a T11 message whose native form needs a second probe.
- Commit type (`feat` / `fix` / `refactor` / `test` / `docs`) by whether output changed;
  only T12 is `feat`.
- Skip a batch's survey when bytediff shows 0 output diffs across the batch (T17's fresh
  survey always runs). Run the survey after batches 3 and 4.
- Defer a speed measurement to T17 when load ≥ 8. Re-run a walk id that timed out under
  load once before calling it a regression.
- Add native-matching warnings to golden "logs nothing" allow-lists; move tests that spy
  on `console.error` for a warning to `console.warn` (AD-13).
- Temporary instrumentation gated by an environment variable, removed before the commit.
- 1–3-line pre-existing fixes in files already being edited; anything larger becomes a new
  follow-up (item 90 onward) in the follow-ups README.
- T0 rebuilds `$BASE` references if an earlier session's scratchpad is gone.
- Wording of test names, journal rows, README status lines and `.agent-notes/` entries.

## Batches

Sub-batches 2a/2b run in parallel; the batch gate runs once after both land.

| Batch | Tasks | Mode | Done |
|---|---|---|---|
| [1](batch-1/overview.md) | T0 baselines, native references | orchestrator | [ ] |
| [2a](batch-2a/overview.md) | T1 agerr partial lines · T2 `State` 87 · T3 fma 84 · T4 agNameOf 74 · T5 style tokenizer 80 | parallel worktrees | [ ] |
| [2b](batch-2b/overview.md) | T6 docs 86 · T7 json order 78 · T8 attvalue 76 · T9 cluster snapshot 89 | parallel worktrees | [ ] |
| [3](batch-3/overview.md) | T10 len 73 · T11 findStopColor 75/77/82 · T12 layerselect 79 · T13 cleanup labels 72 · T14 image sizing 83 | parallel worktrees | [ ] |
| [4](batch-4/overview.md) | T15 fused kernel 85 · T16 colorscheme window 81 | parallel worktrees | [ ] |
| [5](batch-5/overview.md) | T17 final verification, walk refresh, close-out, re-sign stop | orchestrator | [ ] |

## Documents

- [decisions.md](decisions.md): AD-1 to AD-18 (locked)
- [decision-journal.md](decision-journal.md): append-only execution log
- [diagrams/component-map.md](diagrams/component-map.md), [diagrams/data-flow.md](diagrams/data-flow.md)
- Global journal: each task's row also goes to `plans/decision-journal.md`; T17 adds a
  mission-summary row.

## Conventions

- Diagnosis mode (`~/.claude/rules/diagnosis.md`) for every discrepancy; each fix's journal
  row carries mechanism / origin / causal chain / ruled out.
- Every ported symbol keeps `/** @see lib/...:fn */`. Tests first (TDD).
- Parallel tasks develop in separate git worktrees; the orchestrator lands them one at a
  time (cherry-pick, gates, journal row, commit). Journal and README updates land as one
  `docs(mission)` commit per batch.
- Model routing: implementation `typescript-pro` (sonnet); diagnosis `debugger` (opus);
  T6 `documentation-engineer` (locale edits need Bash and Edit).
