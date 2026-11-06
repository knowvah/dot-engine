# Mission: post-16.1 follow-ups, part 11 (items 126–138)

## Objective

Close the follow-ups part 10 opened in
[`plans/post-16.1-followups/README.md`](../post-16.1-followups/README.md):

- two first renders that throw where native succeeds: `w4.gv` recursion, `w5.gv` `.ll` (128);
- `xdot` and `dot` wrap long strings at 128 columns as `write.c` does (127, 135);
- fdp `json` undoes its cluster-edge proxies as `attach_attrs` does (133);
- `conjgrad.ts` prints its error on one line (131);
- 2-D `mode=sgd` drift, traced to the first differing value (132);
- subgraph-then-root renders on fdp and osage, checked against address-free native (137);
- `nestedclust.gv` no-free renders 2 and 3 (129);
- the svg graph id on a subgraph render (136);
- a stale comment (126), a redundant helper (130), the divergences ledger (138), and 134, already
  fixed by PR #128.

Each item is fixed faithfully to the C (graphviz 16.1.0) or parked with a full diagnosis. No task is
`feat`, so the merged PR cuts a **patch release** (AD-7). Nothing is pushed or signed.
**Out of scope:** layouts that vary with the libm (PR 119), and any write in plantuml-ts (stop 12).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read this README, [decisions.md](decisions.md), [decision-journal.md](decision-journal.md), then the
   current batch's `overview.md`. Check finished tasks with `git log --oneline main..`.
3. Read `.agent-notes/post-16-1-followups-10.md` (native harness technique, heap-address fdp, `noaddr.patch`),
   `.agent-notes/plantuml-ts-issues-41-42.md` (lldb without debug info; merged-chain clip flags; `agerrLineOn`),
   `-9.md` (second renders, write-back) and `-3.md` (native harness technique).

## Branch and commits

