# T4 — dot format walks (`test(T4)`)

Run sequentially inside this task (one walk process at a time), each after deleting its own JSONL:

| Walk | Delete first | Command |
|---|---|---|
| dot (agwrite) | `test/corpus/dot-parity-dot.jsonl` | `DOT_CONCURRENCY=5 npx tsx test/corpus/dot-walk.ts dot` |
| xdot | `test/corpus/xdot-parity.jsonl` | `XDOT_CONCURRENCY=5 npx tsx test/corpus/xdot-walk.ts --survey` |
| json | `test/corpus/json-parity.jsonl` | `JSON_CONCURRENCY=5 npx tsx test/corpus/json-walk.ts --survey` |
| map | `test/corpus/map-parity-dot.jsonl` if present, else `map-parity.jsonl` | `MAP_CONCURRENCY=5 npx tsx test/corpus/map-walk.ts dot` |
| plain | `test/corpus/plain-parity-dot.jsonl` | `PLAIN_CONCURRENCY=5 npx tsx test/corpus/plain-walk.ts dot` |

Each under `caffeinate -i`, log `$BASE/logs/T4-<walk>.log`. Without `--survey`, xdot and json walks stop at the first
divergence and write nothing: always pass it. Then `npx tsx test/corpus/xdot-dashboard.ts`,
`json-dashboard.ts`, `map-dashboard.ts` (PARITY-XDOT/JSON/MAP.md).

**#149 expectation:** 16.1.1 writes a body's edges after its nodes, in creation order (`write.c:write_body`).
`-Tdot`/`-Txdot` comparisons that are order-sensitive may flip in bulk; that class is #149's, not a stop-6 event,
once T9a confirms the signature.

## Write-set
`test/corpus/{dot-parity-dot,xdot-parity,json-parity,map-parity,plain-parity-dot}.{json,jsonl}` (and
`map-parity-dot.*` if the walk writes it), `test/corpus/PARITY-{XDOT,JSON,MAP}.md`.

## Acceptance criteria
- Given each summary, then it records 16.1.1 and the old id set (batch 2a common criteria).
- Given `$BASE/diff/<file>.tsv` per walk, then transitions are counted in the journal.

## Observability / rollback
Journal row per walk. Reversible.
