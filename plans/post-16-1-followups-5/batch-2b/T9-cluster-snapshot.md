# T9: cluster attributes read the snapshot (AD-6, item 89)

**Context:** `clusterAttr` (`src/gvc/device-cluster.ts:46`) walks live parent `attrs`, so
`digraph{subgraph cluster_x{a}; graph[color=white]}` draws a white border; native draws
black, because `agget(sg, …)` sees the dict `agsubg` copied when the cluster opened.
`graphAttrInherited` (`src/common/attr-get.ts`) implements that rule
(`graphDefaultsSnapshot`, proven by 2184 and 894589). Keys served: style, color, pencolor,
fillcolor, bgcolor, penwidth, gradientangle, peripheries, colorscheme.

**Task:** (1) Probe each key natively with a declared-after and a declared-before repro
(`$BASE/native/89*`); record the 18 results. (2) `clusterAttr` returns
`graphAttrInherited(sg, key)`; keep `clusterStyle`/`clusterPeripheries` as thin wrappers.
(3) If any key's probe disagrees with the snapshot rule, stop (stop 10) with the probe
output; no per-key special case. (4) Tests: both repros for every key.

**Write-set:** `src/gvc/device-cluster.ts` (+test).
**Read-set:** `src/common/attr-get.ts`, `src/parser/builder.ts` (`graphDefaultsSnapshot`
capture), `lib/cgraph/graph.c:agsubg`, `lib/common/emit.c:emit_clusters` 3795-3880.

**Interface output:** `clusterAttr(sg, key)` reads own value else the snapshot (consumed by
T16).

**Acceptance criteria:**
- *Given* `digraph{subgraph cluster_x{a}; graph[color=white]}`, *then* the border is black.
- *Given* `digraph{graph[color=white]; subgraph cluster_x{a}}`, *then* white.
- *Given* each of the 9 keys, *then* both repros match native.
- *Given* the corpus, *then* bytediff identical (no id hits the case).

**Observability:** N/A. **Rollback:** reversible.
