# T3 — engine-track report join accepts fault rows

## Context

`test/corpus/parity-report.ts` builds `PARITY-<engine>.md` and the cross-engine
`PARITY.md` from `parity-<engine>.json` (engine walks) joined at report time with
`accepted-divergences-engines.json` (`engine → id → entry`). Today the join only
accepts `diverged` rows (`computeAcceptedIds`, `parity-report.ts:196-208`;
`engineMarkdown`, `:529-560`), so A10's `2784` port-error rows (`err: "Map maximum
size exceeded"`) cannot be accepted and sit in the fault table. T3 extends the
join with T1's rule ([AD-3](../decisions.md#ad-3)): a per-id entry whose
`verdict`/`errIncludes` match a `port-error`/`timeout` row accepts it.

## Task

TDD in `parity-report.test.ts` first, then:

1. `EngineAcceptedEntry` (`:102-106`) gains T1's `FaultAcceptance` fields.
2. `computeAcceptedIds`: a row is accepted iff a per-id entry exists and
   `acceptsOutcome(entry, {outcome: r.status, errs: r.err ? [r.err] : []})`
   (class entries still accept only `diverged`, unchanged).
3. `engineRow` (`:395-415`): accepted fault rows are subtracted from
   `portFaults` (not from `diverged`); accepted diverged rows as today.
   `accepted` = both. Totals must still sum to `surveyed`.
4. `engineMarkdown`: accepted fault rows move from the faults table to the
   accepted table (`engineAcceptedTable`, `:483-499`); render `#diffs` blank for
   them and the bound column falls back to `errIncludes` when `bound` is absent.
   The Summary counts use the same split as `engineRow`.
5. `accepted-divergences-engines.test.ts`: per-id entries must pass T1's
   `validateFaultFields` (failure names `engine/id`).

Do not touch the json/map/plain detail-page code (T4 resolves those at walk
time) or the dot-track join (`accepted.ts`).

## Write-set

- `test/corpus/parity-report.ts`
- `test/corpus/parity-report.test.ts`
- `test/corpus/accepted-divergences-engines.test.ts`

## Read-set

- T1's exports in `test/corpus/accepted-class.ts`
- `test/corpus/parity-report.ts:100-125`, `:182-212`, `:395-416`, `:483-600`
- `test/corpus/parity-report.test.ts:1-40`, `:112-235` (fixtures, existing cases)
- `test/corpus/accepted-divergences-engines.test.ts` (whole, 110 lines)
- `../decisions.md#ad-1`, `#ad-3`, `#ad-7`

## Acceptance criteria

- Given an engines entry `{class:'A10', verdict:'port-error', errIncludes:'Map
  maximum size exceeded', ref}`, when the row is a matching port-error, then
  `engineRow` counts it in `accepted` and not in `portFaults`, and
  `engineMarkdown` lists it in the accepted table, not the faults table.
- Given a port-error row whose `err` lacks `errIncludes` (or an entry without a
  `verdict`), then it stays a fault and is not counted accepted.
- Given a registry entry with invalid fault fields (e.g. `verdict:'port-error'`
  with no `errIncludes`), when `accepted-divergences-engines.test.ts` runs, then
  it fails naming `engine/id`.
- Existing diverged and class-acceptance tests pass unchanged; regenerating the
  dashboards from the current committed data (no A10 entries yet) produces no
  `PARITY-*.md` diff (run `npx tsx test/corpus/parity-report.ts`, inspect,
  then `git checkout test/corpus/PARITY*.md`).

## Quality bar

TS strict, no `any`; no new duplicated acceptance logic (call `acceptsOutcome`);
`npm run typecheck`, `npx vitest run test/corpus test/docs`, `bash test/golden/gates.sh` green.

## Observability

N/A — dashboard rendering only; no new observable operations.

## Rollback

Reversible — revert the commit; the registry change is additive.

## Commit

`feat(corpus): accept registered port-errors in engine dashboards`
