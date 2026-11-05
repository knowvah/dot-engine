# Mission: post-16.1 follow-ups, part 10 (items 114–124)

## Objective

Close the eleven follow-ups part 9 opened in
[`plans/post-16.1-followups/README.md`](../post-16.1-followups/README.md):

- `dim` and `dimen`: neato and sfdp lay out and print in up to `MAXDIM` dimensions (114);
- `ccomps` reuses a user's `_cc_N` subgraph (115);
- later layouts on one `Graph`: `dotInitNode`'s list guard (116), second renders on `graphs-fdp` and
  `1581` (117), `abomShift` (118), the fitter fallback and aux-edge weights (119), no-free arrows on
  the flat aux route (120), the reset's edge cases (123);
- sfdp's solver drift: trace it to the first differing value, and fix it if the origin is not libm (121);
- a golden input carrying a graph `_draw_` and `_background` (122);
- why native's `graphs-b56` second `plain` render varies per process (124).

Each item is fixed faithfully to the C (graphviz 16.1.0) or parked with a full diagnosis. T1, T6, T7,
T8 and T13 are `feat`, so the merged PR cuts a **minor release** (AD-12). Nothing is pushed or signed.
**Out of scope:** layouts that vary with the libm (PR 119), and any write in plantuml-ts (stop 13).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read this README, [decisions.md](decisions.md), [decision-journal.md](decision-journal.md), then the
   current batch's `overview.md`. Check finished tasks with `git log --oneline main..`.
3. Read `.agent-notes/post-16-1-followups-9.md` (second renders, write-back, native repeatability),
   `-8.md` (fusion; `Math.pow` is the platform libm), `-7.md` (ipsep nondeterminism; tooling), `-6.md`
   (context API for stderr; job plumbing), `-5.md` (locale `sourceHash`; Gate-4 ratchet) and `-3.md`
   (native harness technique).

## Branch and commits

