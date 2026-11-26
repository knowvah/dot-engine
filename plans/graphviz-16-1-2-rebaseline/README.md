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
| [3](batch-3/overview.md) | T12a classify dot · T12b classify engines | parallel, read-only | [x] |
| [4](batch-4/overview.md) | T13 hand registries · T14 goldens · T15 docs | T13 ∥ T14, then T15 | [x] |
| [5](batch-5/overview.md) | T16 close-out, issue comments, planned stop | orchestrator | [x] |

## Mission summary (2026-11-26)

Done: T0–T16. The oracle is the 16.1.2 carried build; `src/` is unchanged (`dist/index.js` sha256
`8c41a87d…5ae4a18f`, `api.js` and `render.js` equal too, on `c6d794a9` and on head; `git diff c6d794a9 HEAD -- src`
empty). Gates on head: typecheck 0; `npm test` 15790 / 15790; goldens 5 / 5 (253 fixtures); corpus + docs
2893 / 2893; `docs:i18n-status` 0 stale × 23; coverage 97.26 / 93.23 / 98.46 / 98.25 (statements, branches,
functions, lines).

**Dot survey** (baseline: queue survey `9007464d`, AD-4): conformant 966 → 934, structural-match 5 → 3, diverged
1 → 1, oracle-error 10 → 44. All 34 moves are the 16.1.2 render skip (#299).

**What 16.1.2 itself changed** (native 16.1.1 vs 16.1.2 identical everywhere else: 929 dot ids, 894–921 ids per
other engine): the render skip (#299: 34 dot ids, 5 on-engine ids, 3 goldens kept at 16.1.1) and fdp `2717`
(#303). #300, #301 and #302 reach no walked id.

**Everything else that moved** is not 16.1.2: the walk rosters were stale (53 ids that port commits on main had
already fixed entered every table: #158 34, #160 4, #164 1, #148 14; the 18 render-skip ids left), port commits
on main (#242, #175), open port gaps that the new ids expose (#231, #224, #315), a native crash on both versions
(#316), native timing at the 300 s cap (`2783` plain), and native run-to-run variance. Detail:
[classification/dot.md](classification/dot.md) (460 rows), [classification/engines.md](classification/engines.md)
(2089 rows).

**Registries, before → after** (row count: verdict counts; "before" is the committed file at `c6d794a9`; the old
`parity.json` was a stale 2026-11-12 survey, see the dot survey line above):

| registry | before | after |
|---|---|---|
| `dot-parity-dot.json` | 899: oracleError 4, pass 895 | 934: oracleError 4, pass 930 |
| `json-parity-circo.json` | 898: accepted 4, conformant 885, diverged 2, oracle-error 7 | 933: accepted 4, conformant 918, diverged 3, oracle-error 7, port-error 1 |
| `json-parity-fdp.json` | 898: accepted 18, conformant 862, diverged 2, oracle-error 5, oracle-nondeterministic 9, port-error 2 | 933: accepted 17, conformant 888, diverged 10, oracle-error 9, oracle-nondeterministic 7, port-error 2 |
| `json-parity-neato.json` | 898: accepted 2, conformant 892, oracle-error 3, port-error 1 | 933: accepted 2, conformant 925, diverged 1, oracle-error 3, port-error 2 |
| `json-parity-osage.json` | 899: accepted 7, conformant 891, diverged 1 | 934: accepted 7, conformant 925, diverged 2 |
| `json-parity-patchwork.json` | 899: accepted 2, conformant 896, diverged 1 | 934: accepted 2, conformant 930, diverged 2 |
| `json-parity-sfdp.json` | 898: accepted 286, conformant 610, oracle-error 1, port-error 1 | 933: accepted 278, conformant 638, diverged 14, oracle-error 1, port-error 2 |
| `json-parity-twopi.json` | 898: accepted 7, conformant 880, diverged 3, oracle-error 1, oracle-nondeterministic 6, port-error 1 | 933: accepted 7, conformant 913, diverged 4, oracle-error 2, oracle-nondeterministic 5, port-error 2 |
| `json-parity.json` | 899: accepted 2, conformant 892, diverged 1, oracle-error 4 | 934: accepted 2, conformant 926, diverged 2, oracle-error 4 |
| `map-parity-circo.json` | 898: accepted 1, conformant 890, oracle-error 7 | 933: accepted 1, conformant 924, oracle-error 7, port-error 1 |
| `map-parity-dot.json` | 899: conformant 895, oracle-error 4 | 934: conformant 930, oracle-error 4 |
| `map-parity-fdp.json` | 898: accepted 4, conformant 887, diverged 1, oracle-error 5, port-error 1 | 933: accepted 4, conformant 919, diverged 1, oracle-error 8, port-error 1 |
| `map-parity-neato.json` | 898: accepted 1, conformant 894, oracle-error 3 | 933: accepted 1, conformant 928, oracle-error 3, port-error 1 |
| `map-parity-osage.json` | 899: accepted 1, conformant 898 | 934: conformant 934 |
| `map-parity-patchwork.json` | 899: conformant 899 | 934: conformant 934 |
| `map-parity-sfdp.json` | 898: accepted 31, conformant 866, oracle-error 1 | 933: accepted 29, conformant 900, diverged 2, oracle-error 1, port-error 1 |
| `map-parity-twopi.json` | 898: accepted 1, conformant 895, oracle-error 1, timeout 1 | 933: accepted 1, conformant 928, oracle-error 2, port-error 1, timeout 1 |
| `map-parity.json` | 899: conformant 895, oracle-error 4 | 934: conformant 930, oracle-error 4 |
| `parity-circo.json` | 898: diverged 3, oracle-error 5, pass 889, port-error 1 | 933: diverged 4, oracle-error 5, pass 922, port-error 2 |
| `parity-fdp.json` | 898: diverged 17, oracle-error 3, oracle-nondeterministic 13, pass 863, port-error 2 | 933: diverged 24, oracle-error 7, oracle-nondeterministic 8, pass 892, port-error 2 |
| `parity-neato.json` | 898: diverged 1, oracle-error 1, oracle-nondeterministic 1, pass 894, port-error 1 | 933: diverged 1, oracle-error 1, pass 929, port-error 2 |
| `parity-osage.json` | 899: diverged 5, pass 894 | 934: diverged 5, pass 929 |
| `parity-patchwork.json` | 899: pass 899 | 934: pass 934 |
| `parity-sfdp.json` | 898: diverged 285, oracle-nondeterministic 1, pass 611, port-error 1 | 933: diverged 291, oracle-nondeterministic 1, pass 639, port-error 2 |
| `parity-twopi.json` | 898: diverged 12, oracle-nondeterministic 2, pass 883, port-error 1 | 933: diverged 8, oracle-error 1, oracle-nondeterministic 6, pass 916, port-error 2 |
| `parity.json` | 950: conformant 899, diverged 25, errored 2, oracle-error 10, structural-match 14 | 982: conformant 934, diverged 1, oracle-error 44, structural-match 3 |
| `plain-parity-circo.json` | 898: accepted 1, oracleError 9, pass 888 | 933: accepted 1, oracleError 10, pass 922 |
| `plain-parity-dot.json` | 899: accepted 1, oracleError 4, pass 894 | 934: accepted 1, oracleError 4, pass 929 |
| `plain-parity-fdp.json` | 898: accepted 1, oracleError 7, pass 889, portError 1 | 933: accepted 1, diverged 1, oracleError 12, pass 919 |
| `plain-parity-neato.json` | 898: accepted 1, oracleError 4, pass 893 | 933: accepted 1, oracleError 5, pass 927 |
| `plain-parity-osage.json` | 899: accepted 6, pass 893 | 934: accepted 6, pass 928 |
| `plain-parity-patchwork.json` | 899: pass 899 | 934: pass 934 |
| `plain-parity-sfdp.json` | 898: accepted 1, oracleError 2, pass 895 | 933: accepted 1, oracleError 3, pass 929 |
| `plain-parity-twopi.json` | 898: accepted 12, diverged 2, oracleError 2, pass 882 | 933: accepted 11, diverged 2, oracleError 4, pass 916 |
| `xdot-parity.json` | 899: conformant 895, oracle-error 4 | 934: conformant 930, oracle-error 4 |

Accepted registries: 16 entries retired (14 for ids that left with the render skip, 2 fixed by port commits),
none added.

**Open for the maintainer:**
- #299 ruling (render skip), including whether engine walks should keep the 18 ids native still renders there.
- `2783` has no accepted entry (same class A10 port error as `2784`, 15 rows on 5 engines); `2784`'s json rows
  on twopi, neato, fdp, sfdp have none either.
- #313 (native timing recapture, the maintainer's), then #222.
- New issues filed: #313, #314, #315, #316, #317. #210 can close. #311 is fixed here; the locale pages still
  lack the U-series section.
- The T8 commit body says the 53 entered ids came from port commits after the registries; they came from a stale
  roster (journal, T12a). The body can be corrected at re-sign.
- Two `unclassified` rows in `failure-sites.json` (`lib/cgraph/attr.c#setattr#UNREACHABLE#1`,
  `lib/common/htmltable.c#allocObj#UNREACHABLE#1`).

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
