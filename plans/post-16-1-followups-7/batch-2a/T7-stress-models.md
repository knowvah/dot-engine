# T7: subset and circuit distance models (item 96a, AD-3 amendment)

**Context:** `stress_majorization_cola`'s model branch
(`constrained_majorization_ipsep.c:128-150`) calls two functions that are not ported:
- `stress.c:compute_apsp_artificial_weights_packed` (714–774), for `model=subset`;
- `stress.c:circuitModel` (169–220), for `model=circuit`. It is built on
  `circuit.c:solveCircuit` (22–37), `matinv.c:matinv` (40–61) and `lu.c`
  (`lu_decompose` 67, `lu_solve` 137, `lu_free` 155).

The port already has:
- `computeApspPacked` and `computeWeightedApspPacked` (`src/layout/neato/bfs.ts:110,129`;
  duplicated in `stress-kernel.ts:44,59`);
- `mdsModel` (`stress.ts:329`);
- `kkutils.ts` (without `common_neighbors`, `fill_neighbors_vec_unweighted` and
  `empty_neighbors_vec`, `kkutils.c:21-50`).

The major, kk and hier paths keep these models loud (`start.ts:207-216`,
`constrained-majorization.ts:96`); wiring them in is follow-up 103.

**Task:**
1. Port the following, one TS file per C file, with C boundaries and `@see`. Preserve C
   quirks verbatim, such as the weighted branch reading `graph[i].ewgts[j]` before
   reassigning `ewgts`.
   - `lu.c` → `src/layout/neato/lu.ts`;
   - `matinv.c` → `matinv.ts`;
   - `circuit.c:solveCircuit` → `circuit.ts`;
   - `circuitModel` and `compute_apsp_artificial_weights_packed` →
     `src/layout/neato/stress-models.ts`;
   - the three `kkutils.c` helpers go in `stress-models.ts` too. `kkutils.ts` is outside
     this write-set; note the misplacement in the hand-back.
2. Use the existing `computeWeightedApspPacked`: pick the copy in `bfs.ts` and import it.
   Do not add a third copy. Report the pre-existing duplicate in the hand-back.
3. Tests first. The values come from the T5 harness approach (a native dump of each
   function on the T0 `model=subset` and `model=circuit` graphs, plus a disconnected
   graph where `circuitModel` returns NULL) and go in
   `src/layout/neato/__fixtures__/stress-models.ts`.

**Write-set:** `src/layout/neato/lu.ts`, `matinv.ts`, `circuit.ts`, `stress-models.ts`
(new), tests beside each, `src/layout/neato/__fixtures__/stress-models.ts` (new).
**Read-set:** `lib/neatogen/lu.c`, `matinv.c`, `circuit.c:1-37`, `stress.c:160-225,690-774`,
`kkutils.c:15-52`, `src/layout/neato/bfs.ts:100-160`.

**Interface output** (consumed by T8):

```ts
export function circuitModel(graph: VtxData[], nG: number): Float32Array | null;
export function computeApspArtificialWeightsPacked(graph: VtxData[], n: number): Float32Array;
```

**Acceptance criteria:**
- *Given* the harness graphs, *when* each function runs, *then* the packed `Dij` is
  bit-equal (float32) to native.
- *Given* a disconnected graph, *then* `circuitModel` returns `null`, as C's `solveCircuit`
  failure path does.
- *Given* the corpus, *then* bytediff is identical (nothing calls these yet).

**Commit:** `feat(T7): port subset and circuit distance models`.
**Observability:** N/A. **Rollback:** reversible.
