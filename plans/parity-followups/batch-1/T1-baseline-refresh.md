<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Targeted engine-track refresh

## Context
The engine xdot tracks (`test/corpus/parity-<engine>.json`) carry
oracle-error/timeout rows recorded in earlier missions. At least one is stale
(circo 2095_1 -Txdot exits 0 when run fresh, verified 2026-07-24), and the
2619/2516 family is oracle-error on ALL engines — artifact smell. The 9
blind-spot registry accepts (AD-1) cite these rows.

## Task
1. For each of the 7 engines: collect its oracle-error/timeout ids from
   `parity-<engine>.json`, strip those rows from the engine's parity JSONL,
   re-run `engine-walk.ts <engine>` (resume model re-computes only stripped
   ids), regenerate the summary.
2. Double-run the oracle on each formerly-error id (sha compare) before
   trusting a fresh verdict; invalidate oracle caches if verdicts look
   impossible (repo journal 2026-07-24 anomaly discipline).
3. For every blind-spot id whose xdot NOW PASSES: re-verdict its json/map
   entries (strip rows, re-run those walkers for that engine) — if they pass
   too, delete the registry entries; if they still diverge, leave for T3–T5
   with the fresh xdot baseline noted.
4. Record per-id outcomes (was → now) in the mission journal; genuine native
   crashes stay oracle-error (listed, premise check per stop condition 7).

## Write-set
- `test/corpus/parity-<engine>.json` + `.jsonl` (7 engines)
- `test/corpus/accepted-divergences-{json,map,plain}.json` (closures only)
- `test/corpus/{json,map}-parity-<engine>.json(l)` for re-verdicted ids

## Read-set
- `test/corpus/engine-walk.ts` (resume model), repo journal 2026-07-24
  entries (anomaly discipline), the three registries' follow-up entries.

## Interface contract (consumed by T3–T5)
Fresh `{ id, status }` per blind-spot id in `parity-<engine>.json`, plus a
journal note listing which ids remain to diagnose.

## Acceptance criteria
- Given the stripped rows, when engine-walk re-runs, then every former
  oracle-error/timeout id has a current verdict; no stale rows remain.
- Given a blind-spot id that now passes xdot+json+map, then its registry
  entries are deleted (no placeholder rationale survives for a passing id).
- Given regeneration, then no previously-passing engine-track id regressed.

## Observability / rollback
N/A — no new observable operations. Reversible (git).

## Quality bar
`npm run typecheck` + `npm test` green; journal updated; pgrep-verified no
sweep runs during any registry edit.
