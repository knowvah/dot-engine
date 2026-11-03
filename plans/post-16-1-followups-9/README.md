# Mission: post-16.1 follow-ups, part 9 (items 109–113, circo root, plantuml-ts 36 and 37)

## Objective

Close the five follow-ups part 8 opened in
[`plans/post-16.1-followups/README.md`](../post-16.1-followups/README.md), plus one crash
found while planning:

- `toDistType` saturates as native arm64 does (109);
- `compareEvents` tie order under libc++ `std::sort`, and the `dir1 n40` cause (110);
- neato components see the root's attributes: `maxiter`, `epsilon`, `stresswt` (111);
- `ccomps` names, and sfdp's missing `start` warning (112);
- remove `getGlobalImageSizer` (113);
- circo's `root` lookup: a graph-level `root` throws on a disconnected graph, and node-level
  `root=true` is unported;
- plantuml-ts tracker issue 37: a second layout on one `Graph` reads stale records (T11), and
  issue 36: fixed already, pin it (T12). Both added by AD-11 during execution.

Each item is fixed faithfully to the C (graphviz 16.1.0) or parked with a full diagnosis.
All commits are `fix`-class, so the merged PR cuts a patch release (AD-9). Nothing is pushed
or signed. **Out of scope (user decision, PR 119):** layouts that vary with the libm.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read this README, [decisions.md](decisions.md), [decision-journal.md](decision-journal.md),
   then the current batch's `overview.md`. Check finished tasks with `git log --oneline main..`.
3. Read `.agent-notes/post-16-1-followups-8.md` (fusion; `pccomps` names; `Math.pow` is the
   platform libm) and `-7.md` (ipsep nondeterminism; `registerRenderState`; tooling). Also
   `-6.md` (context API for stderr; job plumbing), `-5.md` (locale `sourceHash`; Gate-4
   ratchet) and `-3.md` (native harness technique).

## Branch and commits

