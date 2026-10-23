# T17: `smart_ini_x` `IMDS_given_dim` (item 43c, AD-6)

**Context:** with `mode=hier` and the default `start` (native passes `INIT_SELF`,
`neatoinit.c:1089`, so `opt_smart_init` is set, `:1093`), the 2-D path calls
`IMDS_given_dim(graph, n, y, x, Epsilon)` (`constrained_majorization.c:141`).
`lib/neatogen/smart_ini_x.c` (383 lines: `standardize`, `mat_mult_vec_orthog`,
`power_iteration_orthog`, `compute_avgs`, `compute_Bij`, `IMDS_given_dim`) is unported.

**Task:** port to `src/layout/neato/smart-ini-x.ts`, every static function, `@see` each,
using existing `matrix-ops.ts`/`conjgrad.ts`/APSP ports where C calls them (do not
re-implement them). Per `batch-3b/hier-harness.md`.

**Write-set:** `src/layout/neato/smart-ini-x.ts` (+ test).
**Read-set:** `lib/neatogen/smart_ini_x.c`; `src/layout/neato/{matrix-ops,conjgrad,stress}.ts`
exports; `lib/neatogen/stress.c` `compute_apsp`.

**Interface output (T22):** `imdsGivenDim(graph: VtxData[], n: number, givenCoords:
Float64Array, newCoords: Float64Array, conjTol: number): 0 | 1`.

**Acceptance criteria:**
- *Given* the harness inputs with `y` from `computeYCoords`, *then* `newCoords` equals the
  harness bit for bit.
- *Given* a graph where C returns nonzero, *then* the port returns 1.

**Observability:** N/A. **Rollback:** reversible (new, unwired file).
