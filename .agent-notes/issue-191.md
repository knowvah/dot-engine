# issue-191 mission — observations (2026-11-21)

## Observation: native's json render takes the anchor counter twice
- **Context**: `twice.c seq:l,<fmt>,svg` against the carried oracle, reading the ids of the svg that
  follows another render on the same layout.
- **Finding**: `initAnchor` runs for every renderer, whether or not an anchor is written. xdot, dot,
  plain, json0, imap and cmapx each take as many ids as one svg render; json takes twice as many (it
  emits through xdot too): `anchor.gv` gives `_2 _3` after any of the first six and `_4 _5` after
  json. The port agrees for node, graph and cluster labels (its json runs an inner xdot render,
  `src/render/json.ts` `collectDrawLookup`).
- **Impact**: a multi-render id check must count every earlier render, not only the ones that print
  ids.
- **Confidence**: High (`plans/issue-191-anchor-id-renders/harness/native/`, 20 captures reproduced
  byte for byte)

## Observation: only the svg and xdot/dot renderers emit an HTML edge label
- **Context**: two probes added at execution, `anchor-objs.gv` and `anchor-clust.gv`, with cell
  anchors in graph, cluster, node and edge labels.
- **Finding**: C's `emit_end_edge` runs `emit_edge_label` → `emit_label` → `emit_html_label` for
  every renderer. In the port the renderer's `endEdge` owns edge labels and only
  `src/render/svg.ts:177` and `src/render/dot.ts:257` call `renderEdgeLabels`; the map renderers
  write the label rectangle only (`src/render/map.ts:740`, #252) and `endEdge` is a no-op for plain,
  plain-ext, json0 and json. So after one of those renders the anchor count is short by the edge
  label's cells (json: by one of native's two). A single render shows it in cmapx and imap only.
  Tracked in #280 (ruling) and #252 (fix).
- **Impact**: until #252 lands, a same-layout probe with an HTML edge label agrees with native only
  after svg, xdot or dot. Node-only probes hide this.
- **Confidence**: High (`harness/results/probes-head-objs.tsv`: 6 of 19 equal, base 0)

## Observation: twice.c's seq mode needs a format argument before it
- **Context**: re-capturing native with `harness/build.sh`'s `twice-native`.
- **Finding**: the call is `twice-native <file> <engine> <format> seq:<ops>`; the third argument is
  ignored by `seq:` but must be there. With `seq:<ops>` in third place the probe takes it as a
  format, runs its default compare and prints `SAME`, with exit 0.
- **Impact**: a capture that is one line long is this, not a native failure.
- **Confidence**: High

## Observation: a cluster probe has no native reference for three no-free layouts
- **Context**: `seq:l,svg,l,svg,l,svg` on `anchor-clust.gv`.
- **Finding**: native exits 139 on the third layout (also for
  `digraph { subgraph cluster_c { a } a -> b }`); the port throws. Two layouts with a free between
  (`l,svg,f,l,svg`) are fine. This is the known case in `.agent-notes/issue-138.md`;
  `run-probes.sh` prints `no-native` for a job with no capture.
- **Impact**: keep clusters out of across-layout scripts.
- **Confidence**: High
