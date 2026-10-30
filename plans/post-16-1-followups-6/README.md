# Mission: post-16.1 follow-ups, part 6 (items 90–94)

## Objective

Close the five follow-ups part 5 opened in
[`plans/post-16.1-followups/README.md`](../post-16.1-followups/README.md): missing-image
warnings printed once per layout (90), node `image=` drawn in svg and xdot through one
port of `gvrender_usershape` (91), the empty colour name in node/cluster fills (92), the
image docs (93), and the ipsep right-multiply read from the disassembly (94). Each item is
fixed faithfully to the C (graphviz 16.1.0) or parked with a full diagnosis (part-5 AD-3).
Nothing is pushed or signed (AD-1).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read this README, [decisions.md](decisions.md), [decision-journal.md](decision-journal.md),
   then the current batch's `overview.md`. Check finished tasks with `git log --oneline main..`.
3. Read `.agent-notes/post-16-1-followups-5.md` (walk summaries only at the end, xdot
   timeouts under load, cola shares the kD CG, `fmaf` cost) and
   `.agent-notes/post-16-1-followups-3.md` (LTO: disassemble linked dylibs only, lldb).

## Branch and commits

- Branch `chore/post-16-1-followups-6` off `main` (`10665972`, PR #114 merged).
- **First run only:** create the branch, add "Being closed by `plans/post-16-1-followups-6/`"
  after the part-5 line in the follow-ups README header, and commit the brief and that
  README as `docs(mission): add post-16.1 follow-ups part 6 brief`.
- One commit per task. Subject `<type>(TN): <desc>`, ≤72 chars, lowercase, no period;
  lines ≤80; body when >3 files change; no attribution of any kind.
- **Commit unsigned, locally only (AD-1):** `git -c commit.gpgsign=false commit -F <msgfile>`,
  run standalone (never chained with `&&`; the auto-mode classifier denies chained commits).
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
| i18n (T5) | `npm run docs:i18n-status` | 0 stale | `npm run docs:i18n-hashes` |
| Byte-identity (`src/` tasks) | `npx tsx test/tools/bytediff.ts` (T0 usage): previous head's bundle vs this task's, one process per job, engines × {svg, xdot, json, plain, cmapx} + console | identical, or every change explained; capped jobs listed apart | diagnose |
| Stderr parity (T1, T2) | `npx tsx test/tools/probe.ts <bundle> <engine> <case>` vs native | lines equal native's (`<stdin>: ` normalized) | diagnose |
| Survey (T6 always) | `rm -f test/corpus/parity-mission-probe.json && GVBINDIR=/tmp/ghl PARITY_OUT=parity-mission-probe.json npx tsx test/corpus/survey.ts && npx tsx test/corpus/rules-gate.ts test/corpus/parity-mission-probe.json test/corpus/parity.json` | `GATE PASS`, 0 regressions, `counts.oracle-error` == 14 | revert, STOP |
| Engine walk (T6, AD-7) | `GVBINDIR=<full plugin dir> npx tsx test/corpus/engine-walk.ts <engine> <scratch>.jsonl`, compared by id with the committed `parity-<engine>.jsonl` | no pass→worse (`oracle-nondeterministic` neutral) | revert, STOP |

- The survey takes about 3 hours. Never edit `src/` while a survey or walk reads it: run it
  in a worktree of the commit under test (`ln -s <repo>/node_modules node_modules`,
  `npm run parser:regen`).
- Oracle: `~/git/graphviz/build/cmd/dot/dot` (16.1.0). `GVBINDIR=/tmp/ghl` for dot; other
  engines use the full plugin dir
  `/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/dfc80e32-d4b2-43d1-a20b-4d2c1be89946/scratchpad/ghl16-all`
  (walk caches are keyed on that path). A `/tmp` clean deletes `config8`: fix with
  `GVBINDIR=<dir> dot -c`; rebuild a missing dir per `.agent-notes/post-16-1-followups-5.md`.
- No speed gate: no speed id reaches a changed kernel (T3 touches ipsep only).

## Stop conditions

1. A task needs to write a file outside its write-set (T6's is open).
2. The same gate check fails twice in a row after fix attempts. Stop editing; keep
   investigating until the cause can be named, then log the diagnosis artifact.
3. The same code location or approach fails the same check three times in a row.
4. A change would contradict AD-1 to AD-7 or a carried part-5 decision, or evidence shows
   one is wrong.
5. A survey or walk verdict regression not explainable as a move toward the oracle.
6. The oracle fails preflight, `dot -V` is not 16.1.0, or `counts.oracle-error` ≠ 14.
7. A native probe contradicts a decision (for example item 92's xdot/json form differs
   from its svg form in a way AD-5 does not cover).
8. T2 or T4 changes any corpus output (neither can reach the corpus: no corpus input
   supplies a sizer or an empty colour name).
9. T3's verdict needs a kernel shape other than fused, a cola variant, or unfused (AD-6).
10. A fix would optimize, reorder or simplify C behaviour, or needs `any` or a Node-only
    API in `src/`.
11. Anything would push, open a PR, publish, sign, rebase, or touch `main`.
12. **Planned stop:** T6 is done. Hand the user the re-sign command.

## Push forward (decide alone; record each decision in the journal)

- Park T3 after its ~2 h budget with the full artifact (part-5 AD-3), then continue.
- Commit type by whether output changed (`fix` / `refactor` / `docs`); no `feat` here.
- Add native-matching warnings to golden "logs nothing" allow-lists; warnings go to
  `console.warn` (part-5 AD-13).
- Temporary instrumentation gated by an environment variable, removed before the commit.
- 1–3-line pre-existing fixes in files already being edited (for example the stale "The
  port never sizes node images" comment in `poly-init.ts`); anything larger becomes a new
  follow-up (item 95 onward).
- T0 rebuilds `$BASE` references and plugin dirs if an earlier session's scratchpad is gone.
- Wording of test names, journal rows, README status lines and `.agent-notes/` entries.

## Batches

| Batch | Tasks | Mode | Done |
|---|---|---|---|
| [1](batch-1/overview.md) | T0 baselines, native references | orchestrator | [x] |
| [2](batch-2/overview.md) | T1 warnings at layout 90 · T2 empty fill name 92 · T3 cola right-multiply 94 | parallel worktrees | [x] (T3 parked) |
| [3](batch-3/overview.md) | T4 `gvrender_usershape`, node draw, xdot `I` 91 | worktree | [x] |
| [4](batch-4/overview.md) | T5 image docs 93 · T6 final verification, close-out, re-sign stop | T5 agent, then orchestrator | [x] |

## Documents

- [decisions.md](decisions.md): AD-1 to AD-7 (locked) and the carried part-5 decisions
- [decision-journal.md](decision-journal.md): append-only execution log
- [diagrams/component-map.md](diagrams/component-map.md), [diagrams/data-flow.md](diagrams/data-flow.md)
- Global journal: each task's row also goes to `plans/decision-journal.md`; T6 adds a
  mission-summary row.

## Conventions

- Diagnosis mode (`~/.claude/rules/diagnosis.md`) for every discrepancy; each fix's journal
  row carries mechanism / origin / causal chain / ruled out.
- Every ported symbol keeps `/** @see lib/...:fn */`. Tests first (TDD).
- Parallel tasks develop in separate git worktrees; the orchestrator lands them one at a
  time (cherry-pick, gates, journal row, commit). Journal and README updates land as one
  `docs(mission)` commit per batch.
- Model routing: implementation `typescript-pro` (sonnet); T3 `debugger` (opus); T5
  `documentation-engineer` (locale edits need Bash and Edit).
