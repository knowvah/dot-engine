# T3: oracle nondeterminism in walks (item 69, AD-13)

**Context:** native 16.1.0 gives 2–3 distinct xdots in 5–6 runs on some fdp/sfdp/neato/
twopi ids (graphs-fdp, linux.x86-neatosplines_neato sfdp, ngk10_4 neato, directed-table
fdp, nshare-arrows_dot twopi; linux.i386-b102 fdp differs between sessions). The walk caches
one oracle draw (`test/corpus/engine-walk.ts` `oracleXdot`), so verdicts flip with no port
change. `EngineWalkStatus` = `'pass' | 'diverged' | 'oracle-error' | 'port-error' |
'timeout'` (`engine-walk.ts:34`).

**Task:**
1. Add `'oracle-nondeterministic'` to `EngineWalkStatus` (and json-walk's equivalent).
2. On a `diverged` verdict, render the oracle 3 more times bypassing the cache; if any two
   of the 4 xdots differ, the row becomes `oracle-nondeterministic` with `nDraws` (distinct
   count) and the fact is recorded through `oracle-env.ts` (keyed by release, engine,
   format, id) so later walks skip the re-runs.
3. Every reader of the status (`grep -rn "EngineWalkStatus\|status === '" test/corpus`):
   `rules-gate.ts`, `parity-report.ts`, dashboards, `engine-walk.test.ts` — treat the new
   status as neither pass nor regression; reports count it separately.

**Write-set:** `test/corpus/engine-walk.ts`, `json-walk.ts`, `oracle-env.ts` and every
`test/corpus/*.ts` reader of the walk status found in step 3, with their tests. Nothing
outside `test/corpus/`.
**Read-set:** `test/corpus/engine-walk.ts:30-60,255-330`, `test/corpus/oracle-env.ts`.

**Interface output (T29):** status `'oracle-nondeterministic'`; row field `nDraws?: number`.

**Acceptance criteria:**
- *Given* a stub oracle returning different xdots on successive calls, *when* an id
  diverges, *then* its row is `oracle-nondeterministic` with `nDraws` ≥ 2.
- *Given* a stub oracle that is stable, *when* an id diverges, *then* the row stays
  `diverged` and the extra runs happen once.
- *Given* a baseline row `pass` and a new row `oracle-nondeterministic`, *when* the
  regression comparison runs, *then* it is not reported as a regression.

**Observability:** N/A. **Rollback:** reversible (test tooling only).
