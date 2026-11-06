# T6: KK under `dim` (114, AD-2, AD-3)

**Context:** `src/layout/neato/kk.ts:40` fixes `NDIM = 2`, and `randompos` (`:146`) draws two coordinates. C's `Ndim` loops are in `lib/neatogen/stuff.c:31,274-275,301-314,344-551`, and
`solve` takes `n`. The drand48 order must follow C: a third draw per node moves x and y too. `randompos` for k ≥ 2 and `initial_positions` follow `stuff.c:295-320`.

**Task:**
1. Tests first, from the `mode=KK` fixtures in `src/layout/neato/__fixtures__/dim/`; include `dim=4` and a pinned case.
2. Make `NDIM` a field on `KkState`, read from `root.info.ndim`. Keep every fused `fma`/`fms` in its C statement; no 3-D branch (AD-2).
3. Fix the "2-D only" comment.

**Write-set:** `src/layout/neato/kk.ts`, `src/layout/neato/kk.test.ts`, a new `src/layout/neato/kk.dim.test.ts`.

**Acceptance criteria:**
- *Given* `mode=KK dim=3 dimen=3`, *when* rendered, *then* `pos` matches the fixture byte for byte or within ±0.01 (AD-3).
- *Given* any 2-D graph, *when* bytediffed over the smoke ids, *then* output is byte-identical, and the 49 model probes do not move.
- *Given* KK's p50 on a 2-D graph, *then* the time before and after is reported in the hand-back.

**Commit:** `feat(T6): lay out kk in ndim dimensions`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
