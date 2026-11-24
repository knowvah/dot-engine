# T11 — attribution and oracle errors (`test(T11)`)

## Lesson from #147 (journal, T7 row)
The classifier and attribution once defaulted `GVBINDIR` to the dot-only dir, so every non-dot engine failed in
~1 s and was filed `harness-error`. T2 of #147 fixed the defaults (`defaultGvbindir`); still check the first
rows of each log: ~1 s per id or any `harness-error` means the plugin dir is wrong — stop, fix, rerun fresh.

## Commands
1. Attribution, one engine at a time (each takes the oracle's sha1 and refuses to resume 16.1.1 rows):
   `for e in twopi fdp sfdp neato; do caffeinate -i env ATTR_ORACLE_TIMEOUT_MS=3600000 npx tsx test/corpus/attribute-divergence.ts $e --fresh > $BASE/logs/T11-attr-$e.log 2>&1 || break; done`
2. Oracle errors: `caffeinate -i npx tsx test/corpus/oracle-error-classifier.ts circo fdp neato osage patchwork sfdp twopi > $BASE/logs/T11-oe.log 2>&1`
   (reruns each oracle-error or timeout row up to 3× at 60/120/240 s, serially).

## Write-set
`test/corpus/attribution-{fdp,neato,sfdp,twopi}.{json,jsonl}`, `test/corpus/oracle-errors-{circo,fdp,neato,osage,patchwork,sfdp,twopi}.json`.

## Acceptance criteria
- Given each attribution summary, then the oracle sha1 is the 16.1.2 carried binary's, there are 0
  `harness-error` rows, and the row set equals the engine's diverged/structural rows in T9's `parity-<engine>.json`.
- Given old vs new attribution, then the journal counts class changes (e.g. `drift-exonerated` ↔ other); these
  feed `accepted-class.ts`, so T13 reads them.
- Given each `oracle-errors-<engine>.json`, then the journal lists ids that left or entered the oracle-error set,
  marking render-skip ones (native exit 1, empty output; AD-2).

## Observability / rollback
Journal rows. Reversible.
