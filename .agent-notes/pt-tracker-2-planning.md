## Observation: plantuml-ts issues 27-35 were filed against homebrew graphviz 16.1.0
- **Context**: planning plans/plantuml-tracker-2 (2026-10-11), probing each repro against the native 15.1.0~dev oracle.
- **Finding**: 23/27/28/29/30/32/33/35 reproduce against native 15.x; 34 (HTML table border order) matches 15.x exactly — 16.1.0 reordered emit_html_tbl.
- **Impact**: re-probe every plantuml-ts filing against ~/git/graphviz/build before scoping; 16.1-only deltas belong to a graphviz-sync mission.
- **Confidence**: High

## Observation: A3's "Apple hypot unreproducible" premise is stale
- **Context**: same planning session; route.ts findMaxDev still uses Math.hypot + tolerant tie.
- **Finding**: src/common/libm-hypot.ts (2026-10-06, fdp) models the host hypot bit-exactly; swapping ptDist to libmHypot + strict `>` (reverted experiment on main v2.3.0) matched native on 23-w9, 32, 33, 35; 23-w20 still differed (FMA contraction, see fma-contraction-tiebreak.md).
- **Impact**: A3/A8 are candidates for closure via contraction mirroring (plans/plantuml-tracker-2 T1/T5/T7).
- **Confidence**: High for the 4 repros; corpus-wide effect unmeasured

## Observation: /tmp/ghl can lose its plugin config
- **Context**: native oracle printed `Format: "svg" not recognized. No formats found.`
- **Finding**: `sh test/corpus/gen-headless-gvbindir.sh` regenerates it; nothing else was wrong.
- **Impact**: run it at the start of any oracle-comparison session.
- **Confidence**: High

## Observation: flat-edge `et` is dropped in two places, not one
- **Context**: scoping plantuml-ts issue 28.
- **Finding**: edge-route.ts:365 passes a hard-coded EDGETYPE_SPLINE to makeFlatAdjEdges (whose `_et` is unused); splines-flat-multi.ts routeFlatEdgeGroupFaithful takes no et. Labeled flats (splines-flat-labeled.ts:105,131) do honour et.
- **Impact**: adjacent flat edges under splines=line/polyline are likely affected too (unprobed).
- **Confidence**: Medium (code read, not executed)
