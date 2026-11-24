# T10 — engine format walks (`test(T10)`)

For each engine in `circo fdp neato osage patchwork sfdp twopi`, one walk process at a time, each after deleting
its own JSONL:

| Walk | Delete first | Command |
|---|---|---|
| json | `test/corpus/json-parity-<e>.jsonl` | `JSON_CONCURRENCY=5 npx tsx test/corpus/json-walk.ts <e> --survey` |
| map | `test/corpus/map-parity-<e>.jsonl` | `MAP_CONCURRENCY=5 npx tsx test/corpus/map-walk.ts <e>` |
| plain | `test/corpus/plain-parity-<e>.jsonl` | `PLAIN_CONCURRENCY=5 npx tsx test/corpus/plain-walk.ts <e>` |

21 runs, each under `caffeinate -i`, log `$BASE/logs/T10-<walk>-<e>.log`. Then `json-dashboard.ts` and
`map-dashboard.ts` again if T8 already ran them (their output depends on both tasks; the later task commits it).
Scope is the survey's conformant set, so start after T7 commits.

## Write-set
`test/corpus/{json,map,plain}-parity-{circo,fdp,neato,osage,patchwork,sfdp,twopi}.{json,jsonl}`; shares
`PARITY-JSON.md`/`PARITY-MAP.md` with T8 — whichever finishes last regenerates and commits them.

## Acceptance criteria
- Batch 2a common criteria for all 21 files.
- Given a walk that ends without a summary, then the journal records why and it is rerun once before stop 2.

## Observability / rollback
Journal row per walk (or one row per engine). Reversible.
