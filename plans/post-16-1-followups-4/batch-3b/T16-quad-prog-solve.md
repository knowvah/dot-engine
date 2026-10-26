# T16: `quad_prog_solve` (item 43b, AD-6)

**Context:** `lib/neatogen/quad_prog_solve.c` (441 lines: `unpackMatrix`,
`ensureMonotonicOrderingWithGaps`, `initConstrainedMajorization`,
`constrained_majorization_new_with_gaps`, `deleteCMajEnv`, static `equals`) is unported. It
works on `float` (packed `float *`, `float **`), with `quicksort_placef` (T15) and
`util/list.h` lists.

**Task:** port to `src/layout/neato/quad-prog-solve.ts` symbol for symbol (`@see` each),
`float` semantics per `batch-3b/hier-harness.md`; `CMajEnv` as an interface; split long C
functions only at their own phase boundaries (AD-6). `quicksort_placef` comes from T15: if
T15 has not landed, develop against a local copy and switch the import before landing (the
orchestrator lands T15 first).

**Write-set:** `src/layout/neato/quad-prog-solve.ts` (+ test).
**Read-set:** `lib/neatogen/quad_prog_solve.c`, `lib/neatogen/quad_prog_solver.h`,
`lib/neatogen/digcola.h`; `src/layout/neato/matrix-ops.ts`.

**Interface output (T22):**
- `initConstrainedMajorization(packedMat: Float32Array, n: number, ordering: Int32Array,
  levels: Int32Array, numLevels: number): CMajEnv`.
- `constrainedMajorizationNewWithGaps(e: CMajEnv, b: Float32Array, coords: Float32Array[],
  nDims: number, curAxis: number, maxIterations: number, hierarchyBoundaries: Float32Array,
  levelsGap: number): number`.
- `deleteCMajEnv(e: CMajEnv): void` only if it has an observable effect; otherwise omit
  and note it.

**Acceptance criteria:**
- *Given* harness inputs (the probe graph's packed Laplacian and hierarchy, plus the
  random DAG), *when* one solve step runs, *then* `coords` equal the harness bit for bit.
- *Given* equal adjacent places (`equals` with C's tolerance), *then* block merging matches
  the harness.

**Observability:** N/A. **Rollback:** reversible (new, unwired file).
