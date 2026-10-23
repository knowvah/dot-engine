# Mission: post-16.1 follow-ups, part 4 (items 43–71)

## Objective

Close every open follow-up in
[`plans/post-16.1-followups/README.md`](../post-16.1-followups/README.md), items 43–71:
diagnostics parity (44, 54–61, 63), clip/arith fidelity (48–51), feature ports (43
`mode=hier`, 62 striped clusters, 64 HTML gradients), tooling and corpus hygiene (45, 65,
66, 69, 70, 71), state/API (46, 47), refactor/perf (67, 68) and investigations (52, 53).
Each item is fixed faithfully to the C (graphviz 16.1.0), closed as documented (52, 56), or
fixed or parked with a full diagnosis (AD-3). Nothing is pushed or signed (AD-1).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full
   (`rules/autonomous-execution.md` is a stub).
2. Read this README, [decisions.md](decisions.md), [decision-journal.md](decision-journal.md),
   then the current batch's `overview.md`. Check finished tasks with `git log --oneline main..`.
3. Read `.agent-notes/post-16-1-followups-3.md` (LTO disassembly, clang harness, lldb on
   native statics, GTS nondeterminism, native stderr details, tooling limits, locale edits
   need a Bash/Edit-capable agent) and `.agent-notes/post-16-1-followups-mission.md`
   (harness technique, golden "logs nothing" allow-lists, worktree bundling).

## Branch and commits

