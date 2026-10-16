# T7: `fix(T7)`: warn when an HTML cell or table is too small for its content

**Context:**
- C `lib/common/htmltable.c:1144` (cell) and `:1683` (table) print `cell size too small
  for content` / `table size too small for content` under `FIXEDSIZE`. The neighbouring
  lines (:1150, :1689) print a second message; port it too.
- The port skips both (`src/common/htmltable.ts:292`, "non-visual").
- Decision-journal T4 (2026-10-12): native prints the table warning on nearly every
  empty-FIXEDSIZE-table input.

**Task:**
- Port both warnings at the C call sites, wherever the port computes those sizes
  (`htmltable.ts` or `htmltable-pos.ts`). Do not move logic.
- Write tests first.
- T9 also edits `htmltable.ts` in batch 3, so land this task before T9 starts.

**Write-set:** `src/common/htmltable.ts`, `src/common/htmltable-pos.ts` (only if the size
check lives there), their tests. **Read-set:** `~/git/graphviz/lib/common/htmltable.c:1130-1160,
1670-1700`; `src/common/htmltable.ts:280-300`.

**Acceptance criteria:**
- *Given* a `FIXEDSIZE` cell smaller than its content, *then* `cell size too small for
  content` is warned once per cell, as in C.
- *Given* an empty `FIXEDSIZE` table, *then* `table size too small for content` is warned.
- *Given* the batch-2 shared criteria, *then* SVG is byte-identical and the per-id counts
  match native.

**Observability:** new stderr lines only. **Rollback:** reversible.
