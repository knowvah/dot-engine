# Bezier inventory (post-16.1 follow-ups part 2, T10, 2026-10-20)

## Observation: every port copy of utils.c:Bezier, against the 16.1 compiled C
- **Context**: item 20a; read-only inventory for T11 (shared fused `bezier()`) and T12.
- **Finding**: notation **F** = `fma(1-t, V[j], t*V[j+1])`: `t*V[j+1]` rounds first,
  `(1-t)*V[j]` is fused. Out-of-line libgvc `_Bezier` (0x42b58):
  `fsub d7,d1(1.0),d0(t); fmul.2d v4,v3(V1),v0[0](t); fmla.2d v4,v2(V0),v7[0](1-t)`;
  bitcode IR agrees (`llvm.fmuladd(1-t, V[j], t*V[j+1])`). ThinLTO inlines `Bezier` into
  every libgvc caller (no `bl _Bezier` in libgvc); `libgvplugin_dot_layout` calls it
  through a stub (`U _Bezier`). Swapped order `fma(t,b,(1-t)a)` differs from F in 33% of
  random inputs, plain form in 24%. At t=0.5, plain, F and `(a+b)/2` are bit-identical.

| port file:fn | C file:fn | calls Bezier? | fused + order | needs L/R | port matches compiled C? | evidence |
|---|---|---|---|---|---|---|
| common/spline-midpoint.ts:bezier | utils.c:175 Bezier via utils.c:390 dotneato_closest | yes (inlined) | F | no (NULL,NULL) | yes | `_dotneato_closest`: `fsub d22,d17,d21; fmul.2d v2,v4,v21[0]; fmla.2d v2,v3,v22[0]` |
| gvc/anchor.ts:bezierHalf | emit.c:832 approx_bezier → Bezier(cp,0.5,L,R) :840 | yes (inlined, t folded) | `fma(0.5,a,0.5*b)` | L and R | yes in value (t=0.5) | `_approx_bezier`: `fmov.2d v5,#0.5; fmul.2d v6,v1,v5; fmla.2d v6,v5,v2` |
| layout/dot/compound-geom.ts:subdivideBezier/casteljauStep | dotgen/compound.c (same as next row) | yes | F | L or R | t=0.5 only; **dead in production** (only its branch test imports it) | — |
| layout/dot/compound-clip.ts:subdivideBezier/casteljauStep | compound.c:178 findVertical, :219 findHorizontal (t=0.5, L+R); :242/247/252/257 splineIntersectf (variable t, Left only) | yes, out-of-line cross-dylib | F | t=0.5 both; splineIntersectf Left | **no** for variable-t (tryUpdateIntersect); yes at t=0.5 | `_findVertical` `bl 0x1f444 ; stub _Bezier`; `_splineIntersectf` 4× |
| layout/dot/edge-route-clip.ts:deCasteljauTriangle/bezierSubdivide | splines.c:135 bezier_clip from arrows.c:303 arrowEndClip / :331 arrowStartClip, splines.c shape_clip0 | yes (inlined) | F | one half (by left_inside); port builds both + midpoint | **no** (plain, variable t) | `_arrowEndClip`: `fsub d31,d17,d28; fmul.2d v26,v5,v28[0]; fmla.2d v26,v2,v31[0]` |
| layout/dot/splines-label.ts:cubicBezierAt | splines.c:1337/1348 place_portlabel, Bezier(c,0.1/0.9,NULL,NULL) | yes (constants) | F | no | **no** (plain). JS `1-0.9` = C's 0x3fb9999999999998 | `_place_portlabel`: `fmul.2d v5,v0,v3; fmla.2d v5,v4,v7` |
| common/taper.ts:bezierPoint | taper.c:147, Bezier(V, step/BEZIERSUBDIVISION,NULL,NULL) | yes (inlined) | F | no | **no** (plain) | `_taper`: `fdiv d1,d1,d10; fsub d2,d11,d1; fmul.2d v3,v5,v1[0]; fmla.2d v3,v4,v2[0]` |
| render/svg-edge-split.ts:splitCubic | emit.c:1921 splitBSpline, Bezier :1931 (t), :1965 (r) | yes (inlined ×2) | F | L and R (mapping correct) | **no** (plain) | `_splitBSpline` 0x20208 / 0x20630 fmul.2d+fmla.2d |
| common/splines-routespl.ts:deCasteljauPoint | routespl.c:251-262 limitBoxes, inlined `sp[k].x += t*(sp[k+1].x - sp[k].x)` — **not Bezier** | no | `fma(t, b-a, a)` (own formula) | n.a. | **no** (plain `a+t*(b-a)`) | `_limitBoxes`: `fsub d22,d16,d5; fmadd d5,d6,d22,d5` ×12 |
| common/arrows-shapes-poly.ts:cubicHalf | arrows.c:1083/1085 arrow_type_curve, Bezier(AF,0.5,NULL,AF)/(AF,0.5,AF,NULL) | yes (constants) | `fma(0.5,a,0.5*b)` | one half per flag (mapping correct) | yes in value (t=0.5) | `_arrow_type_curve`: `fmul d1,d14,d0; fmadd d1,d12,d0,d1` |
| common/splines-geom.ts:evalBezier | utils.c:175 Bezier (its `@see geomprocs.h:Bezier` is wrong) via emit.c:784 update_bb_bz (t=0.5, L+R) and splines.c:135 bezier_clip (variable t); main live clip path (splines-clip.ts → bezierClip) | yes (inlined) | F | L, R optional | **no, even at t=0.5**: uses `a+t*(b-a)`; differs from `(a+b)/2` in 9.7% of 1e6 random inputs | `_update_bb_bz`: `fmov.2d v2,#0.5; fmul.2d v6,v4,v2; fmla.2d v6,v2,v0` |

