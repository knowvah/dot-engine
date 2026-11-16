# T8b — port bench (`test(T8b)`), alone, last

## Commands
1. `npm run build:js`
2. `caffeinate -i node test/corpus/bench.mjs > $BASE/logs/T8b.log 2>&1` — full run, **never** with `BENCH_IDS`
   (a filtered run overwrites `perf.json` with a partial set).
3. `node test/corpus/perf-dashboard.mjs` (writes `PERF.md`; reads `wasm-perf.json`, which stays as is).

Nothing else runs meanwhile; record load before and after.

## Write-set
`test/corpus/perf.json`, `test/corpus/PERF.md`.

## Acceptance criteria
- Given the new `perf.json`, then it covers the same ids as the old one, and its native column comes from the T8a
  timings.
- Given old vs new port timings for the same port bundle, then the journal reports the median port/native ratio
  before and after, and any id whose ratio moved by more than 2× (expected only where native time moved, T8a).

## Observability / rollback
Journal row. Reversible.
