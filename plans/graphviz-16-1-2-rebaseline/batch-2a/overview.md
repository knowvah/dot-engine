# Batch 2a — native timings, then the walks

The orchestrator runs these as background processes under `caffeinate -i`, logs in `$BASE/logs/`. **T6 runs
first and alone** (the survey budgets each id from `native-timings.json`, `test/corpus/survey.ts:93-100`).
Then T7, whose conformant set scopes every other walk (`engine-walk.ts:430-444`; the format walks likewise),
so T8–T10 start on the T7 commit. Then at most two of T8–T10 at a time, each with `*_CONCURRENCY=5`, 1-minute
load ≤ 12: T9 (the long serial chain) with T8, then T10 when T8 finishes. Each task commits only its own files when its run finishes; stage by path, never while
a walk reads the registries being staged.

| ID | Description | Writes | Depends On | Done |
|---|---|---|---|---|
| T6 | [Native timings](T6-native-timings.md) | `test/corpus/native-timings.json` | T5 | [x] |
| T7 | [Dot survey](T7-dot-survey.md) | `test/corpus/parity.json`, `PARITY-dot.md` | T6 | [x] |
| T8 | [Dot formats](T8-dot-formats.md) | `dot-parity-dot.*`, `xdot-parity.*`, `json-parity.*`, `map-parity*.*`, `plain-parity-dot.*`, `PARITY-{XDOT,JSON,MAP}.md` | T6 | [x] |
| T9 | [Engine walks](T9-engine-walks.md) | `parity-{circo,fdp,neato,osage,patchwork,sfdp,twopi}.*` | T6 | [ ] |
| T10 | [Engine formats](T10-engine-formats.md) | `{json,map,plain}-parity-<engine>.*` (7 engines) | T6 | [x] |

## Every task's acceptance criteria (plus its own)
- Given the regenerated summary, then its oracle version field reads 16.1.2.
- Given the old copy in `$BASE/old/`, then the new file has the same id set, or every missing/added id is
  explained in the journal (the 7 pending inputs are quarantined, so the set should not change).
- Given old vs new, then a verdict-diff table `$BASE/diff/<file>.tsv` (`id  old  new`) exists and its counts per
  transition go in the journal row. These tables are T12's input.
- Rows whose native output is now empty with exit 1 are tagged `render-skip?` in the table (AD-2), for T12.
- The task's gates pass, except failures T13 owns (registry staleness): recorded, not fixed here.
