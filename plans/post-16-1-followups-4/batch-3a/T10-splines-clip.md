# T10: `splines-clip.ts` DIST and bezier clip (item 48, AD-4)

**Context:** `src/common/splines-clip.ts` `SplineClipHelper.arrowEndClip`/`arrowStartClip`
(non-dot engines and the main dot routing path) computes DIST with `Math.hypot` (`:128`),
also in `sphereCtx`; native `_arrowEndClip`/`_arrowStartClip` is `sqrt(fma(dx,dx,dy*dy))`
(part 3 T7 found it in libgvc). Its `bezierClip` should be checked against `_bezier_clip`
(`lib/common/splines.c`).

**Task:** for each DIST site and each arithmetic step of `bezierClip`, read the 16.1
disassembly (`$BASE/disasm/libgvc.txt`) and port the fused/unfused form it shows
(`dist2` + `Math.sqrt`, software `fma` only where proven). Pin each with clang `-O2`
harness vectors (fused vs hypot vs plain) as part 3 T7/T8 did. Record unfused sites in the
hand-back.

**Write-set:** `src/common/splines-clip.ts` (+ test).
**Read-set:** `splines-clip.ts`; `lib/common/splines.c` (`arrowEndClip`, `arrowStartClip`,
`bezier_clip`, `shape_clip0`); `src/layout/dot/edge-route-clip.ts:110-140` (part 3's ported
form); part 3 T7/T8 journal rows.

**Acceptance criteria:**
- *Given* the harness vectors, *when* the unit tests run, *then* each site matches C bit
  for bit (red on T0 for every fused site).
- *Given* bytediff over the spline-heavy ids × neato, fdp, sfdp, circo, twopi, osage, dot,
  *then* identical or every change toward native.
- *Given* the speed set, *then* p50 ≤ 1.05× (stop 7).

**Observability:** N/A. **Rollback:** reversible.
