# T13: sfdp `dim` and `dimen` (114, AD-1, AD-3)

**Context:** `src/layout/sfdp/init.ts:52` and `index.ts:53` fix `ndim` at 2. C: `lib/sfdpgen/sfdpinit.c:55-58,67-77`. `quadtree.ts`, `sparse-*`, `spring-electrical.ts` and `getPos` (`init.ts:254`) already take `dim`.
T1's `pos` printing covers output. T2 runs first, so start from its landed head and read its journal row.

**Task:**
1. Tests first, from `src/layout/sfdp/__fixtures__/dim/`.
2. Port `sfdp_init_graph`'s reads into `root.info.ndim` and `odim`; size `ND_pos`; pass `dim` through. Check `quadtree` at `1 << dim` for `dim=4`, and the overlap call.
3. Fix the "fixed at 2" comments.

**Write-set:** `src/layout/sfdp/init.ts`, `index.ts`, `spring-driver.ts`, a new `src/layout/sfdp/dim.test.ts`.

**Acceptance criteria:**
- *Given* each fixture, *when* rendered, *then* every coordinate is within ±0.5 pt of native (AD-3), and `pos` has native's count.
- *Given* any 2-D graph on sfdp, *when* bytediffed over the smoke ids, *then* output is byte-identical to T2's head (stop 8).

**Commit:** `feat(T13): lay out sfdp in ndim dimensions`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