- Branch `chore/post-16-1-followups-11` off `main` (`1e55cf7f`; PRs #125–#128 merged, v2.12.0).
- **First run only:** create the branch; add "Being closed by `plans/post-16-1-followups-11/`." after the
  part-10 header lines in the follow-ups README, and mark 134 DONE (PR #128); commit the brief and that README
  as `docs(mission): add post-16.1 follow-ups part 11 brief`.
- One commit per task. Subject `<type>(TN): <desc>`, ≤72 chars, lowercase, no period; lines ≤80; a body
  when more than 3 files change; no attribution of any kind.
- Types: `test(T0)`, `fix` per task file, `refactor(T10)`, `docs(T11)`, `chore(T12)`. No `feat` (AD-7).
- **Commit unsigned, locally only:** `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone
  (never chained with `&&`). Never push, open a PR, sign, rebase, or touch `main`.
- The journal cites task IDs, not SHAs. Only the orchestrator writes `decision-journal.md`,
  `plans/decision-journal.md`, `plans/post-16.1-followups/README.md` and `.agent-notes/`. Subagents
  report findings in their hand-back.

## Quality gates (every task, before its commit)

| Gate | Command | Pass | On fail |
|---|---|---|---|
| Types | `npm run typecheck` | exit 0 | fix, re-run |
| Unit | `npm test` | exit 0 | fix, re-run |
| Goldens | `bash test/golden/gates.sh` | 5/5 PASS | fix, re-run |
| Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 | fix, re-run |
| i18n (T11, T12) | `npm run docs:i18n-status` | 0 stale × 23 | set each locale `sourceHash` |
| ipsep probes | `npx vitest run src/layout/neato/ipsep-probes.test.ts` | 22/22 (stop 7) | diagnose |
| Model probes | `npx vitest run src/layout/neato/models-probes.test.ts` | 49/49 (stop 7) | diagnose |
| Libm sensitivity (new layout fixtures) | `npx vitest run --config plans/post-16-1-followups-9/harness/armpow/vitest.config.mjs <files>` | passes | replay macOS `pow` in the test, as `kk-large` does |
| Byte-identity (`src/` tasks) | `npx tsx test/tools/bytediff.ts <prev>.mjs <this>.mjs $BASE/smoke-ids.txt <out>.json`, one process per job; compare bundle hashes first | identical, or within stop 8's exceptions | diagnose (stop 8) |
| Coverage (T12) | `npm run coverage` | thresholds met | add tests |
| Survey (T12) | `rm -f test/corpus/parity-mission-probe.json && GVBINDIR=/tmp/ghl PARITY_OUT=parity-mission-probe.json npx tsx test/corpus/survey.ts && npx tsx test/corpus/rules-gate.ts test/corpus/parity-mission-probe.json test/corpus/parity.json` | `GATE PASS`, 0 regressions, `counts.oracle-error` == 14 | revert, STOP |
| Full bytediff (T12) | T0 bundle vs head, `--all`, 8 engines × 5 formats; the 21 quarantined ids separately | identical, or within stop 8's exceptions | diagnose (stop 8) |
| neato sgd re-walk (T6, only if it changes `src/`) | `npx tsx test/corpus/engine-walk.ts neato test/corpus/parity-neato.jsonl` for the `mode=sgd` ids, then `npx tsx test/corpus/parity-report.ts` | no id further from native | revert the fix, park |

- `$BASE` is the executing session's `<scratchpad>/followups11-baseline`. The survey takes about 3 h (`world.gv`
  alone about 2.5 h) and the full bytediff about 7 h. Run them under `caffeinate`, in a worktree of the commit
  under test (`ln -s <repo>/node_modules node_modules`, `npm run parser:regen`), with no other heavy jobs.
  Record the load. Never edit `src/` while a survey reads it.
- Oracle: `~/git/graphviz/build/cmd/dot/dot` (16.1.0). dot uses `GVBINDIR=/tmp/ghl`; other engines use
  `/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/dfc80e32-d4b2-43d1-a20b-4d2c1be89946/scratchpad/ghl16-all`.
  A `/tmp` clean deletes `config8`: `GVBINDIR=<dir> dot -c`.
- Land parallel tasks one at a time: cherry-pick, gates, bytediff, journal row. Never cherry-pick while
  gates read `src/`.

## Stop conditions

1. A task needs to write a file outside its write-set (T12's is open). This includes a T6–T9 diagnosis that
   points outside its planned files.
2. The same gate check fails twice in a row after fix attempts: keep diagnosing until the mechanism can be
   stated, then log the artifact.
3. The same code location or approach fails the same check three times in a row.
4. A change would contradict AD-1 to AD-7, or evidence shows one is wrong.
5. A survey regression that is not a move toward the oracle, or `counts.oracle-error` ≠ 14.
6. The oracle fails preflight, or `dot -V` is not 16.1.0.
7. Any of the 22 ipsep or 49 model probes moves.
8. Any first render changes, stderr included. **Exceptions (user decision, 2026-11-06):** T1 and T2's inputs
   now render; T3's long-string wrap lines in `xdot` and `dot`, byte-equal to native; T4's fdp `json` on
   graphs with an edge to a cluster, equal to native; T5's conjgrad message without the blank line; T6's
   neato `mode=sgd` ids, only if the re-walk shows every moved id closer to native; T9's svg id on a
   subgraph render. No other change is allowed.
9. A fix would optimize, reorder or simplify C behaviour; need `any` or a Node-only API in `src/`; or need
   a new public API field.
10. Anything would push, open a PR, publish, sign, rebase, or touch `main`.
11. A file the complexity hook blocks cannot stay within its limit inside the write-set.
12. Anything would write in `~/git/knowvah/plantuml-ts`. Reading it from outside is fine.
13. **Planned stop:** T12 is done. Hand the user the re-sign command and the release note.

## Push forward (decide alone; record each decision in the journal)

- **Park** T6 at 3 h and T8 at 2 h, and any other task that misses after a fair attempt: journal the
  artifact, open a follow-up from 139 on. The other items continue.
- **Native nondeterminism:** compare against ≥8 native runs, and against T7's `noaddr.patch` build where
  heap order is suspected; a fixture refresh is a journaled decision with the per-run evidence.
- **Libm-sensitive probe:** replay macOS's values in the test (`kk-large` is the pattern). Never change
  runtime code for this (PR 119). A T6 trace that ends in libm closes 132 under PR 119.
- **Warnings:** add native-matching warnings to golden "logs nothing" allow-lists.
- **Temporary instrumentation** (incl. native harnesses): gate on an env var, remove before the commit;
  archive harness sources under `harness/`. Never edit `~/git/graphviz`: rsync it to scratch and build there.
- **Pre-existing fixes of 1–3 lines** in files already being edited; larger → follow-up.
- **New discoveries** not needed for this scope: a follow-up from 139 on.
- **Missing scratchpad:** T0 rebuilds `$BASE` and the plugin dirs.
- **Wording:** test names, journal rows, README status lines, `.agent-notes/` entries.

## Batches

| Batch | Tasks | Mode | Done |
|---|---|---|---|
| [1](batch-1/overview.md) | T0 baselines, native fixtures | orchestrator | [x] |
| [2](batch-2/overview.md) | T1 w4 recursion · T2 w5 `.ll` (128) · T3 xdot wrap (127, 135) · T4 fdp json (133) · T5 conjgrad (131) | parallel worktrees | [ ] |
| [3](batch-3/overview.md) | T6 sgd drift (132) · T7 native variance (137) · T8 nestedclust (129) · T9 svg subgraph id (136) | parallel worktrees, after batch 2 | [ ] |
| [4](batch-4/overview.md) | T10 comment and helper (126, 130) · T11 ledger and docs (138) | parallel | [ ] |
| [5](batch-5/overview.md) | T12 final verification, close-out, re-sign stop | orchestrator | [ ] |

## Documents

- [decisions.md](decisions.md): AD-1 to AD-7 (locked) plus the carried decisions.
- [agent-common.md](agent-common.md): rules every task agent reads first.
- [decision-journal.md](decision-journal.md): append-only execution log.
- Diagrams: [diagrams/component-map.md](diagrams/component-map.md), [diagrams/data-flow.md](diagrams/data-flow.md).
- Global journal: each task's row also goes to `plans/decision-journal.md`; T12 adds a mission-summary row.

## Conventions

- Diagnosis mode (`~/.claude/rules/diagnosis.md`) for every discrepancy; each fix's journal row records
  mechanism, origin, causal chain and what was ruled out.
- Every ported symbol keeps `/** @see lib/...:fn */`. Tests come first (TDD); the T0 native fixtures and
  harness dumps are the specification.
- Parallel tasks run in separate git worktrees off the latest landed head; agents get
  [agent-common.md](agent-common.md) plus their task file, a worktree path and a scratch dir. Journal and
  README updates land as one `docs(mission)` commit per batch.
- Model routing: T1, T2, T6, T7, T8 `debugger` (opus: crash and drift diagnosis, native harnesses);
  T3, T4, T5, T9, T10 `typescript-pro` (sonnet); T11 `documentation-engineer`.
