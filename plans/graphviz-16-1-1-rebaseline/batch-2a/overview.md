# Batch 2a — native timings, then the walks

The orchestrator runs these as background processes under `caffeinate -i`, logs in `$BASE/logs/`.
**T8a runs first and alone** (the survey budgets from its output). Then at most two of T3–T6 at a time, each
with `*_CONCURRENCY=5`, 1-minute load ≤ 12. Order of pairs: (T3, T5) then (T4, T6). Each task commits only its
own files when its run finishes; never commit while a walk reads the registries being staged (stage by path).

| ID | Description | Writes | Depends On | Done |
|---|---|---|---|---|
| T8a | [Native timings](T8a-native-timings.md) | `test/corpus/native-timings.json` | T2 | [x] |
| T3 | [Dot survey](T3-dot-survey.md) | `test/corpus/parity.json`, `PARITY-dot.md` | T8a | [x] |
| T4 | [Dot formats](T4-dot-formats.md) | `dot-parity-dot.*`, `xdot-parity.*`, `json-parity.*`, `map-parity.*`, `plain-parity-dot.*` | T8a | [x] |
| T5 | [Engine walks](T5-engine-walks.md) | `parity-{circo,fdp,neato,osage,patchwork,sfdp,twopi}.*` | T8a | [x] |
| T6 | [Engine formats](T6-engine-formats.md) | `{json,map,plain}-parity-<engine>.*` (7 engines) | T8a | [x] |

## Every task's acceptance criteria (plus its own)
- Given the regenerated summary, then `oracleVersion` (or the summary's version field) reads 16.1.1.
- Given the old copy in `$BASE/old/`, then the new file has the same id set, or every missing/added id is
  explained in the journal (manifest-driven, so ids should not change).
- Given old vs new, then a verdict-diff table `$BASE/diff/<file>.tsv` (`id  old  new`) exists and its counts per
  transition go in the journal row. These tables are T9's input.
- The task's gates pass, except failures T10 owns (registry staleness) — recorded, not fixed here.
