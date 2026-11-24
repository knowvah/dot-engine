# T2 — oracle defaults to 16.1.2 (`test(T2)`, typescript-pro; one commit with T3)

## Context
`test/corpus/oracle-paths.mjs` is the single source of oracle locations; two shell scripts carry the same
literals and `gvbindir-defaults.test.ts` enforces agreement. All point at 16.1.1 today. AD-1, AD-4.

## Task (tests first)
1. Update the expectations in `gvbindir-defaults.test.ts` (e.g. `:156-157`, `:190-193` fixtures may stay as
   generic examples) and `oracle-env.test.ts:23` (`GOOD_V` version string) to 16.1.2; run them red.
2. `oracle-paths.mjs`: `ORACLE_VERSION = '16.1.2'`; pristine build `~/git/graphviz-16.1.2/build`, pristine
   GVBINDIRs `/tmp/ghl1612`, `/tmp/ghl1612-all`; carried build `~/git/sseely/graphviz-carried-1612/build`,
   carried GVBINDIRs `/tmp/ghl1612-carried`, `/tmp/ghl1612-carried-all`. Header comments → ADR-0004.
   `ORACLE_CORPUS_ROOT` stays derived (now `~/git/graphviz-16.1.2/tests`).
3. `build-carried-oracle.sh`: `LIVE_TAG="16.1.2"`, `LIVE_CARRIED_DIR="$HOME/git/sseely/graphviz-carried-1612"`,
   `LIVE_GVBINDIR_{DOT,ALL}` → the 1612 carried dirs, `PRISTINE_BUILD` default → `~/git/graphviz-16.1.2/build`,
   header comment ("16.1.1 live", default dirs) to match. Keep `guard_next_tag` unchanged.
4. `gen-headless-gvbindir.sh`: `BUILD` default `~/git/graphviz-16.1.2/build`, `OUT` `/tmp/ghl1612`, `ALL_OUT`
   `/tmp/ghl1612-all`, header comments.
5. `carried-selfcheck.ts`: header comment "pristine 16.1.1" → the pristine build of `ORACLE_VERSION` (code already
   reads `ORACLE_VERSION`).
6. Add one guard case to the existing `it.each` in `gvbindir-defaults.test.ts`: `ORACLE_TAG=16.1.1` with no
   overrides is refused (the old live tag must not overwrite the new live dirs). Run with `HOME` = an empty temp
   dir, as the existing cases do.

## Write-set
`test/corpus/oracle-paths.mjs`, `test/corpus/build-carried-oracle.sh`, `test/corpus/gen-headless-gvbindir.sh`,
`test/corpus/gvbindir-defaults.test.ts`, `test/corpus/oracle-env.test.ts`, `test/corpus/carried-selfcheck.ts`,
plus T3's write-set (same agent, same commit).

## Do not
Run `build-carried-oracle.sh` or `gen-headless-gvbindir.sh` against real paths (the builds and dirs exist; T5
regenerates `config8` only). Touch `src/`.

## Acceptance criteria
- Given no env overrides, when `defaultGvbindir('dot')` / `('neato')` are read, then they are
  `/tmp/ghl1612-carried` / `/tmp/ghl1612-carried-all`, and `ORACLE_VERSION` is `16.1.2`.
- Given the two scripts, when the fitness test parses their literals, then they equal `oracle-paths.mjs`.
- Given `ORACLE_TAG=16.1.1` and no overrides, when the carried builder runs, then it exits 1 with the guard
  message before touching anything.
- Gates (with T3): typecheck, `npm test`, corpus + docs green; goldens unchanged.

## Observability / rollback
N/A. Reversible (revert the commit).
