# T8 — dot format walks (`test(T8)`)

Run sequentially inside this task (one walk process at a time), each after deleting its own JSONL:

| Walk | Delete first | Command |
|---|---|---|
| dot (agwrite) | `test/corpus/dot-parity-dot.jsonl` | `DOT_CONCURRENCY=5 npx tsx test/corpus/dot-walk.ts dot` |
| xdot | `test/corpus/xdot-parity.jsonl` | `XDOT_CONCURRENCY=5 npx tsx test/corpus/xdot-walk.ts --survey` |
| json | `test/corpus/json-parity.jsonl` | `JSON_CONCURRENCY=5 npx tsx test/corpus/json-walk.ts --survey` |
| map | `test/corpus/map-parity-dot.jsonl` if present, else `map-parity.jsonl` | `MAP_CONCURRENCY=5 npx tsx test/corpus/map-walk.ts dot` |
| plain | `test/corpus/plain-parity-dot.jsonl` | `PLAIN_CONCURRENCY=5 npx tsx test/corpus/plain-walk.ts dot` |

Each under `caffeinate -i`, log `$BASE/logs/T8-<walk>.log`. Without `--survey`, xdot and json walks stop at the
first divergence and write nothing: always pass it. Then `npx tsx test/corpus/xdot-dashboard.ts`,
`json-dashboard.ts`, `map-dashboard.ts` (PARITY-XDOT/JSON/MAP.md). Each walk takes only the survey's
conformant ids, so T7 must be committed first.

**Expectations:** #299's render skip turns error-reporting inputs into oracle errors on every format;
16.1.2 changes `write.c`/agwrite only by refactor per the #295 triage, so a bulk `-Tdot` flip is a stop-6
candidate until T12a ties it to a commit.

## Write-set
`test/corpus/{dot-parity-dot,xdot-parity,json-parity,map-parity,plain-parity-dot}.{json,jsonl}` (and
`map-parity-dot.*` if the walk writes it), `test/corpus/PARITY-{XDOT,JSON,MAP}.md`.

## Acceptance criteria
- Given each summary, then it records 16.1.2 and the old id set less T7's newly non-conformant ids plus its newly
  conformant ones (batch 2a common criteria).
- Given `$BASE/diff/<file>.tsv` per walk, then transitions are counted in the journal.

## Observability / rollback
Journal row per walk. Reversible.