- **Unidentified**: `edge-route-clip.ts:bezierClipNode` on the legacy fitter path
  (routeForwardEdge → straightEdgeSplineWithRank → routeWithRank/routeSimple →
  clipToNodes, edge-route.ts:440-452) has no C counterpart; C reaches that case through
  make_regular_edge + clip_and_install. Only its compound.ts use (arrow clip) maps to C.
- **Impact**: T11 consolidates the F rows on one shared `bezier()`; `deCasteljauPoint`
  needs its own `fma(t, b-a, a)`, not the shared F. Rows at constant t=0.5 are already
  value-identical.
- **Confidence**: High (disassembly + IR + 1e6-sample numeric checks; scratch
  `t10/` in session e113f7ce).

## Observation: neighbouring non-Bezier fused expressions the port computes plain
- **Context**: same T10 sweep.
- **Finding**:
  - `ptToLine2` (geom.c:185/188, used by check_control_points in approx_bezier and
    update_bb_bz): IR `fmuladd(p.y-a.y, dx, -((p.x-a.x)*dy))`, `fmuladd(dx,dx,dy*dy)`;
    port `src/gvc/anchor.ts:432`, `src/common/splines-geom.ts:73` plain. It decides
    whether a segment is subdivided.
  - `arrows.c:arrow_type_curve` fuses `p.x ± 0.95*v.x` and computes `w.x*4.0/3.0` as
    `(w*4)/3`; port `arrows-shapes-poly.ts:curveControlPoints` uses plain and
    `s*w.x*(4/3)`.
  - `splitBSpline` uses `DIST` = `sqrt(fma)`; port `svg-edge-split.ts:approxLen` uses
    `Math.hypot`.
  - `edge-route-clip.ts:arrowEndClip/tailArrowEndClip` (used by compound.ts) differs from
    arrows.c:280-331 beyond fusion: tip-relative coordinates, `Math.hypot` inside test,
    forward tail clip with leftInside=true, re-subdivided fallback. A faithful
    `SplineClipHelper.arrowEndClip/arrowStartClip` exists in `src/common/splines-clip.ts`.
- **Impact**: candidates for T12 (other Bezier-like sites) or later follow-ups.
- **Confidence**: High for the IR/asm; Medium for output impact (unmeasured).

## Observation: -flto object files are bitcode
- **Context**: T10 technique.
- **Finding**: the oracle build's `.o` files are LLVM bitcode; `llvm-dis` shows exactly
  which expressions became `llvm.fmuladd`, without rebuilding or disassembling.
- **Confidence**: High
