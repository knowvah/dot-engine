# T8a — native timings (`test(T8a)`), alone

## Why first
`survey.ts:93-100`, `bench.mjs:46` and `wasm-bench.mjs` read `native-timings.json` (937 ids, `dotVersion` 16.1.0,
captured 2026-10-15). The survey sets each id's port budget from it; 16.1.1 fixes native hangs (e.g. `2854`), so
the old floors are wrong for 16.1.1.

## Command
`caffeinate -i env CAPTURE_FORCE=1 node test/corpus/capture-native.mjs > $BASE/logs/T8a.log 2>&1`
(defaults from `oracle-paths.mjs`: 16.1.1, `/tmp/ghl1611`; `CAPTURE_CAP_MS` 300000, `CAPTURE_CONC` 3).
Nothing else heavy runs meanwhile.

## Write-set
`test/corpus/native-timings.json`.

## Acceptance criteria
- Given the run, then `dotVersion` is 16.1.1 and the id count equals 937 or the difference is journaled.
- Given old vs new, then the journal lists ids whose native time moved by more than 2× either way, and ids that
  were capped/failed on 16.1.0 and now finish (expected: `2778`, `2854`, `2854_1`, `2855` per ADR-0002).

## Observability / rollback
Journal row: runtime, load, counts. Reversible.
