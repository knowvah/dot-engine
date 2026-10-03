# v2-fidelity mission observations

## Observation: src/layout/neato/init.ts cannot grow
- **Context**: T6 (start=regular port) planned into init.ts.
- **Finding**: init.ts is 515 lines at ca7bf4d3; the complexity hook denies any
  edit that makes an over-500-line file longer than at HEAD.
- **Impact**: new neato init logic must go in a new module; plan write-sets
  accordingly.
- **Confidence**: High

## Observation: neato -Tplain fixtures — pos is inches, sep factor is 1+x
- **Context**: writing an overlap fixture with pinned positions.
- **Finding**: `pos="150,0!"` places a node 150 in away (no inputscale); a
  multiplicative `sep="1"` scales node half-sizes by 2 (native -v2 prints
  "Node separation: add=0 (2,2)"). `-v2` also prints "overlap [i] : n", a cheap
  way to see whether C's Voronoi adjuster ran.
- **Impact**: build overlap fixtures in inches and confirm with -v2.
- **Confidence**: High

## Observation: mode=ipsep without constraints already matches native
- **Context**: T6 Step 0.
- **Finding**: Δ ≤ 0.12 pt on 8 fixtures; diverges only with
  diredgeconstraints, clusters, or overlap=ipsep.
- **Impact**: any loud check must be conditional on C building constraints.
- **Confidence**: High

## Observation: neato-internal C oracles — use neato, link dylibs
- **Context**: v2-silent-gaps T1/T5 native oracles for poly.c and cAdjust.
- **Finding**: under dot, native ND_clust is set on every node, so makePoly collapses to the cluster box — drive poly.c oracles with neato. A scratch C driver can compile an unmodified copy of a neatogen .c against the build's dylibs (static libneatogen symbols are LTO-hidden). For adjust-only native baselines use `neato -n1 -Goverlap=true`; `overlap=false` runs prism, not a no-op.
- **Impact**: cheap exact oracles for internal neatogen functions.
- **Confidence**: High

## Observation: rotated polygon vertices differ from native by 1 ulp
- **Context**: v2-silent-gaps T1.
- **Finding**: shape=box orientation=20 vertex[2].y is exactly -18 in the port, -17.999999999999996 natively; flips inclusive-bbox polyOverlap verdicts at exact touch. Generator (src/common/poly-vertices.ts / poly-sizing.ts) origin not pinpointed.
- **Impact**: overlap counting may differ from native for rotated shapes at exact-touch boundaries.
- **Confidence**: High (observation), mechanism unknown
