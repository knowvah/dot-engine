# Decisions: issue #148

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-16. No issue was labelled `queue:planned`. #148 is the lowest-numbered
`queue:ready` issue; its only blocker, #147, is closed. Nobody confirmed the
decisions below. Each names the options it rejected and the evidence, so the
maintainer can audit it.

### AD-1: one corpus-root constant beside the oracle paths

- **Decision:** add `ORACLE_CORPUS_ROOT = join(dirname(ORACLE_GRAPHVIZ_BUILD),
  'tests')` to `test/corpus/oracle-paths.mjs` (and its `.d.mts`). Every script that
  defaults `CORPUS_ROOT` (or hardcodes the root) imports it; `CORPUS_ROOT` and argv
  still win. `gvbindir-defaults.test.ts` gains a check that no file under `test/`
  defaults to `git/graphviz/tests` in code (comments and test data excepted), and
  its existing assertion that this literal is *not* flagged is inverted.
- **Why:** ADR-0002 decision 3 makes `oracle-paths.mjs` the one file to change on
  an oracle bump. The corpus is the same checkout as the oracle build, so deriving
  it from `ORACLE_GRAPHVIZ_BUILD` keeps one literal. The rebaseline's AD-1 named
  this move as #148.
- **Rejected:** rewriting the 19 literals to `graphviz-16.1.1/tests` (repeats the
  chore on the next bump, no guard); a second root holding only the 36 new files
  (mixes two trees, and the 7 changed inputs stay at 16.1.0); vendoring the inputs
  into this repo (duplicates upstream; `corpus-links.ts` rewrites `…/tests/<rel>`
  to gitlab URLs and assumes the upstream layout).
- **Evidence:** `git grep -n "git/graphviz/tests" -- test` lists the defaults:
  `enumerate.ts:79`, `survey.ts`, `dot-walk.ts:59`, `xdot-walk.ts:42`,
  `json-walk.ts:79`, `map-walk.ts`, `plain-walk.ts`, `format-walk.ts:37`,
  `engine-walk.ts:113`, `attribute-divergence.ts:120`,
  `oracle-error-classifier.ts:62`, `capture-native.mjs:23`, `bench.mjs:39`,
  `wasm-bench.mjs:63`, `attr-frequency.ts:36`, `blind-spots.ts:31`,
  `zz-rebucket-tmp.ts:15`, `test/tools/bytediff.ts:38`, `test/tools/timing.ts:14`.

### AD-2: registries, dashboards and timings are not touched

- **Decision:** leave `parity*.json(l)`, `*-parity-*.json(l)`, `PARITY-*.md`,
  `native-timings.json` and `perf.json` as they are. T3's measurement goes to
  `classification.md` in this plan and to issue comments.
- **Why:** the queue rules reserve the full survey for the maintainer's pre-merge
  run. A resume walk would re-render every non-passing row (a de facto full walk)
  and skip the 7 changed inputs it already holds; hand-appended rows leave the
  summary JSON and dashboards inconsistent.
- **Evidence:** corpus tests only check registry ids ⊆ manifest ids
  (`accepted-divergences.test.ts:47`, `accepted-divergences-engines.test.ts:73`,
  `engine-exclusions.test.ts:32`); with the regenerated manifest and no registry
  change, `npx vitest run test/corpus test/docs` passed 2850/2850 at planning.
- **Hand-off:** the report tells the maintainer to run those walks fresh for the
  7 changed ids.

### AD-3: classify and file; do not fix

- **Decision:** T3 classifies each new or changed id as one of: `conformant`;
  `pending-port` (a 16.1.1 change filed as #149–#165 explains it); `new-upstream`
  (a 16.1.1 change not yet filed: new issue, labels `upstream-16.1.1`,
  `follow-up`); `port-defect` (port differs from both natives or crashes where
  neither native does: new issue, label `follow-up`); `oracle-crash`
  (quarantined in T2). No `src/` change.
- **Why:** #148 is a corpus issue; each port change needs its own mission and
  gates. The rebaseline used the same scheme (its AD-3/AD-4).
- **Rejected:** fixing small divergences here (scope creep, unreviewed
  behaviour change on a test-only mission); accepted-divergence entries
  (permanent; rejected by the rebaseline's AD-3).
- **Attribution evidence:** the native 16.1.0/16.1.1 pair per id, the upstream
  number in the file name, and the C commit named in the matching issue. Bisect
  with the 16.1.0 build only when those disagree.

### AD-4: the pending-ports table in `docs/known-divergences.md` stays

- **Decision:** do not edit `docs/known-divergences.md`. Its table lists ids that
  *moved* at 16.1.1; the new ids did not move, and the page already says "Inputs
  that reach each change are tracked in #148". The classification goes on #148
  and on each matched issue.
- **Rejected:** adding the new ids to the table. Every edit to that page re-hashes
  26 translated `docs-site/*/divergences.md` pages (`sourceHash`), as the
  rebaseline and `0e449392` did; the cost buys no accuracy.

### AD-5: native crashes are quarantined as `oracle-crash`

- **Decision:** `2746`, `2761`, `2761_1` go in `enumerate.ts` `MANUAL_QUARANTINE`
  as `oracle-crash`, with a comment: native 16.1.1 segfaults (exit 139), upstream
  `test_regression.py` marks `test_2746`/`test_2761` `xfail`. T2 re-checks each
  under `oraclePreflight` before quarantining; any other new id that crashes the
  oracle gets the same treatment.
- **Why:** precedent: `../doc/infosrc/record.dot` and two siblings are quarantined
  `oracle-crash` for a native abort. No reference exists to compare against.

## Baseline

On `736b6d59` at planning: `npm run typecheck` exit 0; `npm test` exit 0 (575
files, 13534 passed, 18 expected fail). Working tree clean apart from this brief.

## Rollback

Reversible: revert the squashed commit. The manifest returns to 971 ids and the
scripts to the 16.1.0 root; no registry or `src/` file changes.
