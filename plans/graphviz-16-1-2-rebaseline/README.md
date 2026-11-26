# Mission: move the oracle to graphviz 16.1.2 and re-baseline (#297)

## Objective

Move every oracle-derived measurement in dot-engine from the 16.1.1 carried oracle to the **16.1.2 carried
oracle** (16.1.2 + `test/corpus/oracle-patches/*.patch`), recorded in a new ADR-0004: point the oracle defaults
at the 16.1.2 builds, set the 7 new 16.1.2 corpus inputs aside for #298, regenerate the failure-site inventory,
native timings, the dot survey, every dot and engine walk, attribution and oracle errors, the goldens and the
reports, then trace **every** result that changes to the 16.1.2 commit that caused it (or to #299's render
skip, or to a port commit on main). `src/` does not change: the head bundle must hash equal to main's
`c6d794a9` (AD-4).

**Out of scope:** any `src/` change, including `src/**/__fixtures__` (the ports are #299–#303); admitting the 7
new inputs (#298, AD-1); `perf.json`/`PERF.md` (#222, AD-10); `wasm-perf.json`; `parity-rules.json`; earlier
`plans/`. Nothing is pushed or signed; the commit types cut no release (AD-9).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read this README, [decisions.md](decisions.md), [decision-journal.md](decision-journal.md), then the current
   batch's `overview.md`. Check finished tasks with `git log --oneline origin/main..`.
3. Read [agent-common.md](agent-common.md) and the `.agent-notes/` entries it names.

## Branch and commits

- Worktree `~/git/knowvah/dot-engine-1612`, branch `chore/graphviz-16.1.2-oracle`, on main `c6d794a9` (AD-8).
  Never create another branch; never merge main in.
- **First run only (T0):** commit this brief as `docs(mission): add graphviz 16.1.2 re-baseline brief`.
- `.claude/settings.autonomous.json` in this worktree carries uncommitted allow rules (the main checkout's
  plus the 16.1.2 binaries) and stays uncommitted: always stage by path.
- One commit per task (T2 and T3 share one commit: see [batch-1](batch-1/overview.md)). Subject
  `<type>(TN): <desc>`, ≤72 chars, lowercase, no period; lines ≤80; a body when more than 3 files change. End
  every message with the harness-default `Co-Authored-By:` trailer (`~/.claude/rules/commits.md`).
- Types (AD-9): `docs(T1)`, `test(T2)`, `test(T4)`, `test(T6)`…`test(T11)`, `docs(mission)` for T12,
  `test(T13)`, `test(T14)`, `docs(T15)`, `chore(T16)`. No `feat`/`fix`.
- **Commit unsigned, locally only:** `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone (never
  chained with `&&`). Never push, open a PR, sign, rebase, or touch `main` or the main checkout.
- Only the orchestrator writes `decision-journal.md`, `plans/decision-journal.md`, `.agent-notes/` and GitHub
  issues. Subagents report findings in their hand-back.

## Quality gates (every committing task)

| Gate | Command | Pass | On fail |
|---|---|---|---|
| Types | `npm run typecheck` | exit 0 | fix, re-run |
| Unit | `npm test` | exit 0 | fix, re-run |
| Goldens | `bash test/golden/gates.sh` | 5/5 PASS | fix (T14 records 16.1.2 failures in `known-failing.json`) |
| Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 | T13 owns registry-staleness failures |
| i18n (T15) | `npm run docs:i18n-status` | 0 stale × 23 | set each locale's `sourceHash` |
| Port unchanged (T5, T16) | bundle of head vs bundle of `c6d794a9`, built from clean `git archive` exports (`npm run parser:regen && npm run build:js`) | identical sha256 | STOP (stop 3) |
| Coverage (T16) | `npm run coverage` | thresholds met | add tests |

- `$BASE` = `~/git/knowvah/rebaseline-1612` (durable, outside the repo; a reboot wiped #147's scratchpad
  `$BASE`). Long runs go under `caffeinate -i`, in this worktree, backgrounded, one log per run in
  `$BASE/logs/`. Record start, end, 1-minute load and row counts.
- Oracles (after T2, from `test/corpus/oracle-paths.mjs`): **16.1.2 carried**
  `~/git/sseely/graphviz-carried-1612/build/cmd/dot/dot`, `GVBINDIR=/tmp/ghl1612-carried` (dot) and
  `/tmp/ghl1612-carried-all` (other engines). **16.1.2 pristine** (bisect) `~/git/graphviz-16.1.2/build/cmd/dot/dot`,
  `/tmp/ghl1612{,-all}`. **16.1.1 carried** (classification only) `~/git/sseely/graphviz-carried/build/cmd/dot/dot`,
  `/tmp/ghl1611-carried{,-all}`; 16.1.1 pristine `~/git/graphviz-16.1.1/build/cmd/dot/dot`, `/tmp/ghl1611{,-all}`.
- `/tmp` plugin dirs lose `config8` overnight: before any native run check `ls <dir>/config8`; rebuild with
  `GRAPHVIZ_BUILD=<build> sh test/corpus/gen-headless-gvbindir.sh [all] <dir>`.
- Concurrency: at most 2 walk processes at once, each with its `*_CONCURRENCY=5`; keep the 1-minute load ≤ 12.
  T6 runs alone. One native `2784` render at a time (up to 67 GB resident). Never edit files a running walk
  reads (`test/corpus/*.ts`, the registries).

## Stop conditions

1. A task needs a file outside its write-set (T16's is open).
2. The same gate fails twice in a row after fix attempts (state the mechanism first), or the same approach
   fails the same check three times.
3. The head bundle differs from main's, or a task would edit `src/`.
4. Preflight fails: `dot -V` ≠ 16.1.2 on either 16.1.2 build, plugins ≠ `8.0.17`, an engine does not render,
   or the carried self-check fails.
5. A result changes while native 16.1.1 and 16.1.2 outputs are identical (after ≥8 runs on fdp, sfdp, neato,
   twopi) and no named `src/` commit on main explains it.
6. One worsening group of more than 50 ids cannot be tied to a filed issue or to #299.
7. A change would contradict AD-1 to AD-10, or evidence shows one is wrong.
8. Anything would push, open a PR, sign, rebase, or touch `main`, the main checkout or its `.claude/`.
9. **Planned stop:** T16 is done. Hand the user the re-sign command and the after-merge steps.

## Push forward (decide alone; journal each)

- File a new `upstream-16.1.2` issue for a 16.1.2 change nobody filed (AD-3), with the native diff.
- Compare against ≥8 native runs where the engine is nondeterministic.
- Keep existing caps and quarantine; record capped ids.
- Add native-matching warnings to golden "logs nothing" allow-lists.
- Pre-existing fixes of 1–3 lines in files already being edited; larger → a GitHub issue.
- Wording of journal rows, issue comments, doc prose.
- Missing `$BASE`, plugin dirs or `config8`: T5's steps rebuild them.

## Batches

| Batch | Tasks | Mode | Done |
|---|---|---|---|
| [1](batch-1/overview.md) | T1 ADR-0004 · T2+T3 oracle defaults and pending inputs · T4 failure sites · T5 preflight | sequential | [x] |
| [2a](batch-2a/overview.md) | T6 native timings (alone, first) · T7 dot survey · T8 dot formats · T9 engine walks · T10 engine formats | ≤2 runs at once | [x] |
| [2b](batch-2b/overview.md) | T11 attribution + oracle errors | after T9 | [x] |
| [3](batch-3/overview.md) | T12a classify dot · T12b classify engines | parallel, read-only | [ ] |
| [4](batch-4/overview.md) | T13 hand registries · T14 goldens · T15 docs | T13 ∥ T14, then T15 | [ ] |
| [5](batch-5/overview.md) | T16 close-out, issue comments, planned stop | orchestrator | [ ] |

## Documents

- [decisions.md](decisions.md): AD-1 to AD-10 (locked, user-approved 2026-11-24).
- [agent-common.md](agent-common.md): rules every task agent reads first.
- [decision-journal.md](decision-journal.md): append-only execution log; each row also goes to
  `plans/decision-journal.md`.
- Diagrams: [component-map](diagrams/component-map.md), [data-flow](diagrams/data-flow.md).
- Classification output (T12): `classification/dot.md`, `classification/engines.md`.
- Model on: `plans/graphviz-16-1-1-rebaseline/` (#147): its journal records the harness faults met last time.

## Conventions

- Diagnosis mode (`~/.claude/rules/diagnosis.md`) for every discrepancy; journal rows carry the artifact.
- Fresh runs only: walkers resume from a JSONL without checking the oracle version, so each regenerating task
  deletes **its own** JSONL immediately before its run; T5 copies the old ones to `$BASE/old/`.
- Model routing: T2+T3, T4, T13, T14 `typescript-pro` (sonnet); T12a, T12b `debugger` (opus); T15 locales
  `documentation-engineer`; T1, T5–T11 and T16 the orchestrator.
