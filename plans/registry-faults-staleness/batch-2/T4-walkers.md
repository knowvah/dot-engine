# T4 — json/map walkers accept registered port-errors

## Context

`test/corpus/json-walk.ts` and `map-walk.ts` resolve acceptance at **walk time**:
`loadAccepted` (`json-walk.ts:358-376`, `map-walk.ts:444-461`) builds a
`Set<string>` of accepted ids, and only a *diverged* comparison becomes
`'accepted'` (`json-walk.ts:328`, `map-walk.ts:353`). A port failure returns
early with `verdict: port.verdict` (`json-walk.ts:319-321`, `map-walk.ts:394-401`),
so A10's `2784` rows stay `port-error`. Per [AD-3](../decisions.md#ad-3), T4
makes a port-error/timeout row `'accepted'` when a registry entry for that
(id, engine) declares the matching `verdict`/`errIncludes`, using T1's
`acceptsOutcome` — no duplicated rule.

## Task

1. `loadAccepted` in both walkers returns two things: the existing diverged-
   acceptance id set (class members + entries whose `declaredVerdict` is
   `'diverged'`) and a `Map<string, FaultAcceptance>` of fault entries for this
   engine (engine-less entries apply to every engine, as today). A fault entry
   must **not** land in the diverged set.
2. In each `walkOne`'s port-failure branch: if the fault map has the id and
   `acceptsOutcome(entry, {outcome: port.verdict, errs: [errMsg]})` holds, write
   `verdict: 'accepted'` (map: top-level and both `cmapx`/`imap` results), keeping
   `errMsg`. Otherwise unchanged. Keep scrubbing (`scrubHome`) before matching.
3. Thread the new structure through `runDefault`/`runSurvey`/`runEngineWalk`
   signatures. In `runDefault`, an accepted fault row must not halt the walk.
4. `json-dashboard.ts` / `map-dashboard.ts`: accepted rows with no `diffCount`
   render (blank `#diffs`) without throwing; the accepted-roster table renders
   an entry that has `verdict`/`errIncludes` (use `errIncludes` when `delta` is
   absent). Change only what is needed for that.
5. Tests: the walkers have no unit tests and run under an `isMain` guard. Do not
   add a walker harness; instead export a small pure helper from each walker
   (e.g. `faultVerdict(entry | undefined, portVerdict, errMsg)`) only if it
   adds logic beyond `acceptsOutcome`; otherwise keep the glue to one call and
   rely on T1's tests plus T5's re-walk (the end-to-end proof). State which in
   the hand-back.

## Write-set

- `test/corpus/json-walk.ts`
- `test/corpus/map-walk.ts`
- `test/corpus/json-dashboard.ts`
- `test/corpus/map-dashboard.ts`

## Read-set

- T1's exports in `test/corpus/accepted-class.ts`
- `test/corpus/json-walk.ts:120-150`, `:306-376`, `:425-512`
- `test/corpus/map-walk.ts:105-160`, `:338-461`, `:497-645`
- `test/corpus/json-dashboard.ts:160-240`, `test/corpus/map-dashboard.ts:150-240`
- `../decisions.md#ad-1`, `#ad-3`, `#ad-7`

## Acceptance criteria

- Given a json/map entry `{id:'2784', engine:'circo', verdict:'port-error',
  errIncludes:'Map maximum size exceeded'}`, when the port render fails with that
  message, then the row verdict is `'accepted'` and `errMsg` is kept (map: both
  formats).
- Given a port error whose message lacks `errIncludes`, then the verdict stays
  `'port-error'`.
- Given a fault entry, when the port output instead *diverges*, then the row is
  `'diverged'` (a fault entry does not accept divergence).
- Given an accepted row without `diffCount`, when the dashboards are regenerated
  (`npx tsx test/corpus/json-dashboard.ts`, `map-dashboard.ts`), then they
  render without error and the current committed data produces no diff
  (`git checkout` the outputs after inspecting).
- `npm run typecheck` exit 0; no walker run is required in T4 (T5 runs them).

## Quality bar

TS strict, no `any`; `acceptsOutcome` is the only acceptance rule; existing
behaviour for diverged acceptance byte-identical; `npx vitest run test/corpus
test/docs` and `bash test/golden/gates.sh` green.

## Observability

N/A — no new observable operations.

## Rollback

Reversible — revert the commit; rows re-walked later revert to `port-error`.

## Commit

`feat(corpus): accept registered port-errors in json and map walks`
