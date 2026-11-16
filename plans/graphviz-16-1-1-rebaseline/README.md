# Mission: re-pin the oracle to graphviz 16.1.1 and re-baseline (#147)

## Objective

Move every oracle-derived measurement in dot-engine from graphviz 16.1.0 to 16.1.1, per
[ADR-0002](../../docs/adr/0002-graphviz-16.1.1-oracle.md): fix the oracle defaults that still point at
16.1.0, regenerate the dot survey, every dot and engine walk, the attribution and oracle-error registries,
native timings and port perf, the goldens and the reports, then trace **every** verdict that changes to the
16.1.1 commit that caused it, filed as #149–#165 or as a new `upstream-16.1.1` issue. `src/` does not change,
so no verdict change is a port regression (AD-4): the head bundle must hash equal to main's.

**Out of scope:** any `src/` change (the ports are #149–#165), the 48 new and 7 modified 16.1.1 corpus
inputs (#148, AD-1), `src/**/__fixtures__` (AD-5), `wasm-perf.json`, `parity-rules.json`.
Nothing is pushed or signed; the commit types cut no release (AD-9).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read this README, [decisions.md](decisions.md), [decision-journal.md](decision-journal.md), then the
   current batch's `overview.md`. Check finished tasks with `git log --oneline main..`.
3. Read `.agent-notes/` entries named in [agent-common.md](agent-common.md).

## Branch and commits

- Worktree `~/git/knowvah/dot-engine-1611`, branch `chore/graphviz-16.1.1-oracle`, on main `9c7c65b6`
  plus ADR-0002 (`210f524d`) and the oracle-paths module (`199e74e0`), both signed. Never create another
  branch; never merge main in.
- **First run only:** commit this brief as `docs(mission): add graphviz 16.1.1 re-baseline brief`.
- One commit per task. Subject `<type>(TN): <desc>`, ≤72 chars, lowercase, no period; lines ≤80; a body when
  more than 3 files change. End every message with the harness-default `Co-Authored-By:` trailer
  (`~/.claude/rules/commits.md`, attribution required).
- Types: `test(T1)`, `test(T3)`…`test(T8b)`, `test(T11)`, `test(T10)`, `docs(T12)`, `chore(T13)`. No `feat`/`fix`.
- **Commit unsigned, locally only:** `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone (never
  chained with `&&`). Never push, open a PR, sign, rebase, or touch `main` or the main checkout.
- Only the orchestrator writes `decision-journal.md`, `plans/decision-journal.md`, `.agent-notes/`, and GitHub
  issues. Subagents report findings in their hand-back.

## Quality gates (every committing task)

| Gate | Command | Pass | On fail |
|---|---|---|---|
| Types | `npm run typecheck` | exit 0 | fix, re-run |
| Unit | `npm test` | exit 0 | fix, re-run |
| Goldens | `bash test/golden/gates.sh` | 5/5 PASS | fix (T11 records 16.1.1 failures in `known-failing.json`) |
| Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 | T10 owns registry-staleness failures |
| i18n (T12) | `npm run docs:i18n-status` | 0 stale × 23 | set each locale's `sourceHash` |
| Port unchanged (T2, T13) | bundle of head vs bundle of `9c7c65b6`, built from clean `git archive` exports (`npm run parser:regen && npm run build:js`) | identical sha256 | STOP (stop 3) |
| Coverage (T13) | `npm run coverage` | thresholds met | add tests |

- `$BASE` = `<executing session scratchpad>/rebaseline-1611`. Long runs go under `caffeinate -i`, in this
  worktree, backgrounded, one log per run in `$BASE/logs/`. Record start, end, load and row counts.
- Oracles: **16.1.1** `~/git/graphviz-16.1.1/build/cmd/dot/dot`, `GVBINDIR=/tmp/ghl1611` (dot) and
  `/tmp/ghl1611-all` (other engines). **16.1.0** (classification only): `~/git/graphviz/build/cmd/dot/dot`,
  `/tmp/ghl` and `$BASE/ghl16-all`. A `/tmp` clean deletes `config8`: `GVBINDIR=<dir> <dot> -c`.
- Concurrency: at most 2 walk processes at once, each with its `*_CONCURRENCY=5`; keep the 1-minute load
  ≤ 12. T8a and T8b run alone. Never edit files a running walk reads (`test/corpus/*.ts`, the registries).

## Stop conditions

1. A task needs a file outside its write-set (T13's is open).
2. The same gate fails twice in a row after fix attempts (state the mechanism first), or the same approach
   fails the same check three times.
3. The head bundle differs from main's, or a task would edit `src/`.
4. Preflight fails: `dot -V` ≠ 16.1.1, plugins ≠ `8.0.16`, or an engine does not render.
5. A verdict changes while native 16.1.0 and 16.1.1 outputs are identical (after ≥8 runs on fdp, sfdp, neato,
   twopi): a harness fault, not upstream.
6. One worsening class of more than 50 ids cannot be tied to a filed issue (suggests configuration error).
7. A change would contradict AD-1 to AD-9, or evidence shows one is wrong.
8. Anything would push, open a PR, sign, rebase, or touch `main`, the main checkout or its `.claude/`.
9. **Planned stop:** T13 is done. Hand the user the re-sign command and the after-merge steps.

## Push forward (decide alone; journal each)

- File a new `upstream-16.1.1` issue for a 16.1.1 change nobody filed (AD-4), with the native diff.
- Compare against ≥8 native runs where the engine is nondeterministic.
- Keep existing caps and quarantine; record capped ids.
- Add native-matching warnings to golden "logs nothing" allow-lists.
- Pre-existing fixes of 1–3 lines in files already being edited; larger → a GitHub issue.
- Wording of journal rows, issue comments, doc prose.
- Missing `$BASE` or plugin dirs: T2's steps rebuild them.

## Batches

| Batch | Tasks | Mode | Done |
|---|---|---|---|
| [1](batch-1/overview.md) | T1 oracle defaults · T2 preflight | sequential | [x] |
| [2a](batch-2a/overview.md) | T8a native timings (alone, first) · T3 dot survey · T4 dot formats · T5 engine walks · T6 engine formats | ≤2 runs at once | [x] |
| [2b](batch-2b/overview.md) | T7 attribution + oracle errors · T8b port bench (alone, last) | after 2a | [x] (T8b deferred to #222) |
| [3](batch-3/overview.md) | T9a classify dot · T9b classify engines | parallel, read-only | [x] |
| [4](batch-4/overview.md) | T10 hand registries · T11 goldens · T12 docs | T10 ∥ T11, then T12 | [x] |
| [5](batch-5/overview.md) | T13 close-out, issue comments, planned stop | orchestrator | [x] |

T8 was split into T8a/T8b during planning: the survey budgets each id from `native-timings.json`
(`test/corpus/survey.ts:93-100`), so native timings must be 16.1.1's before any walk.

## Mission summary

Oracle moved from graphviz 16.1.0 to 16.1.1 with the port unchanged (`dist/index.js` sha256 `7f4134d0…a9db3126`
on `9c7c65b6` and on head; `git diff 9c7c65b6 HEAD -- src` empty). Every verdict change between the two oracles
has a cause (`classification/dot.md`, `classification/engines.md`); no unexplained group, no new upstream issue.

| registry | 16.1.0 | 16.1.1 |
|---|---|---|
| dot survey (`parity.json`, 950 ids) | 930 conformant, 3 structural, 2 diverged, 1 errored, 14 oracle-error | 899, 14, 25, 2, **10** |
| circo walk | 929: 921 pass, 2 diverged, 1 port-error, 5 oracle-error | 898: 887, 5, 1, 5 |
| twopi walk | 929: 914 pass, 10 diverged, 1 port-error, 4 nondeterministic | 898: 880, 13, 1, 4 |
| osage / patchwork walks | 930: 925 + 5 diverged / 930 pass | 899: 894 + 5 / 899 |
| neato walk | 929: 926 pass, 1 diverged, 1 port-error, 1 oracle-error | 898: 895, 1, 1, 1 |
| fdp walk | 929: 894 pass, 16 diverged, 2 port-error, 4 oracle-error, 13 nondeterministic | 898: 866, 16, 2, 3, 11 |
| sfdp walk | 929: 632 pass, 295 diverged, 1 port-error, 1 nondeterministic | 898: 612, 285, 1, 0 |
| hand registries (T10) | — | 94 entries removed, 0 added |
| goldens `known-failing.json` | 0 | 4 goldens + 10 pt-issue (#158, #163) |

The walk universes shrink by 31 because the 35 ids that #158 and #162 move out of the survey's conformant set
leave every walk, and 4 enter (`1581`, `2475_1`, `2854_1`, `2855`).

Groups per issue: #158 36 survey ids + 12 goldens; #164 6 engine ids (21 walk rows); #149 2 ids in `-Tdot`/`-Txdot`;
#162 `1314`; #159 `2723`; #151 `2778`; #163 2 goldens; #150, #152–#157, #160, #161, #165 none. Not 16.1.1:
port commits on main (AD-4a) 92 rows, baseline staleness 35, native variance 27, harness caps 16, scope 1281.
T8b (port bench) was stopped at the user's request so the PR could open the same day; follow-up #222.

## Documents

- [decisions.md](decisions.md): AD-1 to AD-9 (locked, user-approved 2026-11-12).
- [agent-common.md](agent-common.md): rules every task agent reads first.
- [decision-journal.md](decision-journal.md): append-only execution log; each row also goes to
  `plans/decision-journal.md`.
- Diagrams: [component-map](diagrams/component-map.md), [data-flow](diagrams/data-flow.md).
- Classification output (T9): `classification/dot.md`, `classification/engines.md`.

## Conventions

- Diagnosis mode (`~/.claude/rules/diagnosis.md`) for every discrepancy; journal rows carry the artifact.
- Fresh runs only: T2 moves every committed `*.jsonl` aside to `$BASE/old/`; walkers resume from a JSONL
  without checking the oracle version. The old registries stay readable there for the T3–T8 diffs.
- Model routing: T1, T10, T11 `typescript-pro` (sonnet); T9a, T9b `debugger` (opus); T12 locales
  `documentation-engineer`; T2–T8 and T13 the orchestrator.
