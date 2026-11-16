# Batch 2b — attribution, oracle errors, port bench

After batch 2a is committed. T7 may pair with nothing heavy but itself; T8b runs alone, last.

| ID | Description | Writes | Depends On | Done |
|---|---|---|---|---|
| T7 | [Attribution and oracle errors](T7-attribution-oracle-errors.md) | `attribution-{fdp,neato,sfdp,twopi}.*`, `oracle-errors-*.json` | T5 | [x] |
| T8b | [Port bench](T8b-port-bench.md) | `perf.json`, `PERF.md` | T7 | deferred: #222 |

Batch 2a's common acceptance criteria apply to every file here too.
