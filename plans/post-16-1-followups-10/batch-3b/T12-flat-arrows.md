# T12: no-free arrows on the flat aux route (120, AD-8)

**Context:** 21 of 211 svg lines differ on `multi-edge` render 2 (`src/gvc/__fixtures__/rerender/`), around `copyOneFlatSpline` (`src/layout/dot/splines-flat.ts:276-283`). It reads `auxe.info.spl?.list[0]`, and the first bezier of an aux edge is stale on a later
layout; C copies from the aux graph's fresh edges (`lib/dotgen/dotsplines.c:1255-1285`). It is the one known miss left in the no-free gap part 9 AD-12 closed.

**Task:**
1. Test first: turn `multi-edge` render 2's svg into a fixture comparison.
2. Dump native's aux beziers and arrow flags at that copy, and name the mechanism. Then fix it in `copyOneFlatSpline`, keeping the "emit uses `bz.size`" behaviour.

**Write-set:** `src/layout/dot/splines-flat.ts`, `src/gvc/rerender.test.ts`, `src/gvc/__fixtures__/rerender/`.

**Acceptance criteria:**
- *Given* `multi-edge` laid out twice with no free, *when* rendered to svg, *then* 0 of the 21 lines differ.
- *Given* the smoke ids, *when* bytediffed, *then* output is byte-identical (stop 8).

**Commit:** `fix(T12): copy no-free arrows on the flat aux route as c does`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
