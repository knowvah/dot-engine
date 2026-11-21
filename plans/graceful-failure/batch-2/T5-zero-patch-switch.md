<!-- SPDX-License-Identifier: EPL-2.0 -->
# T5: Zero-patch carried build, sample self-check, oracle switch

## Context

T2 wrote `test/corpus/build-carried-oracle.sh` and an empty patch series.
D1 makes the carried build *the* oracle; with zero patches it must be
byte-equal to pristine 16.1.1 (stop 5). `test/corpus/oracle-paths.mjs` is
the single source of truth for oracle locations, and
`gvbindir-defaults.test.ts` enforces that rule.

## Task

1. Run `bash test/corpus/build-carried-oracle.sh` (empty series). Check
   `uptime` first.
2. Write `test/corpus/carried-selfcheck-sample.json`: about 60 ids, chosen
   **deterministically** (for example, sorted manifest ids, every k-th, then
   topped up so every engine `dot neato fdp sfdp circo twopi osage patchwork`
   and every format `svg xdot plain json map dot` appears at least 5
   times). Record the selection rule in the file.
3. Write `test/corpus/carried-selfcheck.ts` (a tsx script):
   - render each sample (id, engine, format) with pristine and with carried,
     capturing stdout and stderr;
   - compare byte for byte;
   - exit non-zero on any difference and print the first difference.
   Its pure comparison helpers are unit-tested in the same file's colocated
   test only if they hold logic; otherwise the script's run is the evidence
   (record it in the journal).
4. Edit `test/corpus/oracle-paths.mjs`:
   - point `ORACLE_GRAPHVIZ_BUILD`, `ORACLE_DOT_BIN`, `ORACLE_GVBINDIR` and
     `ORACLE_GVBINDIR_ALL` at the carried build and dirs;
   - add `ORACLE_PRISTINE_GRAPHVIZ_BUILD`, `ORACLE_PRISTINE_DOT_BIN`,
     `ORACLE_PRISTINE_GVBINDIR` and `ORACLE_PRISTINE_GVBINDIR_ALL` with the
     current 16.1.1 values;
   - `ORACLE_CORPUS_ROOT` stays the **pristine** checkout's `tests/`, so
     corpus inputs never change with patches;
   - update the header comment to cite ADR-0003.
5. Edit `test/corpus/gvbindir-defaults.test.ts` so it enforces the carried
   literals in `build-carried-oracle.sh` and `gen-headless-gvbindir.sh` as
   it does today, and still finds no other hardcoded oracle path.

## Interface contract (output; consumed by every sweep, T6 and T14)

`oracle-paths.mjs` exports the carried paths under the existing `ORACLE_*`
names, and the pristine paths under `ORACLE_PRISTINE_*`.

## Write-set

`test/corpus/carried-selfcheck.ts`, `test/corpus/carried-selfcheck-sample.json`,
`test/corpus/oracle-paths.mjs`, `test/corpus/gvbindir-defaults.test.ts`.

## Read-set

- `test/corpus/oracle-paths.mjs`
- `test/corpus/gvbindir-defaults.test.ts`
- `test/corpus/oracle-env.ts` (`oraclePreflight`)
- `test/corpus/corpus-manifest.json` (ids and engines; read with `jq` or
  head, never whole)
- `test/corpus/capture-native.mjs` (how native is invoked)

## Acceptance criteria

- Given the empty series, when the carried oracle is built and the
  self-check runs, then all samples are byte-equal in both output and
  stderr. Any difference is **stop 5**: diff the `CMakeCache.txt` files and
  journal.
- Given `oracle-paths.mjs`, when imported, then the `ORACLE_*` constants
  point at the carried build and the `ORACLE_PRISTINE_*` constants hold the
  16.1.1 values.
- Given `gvbindir-defaults.test.ts`, when run, then it passes, and it fails
  if another file under `test/` hardcodes either oracle path.

## Observability

Self-check summary (sample count, per-engine and per-format counts, 0
differences) recorded in the journal.

## Rollback

Reversible. Reverting `oracle-paths.mjs` restores the pristine oracle.

## Commit

`chore(oracle): switch sweeps to the carried 16.1.1 build`, with a body
citing ADR-0003 and the self-check evidence.
