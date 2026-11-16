# T5 — engine walks (`test(T5)`)

`engine-walk.ts` is serial (one id at a time; no concurrency variable). Run the 7 engines one after another in a
single background chain, each after deleting its own `test/corpus/parity-<engine>.jsonl`:

`for e in circo osage patchwork twopi neato fdp sfdp; do rm -f test/corpus/parity-$e.jsonl; caffeinate -i npx tsx test/corpus/engine-walk.ts $e > $BASE/logs/T5-$e.log 2>&1 || break; done`

Defaults (after T1): 16.1.1 binary, `/tmp/ghl1611-all`. circo alone took ~30 min historically; the set takes
many hours. Budget variables `ENGINE_TIMEOUT_MULT`, `ENGINE_TIMEOUT_FLOOR_MS`, `ENGINE_ORACLE_TIMEOUT_MS` keep
their defaults (record them in the journal).

**Expectations:** #156 (neato double-precision Laplacian and CG) moves neato/sfdp-family numbers; #157 (fdp ctr,
`-0.0`); #164 (ortho permutation via libc `rand()`). Nondeterministic engines: a flip alone is not a change
until T9b's ≥8 native runs.

## Write-set
`test/corpus/parity-{circo,fdp,neato,osage,patchwork,sfdp,twopi}.{json,jsonl}`.

## Acceptance criteria
- Given each `parity-<engine>.json`, then it records 16.1.1 and the manifest's id set less `engine-exclusions.json`.
- Given `$BASE/diff/parity-<engine>.tsv`, then transitions per engine are in the journal.
- Given a chain failure (`break`), then the journal names the engine and the log tail, and the chain resumes from
  that engine only after diagnosis.

## Interface contract (consumed by T7)
Committed `parity-<engine>.json` for fdp, neato, sfdp, twopi (attribution reads them) and all 7 (oracle-error
classifier reads their `oracle-error`/`timeout` rows).

## Observability / rollback
Journal row per engine. Reversible.
