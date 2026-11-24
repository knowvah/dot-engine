# T9 — engine walks (`test(T9)`)

`engine-walk.ts` is serial (one id at a time). Run the 7 engines one after another in a single background chain,
each after deleting its own `test/corpus/parity-<engine>.jsonl`:

`for e in circo osage patchwork twopi neato fdp sfdp; do rm -f test/corpus/parity-$e.jsonl; caffeinate -i npx tsx test/corpus/engine-walk.ts $e > $BASE/logs/T9-$e.log 2>&1 || break; done`

Defaults (after T2): 16.1.2 carried, `/tmp/ghl1612-carried-all`. #147's chain took 22 h. Budget variables
`ENGINE_TIMEOUT_MULT`, `ENGINE_TIMEOUT_FLOOR_MS`, `ENGINE_ORACLE_TIMEOUT_MS` keep their defaults (record them).
Engine walks take the survey's conformant ids (`engine-walk.ts:430-444`), so start after T7 commits.

**Expectations (#295 triage):** #301 `conc_slope`, #302 `reallyroutespline` (shared routing, all engines), #303
fdp `mapc` (`2717` crash fix); neatogen `s1` refactor (no change expected). Nondeterministic engines: a flip
alone is not a change until T12b's ≥8 native runs.

## Write-set
`test/corpus/parity-{circo,fdp,neato,osage,patchwork,sfdp,twopi}.{json,jsonl}`.

## Acceptance criteria
- Given each `parity-<engine>.json`, then it records 16.1.2 and the survey's conformant id set less
  `engine-exclusions.json`.
- Given `$BASE/diff/parity-<engine>.tsv`, then transitions per engine are in the journal.
- Given a chain failure (`break`), then the journal names the engine and the log tail, and the chain resumes
  from that engine only after diagnosis.

## Interface contract (consumed by T11)
Committed `parity-<engine>.json` for fdp, neato, sfdp, twopi (attribution reads them) and all 7 (the
oracle-error classifier reads their `oracle-error`/`timeout` rows).

## Observability / rollback
Journal row per engine. Reversible.
