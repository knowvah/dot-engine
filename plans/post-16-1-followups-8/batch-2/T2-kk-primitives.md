# T2: KK subset weights and `circuit_model(g)` (item 103a, AD-3, AD-4)

**Context:** neato's KK path (`neatoinit.c:kkNeato`, 1240-1266) needs two distance
primitives the port lacks:
- `subset_model` (1203-1218) → `kkutils.c:compute_apsp_artificial_weights` (93-104), which
  calls `compute_new_weights` (165-194), `compute_apsp_dijkstra` and `restore_old_weights`
  (196-...). `DistType` is `int` (`sparsegraph.h:39`).
- `circuit.c:circuit_model(g, nG)` (38-70): conductances from `ED_dist`, `solveCircuit`
  (ported by part 7 in `circuit.ts`), then `GD_dist[i][j] = Gm_inv[i][i] + Gm_inv[j][j] -
  2*Gm_inv[i][j]`; returns `solveCircuit`'s result.

Part 7 put three `kkutils.c` helpers (`common_neighbors`, `fill_neighbors_vec_unweighted`,
`empty_neighbors_vec`) in `stress-models.ts` because `kkutils.ts` was outside its set (AD-4
moves them).

**Task:**
1. Tests first from a native harness (part-7 T7 approach: archived in
   `plans/post-16-1-followups-7/harness/T7/`): dump `compute_apsp_artificial_weights` Dij and
   `circuit_model`'s `GD_dist` for the T0 `models/` small graph, its `len` variant and a
   disconnected graph. Archive the harness under `plans/post-16-1-followups-8/harness/T2/`
   and the values in `src/layout/neato/__fixtures__/kk-models.ts`.
2. `kkutils.ts`: port the three functions and move the three helpers from
   `stress-models.ts` (update its imports; its behaviour and tests must not change).
3. `circuit.ts`: port `circuit_model` as `circuitModel(g, nG): boolean` writing the graph's
   KK distance matrix the way `kk.ts` holds `GD_dist` (read `kk.ts`/`kk-paths.ts` to find
   it; if it is not reachable without editing `kk.ts`, take the matrix as a parameter and
   journal the deviation). It is distinct from `stress-models.ts`'s float `circuitModel`
   (`stress.c:169`); document both names.

**Write-set:** `src/layout/neato/kkutils.ts`, `stress-models.ts`, `circuit.ts`, tests beside
each, `src/layout/neato/__fixtures__/kk-models.ts` (new), `plans/post-16-1-followups-8/harness/T2/**`.
**Read-set:** `~/git/graphviz/lib/neatogen/kkutils.c:15-200`, `circuit.c`,
`neatoinit.c:1200-1266`, `src/layout/neato/kk.ts`, `kk-paths.ts`, `stress-models.ts`.

**Interface output** (consumed by T7):
```ts
export function computeApspArtificialWeights(graph: VtxData[], n: number): Int32Array[]; // kkutils.c:93
export function circuitModel(g: Graph, nG: number /* , dist? */): boolean;              // circuit.c:38
```

**Acceptance criteria:**
- *Given* the harness graphs, *when* each function runs, *then* its matrix is bit-equal to
  native.
- *Given* a disconnected graph, *then* `circuitModel` returns false, as `solveCircuit` does.
- *Given* `stress-models.test.ts`, *then* it passes unchanged after the helper move.
- *Given* the corpus, *then* bytediff is identical (nothing calls the new functions yet).

**Commit:** `refactor(T2): port kk subset weights and circuit_model`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
