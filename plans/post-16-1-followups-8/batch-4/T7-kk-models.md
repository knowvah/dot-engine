# T7: subset and circuit on the KK path (item 103c, AD-3, AD-5)

**Context:** C `neatoinit.c:kkNeato` (1240-1266):
- subset → `subset_model(g, nG)` (1203-1218): `makeGraphData(G, nG, &ne, MODE_KK,
  MODEL_SUBSET, NULL)` (no `len`/weights), `compute_apsp_artificial_weights`, copy into
  `GD_dist`;
- circuit → `circuit_model(g, nG)`; on failure `Warning: graph <name> is disconnected.
  Hence, the circuit model` + `is undefined. Reverting to the shortest path model.` +
  `Alternatively, consider running neato using -Gpack=true or decomposing` + `the graph into
  connected components.` (AGPREV each), then `shortest_path`;
- mds → `shortest_path` then `mds_model`; otherwise `shortest_path`.

The port's `kk.ts` handles MDS only; `start.ts:checkModel` refuses KK subset/connected
circuit and pre-checks connectivity (`kkCircuitFallsBack`, `isConnected`,
`warnCircuitDisconnected`). T2 ported `computeApspArtificialWeights` and `circuitModel(g)`.

**Task:**
1. Tests first: flip the KK `it.todo`s in `models-probes.test.ts` (T0 fixtures, including
   disconnected circuit with and without `pack=true`).
2. `kk.ts` (+ `kk-paths.ts`): port `kkNeato`'s model dispatch in C order, using T2's
   functions; the disconnected warning comes from `circuit_model`'s failure, not a
   pre-check (AD-3).
3. `start.ts`: remove the KK refusals and `kkCircuitFallsBack` / `isConnected` /
   `warnCircuitDisconnected` if nothing else uses them (grep first). `checkModel` may then
   have no refusals left; remove what C does not have.
4. If native's `pack=true` behaviour contradicts AD-3 (e.g. the warning still prints per
   component), stop 9 with the probe evidence.

**Write-set:** `src/layout/neato/kk.ts`, `kk-paths.ts`, `start.ts` (KK parts of
checkModel and its helpers), `models-probes.test.ts` (KK cases), tests beside each.
**Read-set:** `~/git/graphviz/lib/neatogen/neatoinit.c:1195-1270`, `circuit.c`, `kkutils.c:90-200`,
`src/layout/neato/kkutils.ts`, `circuit.ts`, `make-graph-data.ts`.

**Interface input:** T2's `computeApspArtificialWeights(graph, n): Int32Array[]` and
`circuitModel(g, nG): boolean`.

**Acceptance criteria:**
- *Given* each KK fixture case, *when* laid out, *then* xdot is within 0.01 and stderr
  byte-equal.
- *Given* a disconnected KK circuit with and without `pack=true`, *then* the warning and
  the fallback layout match native.
- *Given* the corpus bytediff, *then* identical; `grep -rn "unsupported(" src/layout/neato/start.ts`
  shows no `model` refusal.

**Commit:** `feat(T7): lay out subset and circuit models on kk`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
