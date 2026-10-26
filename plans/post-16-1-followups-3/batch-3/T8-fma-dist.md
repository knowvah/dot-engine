# T8: `DIST` in `approxLen` and `addTriEdge` (item 29c, AD-6)

**Context:** `lib/common/geom.h:56` `DIST(p,q) = sqrt(DIST2(p,q))`; clang compiles
`DIST2` as `fma(dx, dx, dy*dy)` at the sites part 2 checked (its T13 row: `addTriEdge` seg
5-6 native …205 fused, port …212). Port sites using `Math.hypot` or plain sums:
`src/render/svg-edge-split.ts:15-65 approxLen` and
`src/layout/neato/multispline-router.ts:88-114 addTriEdge`
(`lib/neatogen/multispline.c:483`).

**Task:** for each site, read the C caller's disassembly (`approxLen`'s C counterpart:
find it from the port's `@see`), confirm the fused `DIST2`, and port it with the existing
fused helper `dist2` (`src/common/spline-midpoint.ts:26`, `fma(dx, dx, dy*dy)`), taking
`Math.sqrt` of it for `DIST`. No fusion evidence → no change.

**Write-set:** `src/render/svg-edge-split.ts`, `src/layout/neato/multispline-router.ts`
(+ tests).
**Read-set:** `multispline.c:475-545`, the C counterpart of `approxLen`, the disassembly.

**Acceptance criteria:**
- *Given* `addTriEdge` on 2168_3's seg 5-6 inputs, *then* the weight equals native's
  …205 bits.
- *Given* byte-identity over neato/sfdp corpus ids (`splines=true` multispline) and edge
  split SVG ids, *then* identical or toward native.
- *Given* the speed set, *then* p50 ≤ 1.05× T0.

**Observability:** N/A. **Rollback:** reversible.
