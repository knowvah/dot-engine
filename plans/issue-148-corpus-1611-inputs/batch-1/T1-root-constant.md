# T1: one corpus-root default

## Context

19 files default the corpus root to the 16.1.0 checkout (list in
[decisions.md AD-1](../decisions.md#ad-1-one-corpus-root-constant-beside-the-oracle-paths)).
ADR-0002 decision 3 keeps oracle locations in `test/corpus/oracle-paths.mjs`, and
`gvbindir-defaults.test.ts` enforces it for the binary and plugin dirs. Extend
both to the corpus root.

## Task (TDD)

1. **Red.** In `test/corpus/gvbindir-defaults.test.ts`:
   - assert `ORACLE_CORPUS_ROOT === join(dirname(ORACLE_GRAPHVIZ_BUILD), 'tests')`;
   - add a root-default matcher (a `homedir()`/`os.homedir()` join of
     `'git/graphviz/tests'`, outside comment lines) and a test that no file under
     `test/` matches it. It must not flag the scrub-test data strings in
     `corpus-links.test.ts:59,76,97` (absolute paths inside messages, not
     defaults); add matcher self-tests for both cases;
   - invert line 143's expectation (the old literal *is* now a default to flag).
   Run it: it fails, listing the 19 files.
2. **Green.** Add `ORACLE_CORPUS_ROOT` to `oracle-paths.mjs` (doc comment: the
   corpus is the oracle checkout's `tests/`; `CORPUS_ROOT` overrides) and to
   `oracle-paths.d.mts`. Replace each default with the import, keeping each
   script's override order (`argv` then `CORPUS_ROOT` where it had them). Scripts
   with no env override today (`attr-frequency.ts`, `blind-spots.ts`,
   `zz-rebucket-tmp.ts`, `bytediff.ts`, `timing.ts`) get the constant only: do not
   add new override knobs (YAGNI).
3. `test/corpus/dashboard.ts:32` `corpusRootMd`: its regex only recognises
   `graphviz/tests`, so the new root would print verbatim. Make it accept the
   oracle checkout (`graphviz[^/]*/tests`), with a unit test if `dashboard.ts`
   has a test file; otherwise test the exported helper you factor out.
4. `test/corpus/README.md`: the `CORPUS_ROOT` row of the config table and the
   "local clone" wording name `~/git/graphviz-16.1.1/tests` and the constant.
5. `docs/adr/0002-graphviz-16.1.1-oracle.md`: one sentence under Consequences:
   the corpus root moved with the oracle (#148) and comes from
   `ORACLE_CORPUS_ROOT`. Do not change the decisions.

## Write-set

`test/corpus/oracle-paths.mjs`, `test/corpus/oracle-paths.d.mts`,
`test/corpus/gvbindir-defaults.test.ts`, `test/corpus/dashboard.ts` (+ its test
if one exists or is added), `test/corpus/README.md`, the 19 script files listed in
AD-1, `docs/adr/0002-graphviz-16.1.1-oracle.md`.

## Read-set

`test/corpus/gvbindir-defaults.test.ts:25-75,130-160`,
`test/corpus/corpus-links.ts:50-90` (the scrub uses `CORPUS_ROOT` from env only;
leave it), `docs/adr/0002-graphviz-16.1.1-oracle.md` decision 3.

## Acceptance criteria

- Given the tree after T1, when `gvbindir-defaults.test.ts` runs, then it passes
  and `git grep -n "git/graphviz/tests" -- 'test/**/*.ts' 'test/**/*.mjs'` shows
  only comments and the three `corpus-links.test.ts` data strings.
- Given a script source containing `join(homedir(), 'git/graphviz/tests')`, when
  the root matcher runs on it, then it reports that line.
- Given `CORPUS_ROOT=/x`, when `enumerate.ts`'s `corpusRoot()` runs with no argv
  root, then it returns `/x`; with neither, `ORACLE_CORPUS_ROOT`.
- Given root `~/git/graphviz-16.1.1/tests`, when `corpusRootMd` renders, then it
  links the gitlab `tests/` tree.

## Quality bar

Typecheck clean; `npx vitest run test/corpus` green; no behaviour change other
than the default root. Commit `test(T1): take the corpus root from oracle-paths`.

**Observability:** N/A — no new observable operations.
**Rollback:** Reversible (revert the commit).
