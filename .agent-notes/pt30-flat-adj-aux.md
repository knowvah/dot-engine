## Observation: port-less edge in a mixed-port flat-adjacent group is routed outside the aux group
- **Context**: plantuml-ts issue 30, `{rank=same; a; b;} a -> b; a:e -> b:w;`.
  Port-less `a->b` started at 54.28 vs native 54.46 (arrow tip 70.24 vs 70.45);
  the port edge matched.
- **Finding**:
  - Mechanism: C groups all adjacent flat edges sharing a getmainedge into ONE
    `make_flat_adj_edges` call (cnt=2) and decides `ports` over the whole group;
    the port-less edge is cloned into the aux graph as `hvye` (weight 10000) and
    its spline is copied back via `transformf`. The port split the group by
    port presence: `collectAdjacentFlatGroup` keeps only edges with a defined
    port (`isGroupableFlat` -> `isAdjacentPortFlat`, edge-route.ts:310-317), so
    the aux call got cnt=1 (a synthetic pseudo `hvye`), and the port-less edge
    was routed on its own by `makeAdjFlatNoPortEdge` -> `makeSimpleFlat`
    (splines-flat-labeled.ts:397), a straight tp->hp bezier clipped against the
    ellipse (bezier_clip stops at 0.5 tolerance, so the clip point depends on the
    input curve: 54.28 vs 54.46).
  - Origin: src/layout/dot/edge-route.ts:316-317 (`isGroupableFlat`) and the
    dispatch order at :413-414 (`makeAdjFlatNoPortEdge` before the aux route).
  - Causal chain: group split by port presence -> port-less edge never enters
    the aux graph -> routed by makeSimpleFlat instead of the aux spline
    (aux solve gives start 44.536001443862915 in aux coords = 54.46 after
    transformf) -> endpoint drift.
  - First divergent value: C group `cnt=2 ports=1` vs port cnt=1 (instrumented
    C build, `T6 adj cnt=2`). Aux node coords (a:(0,72) b:(0,0), lw/rw 18,
    ht 54, ranks 0/1) and both aux splines were IDENTICAL to 17 digits between
    the port's aux dump and the instrumented C (e.g. port-less
    `(0,44.536001443862915) (0,42.566306747554336) (0,40.558199876684412)
    (0,38.538762182419482)`; port edge `(0,45) ... (3.3e-16,38.3895263671875)`).
  - Ruled out: aux layout / node size / clip (aux splines bit-identical to C,
    and the port-edge output already matched); cloneGraph/subg `rank=source`
    (aux coords identical); transformf/del (port edge in same group matches);
    libm drift (values equal to 17 digits).
- **Impact**: any flat-adjacent group mixing port and port-less edges (common in
  PlantUML) routed the port-less member with makeSimpleFlat instead of the aux.
- **Confidence**: High (instrumented C: plugin swapped into oracle, output
  reproduced native 54.46 with `cnt=2`).
