# T1 — Ratchet harness (known-failing list)

**Agent:** typescript-pro. **Depends on:** —. **Rollback:** Reversible.
**Observability:** N/A — test infrastructure; the list length is the ratchet SLI.

## Context

AD-4. Re-capturing golden refs from 16.1.0 (T2) turns some goldens red before
the port catches up. Gate 3 (`test/golden/gates.sh`) must stay meaningful: known
failures pass as "expected failing", fixes force list removal, and new failures
stay red. The golden suite is `test/golden/suite.test.ts` (one test per
`manifest.json` entry, line ~214; it already skips `knownResidual` entries —
leave that mechanism alone). Per-issue tests are `test/golden/pt-issue-*.test.ts`.

## Task

1. Create `test/golden/known-failing.json` = `{ "goldens": [], "ptIssue": [] }`.
2. Create `test/helpers/known-failing.ts`:
   - `loadKnownFailing()` validates the shape and throws on unknown keys or
     duplicate ids.
   - `goldenTest(id, name, fn)` registers `test.fails` when `id` is listed and
     `test` otherwise; the `test.fails` name carries `[known-failing 16.1]`.
   - `ptIssueTest(id, name, fn)` does the same for the `ptIssue` list.
3. Wire `suite.test.ts`'s per-entry comparison test through `goldenTest`. Add a
   suite-level test asserting every listed golden id exists in `manifest.json`.
4. Unit tests (`test/helpers/known-failing.test.ts`) for the helper's selection
   logic and validation (pure functions; no vitest-internals mocking).

## Interface contract (consumed by T2, T4, T7–T12)

- `known-failing.json`: `{ goldens: string[]; ptIssue: string[] }`, sorted, unique.
- `goldenTest(id: string, name: string, fn: () => void): void`
- `ptIssueTest(id: string, name: string, fn: () => void): void`
- Removing an id is the only way a fixed test turns green.

## Acceptance

- Given an id listed and its comparison failing, when vitest runs, then the test passes.
- Given an id listed and its comparison passing, when vitest runs, then the test
  fails (`test.fails` semantics).
- Given an unlisted id whose comparison fails, then the test fails.
- Given a listed id absent from `manifest.json`, then the suite-level check fails.

## Read-set

`test/golden/suite.test.ts:1-80,200-260`, `test/golden/gates.sh`, `test/helpers/` (listing).

## Write-set

`test/golden/known-failing.json`, `test/helpers/known-failing.ts`,
`test/helpers/known-failing.test.ts`, `test/golden/suite.test.ts`.

## Commit

`test(golden): add a known-failing ratchet for the 16.1 re-pin`
