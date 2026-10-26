# T22: `stress_majorization_with_hierarchy` (item 43d, AD-6)

**Context:** `lib/neatogen/constrained_majorization.c` (445 lines) is the hier driver:
smart-init path (`smart_ini`, default for hier) → `compute_y_coords` + `compute_hierarchy`
(T15), `num_levels < 1` → `stress_majorization_kD_mkernel` (ported, `stress-kernel.ts`),
level separation by `levels_gap`, `IMDS_given_dim` (T17) for dim 2; else `initLayout`
(ported) + `compute_hierarchy`; distance model (`MODEL_SUBSET` / `MODEL_CIRCUIT` stay loud,
AD-6; `MODEL_MDS` → `mdsModel`, ported in `kk-paths.ts`; else `compute_apsp_packed`,
ported); then the majorization loop with `initConstrainedMajorization` /
`constrained_majorization_new_with_gaps` (T16), `conjugate_gradient_mkernel` (ported), and
`agwarningf`/`agerr(AGPREV)` on the circuit fallback.

**Task:** port `stress_majorization_with_hierarchy` to
`src/layout/neato/constrained-majorization.ts`, branch for branch (incl. `goto finish`
cleanup paths as early returns with the same return values), `float` semantics per
`batch-3b/hier-harness.md`, split only at C's own phase boundaries (each helper `@see`).
Do not wire it into `start.ts` (T26). `Verbose` timing/fprintf lines are not ported (the
port has no Verbose), note it.

**Write-set:** `src/layout/neato/constrained-majorization.ts` (+ test).
**Read-set:** `constrained_majorization.c`; `src/layout/neato/{stress,stress-kernel,
kk-paths,matrix-ops,conjgrad}.ts` exports; T15–T17 modules; `batch-3b/hier-harness.md`.

**Interface output (T26):** `stressMajorizationWithHierarchy(graph: VtxData[], n: number,
dCoords: Float64Array[], nodes: Node[] | null, dim: number, opts: number, model: number,
maxi: number, levelsGap: number): number` (C's return value; -1 = failure).

**Acceptance criteria:**
- *Given* the item-43 probe graph and corpus 1554's graph data, *when* run, *then*
  `dCoords` equal the harness bit for bit (`%a`).
- *Given* a graph with no hierarchy (`num_levels < 1`), *then* the result equals
  `stress_majorization_kD_mkernel`'s.
- *Given* `model=subset` or `model=circuit`, *then* the existing loud error is raised at
  the C branch point.

**Observability:** N/A. **Rollback:** reversible (unwired).
