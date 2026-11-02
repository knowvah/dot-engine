# Mission: post-16.1 follow-ups, part 8 (items 103–108)

## Objective

Close the six follow-ups part 7 opened in
[`plans/post-16.1-followups/README.md`](../post-16.1-followups/README.md):

- `model=subset|circuit` on neato's major, KK and hier paths, plus the major path's
  missing MDS branch (103);
- the layout-time FT_NULL warning for unrecognized image bytes (104);
- `src/vpsc/SweepLine.ts` ordering and tie-break (105);
- a known-divergence ledger entry for VPSC's heap-address order (106);
- per-context hooks in `safefile` (107);
- `neatoModel`'s warnings (108).

Each item is fixed faithfully to the C (graphviz 16.1.0) or parked with a full diagnosis
(part-5 AD-3). Item 103 is a `feat`, so the merged PR cuts a minor release (AD-1).
Nothing is pushed or signed (part-5 AD-1).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read this README, [decisions.md](decisions.md), [decision-journal.md](decision-journal.md),
   then the current batch's `overview.md`. Check finished tasks with `git log --oneline main..`.
3. Read `.agent-notes/post-16-1-followups-7.md` (ipsep nondeterminism; process globals →
   `registerRenderState`; JS typed-array assignment rounding; the two MODEL_* numberings;
   loadimage targets; tooling). Also `-6.md` (context API for stderr; job plumbing),
   `-5.md` (locale `sourceHash`; Gate-4 ratchet) and `-3.md` (native harness technique).

## Branch and commits

