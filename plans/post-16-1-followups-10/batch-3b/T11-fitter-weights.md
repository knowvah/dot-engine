# T11: the fitter fallback and aux-edge weights (119, AD-8)

**Context:** `installEdgeSpline` (`src/layout/dot/edge-route-helpers.ts:144`) assigns `e.info.spl`, so its fitter fallback overwrites a stale route where C's `new_spline` appends (`lib/common/splines.c:216-220`). And `init.ts:173-179` keeps a synthetic weight
the flat-label machinery stamped, with aux-edge weights set outside the `weight` attribute, where C's `dot_init_edge` reads the attribute (`lib/dotgen/dotinit.c:65`). Part 9 T13 fixed the other routers and left these as known limits.

**Task:**
1. Find an input that reaches the fallback on a no-free layout, by instrumenting, and add a native `nofree` fixture. If nothing reaches it, pin the function directly and say so.
2. Make the fallback append as `new_spline` does, without changing a first render.
3. Trace how C keeps aux-edge weights (the aux graph's `weight` attribute or `ED_weight`), and match it. State the mechanism in the hand-back before changing it.

**Write-set:** `src/layout/dot/edge-route-helpers.ts`, `src/layout/dot/init.ts`, `src/layout/dot/splines-flat-labeled.ts` for the weights only, `src/gvc/rerender.test.ts`, `src/gvc/__fixtures__/rerender/`.

**Acceptance criteria:**
- *Given* a no-free layout through the fallback, *when* rendered, *then* both routes print, as native.
- *Given* an aux edge, *when* `dot_init_edge`'s port reads its weight, *then* it gets what C's read gets, with the mechanism in the journal.
- *Given* the smoke ids, *when* bytediffed, *then* output is byte-identical (stop 8).

**Commit:** `fix(T11): append the fitter fallback's route and match aux weights`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
