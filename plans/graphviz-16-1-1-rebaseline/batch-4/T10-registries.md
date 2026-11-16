# T10 — hand-maintained registries (`test(T10)`)

## Context
The accepted-divergence registries and the quarantine are hand-maintained; `registry-staleness.test.ts` checks every
entry against the committed walk rows, so after batch 2 some entries are stale (the divergence vanished on 16.1.1)
and some ids may newly need quarantine or leave it (16.1.1 fixes native hangs: `2854` is quarantined `perf`).
AD-3: **do not** add 16.1.1-caused failures here — they are pending ports, listed on their issues.

## Task
1. Run `npx vitest run test/corpus/registry-staleness.test.ts test/corpus/accepted-divergences*.test.ts
   test/corpus/engine-exclusions.test.ts`; list every failure.
2. For each stale entry: confirm with the T9 classification that the divergence is gone because native changed
   (cite the group); remove it. Never remove an entry whose divergence still reproduces.
3. Entries whose matched id changed class (e.g. attribution `drift-exonerated` lost, T7): update per the group.
4. `engine-exclusions.json`: re-check each entry's three criteria (degenerate, expensive, covered elsewhere) against
   the T8a timings; remove entries 16.1.1 no longer justifies, with the evidence in the entry's place in the journal.
5. Fix the stale comment in `accepted-divergences-engines.json` ("written by engine-walk.ts": no writer exists) if
   it is a 1–3 line change.

## Write-set
`test/corpus/accepted-divergences.json`, `accepted-divergences-{dot,engines,json,map,plain,xdot}.json`,
`test/corpus/engine-exclusions.json`.

## Read-set
`plans/graphviz-16-1-1-rebaseline/classification/{dot,engines}.md`, `test/corpus/registry-staleness.ts`,
`test/corpus/accepted-class.ts:100-130`, `$BASE/diff/*.tsv`, [decisions.md](../decisions.md) AD-3.

## Acceptance criteria
- Given the staleness and registry tests, then they pass.
- Given each removed or changed entry, then the hand-back cites its T9 group and native evidence.
- Given the diff of each registry, then no entry was added for a 16.1.1-caused failure (AD-3).
- Gates: typecheck, `npm test`, corpus + docs green.

## Observability / rollback
N/A. Reversible.
