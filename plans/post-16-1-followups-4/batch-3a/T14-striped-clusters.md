# T14: draw cluster `style=striped` (item 62)

**Context:** `lib/common/emit.c:3892-3906` (emit_clusters): for `istyle.striped`, AF = the
cluster bb corners (LL, (UR.x, LL.y), UR, (LL.x, UR.y)); pen `transparent` when
`peripheries=0`, else pencolor; `stripedBox(job, AF, fillcolor, 0)`, `agerr(AGPREV, "in
cluster %s\n")` when it returns > 1; then `gvrender_box(job, GD_bb(sg), 0)`. The port has
only the colour warnings (`src/gvc/device-cluster.ts:109-122`, `stripedClusterColors`);
`stripedBox` exists for nodes (`src/common/multicolor.ts`, `poly-gencode.ts`).

**Task:** port the striped branch into the cluster emit path for every renderer (SVG via
`src/render/svg-cluster.ts`, xdot ops via the cluster path in `src/render/dot/xdot-ops.ts`
or wherever the cluster box is emitted), reusing the node `stripedBox` port, branch order
as C (striped is tested after the rounded/filled branch, before the plain box).

**Write-set:** `src/gvc/device-cluster.ts`, `src/render/svg-cluster.ts`, the xdot cluster
emit file (confirm with `grep -rn "stripedClusterColors\|emitCluster" src`) (+ tests).
**Read-set:** `lib/common/emit.c:3840-3920`, `emit.c:stripedBox`; `device-cluster.ts:90-140`.

**Acceptance criteria:**
- *Given* `digraph{subgraph cluster_a{style=striped;fillcolor="red:green:blue";a}}`, *when*
  rendered as SVG and xdot, *then* output matches native at 0.01.
- *Given* `peripheries=0`, *then* the outline pen is transparent as native.
- *Given* the corpus cluster ids, *then* bytediff identical except striped clusters.

**Observability:** N/A. **Rollback:** reversible.
