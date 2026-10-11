# T8 — Divergence ledgers from the final sweep

**Agent:** documentation-engineer. **Depends on:** T5, T6, T7. **Rollback:** Reversible.
**Observability:** N/A — updates the ledgers the SLI dashboard (PARITY-dot.md)
reads; no new operations.

## Context

AD-6. After T7's fresh sweep (journal rows of T5 and T7 carry
`conformantNow` / `stillDivergent`), the accepted-divergence registries must
describe reality; `test/corpus/accepted-divergences.test.ts` guards that.
A3/A8 entries: `test/corpus/accepted-divergences.json` (2368, graphs-b100,
graphs-b104, 241_1, 2413_1, 2413_2, graphs-decorate, 2371, 2646) and
`test/corpus/accepted-divergences-xdot.json:26` (self-loop "hypot/ULP class").
Prose: `docs/known-divergences.md` §A3 (405-531) and §A8 (774-889).

## Task

1. For each id in `conformantNow`: remove its accepted entry (every
   `accepted-divergences*.json` that lists it).
2. For each survivor: rewrite its `reason`/`bound` with the new measured maxΔ and
   the mechanism now believed (cite the T5/T7 journal row); do not keep claims the
   mission disproved (e.g. "no portable hypot reproduces Apple's").
3. Re-check the xdot self-loop entry against a fresh xdot comparison
   (`test/golden/compare-xdot.ts` path the survey uses); update or remove.
4. `docs/known-divergences.md`: rewrite §A3/§A8 to the new state; if a class is
   empty, keep a short heading marked CLOSED with the closing commit (precedent:
   §A2). Keep the 2368 overlay images only if 2368 still diverges.
5. `npx vitest run test/corpus` green.

## Acceptance

- Given the final sweep, when an A3/A8 id is conformant, then no accepted entry
  lists it and `accepted-divergences.test.ts` passes.
- Given a survivor, then its entry carries the new maxΔ and mechanism.
- Given `docs/known-divergences.md`, then A3/A8 text matches the registries.

## Read-set

`test/corpus/accepted-divergences.json`, `test/corpus/accepted-divergences-xdot.json`,
`test/corpus/accepted-divergences.test.ts`, `docs/known-divergences.md:405-531,774-889`,
`plans/plantuml-tracker-2/decision-journal.md` (T5, T7 rows).

## Write-set

`test/corpus/accepted-divergences*.json`, `docs/known-divergences.md`.

## Commit

`docs(divergences): retire A3/A8 entries closed by faithful pathplan`
