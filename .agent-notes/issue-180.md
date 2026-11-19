# issue #180: the layer prefix in every object id

## Observation: a line-set comparison cannot judge layered svg output
- **Context**: checking the queue rule "no line that equalled native on the base differs on the head" for the #180 probes.
- **Finding**: with `layers`, the same line is native's on one layer and wrong on another (`<g id="a_graph0"><a xlink:href="x">` is right on layer 1; on layer 2 native has `a_l2_graph0`). A set-based check (`bodyeq.mjs`'s counts, or "is this line anywhere in native") reported 1-3 "native lines lost" per row that were not. `plans/issue-180-svg-layer-anchor-id/harness/extra/classify.mjs` aligns base and head with native by LCS and judges each changed line by position; it found 0 lost lines in all 264 rows it was run on.
- **Impact**: for inputs that repeat structure (layers, and likely pages), judge changed lines by alignment, not by membership.
- **Confidence**: High

## Observation: the HTML anchor counter makes one extra emission shift every later cell id
- **Context**: the `layersep` extra probe (cluster with an HTML label whose cell has `href`, on two of three layers).
- **Finding**: C numbers cell anchors with one counter per process (`anchorId++`, `lib/common/htmltable.c:376-390`). The port draws that cluster on layer one too (#181), and the extra label takes number 0, so the cell anchors on the later layers read `_1` and `_2` where native has `_0` and `_1`. With a node of the cluster on every layer the output is byte-equal.
- **Impact**: an off-by-one in `<id>_<n>` cell anchors usually means an extra or missing label emission earlier in the render, not a fault where the id is built. Any object emitted once too often before an HTML label will show up this way.
- **Confidence**: High

## Observation: `git mv -k` on an untracked file does nothing and exits 0
- **Context**: renaming a probe under the untracked `harness/extra/` with `git mv -k a b || mv a b`.
- **Finding**: `-k` skips the error for an untracked source and exits 0, so the fallback never ran; the next write to the old name then replaced the file that was meant to be kept.
- **Impact**: use plain `mv` for files that are not yet tracked.
- **Confidence**: High
