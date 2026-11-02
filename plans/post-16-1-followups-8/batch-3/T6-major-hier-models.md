# T6: subset, circuit and mds on the major and hier paths (item 103b, AD-2, AD-5)

**Context:**
- **Major:** C picks Dij inside `stress_majorization_kD_mkernel` (`stress.c:833-859`): subset
  → `compute_apsp_artificial_weights_packed`; circuit → `circuitModel`, and on NULL
  `Warning: graph is disconnected. Hence, the circuit model` +
  `is undefined. Reverting to the shortest path model.` (AGPREV); mds → `mdsModel`; then, if
  still NULL, weighted APSP iff `graph->ewgts`, else plain APSP. The port computes Dij in
  `init.ts:solveStress` (361-363) from `haveLen` only, so major-path mds is silently
  shortest-path and subset/circuit are refused by `start.ts:checkModel` (`unsupported`).
- **makeGraphData:** C ignores `len` and weights for `MODEL_SUBSET`
  (`neatoinit.c:763-766`); `runMajorization` passes `graphHasLen(g)` regardless.
- **Hier:** `constrained-majorization.ts:95-97` throws for subset and circuit; C
  `constrained_majorization.c:173-191` has the same branch shape as stress.c.
- Part 7 ported `circuitModel`, `computeApspArtificialWeightsPacked` and `mdsModel`
  (`stress-models.ts`, `stress.ts:329`). T1 made `parseModel` revert mds-without-len.

**Task:**
1. Tests first: flip the major and hier `it.todo`s in `models-probes.test.ts` (T0
   fixtures) to assertions (xdot ≤ 0.01, stderr byte-equal).
2. `stress-models.ts`: port the 833-859 block as `stressModelDij(graph, n, model)`; its doc
   comment states the boundary deviation (AD-2). Warnings verbatim through `agerr.ts`.
3. `init.ts`: `solveStress`'s major branch calls `stressModelDij`; `runMajorization` passes
   `haveLen = model !== MODEL_SUBSET && graphHasLen(g)` (and the weight flag, if the port has
   one) per `neatoinit.c:763`. Keep `init.ts` ≤ 500 lines (stop 13).
4. `constrained-majorization.ts`: replace the two `unsupported` calls with C's branches.
5. `start.ts:checkModel`: remove the major and hier refusals; leave the KK ones for T7.
6. Mind the two `MODEL_*` numberings (init.ts defs.h vs stress.ts; `.agent-notes/post-16-1-followups-7.md`).

**Write-set:** `src/layout/neato/stress-models.ts`, `init.ts`, `constrained-majorization.ts`,
`start.ts` (checkModel major/hier only), `models-probes.test.ts` (major/hier cases), tests
beside each.
**Read-set:** `~/git/graphviz/lib/neatogen/stress.c:690-870`, `constrained_majorization.c:150-200`,
`neatoinit.c:755-775,1077-1100`, `src/layout/neato/stress-kernel.ts` (read-only, stop 10),
`stress.ts:280-340`, `make-graph-data.ts`.

**Interface input:** T1's `parseModel`; T2's helper locations in `kkutils.ts`.

**Acceptance criteria:**
- *Given* each major and hier fixture case, *when* laid out, *then* xdot is within 0.01
  and stderr byte-equal, including the disconnected-circuit warning.
- *Given* major `model=mds` with `len`, *then* Dij is `mdsModel`'s and the layout matches native.
- *Given* `model=subset` with `len`, *then* `len` is ignored, as native.
- *Given* the 22 ipsep probes and the corpus bytediff, *then* both are unchanged.

**Commit:** `feat(T6): lay out subset, circuit and mds models on major and hier`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