- Branch `chore/post-16-1-followups-4` off `main` (`89dd6ce9`, PR #106 merged).
- **First run only:** create the branch, add "Being closed by
  `plans/post-16-1-followups-4/`" to the follow-ups README's open-work line, and commit the
  brief and that README as `docs(mission): add post-16.1 follow-ups part 4 brief`.
- One commit per task. Subject `<type>(TN): <desc>`, ≤72 chars, lowercase, no period;
  lines ≤80; body when >3 files change; no attribution of any kind. Only T26 is `feat`.
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
| i18n (docs tasks) | `npm run docs:i18n-status` | 0 stale | `node scripts/i18n-hash.mjs docs/known-divergences.md` |
| Byte-identity (`src/` tasks) | `test/tools/bytediff` (T0/T1): previous head's bundle vs this task's, **one process per job**, the ids the task can reach, engines × {svg, xdot, json, plain, cmapx} + console | identical, or every change explained; capped jobs listed apart, never counted identical | diagnose |
| Stderr parity (warning tasks) | `test/tools/probe` vs native, per case | lines equal native's (`<stdin>: ` normalized, AD-10) | diagnose |
| Survey (after batches 3, 4, 5 and in T29; batch 2 only if bytediff shows output changes) | `rm -f test/corpus/parity-mission-probe.json && GVBINDIR=/tmp/ghl PARITY_OUT=parity-mission-probe.json npx tsx test/corpus/survey.ts && npx tsx test/corpus/rules-gate.ts test/corpus/parity-mission-probe.json test/corpus/parity.json` | `GATE PASS`, 0 regressions, `counts.oracle-error` == 14 | revert, STOP |
| Engine walk (engine-affecting tasks; T29) | `GVBINDIR=<full plugin dir> npx tsx test/corpus/engine-walk.ts <engine> <scratch>.jsonl`, compared by id with the committed `parity-<engine>.jsonl` | no pass→worse (`oracle-nondeterministic` neutral after T3) | revert, STOP |
| Speed (T8, T10–T13, T21; T29) | dot + neato A/B timing (T0's `speed.sh` method) vs `timings-T0.json` | p50 ≤ 1.05× | STOP (stop 7) |

- The survey takes about 3 hours. Never edit `src/` while a survey or walk reads it: run it
  in a worktree of the commit under test (`ln -s <repo>/node_modules node_modules`,
  `npm run parser:regen`).
- Speed only when `uptime` load is below 8, else defer to T29.
- Oracle: `~/git/graphviz/build/cmd/dot/dot` (16.1.0). `GVBINDIR=/tmp/ghl` for dot; other
  engines use the full plugin dir
  `/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/dfc80e32-d4b2-43d1-a20b-4d2c1be89946/scratchpad/ghl16-all`.
  A nightly `/tmp` clean deletes `config8` (`Format "svg" not recognized` or `no layout
  engine support`): fix with `GVBINDIR=<dir> dot -c`.
- Native fdp/sfdp/neato/twopi output is nondeterministic on some ids (item 69): re-run the
  oracle before calling such a diff a regression until T3 lands.

## Stop conditions

1. A task needs to write a file outside its write-set (T28's is open; T18/T19 confirm
   their port site first).
2. The same gate check fails twice in a row after fix attempts. Stop editing; keep
   investigating until the cause can be named, then log the diagnosis artifact.
3. The same code location or approach fails the same check three times in a row.
4. A change would contradict AD-1 to AD-14, or evidence shows one is wrong.
5. A survey or walk verdict regression not explainable as a move toward the oracle.
6. The oracle fails preflight, `dot -V` is not 16.1.0, or `counts.oracle-error` ≠ 14.
7. Speed exceeds p50 1.05× for an FMA site (T10–T13), the layout reset (T8) or lazy
   `attrs` (T21). Report; never unfuse or drop the change to recover speed.
8. A fix would optimize, reorder or simplify C behaviour, or needs `any` or a Node-only API
   in `src/`.
9. Anything would push, open a PR, publish, sign, rebase, or touch `main`.
10. An instrumented native build or clang harness would write into `~/git/graphviz/build`
    or `/tmp/ghl`.
11. T8's reset would change a public signature or reset caller-owned hooks
    (`setTextMeasurer`, `setImageSizer`, `setImageResolver`).
12. The `mode=hier` port needs an unported C helper beyond AD-6's six files plus the loud
    `subset`/`circuit` models.
13. **Planned stop:** T29 is done. Hand the user the re-sign command.

## Push forward (decide alone; record each decision in the journal)

- Park a diagnosis item after its ~2 h budget with the full artifact (AD-3), then continue:
  T28, a T10–T13 site, T21 over ~10 writers, a T15–T17/T22 harness mismatch.
- Mark an FMA site "no fusion" from disassembly evidence and leave its code unchanged.
- Classify each console site in T5 as agerr vs `fprintf(stderr)` from the C source.
- Commit type (`feat` / `fix` / `perf` / `refactor` / `test` / `chore` / `docs`) by whether
  output changed; only T26 is `feat`.
- Skip a batch's survey when bytediff shows 0 output diffs across the batch (T29's fresh
  survey always runs).
- Defer a speed measurement to T29 when load ≥ 8. Re-run a walk id that timed out under
  load once before calling it a regression.
- Add native-matching warnings to golden "logs nothing" allow-lists; move tests that spy
  on `console.error` for a warning to `console.warn` (AD-9).
- Temporary instrumentation gated by an environment variable, removed before the commit.
- 1–3-line pre-existing fixes in files already being edited; log anything larger as a new
  follow-up in the follow-ups README.
- T0 rebuilds the part-3 tools if the scratch copies are gone (AD-5).
- Wording of test names, journal rows, README status lines and `.agent-notes/` entries.

## Batches

Sub-batches (2a/2b, 3a–3c) of one batch run in parallel; the batch gate runs once after all
of them land.

| Batch | Tasks | Mode | Done |
|---|---|---|---|
| [1](batch-1/overview.md) | T0 baselines, tooling import, native references | orchestrator | [ ] |
| [2a](batch-2a/overview.md) | T1 tools 65/66 · T2 fitness reasons 45 · T3 walk nondeterminism 69 · T9 docs 52/56 | parallel worktrees | [ ] |
| [2b](batch-2b/overview.md) | T4 expat BT_NONXML 44 · T5 agerr prefix + channel 54/55 · T6 parseSegs warning 57 · T7 HTML warning state 46 · T8 layout reset 47 | parallel worktrees | [ ] |
| [3a](batch-3a/overview.md) | T10 splines-clip 48 · T11 compound/clipToNodes 49 · T12 tailArrowEndClip 50 · T13 CDT SQRT3 51 · T14 striped clusters 62 | parallel worktrees | [ ] |
| [3b](batch-3b/overview.md) | T15 compute_hierarchy · T16 quad_prog_solve · T17 IMDS_given_dim (43) · T21 lazy virtual attrs 68 | parallel worktrees | [ ] |
| [3c](batch-3c/overview.md) | T18 unsupported style 58 · T19 layers warning 59 · T20 doubled font prefix 61 | parallel worktrees | [ ] |
| [4](batch-4/overview.md) | T22 constrained majorization (43) · T23 missing images 60 · T24 colorscheme transparent 63 · T25 HTML gradient parseSegs 64 | parallel worktrees | [ ] |
| [5](batch-5/overview.md) | T26 `mode=hier` wiring (43) · T27 shared HTML line builder 67 | parallel worktrees | [ ] |
| [6](batch-6/overview.md) | T28 241_0 sfdp drift (53) | single, open write-set | [ ] |
| [7](batch-7/overview.md) | T29 final verification, walk refresh (70, 71), re-sign stop | orchestrator | [ ] |

## Documents

- [decisions.md](decisions.md): AD-1 to AD-14 (locked)
- [decision-journal.md](decision-journal.md): append-only execution log
- [diagrams/component-map.md](diagrams/component-map.md), [diagrams/data-flow.md](diagrams/data-flow.md)
- Global journal: each task's row also goes to `plans/decision-journal.md`; T29 adds a
  mission-summary row.

## Conventions

- Diagnosis mode (`~/.claude/rules/diagnosis.md`) for every discrepancy; each fix's journal
  row carries mechanism / origin / causal chain / ruled out.
- Every ported symbol keeps `/** @see lib/...:fn */`. Tests first (TDD).
- Parallel tasks develop in separate git worktrees; the orchestrator lands them one at a
  time (cherry-pick, gates, journal row, commit). Journal and README updates land as one
  `docs(mission)` commit per batch.
- Model routing: implementation `typescript-pro` (sonnet); diagnosis `debugger` (opus);
  T9 `documentation-engineer` (locale edits need Bash and Edit).
