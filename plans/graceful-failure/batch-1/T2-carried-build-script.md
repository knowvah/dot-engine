<!-- SPDX-License-Identifier: EPL-2.0 -->
# T2: Carried-oracle build script and patch-series skeleton

## Context

D1: the oracle becomes graphviz 16.1.1 plus a series of carried patches,
built from the maintainer's GitLab fork at `/Users/scottseely/git/sseely/graphviz`
(it has tag `16.1.1`; `origin` is the fork, `upstream` is graphviz). The
pristine oracle clones `~/git/graphviz*` must never be written to.

## Task

1. Write `test/corpus/build-carried-oracle.sh` (POSIX sh or bash; it must
   pass `shellcheck`). Behaviour:
   - `CARRIED_SRC` defaults to `/Users/scottseely/git/sseely/graphviz`.
     `CARRIED_DIR` defaults to `/Users/scottseely/git/sseely/graphviz-carried`.
   - Create, or reset, a **detached worktree** of `CARRIED_SRC` at tag
     `16.1.1` in `CARRIED_DIR`. Never move a branch in `CARRIED_SRC`.
   - Apply `test/corpus/oracle-patches/*.patch` in lexical order with
     `git am --3way`. On a conflict: `git am --abort`, exit non-zero, and
     name the patch.
   - Build with the same CMake configuration as the pristine 16.1.1 oracle.
     Read `~/git/graphviz-16.1.1/build/CMakeCache.txt` and reuse its
     `CMAKE_BUILD_TYPE` and feature options. Add
     `-DBISON_EXECUTABLE=/opt/homebrew/opt/bison/bin/bison` and
     `-DFLEX_EXECUTABLE=/opt/homebrew/opt/flex/bin/flex`. Record the cache
     keys copied.
   - Produce the plugin dirs `/tmp/ghl1611-carried` and
     `/tmp/ghl1611-carried-all` through
     `GRAPHVIZ_BUILD=$CARRIED_DIR/build sh test/corpus/gen-headless-gvbindir.sh`.
     Read that script first for its arguments.
   - Write `$CARRIED_DIR/carried-build.json` as
     `{ "tag": "16.1.1", "patches": [{ "file", "sha256" }], "builtAt": ISO8601 }`.
2. `test/corpus/oracle-patches/manifest.json`: `{ "patches": [] }`.
3. `test/corpus/oracle-patches/README.md`: the life cycle (ADR-0003), the
   backport recipe (branch `carried/<slug>` at 16.1.1, then
   `git format-patch -o test/corpus/oracle-patches --start-number N 16.1.1..`),
   and the rule that patch files are regenerated, never hand-edited.
4. `test/corpus/oracle-patches.test.ts` (vitest; write it first): validate
   the manifest against the patch files.

## Interface contract (output; consumed by T5 and T6)

```ts
interface CarriedPatch {
  patch: string;            // file name in test/corpus/oracle-patches/
  slug: string;             // kebab-case
  forkBranch: string;       // 'carried/<slug>'
  upstreamMr: number | null;
  upstreamIssue: number | null;
  status: 'filed' | 'merged';
  dotEngineIssue: number | null;
}
interface CarriedManifest { patches: CarriedPatch[] }
```

## Write-set

`test/corpus/build-carried-oracle.sh`, `test/corpus/oracle-patches/README.md`,
`test/corpus/oracle-patches/manifest.json`, `test/corpus/oracle-patches.test.ts`.

## Read-set

- `test/corpus/gen-headless-gvbindir.sh`
- `test/corpus/oracle-paths.mjs`
- `test/corpus/gvbindir-defaults.test.ts` (it forbids hardcoded oracle
  paths under `test/`; T5 extends it to cover this script)
- `~/git/knowvah/elk-engine/tools/oracle/build.sh` (pattern only)

## Acceptance criteria

- Given the empty series, when the manifest test runs, then it passes with
  0 entries.
- Given a patch file with no manifest entry, or an entry with no file, when
  the test runs, then it fails and names the file.
- Given an entry with `status: 'filed'` and `upstreamMr: null`, when the
  test runs, then it fails (D2: carried only once filed).
- Given a wiped `/tmp/ghl1611-carried`, when the script runs, then it
  regenerates the dir and `GVBINDIR=/tmp/ghl1611-carried <dot> -c` has
  produced `config8`.

## Boundaries

- Do not run the full build in this task if `gvbindir-defaults.test.ts`
  fails on the new literals: T5 owns that test. Note the failure in the
  journal; T5 fixes it in batch 2. Gate 4 may show exactly that one known
  failure at the end of batch 1. Record it.
- No Node built-ins under `src/` (none touched).

## Observability

N/A: no new observable operations. The script prints each step and the
patch being applied.

## Rollback

Reversible.

## Commit

`chore(oracle): add carried-oracle build script and patch manifest`, with a
body.
