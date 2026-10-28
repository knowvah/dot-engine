# T16: cluster colorscheme window spans box and label (AD-16, item 81)

**Context:** `emit.c:3800` opens `setColorScheme(agget(sg, "colorscheme"))` right after
`emit_begin_cluster` and restores it at `:3943`, after `emit_label(job, EMIT_CLABEL, lab)`
(`:3921`); the port's window (`device-cluster.ts:applyClusterObjState` `withColorScheme`)
covers only the colour resolution, so a cluster label's `fontcolor=3` resolves outside the
scheme. `svg-tapered-edge.ts:49` assigns a literal `transparent` pen; `emit.c:2425` does the
same (`gvrender_set_pencolor(job, "transparent")`), so only a probe is owed.

**Task:** (1) Move the window to `renderCluster` (`device.ts`): open before the fill/pen
resolution, close after `renderClusterLabel`; `applyClusterObjState` runs inside it
without its own window. (2) Probe the tapered edge (`$BASE/native/81*`) and journal the
match. (3) Tests: `colorscheme=blues9 fontcolor=3 label=L` label colour; an unchanged
cluster.

**Write-set:** `src/gvc/device.ts` (the `renderCluster` section only),
`src/gvc/device-cluster.ts` (+ tests).
**Read-set:** `lib/common/emit.c:3795-3945`, `:2415-2440`; T9's and T12's edits.

**Acceptance criteria:**
- *Given* `subgraph cluster_a{colorscheme=blues9 fontcolor=3 label=L; a}` -Tsvg, *then* the
  label `fill` equals native's.
- *Given* a tapered edge, *then* the probe shows the port's pen/fill equal to native.
- *Given* the corpus, *then* bytediff identical except ids with a cluster colorscheme and
  a numeric label colour, each explained.

**Observability:** N/A. **Rollback:** reversible.
