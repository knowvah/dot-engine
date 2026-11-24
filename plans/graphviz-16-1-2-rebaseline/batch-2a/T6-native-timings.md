# T6 — native timings (`test(T6)`), alone

## Why first
`survey.ts:93-100`, `bench.mjs` and `wasm-bench.mjs` read `native-timings.json` (`dotVersion` 16.1.1, 941 ids at
#147). The survey sets each id's port budget from it; 16.1.2 changes native behaviour (crash fixes, the render
skip of #299), so the old floors are wrong for 16.1.2.

## Command
`caffeinate -i env CAPTURE_FORCE=1 node test/corpus/capture-native.mjs > $BASE/logs/T6.log 2>&1`
(defaults from `oracle-paths.mjs` after T2; confirm the cap and concurrency variables in the script header and
record them). Nothing else heavy runs meanwhile; record the load at start, peak and end.

## Write-set
`test/corpus/native-timings.json`.

## Acceptance criteria
- Given the run, then `dotVersion` is 16.1.2 and the id count equals the old count or the difference is
  journaled.
- Given old vs new, then the journal lists ids whose native time moved by more than 2× either way, ids that
  failed or were capped on 16.1.1 and now finish, and ids that now exit 1 with no output (render skip, AD-2;
  `2778` expected).
- Given a run at 1-minute load > 12 for more than a few minutes, then it is discarded and re-run.

## Observability / rollback
Journal row: runtime, load, counts. Reversible.
