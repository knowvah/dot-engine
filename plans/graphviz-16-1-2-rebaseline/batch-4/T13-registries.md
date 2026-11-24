# T13 — hand-maintained registries (`test(T13)`, typescript-pro)

## Context
The accepted-divergence registries and `engine-exclusions.json` are hand-maintained; `registry-staleness.test.ts`
checks every entry against the committed walk rows, so after batch 2 some entries are stale (the divergence
vanished on 16.1.2, or a port commit on main fixed it) and attribution classes may have moved (T11). AD-3:
**do not** add 16.1.2-caused failures or render-skip rows here — they are pending ports or #299, listed on
their issues.

## Task
1. Run `npx vitest run test/corpus/registry-staleness.test.ts test/corpus/accepted-divergences*.test.ts
   test/corpus/engine-exclusions.test.ts test/corpus/accepted-class.test.ts`; list every failure.
2. For each stale entry: confirm with the T12 classification why the divergence is gone (cite the group: a 16.1.2
   change or a port commit on main); remove it. Never remove an entry whose divergence still reproduces.
3. Entries whose matched id changed attribution class (T11): update per the group.
4. `engine-exclusions.json`: re-check each entry's criteria (degenerate, expensive, covered elsewhere) against
   T6's timings; remove entries 16.1.2 no longer justifies, with the evidence in the hand-back.

## Write-set
`test/corpus/accepted-divergences.json`, `accepted-divergences-{dot,engines,json,map,plain,xdot}.json`,
`test/corpus/engine-exclusions.json`.

## Read-set
`plans/graphviz-16-1-2-rebaseline/classification/{dot,engines}.md`, `test/corpus/registry-staleness.ts`,
`test/corpus/accepted-class.ts:100-130`, `$BASE/diff/*.tsv`, [decisions.md](../decisions.md) AD-2, AD-3.

## Acceptance criteria
- Given the staleness and registry tests, then they pass.
- Given each removed or changed entry, then the hand-back cites its T12 group and native evidence.
- Given the diff of each registry, then no entry was added for a 16.1.2-caused failure or a render-skip row.
- Gates: typecheck, `npm test`, corpus + docs green.

## Observability / rollback
N/A. Reversible.
