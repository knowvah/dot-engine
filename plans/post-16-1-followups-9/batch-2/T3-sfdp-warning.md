# T3: sfdp `start` warning (item 112, AD-8)

**Context:** `sfdpinit.c:tuneControl` calls `setSeed(g, INIT_RANDOM, &seed)` and warns when the result is
not `INIT_RANDOM`. The port's `resolveSeed` never warns. Follow-up 112 asked about warning order; planning
found the warning is missing altogether. Native's text is `Warning: sfdp only supports start=random`.

**Task:**
1. Tests first, from T0's `src/layout/sfdp/__fixtures__/start-warning/`, in `init.branch.test.ts`.
2. In `tuneControl`, classify with `parseStart(aggetGraph(g, 'start'), INIT_RANDOM)` from
   `neato/start.ts` and warn through `agerr.ts` when `init !== INIT_RANDOM`, at C's point in the function.
3. Keep `resolveSeed` as it is, so seeds do not move. Keep the existing `start=self` seed test.
4. Check order against native on a graph that also warns elsewhere, if the fixtures have one.

**Write-set:** `src/layout/sfdp/init.ts`, `src/layout/sfdp/init.branch.test.ts`.
**Read-set:** `~/git/graphviz/lib/sfdpgen/sfdpinit.c:200-215`, `~/git/graphviz/lib/neatogen/neatoinit.c`
(`setSeed`), `src/layout/neato/start.ts:60-85`, `src/layout/sfdp/init.ts:106-135`.

**Acceptance criteria:**
- *Given* sfdp with `start=self` or `start=regular`, *when* laid out, *then* stderr equals native's.
- *Given* `start=5`, `start=random5` or no `start`, *when* laid out, *then* no warning is printed.
- *Given* every case above, *when* compared with T0's fixtures, *then* xdot equals the pre-T3 output
  (stop 10) and matches native at 0.01.

**Commit:** `fix(T3): warn on sfdp start modes other than random`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