- Branch `chore/post-16-1-followups-10` off `main` (`bf0c19ae`; PRs #122, #123 and #124 merged).
- **First run only:** create the branch; add "Being closed by `plans/post-16-1-followups-10/`." after the
  part-9 header lines in the follow-ups README; commit the brief and that README as
  `docs(mission): add post-16.1 follow-ups part 10 brief`.
- One commit per task. Subject `<type>(TN): <desc>`, ≤72 chars, lowercase, no period; lines ≤80; a body
  when more than 3 files change; no attribution of any kind.
- Types: `test(T0)`, `fix` or `feat` per task file, `docs(T5)`, `docs(T16)`, `chore(T17)`.
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
| i18n (T16, T17) | `npm run docs:i18n-status` | 0 stale × 23 | set each locale `sourceHash` |
| ipsep probes | `npx vitest run src/layout/neato/ipsep-probes.test.ts` | 22/22 (stop 7) | diagnose |
| Model probes | `npx vitest run src/layout/neato/models-probes.test.ts` | 49/49 (stop 7) | diagnose |
| Libm sensitivity (new layout fixtures) | `npx vitest run --config plans/post-16-1-followups-9/harness/armpow/vitest.config.mjs <files>` | passes | replay macOS `pow` in the test, as `kk-large` does |
| Byte-identity (`src/` tasks) | `npx tsx test/tools/bytediff.ts <prev>.mjs <this>.mjs $BASE/smoke-ids.txt <out>.json`, one process per job; compare bundle hashes first (identical bundle ⇒ identical) | identical, or the exception in stop 8 | diagnose (stop 8) |
| Coverage (T17) | `npm run coverage` | thresholds met (this is what CI runs) | add tests |
| Survey (T17) | `rm -f test/corpus/parity-mission-probe.json && GVBINDIR=/tmp/ghl PARITY_OUT=parity-mission-probe.json npx tsx test/corpus/survey.ts && npx tsx test/corpus/rules-gate.ts test/corpus/parity-mission-probe.json test/corpus/parity.json` | `GATE PASS`, 0 regressions, `counts.oracle-error` == 14 | revert, STOP |
| Full bytediff (T17) | T0 bundle vs head, `--all`, 8 engines × 5 formats; the 21 quarantined ids separately | identical, or the exception in stop 8 | diagnose (stop 8) |
| sfdp re-walk (T2's landing, only if T2 changes `src/`) | `npx tsx test/corpus/engine-walk.ts sfdp test/corpus/parity-sfdp.jsonl`, then `npx tsx test/corpus/parity-report.ts`, then `npx tsx test/corpus/attribute-divergence.ts` for ids that moved | 0 ids further from native; the diverged count falls | revert the fix, park |

- The survey takes about 2–3 h and the full bytediff about 7 h. Run them under `caffeinate`, in a worktree
  of the commit under test (`ln -s <repo>/node_modules node_modules`, `npm run parser:regen`), with no other
  heavy jobs. Record the load. Never edit `src/` while a survey reads it.
- Oracle: `~/git/graphviz/build/cmd/dot/dot` (16.1.0). dot uses `GVBINDIR=/tmp/ghl`; other engines use
  `/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/dfc80e32-d4b2-43d1-a20b-4d2c1be89946/scratchpad/ghl16-all`.
  A `/tmp` clean deletes `config8`: `GVBINDIR=<dir> dot -c`.
- Land parallel tasks one at a time: cherry-pick, gates, bytediff, journal row. Never cherry-pick while
  gates read `src/`.

## Stop conditions

1. A task needs to write a file outside its write-set (T17's is open).
2. The same gate check fails twice in a row after fix attempts: keep diagnosing until the mechanism can be
   stated, then log the artifact.
3. The same code location or approach fails the same check three times in a row.
4. A change would contradict AD-1 to AD-12, or evidence shows one is wrong.
5. A survey regression that is not a move toward the oracle, or `counts.oracle-error` ≠ 14.
6. The oracle fails preflight, or `dot -V` is not 16.1.0.
7. Any of the 22 ipsep or 49 model probes moves.
8. Any first render changes, stderr included, on a graph with no `dim` above 2. **The one exception (user
   decision, 2026-11-04):** sfdp first renders may change through T2's fix, if and only if the sfdp re-walk
   shows every moved id closer to native. It applies to no other engine, and sfdp stderr must not change.
9. A fix would optimize, reorder or simplify C behaviour; need `any` or a Node-only API in `src/`; or need
   a new public API field.
10. Anything would push, open a PR, publish, sign, rebase, or touch `main`.
11. A file the complexity hook blocks cannot stay within its limit inside the write-set.
12. **Planned stop:** T17 is done. Hand the user the re-sign command and the release note.
13. Anything would write in `~/git/knowvah/plantuml-ts`. A queue driver runs on that checkout and any tracked
    change stops it. Reading it from outside is fine.

## Push forward (decide alone; record each decision in the journal)

- **Park** T2 at 3 h or T14 at 2 h, and any other task that misses after its budget: journal the artifact,
  open a follow-up. The other items continue. If T2 parks, T13 still runs against sfdp's ±0.5 bar.
- **Native nondeterminism:** compare against ≥8 native runs; a fixture refresh is a journaled decision with
  the per-run evidence.
- **Libm-sensitive probe:** replay macOS's values in the test (`kk-large` is the pattern). Never change
  runtime code for this (PR 119).
- **`dim` fixture misses by FMA or libm:** record it against AD-3; do not chase it.
- **Warnings:** add native-matching warnings to golden "logs nothing" allow-lists.
- **Temporary instrumentation** (incl. native harnesses): gate on an env var, remove before the commit;
  archive harness sources under `harness/`. Never edit `~/git/graphviz`: rsync it to scratch and build there.
- **Pre-existing fixes of 1–3 lines** in files already being edited; larger → follow-up.
- **New discoveries** not needed for this scope: a follow-up from 125 on.
- **Missing scratchpad:** T0 rebuilds `$BASE` and the plugin dirs.
- **Wording:** test names, journal rows, README status lines, `.agent-notes/` entries.

## Batches

| Batch | Tasks | Mode | Done |
|---|---|---|---|
| [1](batch-1/overview.md) | T0 baselines, native fixtures | orchestrator | [x] |
| [2](batch-2/overview.md) | T1 neato `dim` plumbing (114) · T2 sfdp drift (121) · T3 `_cc_N` (115) · T4 draw input (122) · T5 native variance (124) | parallel worktrees | [x] |
| [3a](batch-3a/overview.md) | T6 KK `dim` · T7 stress, hier, ipsep, sgd `dim` · T8 overlap `dim` · T13 sfdp `dim` (114) | parallel worktrees | [x] |
| [3b](batch-3b/overview.md) | T9 list guard (116), T10 `abomShift` (118), T11 fitter and weights (119), T12 flat arrows (120) | one agent, in order; parallel with 3a | [x] |
| [4](batch-4/overview.md) | T14 second renders (117), T15 reset edges (123), then T16 docs | one agent, then docs | [ ] |
| [5](batch-5/overview.md) | T17 final verification, close-out, re-sign stop | orchestrator | [ ] |

## Documents

- [decisions.md](decisions.md): AD-1 to AD-12 (locked) plus the carried decisions.
- [agent-common.md](agent-common.md): rules every task agent reads first.
- [decision-journal.md](decision-journal.md): append-only execution log.
- Diagrams: [diagrams/component-map.md](diagrams/component-map.md), [diagrams/data-flow.md](diagrams/data-flow.md).
- Global journal: each task's row also goes to `plans/decision-journal.md`; T17 adds a mission-summary row.

## Conventions

- Diagnosis mode (`~/.claude/rules/diagnosis.md`) for every discrepancy; each fix's journal row records
  mechanism, origin, causal chain and what was ruled out.
- Every ported symbol keeps `/** @see lib/...:fn */`. Tests come first (TDD); the T0 native fixtures and
  harness dumps are the specification.
- Parallel tasks run in separate git worktrees off the latest landed head; agents get
  [agent-common.md](agent-common.md) plus their task file, a worktree path and a scratch dir. Journal and
  README updates land as one `docs(mission)` commit per batch.
- Model routing: T1, T3, T4, T5, T8, T13 `typescript-pro` (sonnet); T2, T6, T7, T9–T12, T14, T15
  `typescript-pro` (opus: native harnesses, fused kernels, the no-free diagnosis); T16
  `documentation-engineer`.
