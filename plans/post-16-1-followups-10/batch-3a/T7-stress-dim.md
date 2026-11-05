# T7: stress, hier, ipsep and sgd under `dim` (114, AD-2, AD-3, AD-11)

**Context:** the stress kernels already take `dim` (`stress-kernel.ts:91,150,243`, `stress.ts:81,101`), and `initLayout` draws for `d ≥ 2`. C calls
`stress_majorization_with_hierarchy`, `stress_majorization_cola` and `stress_majorization_kD_mkernel` with `Ndim` (`lib/neatogen/neatoinit.c:1117,1178,1186`). `lib/neatogen/sgd.c` is 2-D in its loop (`:20-21,202-203,221-235`)
but the node's other coordinates still come from the initial positions: native's `mode=sgd dim=3` prints a z. `stress-cola.ts` is at 497 lines, so split along C boundaries (AD-11). Never unfuse the kernel.

**Task:**
1. Tests first, from the fixtures for the default solver, `mode=hier`, `mode=ipsep`, `mode=sgd`, `model=subset` and `model=circuit`, each `dim=3 dimen=3`, plus the three-component `pack=true` case.
2. Find each place that assumes two coordinates, by test failure and by reading the C: `dCoords` setup, `start.ts`, `smart_ini_x`'s `dim`, the write-back loop at `neatoinit.c:1193`.
3. Port what is missing, keeping C's drand48 order.

**Write-set:** `src/layout/neato/stress.ts`, `stress-kernel.ts`, `stress-cola.ts`, `stress-models.ts`, `start.ts`, `sgd.ts`, a split file from `stress-cola.ts` if needed, a new `src/layout/neato/stress.dim.test.ts`.

**Acceptance criteria:**
- *Given* each mode and model above, *when* rendered, *then* `pos` matches the fixture byte for byte or within ±0.01 (AD-3), or the miss is recorded with an FMA or libm mechanism.
- *Given* the 22 ipsep and 49 model probes, *then* none moves (stop 7).
- *Given* the smoke ids, *when* bytediffed, *then* output is byte-identical (stop 8).

**Commit:** `feat(T7): lay out stress, hier, ipsep and sgd under dim`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