- Branch `chore/post-16-1-followups-8` off `main` (`cf571186`; PRs #117 and #118 merged).
- **First run only:** create the branch; add "Being closed by `plans/post-16-1-followups-8/`."
  after the part-7 header lines in the follow-ups README; commit the brief and that README
  as `docs(mission): add post-16.1 follow-ups part 8 brief`.
- One commit per task. Subject `<type>(TN): <desc>`, ≤72 chars, lowercase, no period;
  lines ≤80; a body when more than 3 files change; no attribution of any kind.
- Types: `test(T0)`; `feat` for T6 and T7 (AD-1); otherwise `fix`, `refactor` or `docs`.
- **Commit unsigned, locally only (part-5 AD-1):** `git -c commit.gpgsign=false commit -F <msgfile>`,
  run standalone (never chained with `&&`). Never push, open a PR, sign, rebase, or touch
  `main`.
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
| i18n (T8, T9) | `npm run docs:i18n-status` | 0 stale × 23 | set each locale `sourceHash` |
| ipsep probes | `npx vitest run src/layout/neato/ipsep-probes.test.ts` | 22/22 (stop 7) | diagnose |
| Model probes (T6, T7) | `npx vitest run src/layout/neato/models-probes.test.ts` | the task's cases pass | diagnose / park |
| Byte-identity (`src/` tasks) | `npx tsx test/tools/bytediff.ts <prev>.mjs <this>.mjs <ids> <out>.json`, one process per job; compare bundle hashes first (identical bundle ⇒ identical) | identical, or every change native-verified; caps listed | diagnose (stop 8) |
| Survey (T9) | `rm -f test/corpus/parity-mission-probe.json && GVBINDIR=/tmp/ghl PARITY_OUT=parity-mission-probe.json npx tsx test/corpus/survey.ts && npx tsx test/corpus/rules-gate.ts test/corpus/parity-mission-probe.json test/corpus/parity.json` | `GATE PASS`, 0 regressions, `counts.oracle-error` == 14 | revert, STOP |
| Full bytediff (T9) | T0 bundle vs head, `--all`, 8 engines × 5 formats | output identical; every stderr change native-verified | diagnose (stop 8) |

- The survey takes about 3 h; run it in a worktree of the commit under test
  (`ln -s <repo>/node_modules node_modules`, `npm run parser:regen`), alone on the machine.
  Never edit `src/` while a survey reads it.
- Oracle: `~/git/graphviz/build/cmd/dot/dot` (16.1.0). dot uses `GVBINDIR=/tmp/ghl`; other
  engines use `/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/dfc80e32-d4b2-43d1-a20b-4d2c1be89946/scratchpad/ghl16-all`.
  A `/tmp` clean deletes `config8`: `GVBINDIR=<dir> dot -c`.
- Land parallel tasks one at a time: cherry-pick, gates, bytediff, journal row. Never
  cherry-pick while gates read `src/`.

## Stop conditions

1. A task needs to write a file outside its write-set (T9's is open).
2. The same gate check fails twice in a row after fix attempts: keep diagnosing until the
   mechanism can be stated, then log the artifact.
3. The same code location or approach fails the same check three times in a row.
4. A change would contradict AD-1 to AD-10 or a carried decision, or evidence shows one is wrong.
5. A survey or walk regression that is not a move toward the oracle.
6. The oracle fails preflight, `dot -V` is not 16.1.0, or `counts.oracle-error` ≠ 14.
7. Any of the 22 ipsep probes (7 unconstrained byte-identical) moves.
8. A corpus output changes (stderr included): any change from T1, T2, T3, T5, T6 or T7;
   from T4 one a fresh oracle run does not reproduce.
9. A native probe contradicts a decision in a way the AD does not cover.
10. A change to `stress-kernel.ts` or the fused CG beyond what a task names (part-5 AD-4).
11. A fix would optimize, reorder or simplify C behaviour; need `any` or a Node-only API in
    `src/`; or need a new public API field.
12. Anything would push, open a PR, publish, sign, rebase, or touch `main`.
13. A file the complexity hook blocks cannot stay within its limit inside the write-set
    (`init.ts` is at 496 lines; files already over 500 may not grow).
14. **Planned stop:** T9 is done. Hand the user the re-sign command and the release note.

## Push forward (decide alone; record each decision in the journal)

- **Park** a probe that misses 0.01 after its ~2 h budget: journal the artifact, open a
  follow-up (109 onward). The other items continue.
- **Native nondeterminism:** compare against ≥8 native runs; a fixture refresh is a
  journaled decision with the per-run evidence.
- **C process state:** mirror it in a `registerRenderState` container rather than widening
  a write-set to thread a parameter (part-7 precedent).
- **Warnings:** add native-matching warnings to golden "logs nothing" allow-lists.
- **Temporary instrumentation** (incl. native harnesses): gate on an env var, remove before
  the commit; archive harness sources under `harness/`.
- **Pre-existing fixes of 1–3 lines** in files already being edited; larger → follow-up.
- **Test inputs outside a write-set** that a locked AD forces to change: accept, journal.
- **Missing scratchpad:** T0 rebuilds `$BASE` and plugin dirs.
- **Wording:** test names, journal rows, README status lines, `.agent-notes/` entries.

## Batches

| Batch | Tasks | Mode | Done |
|---|---|---|---|
| [1](batch-1/overview.md) | T0 baselines, native fixtures | orchestrator | [ ] |
| [2](batch-2/overview.md) | T1 neatoModel (108) · T2 KK primitives (103a) · T3 SweepLine (105) · T4 FT_NULL (104) · T5 safefile hooks (107) | parallel worktrees | [ ] |
| [3](batch-3/overview.md) | T6 major + hier models (103b) · T8 docs (103/106/108) | parallel | [ ] |
| [4](batch-4/overview.md) | T7 KK models (103c) | single | [ ] |
| [5](batch-5/overview.md) | T9 final verification, close-out, re-sign stop | orchestrator | [ ] |

## Documents

- [decisions.md](decisions.md): AD-1 to AD-10 (locked) plus the carried decisions.
- [decision-journal.md](decision-journal.md): append-only execution log.
- Diagrams: [diagrams/component-map.md](diagrams/component-map.md), [diagrams/data-flow.md](diagrams/data-flow.md).
- Global journal: each task's row also goes to `plans/decision-journal.md`; T9 adds a
  mission-summary row there.

## Conventions

- Diagnosis mode (`~/.claude/rules/diagnosis.md`) for every discrepancy; each fix's journal
  row records mechanism, origin, causal chain and what was ruled out.
- Every ported symbol keeps `/** @see lib/...:fn */`. Tests come first (TDD); the T0 native
  fixtures and harness dumps are the specification.
- Parallel tasks run in separate git worktrees off the latest landed head; agents get the
  common rules file [agent-common.md](agent-common.md) plus their task file, a worktree
  path and a scratch dir. Journal and README updates land as one `docs(mission)` commit per batch.
- Model routing: T1, T4, T5 `typescript-pro` (sonnet); T2, T3, T6, T7 `typescript-pro`
  (opus: numeric ports and VPSC ordering); T8 `documentation-engineer`.
