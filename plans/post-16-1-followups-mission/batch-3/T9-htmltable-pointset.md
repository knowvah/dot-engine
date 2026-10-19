# T9: `perf(T9)`: HTML cell-occupancy set on `PointSet`

**Context:** C `lib/common/htmltable.c:findCol`/`processTbl` (`newPS` at :1198) track
occupied (column, row) cells for spans. The port's `src/common/htmltable.ts` uses
`used: Set<string>` keyed `` `${c},${r}` `` (:48, :59, :66, :311).

**Task:** switch `findCol` and `processTbl` to `PointSet` (`isInPS(c, r)` /
`addPS(c, r)`). Write the test first: a rowspan/colspan table whose column assignment
depends on occupancy.

**Write-set:** `src/common/htmltable.ts`, `src/common/htmltable*.test.ts`.
**Read-set:** `~/git/graphviz/lib/common/htmltable.c:1160-1230`;
`src/common/htmltable.ts:40-70, 300-330`.

**Acceptance criteria:**
- *Given* a table with overlapping row and column spans, *when* processed, *then* each
  cell's (col, row) equals C's.
- *Given* T0's dot baseline, *when* re-rendered, *then* every SVG is byte-identical.

**Observability:** N/A. **Rollback:** reversible.
