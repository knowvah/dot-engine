# T15: `kkutils`, `opt_arrangement`, `compute_hierarchy` (item 43a, AD-6)

**Context:** `stress_majorization_with_hierarchy` (`lib/neatogen/constrained_majorization.c:35`)
calls `compute_y_coords` (`opt_arrangement.c:47`, 92 lines: `construct_b` + conjugate
gradient) and `compute_hierarchy` (`compute_hierarchy.c`, 117 lines), which sorts with
`quicksort_place` (`kkutils.c:161`); `quicksort_placef` (float) is used by
`quad_prog_solve.c`. None is ported. `conjugate_gradient` is ported
(`src/layout/neato/conjgrad.ts`), as are the `vtx_data` builder and matrix ops
(`matrix-ops.ts`).

**Task:** port, symbol for symbol with `@see` tags:
- `src/layout/neato/kkutils.ts`: `quicksort_place`, `quicksort_placef` and their static
  helpers (`split_by_place`, …) exactly (pivot choice and recursion order matter for ties).
- `src/layout/neato/opt-arrangement.ts`: `construct_b`, `compute_y_coords`.
- `src/layout/neato/compute-hierarchy.ts`: `compute_hierarchy`.
Follow `batch-3b/hier-harness.md`.

**Write-set:** the three new files + their tests.
**Read-set:** `lib/neatogen/{kkutils.c:140-207,opt_arrangement.c,compute_hierarchy.c,digcola.h}`;
`src/layout/neato/conjgrad.ts`, `matrix-ops.ts` (exports); `init.ts:330-360`.

**Interface output (T22):**
- `quicksortPlace(place: Float64Array, ordering: Int32Array, size: number): void` (C: `kkutils.c:161`)
  and `quicksortPlacef(place: Float32Array, …)` (signature as C's).
- `computeYCoords(graph: VtxData[], n: number, y: Float64Array, maxIter: number): 0 | 1`.
- `computeHierarchy(graph: VtxData[], n: number, absTol: number, relTol: number,
  given: Float64Array | null): { ordering: Int32Array; levels: Int32Array; numLevels: number } | null`
  (`null` = C's nonzero return).

**Acceptance criteria:**
- *Given* the three harness inputs, *when* each function runs, *then* every output equals
  the harness bit for bit (`%a`).
- *Given* tied `place` values, *then* `quicksortPlace`'s ordering equals C's.
- *Given* `npm test`, *then* the new tests pass and no existing test changes.

**Observability:** N/A. **Rollback:** reversible (new, unwired files).
