# T1: `toDistType` saturates (item 109, AD-5)

**Context:** `dijkstra.ts:248` is `Math.trunc(Math.fround(w))`, stored into an `Int32Array`, so a
weight at or above 2^31 wraps. Native `(DistType)` on arm64 saturates (`dijkstra.c:166`). Only
duplicate neighbours yield such a weight, and `makeGraphData` merges them, so no graph reaches it.

**Task:**
1. Tests first: in `kkutils.artificial.test.ts`, remove the `size_t wrap` exclusion from `DIJ_CASES`
   and its comment. Add direct cases for ≥ 2^31, exactly 2^31 − 1 after `fround`, < −2^31 and NaN.
2. Saturate in `toDistType`: ≥ 2^31 → `INT_MAX`, < −2^31 → `INT_MIN`, NaN → 0.
3. Export `toDistType` only if the tests need it. Note in its comment that this is arm64's
   conversion, the oracle's.

**Write-set:** `src/layout/neato/dijkstra.ts`, `src/layout/neato/kkutils.artificial.test.ts`.
**Read-set:** `~/git/graphviz/lib/neatogen/dijkstra.c:155-175`, `src/layout/neato/dijkstra.ts:245-275`.

**Acceptance criteria:**
- *Given* a weight ≥ 2^31, < −2^31 or NaN, *when* cast, *then* the result is `INT_MAX`, `INT_MIN` or 0.
- *Given* `size_t wrap`, *when* Dij runs, *then* it matches the native values.
- *Given* the smoke ids, *when* bytediffed, *then* output is identical (stop 10).

**Commit:** `fix(T1): saturate toDistType as native arm64 does`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
