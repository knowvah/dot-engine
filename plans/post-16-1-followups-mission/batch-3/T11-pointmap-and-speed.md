# T11: assess neato `PointMap`; measure item-11 speed

**Context:**
- C `lib/neatogen/neatoinit.c:checkEdge` (:665, used by `makeGraphData` at :757 and
  :810) uses a `PointMap` (`newPM`/`insertPM` in `pointset.c`).
- The port's `src/layout/neato/init.ts` `makeGraphDataC` uses a per-node
  `Map<number, number>` (:372). It is already numeric, so a port is warranted only if
  the behaviour differs observably.

**Task:**
1. Compare C's `insertPM` semantics (first insert wins, returns the existing value) with
   the port's map, line by line. If they are equivalent, record a journal row and make no
   commit. If they differ observably, write a failing test, port `PointMap` into
   `src/common/pointset.ts`, and commit as `fix(T11)`. That second case widens the
   write-set, so it is a STOP: ask first.
2. If `uptime` load is below 8, re-time the `timings-before.json` ids on the batch-3 head.
   Record before/after p50/p90 in the journal. Any id slower than 1.10× is a finding to
   diagnose. If the load is 8 or higher, defer to T14.

**Write-set:** the mission journal; `src/layout/neato/init.ts` only per step 1.
**Read-set:** `~/git/graphviz/lib/neatogen/neatoinit.c:650-820`,
`~/git/graphviz/lib/common/pointset.c` (`PointMap`); `src/layout/neato/init.ts:360-390`.

**Acceptance criteria:**
- *Given* the side-by-side comparison, *then* the journal states "equivalent" or
  "differs", with the deciding lines cited.
- *Given* the speed run, *then* no item-11 id is slower than 1.10× its T0 time without a
  stated cause.

**Observability:** N/A. **Rollback:** reversible.
