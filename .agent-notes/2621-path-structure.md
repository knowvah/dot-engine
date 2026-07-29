<!-- SPDX-License-Identifier: EPL-2.0 -->

## Observation: 2621 "path-structure" divergence is the unwired R_VALUE aspect ratio, not routing

- **Context**: Mission plans/2621-path-structure. `tests/2621.dot` (3,670-node
  DAG, rankdir=BT, newrank=true, `ratio=0.5625`) was the last unaccepted
  deterministic divergence on the dot SVG track: verdict `diverged`,
  maxΔ 18188.6, bucket `path-structure`. One instrumented full render per side
  (C `GV_XDUMP` in routespl.c/splines.c vs port `setRouteDump`/`setClipDump`)
  plus a per-edge xdot diff.
- **Mechanism**: The port never applies C's `set_aspect` R_VALUE (numeric
  `ratio=`) y-stretch. `parseRatioDrawing` (src/common/graph-init.ts:202-211)
  deliberately returns without populating `g.info.drawing` for ratioKind
  `'value'` (documented deferral: "math ported but no corpus coverage"), so
  `setAspect` (src/layout/dot/position-bbox.ts:155) no-ops on its
  `!drawing?.ratioKind` guard. C (lib/dotgen/position.c:949-957,
  R_VALUE branch of set_aspect) computes `actual = sz.y/sz.x = 0.47351 <
  desired = 0.5625` → `yf = desired/actual ≈ 1.1881, xf = 1.0` and rescales
  every node y with `round(y*yf)`.
- **Origin**: src/common/graph-init.ts:204 (`if (kind !== 'compress' && kind
  !== 'fill') return;`) — the R_VALUE math itself
  (`aspectValueScale`, src/layout/dot/position-bbox.ts:134-140) is already
  ported and matches C.
- **Causal chain**: unscaled y → every rank's y-gap is 1/1.1881 of C's
  (uniform: port bb 88323×41012 vs oracle 88620×48728; 41012/48728 =
  0.84174 = measured per-gap ratio) → all 1,255 node positions differ in y
  (x: 0/1255 differ) → every routesplines call sees shifted corridor
  boxes/endpoints (first diff at S1_INPUT, e.g. the survey's maxΔ edge
  `powerlines_one->all_custom_axis`: C start y 47983 [integer — C's round()
  in set_aspect] vs port 40384.65 [fractional — unscaled]) → 2,548/2,553
  edge splines differ, many in piece count → `path-structure` bucket.
- **Ruled out**:
  - **rank/mincross/xcoord**: all 1,255 node x-coords identical (0 diffs at
    0.011 tol); node-only bb width identical to 0.01 (86492.14 both).
  - **text measurement**: widths/heights feed x and raw bb — x identical,
    raw port aspect 0.47351 consistent with C's pre-scale layout.
  - **routing (make_regular_edge / routesplines / clip)**: identical call
    structure — C 7,606 routesplines calls + 2,553 clip_and_install vs port
    exactly matching dump counts (55,795 C lines / 32,977 port records,
    both = 7×7606+2553 resp. 4×7606+2553); first divergence is already in
    the S1 INPUT (upstream y), not in any routing stage's transform.
  - **fp/tie class (D4 acceptance)**: the gap ratio is a single global
    1.1881 scale = 0.5625/0.47351, exactly C's yf formula — a logic
    (wiring) gap, not an irreducible numeric tie.
- **Classification**: logic misport (deliberate, documented deferral now
  invalidated by corpus coverage) → T6a faithful fix: wire `'value'` into
  `parseRatioDrawing` (set `ratio` in the drawing; keep `expand`/`auto`
  deferred — `expand` still has no corpus coverage and `auto` needs the
  unported `idealsize`).
- **Blast radius of the fix**: `pack-components.ts` reads the `ratio` attr
  directly (unaffected); `neato/set-aspect.ts:parseNeatoDrawing` no-ops when
  drawing is already populated and parses numeric ratio to the same
  `{kind:'value', ratio}` shape (equivalent); osage delegates to
  parseNeatoDrawing (same). Corpus sweep is the arbiter.
- **Perf calibration (D5)**: full port render of 2621 now takes **22.7 min**
  wall (1,360s in-process; tsx, instrumented) — well under the 3h cap and the
  stale ">30 min never finished" figure. Native: 298s xdot / 276s svg.
- **Confidence**: High (numeric identity of the scale factor; S1-level first
  divergence; x-axis and call-structure equality).
- **Status: CLOSED (2026-07-29).** Fix 206b2460 (wire `'value'` into
  parseRatioDrawing). Post-fix render: bb identical, 0/2553 edges and
  0/1255 nodes beyond 0.01. Fresh 939-sweep: 2621 diverged→conformant, the
  only per-id change (909 conformant, 0 regressions). Dot SVG track now has
  0 unaccepted divergences. Native tree restored (temp GV_XDUMP patches
  reverted; oracle rebuilt). Port dump hooks kept permanently
  (setRouteDump/setClipDump).
