# T7 — attribution and oracle errors (`test(T7)`)

## Commands
1. Attribution, one engine at a time (each takes the oracle's sha1 and refuses to resume 16.1.0 rows; `--fresh`
   is required):
   `for e in twopi fdp sfdp neato; do caffeinate -i npx tsx test/corpus/attribute-divergence.ts $e --fresh > $BASE/logs/T7-attr-$e.log 2>&1 || break; done`
   Historical heavy tail: use `ATTR_ORACLE_TIMEOUT_MS=3600000` if the default caps ids that finished before.
2. Oracle errors: `caffeinate -i npx tsx test/corpus/oracle-error-classifier.ts circo fdp neato osage patchwork sfdp twopi > $BASE/logs/T7-oe.log 2>&1`
   (confirm the argument form in `oracle-error-classifier.ts` before running; it reruns each oracle-error or
   timeout row up to 3× at 60/120/240 s, serially).

## Write-set
`test/corpus/attribution-{fdp,neato,sfdp,twopi}.{json,jsonl}`, `test/corpus/oracle-errors-{circo,fdp,neato,osage,patchwork,sfdp,twopi}.json`.

## Acceptance criteria
- Given each attribution summary, then the oracle sha1 is the 16.1.1 binary's and the row set equals the
  engine's diverged/structural rows in the T5 `parity-<engine>.json`.
- Given old vs new attribution, then the journal counts class changes (e.g. `drift-exonerated` ↔ other); these
  feed `accepted-class.ts`, so T10 reads them.
- Given each `oracle-errors-<engine>.json`, then the journal lists ids that left or entered the oracle-error set.

## Observability / rollback
Journal rows. Reversible.
