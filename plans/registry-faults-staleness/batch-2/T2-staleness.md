# T2 — registry staleness check + retirements

## Context

dot-engine's accepted-divergence registries (`test/corpus/accepted-divergences-*.json`)
list deliberate, documented differences from native graphviz. Only the dot-track
registry has a staleness guard (`accepted-divergences.test.ts:51-60` fails when an
accepted id turns conformant). The 16.1 sync found 136 stale json entries that no
test caught (`plans/graphviz-16.1-sync/decision-journal.md`, T13 ph.2 row). T2 adds
one table-driven staleness check over the six other registries, reading the
committed walk artifacts, and retires the four entries it flags today.

## Task

1. TDD: `test/corpus/registry-staleness.test.ts` first — unit cases for the helper on
   synthetic rows, then one `describe` per registry over the committed `.jsonl`.
2. `test/corpus/registry-staleness.ts` (pure; Node `fs` only in a small loader):
   - row normalizers → T1's `RawOutcome` (`conformant`/`pass` → `pass`;
     `oracleError` → `oracle-error`; `portError` → `port-error`).
   - `staleReason(entry: FaultAcceptance, row: RawOutcome | undefined): string | null`
     implementing [AD-4](../decisions.md#ad-4): absent → stale; `oracle-error` →
     null (exempt); `accepted` → null; otherwise stale unless T1's
     `acceptsOutcome(entry, row)` is true. The message must name registry,
     engine, id and the row's verdict, and say to retire the entry and its
     `docs/known-divergences.md` prose.
3. Registry table (one row each; AD-6: skip `{ class: true }` entries):

| Registry | Entries | Artifact per engine | Verdict key | Error texts |
|---|---|---|---|---|
| engines | `engine → id → {class,…}` | `parity-<engine>.jsonl` | `status` | `err` |
| json | `divergences[{id, engine?}]` | `json-parity.jsonl` (dot) / `json-parity-<e>.jsonl` | `verdict` | `errMsg` |
| map | `divergences[{id, engine?}]` | `map-parity.jsonl` (dot) / `map-parity-<e>.jsonl` | `verdict` | `cmapx.errMsg`, `imap.errMsg` |
| plain | `divergences[{id, engine}]` | `plain-parity-<e>.jsonl` | `verdict` | `formats.*.errMsg` |
| dot-format | `divergences[{id, engine}]` | `dot-parity-<e>.jsonl` | `verdict` | `formats.*.errMsg` |
| xdot | `divergences[{id}]` (dot only) | `xdot-parity.jsonl` | `verdict` | `errMsg` |

   An entry without `engine` (json `share-Latin1`, `windows-Latin1`) is checked
   against all 8 engines' artifacts (dot circo twopi osage patchwork neato fdp sfdp).
   A missing artifact file for a listed engine is a test failure, not a skip.
4. Retire exactly these entries (STOP 7 if anything else is flagged):
   fdp `1879` in `accepted-divergences-engines.json`, `-json.json`, `-map.json`
   (row is now a `splines=compound … not supported yet` port-error — a tracked gap)
   and `1435` in `accepted-divergences-dot.json` (absent: dot-walk walks only
   SVG-conformant ids). Keep json fdp `1652` and plain circo `2108` (oracle-error,
   exempt). Neither 1879 nor the dot-format 1435 entry has prose in
   `docs/known-divergences.md` (the dot-track 1435 entry is a different registry
   and stays).

## Write-set

- `test/corpus/registry-staleness.ts` (create)
- `test/corpus/registry-staleness.test.ts` (create)
- `test/corpus/accepted-divergences-engines.json` (remove `fdp.1879` only)
- `test/corpus/accepted-divergences-json.json` (remove fdp 1879 only)
- `test/corpus/accepted-divergences-map.json` (remove fdp 1879 only)
- `test/corpus/accepted-divergences-dot.json` (remove 1435 only)

## Read-set

- T1's exports: `test/corpus/accepted-class.ts` (types + `acceptsOutcome`)
- `test/corpus/accepted-divergences.test.ts:1-60` (existing staleness pattern)
- `test/corpus/json-walk.ts:358-375` (engine-less entry semantics)
- First 2 lines of each artifact kind listed above (row shapes)
- `../decisions.md#ad-4`, `#ad-5`, `#ad-6`, `#ad-7`

## Interface contract (output, used by T5/T8 verification)

`staleReason(entry, row)` and the normalizers are exported; the test file runs on
`npx vitest run test/corpus/registry-staleness.test.ts` with no network or oracle.

## Acceptance criteria

- Given each of the six registries, when checked against the committed `.jsonl`,
  then no stale entries remain (after the four retirements).
- Given a synthetic entry whose row is `pass`/`conformant` or absent, then
  `staleReason` returns a message naming registry, engine, id and verdict.
- Given an `oracle-error` (or plain `oracleError`) row, then `staleReason` is null.
- Given a port-error entry, when the row is a port-error (or `accepted`) whose
  errors contain `errIncludes`, then null; when an error lacks it, a reason.
- Given a `{ class: true }` entry, then it is skipped.

## Quality bar

TS strict, no `any`; SPDX headers; the whole registry table runs in < 2 s;
`npm run typecheck`, `npx vitest run test/corpus test/docs`, `bash test/golden/gates.sh` green.

## Observability

N/A — no new observable operations (the test failure message is the signal).

## Rollback

Reversible — revert restores the four entries and removes the test.

## Commit

`test(corpus): fail on stale entries in the walk registries`
(body: names the four retirements and why).