- Branch `chore/post-16-1-followups-9` off `main` (`cc1fbf07`; PRs #119 and #120 merged).
- **First run only:** create the branch; add "Being closed by `plans/post-16-1-followups-9/`."
  after the part-8 header lines in the follow-ups README; commit the brief and that README
  as `docs(mission): add post-16.1 follow-ups part 9 brief`.
- One commit per task. Subject `<type>(TN): <desc>`, ≤72 chars, lowercase, no period;
  lines ≤80; a body when more than 3 files change; no attribution of any kind.
- Types: `test(T0)`, `test(T12)`; `fix` or `refactor` for code tasks; `docs(T9)`; `chore(T10)`. No `feat`.
- **Commit unsigned, locally only:** `git -c commit.gpgsign=false commit -F <msgfile>`, run
  standalone (never chained with `&&`). Never push, open a PR, sign, rebase, or touch `main`.
- The journal cites task IDs, not SHAs. Only the orchestrator writes `decision-journal.md`,
  `plans/decision-journal.md`, `plans/post-16.1-followups/README.md` and `.agent-notes/`.
  Subagents report findings in their hand-back.

## Quality gates (every task, before its commit)

| Gate | Command | Pass | On fail |
|---|---|---|---|
| Types | `npm run typecheck` | exit 0 | fix, re-run |
| Unit | `npm test` | exit 0 | fix, re-run |
| Goldens | `bash test/golden/gates.sh` | 5/5 PASS | fix, re-run |
| Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 | fix, re-run |
| i18n (T9, T10) | `npm run docs:i18n-status` | 0 stale × 23 | set each locale `sourceHash` |
| ipsep probes | `npx vitest run src/layout/neato/ipsep-probes.test.ts` | 22/22 (stop 7) | diagnose |
| Model probes | `npx vitest run src/layout/neato/models-probes.test.ts` | 49/49 (stop 7) | diagnose |
| Libm sensitivity (new layout fixtures) | `npx vitest run --config plans/post-16-1-followups-9/harness/armpow/vitest.config.mjs <files>` | passes | replay macOS `pow` in the test, as `kk-large` does |
| Byte-identity (`src/` tasks) | `npx tsx test/tools/bytediff.ts <prev>.mjs <this>.mjs $BASE/smoke-ids.txt <out>.json`, one process per job; compare bundle hashes first (identical bundle ⇒ identical) | identical, or every change native-verified; caps listed | diagnose (stop 8) |
| Coverage (T10) | `npm run coverage` | thresholds met (this is what CI runs) | add tests |
| Survey (T10) | `rm -f test/corpus/parity-mission-probe.json && GVBINDIR=/tmp/ghl PARITY_OUT=parity-mission-probe.json npx tsx test/corpus/survey.ts && npx tsx test/corpus/rules-gate.ts test/corpus/parity-mission-probe.json test/corpus/parity.json` | `GATE PASS`, 0 regressions, `counts.oracle-error` == 14 | revert, STOP |
| Full bytediff (T10) | T0 bundle vs head, `--all`, 8 engines × 5 formats; the 21 quarantined ids separately | output identical; every change native-verified | diagnose (stop 8) |

- The survey takes about 3 h and the full bytediff about 7 h. Run them under `caffeinate`, in
  a worktree of the commit under test (`ln -s <repo>/node_modules node_modules`,
  `npm run parser:regen`), with no other heavy jobs. Record the load: part 8 could not
  confirm it ran alone. Never edit `src/` while a survey reads it.
- Oracle: `~/git/graphviz/build/cmd/dot/dot` (16.1.0). dot uses `GVBINDIR=/tmp/ghl`; other
  engines use `/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/dfc80e32-d4b2-43d1-a20b-4d2c1be89946/scratchpad/ghl16-all`.
  A `/tmp` clean deletes `config8`: `GVBINDIR=<dir> dot -c`.
- Land parallel tasks one at a time: cherry-pick, gates, bytediff, journal row. Never
  cherry-pick while gates read `src/`.

## Stop conditions

1. A task needs to write a file outside its write-set (T10's is open).
2. The same gate check fails twice in a row after fix attempts: keep diagnosing until the
   mechanism can be stated, then log the artifact.
3. The same code location or approach fails the same check three times in a row.
4. A change would contradict AD-1 to AD-11, or evidence shows one is wrong.
5. A survey regression that is not a move toward the oracle, or `counts.oracle-error` ≠ 14.
6. The oracle fails preflight, or `dot -V` is not 16.1.0.
7. Any of the 22 ipsep or 49 model probes moves. T7 may move ipsep only if the new result
   matches native.
8. A corpus output changes, stderr included, and a fresh native run does not reproduce it.
9. dot output changes from T2 or T6 (AD-1 keeps dot untouched).
10. T3 moves an sfdp layout, or T1 moves any output.
11. A fix would optimize, reorder or simplify C behaviour; need `any` or a Node-only API in
    `src/`; or need a new public API field.
12. Anything would push, open a PR, publish, sign, rebase, or touch `main`.
13. A file the complexity hook blocks cannot stay within its limit inside the write-set.
14. **Planned stop:** T10 is done. Hand the user the re-sign command and the release note.
15. T11 changes the output of any first render (AD-11 touches only later layouts).

## Push forward (decide alone; record each decision in the journal)

- **Park** T7, T8 or T11's `xdot` half if it misses after its ~2 h budget: journal the
  artifact, open a follow-up. The other items continue.
- **Native nondeterminism:** compare against ≥8 native runs; a fixture refresh is a journaled
  decision with the per-run evidence.
- **Libm-sensitive probe:** replay macOS's values in the test (`kk-large` is the pattern).
  Never change runtime code for this (PR 119).
- **`std::sort` details:** match the toolchain the oracle was built with; the native harness
  decides, not the header alone.
- **Warnings:** add native-matching warnings to golden "logs nothing" allow-lists.
- **Temporary instrumentation** (incl. native harnesses): gate on an env var, remove before
  the commit; archive harness sources under `harness/`. Never edit `~/git/graphviz`.
- **Pre-existing fixes of 1–3 lines** in files already being edited; larger → follow-up.
- **New discoveries** not needed for this scope: a follow-up from 116 on (`dim=3` is 114, the user `_cc_N` subgraph 115).
- **Missing scratchpad:** T0 rebuilds `$BASE` and the plugin dirs.
- **Wording:** test names, journal rows, README status lines, `.agent-notes/` entries.

## Batches

| Batch | Tasks | Mode | Done |
|---|---|---|---|
| [1](batch-1/overview.md) | T0 baselines, native fixtures | orchestrator | [x] |
| [2](batch-2/overview.md) | T1 `toDistType` (109) · T2 component attrs (111) · T3 sfdp warning (112) · T4 circo root · T5 sizer (113) | parallel worktrees | [x] |
| [3](batch-3/overview.md) | T6 `ccomps` names (112) · T7 `compareEvents` ties (110) | parallel worktrees | [x] |
| [4](batch-4/overview.md) | T8 `dir1 n40` (110) · T11 re-render (37) · T12 pin 36, then T9 docs | parallel worktrees | [ ] |
| [5](batch-5/overview.md) | T10 final verification, close-out, re-sign stop | orchestrator | [ ] |

## Documents

- [decisions.md](decisions.md): AD-1 to AD-11 (locked) plus the carried decisions.
- [agent-common.md](agent-common.md): rules every task agent reads first.
- [decision-journal.md](decision-journal.md): append-only execution log.
- Diagrams: [diagrams/component-map.md](diagrams/component-map.md), [diagrams/data-flow.md](diagrams/data-flow.md).
- Global journal: each task's row also goes to `plans/decision-journal.md`; T10 adds a
  mission-summary row there.

## Conventions

- Diagnosis mode (`~/.claude/rules/diagnosis.md`) for every discrepancy; each fix's journal
  row records mechanism, origin, causal chain and what was ruled out.
- Every ported symbol keeps `/** @see lib/...:fn */`. Tests come first (TDD); the T0 native
  fixtures and harness dumps are the specification.
- Parallel tasks run in separate git worktrees off the latest landed head; agents get
  [agent-common.md](agent-common.md) plus their task file, a worktree path and a scratch dir.
  Journal and README updates land as one `docs(mission)` commit per batch.
- Model routing: T1–T6 `typescript-pro` (sonnet); T7, T8, T11 `typescript-pro` (opus: native
  harnesses, the sort port, the re-render diagnosis); T9 `documentation-engineer`.
