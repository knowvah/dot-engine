# issue #181: clusters drawn only in their layers

## Observation: a writer set filled by a render callback changes meaning once an emit can be skipped
- **Context**: porting `clust_in_layer` into `renderClusters` (`src/gvc/device.ts`); with only that change, `-Txdot` and `-Tjson` of a graph with `layerselect` lost the skipped cluster's `bb`.
- **Finding**: the dot/xdot writer (`src/render/dot/agwrite.ts`) decided "is this subgraph a cluster" from `this.clusters`, which `XdotRenderer.endCluster` fills (`src/render/dot.ts`). C keeps two separate facts: `GD_clust` (walked by `rec_attach_bb`, gives `bb` and the label triple) and "`xdot_end_cluster` ran" (gives `_draw_`). They were the same set until a cluster could be skipped. The writer now reads `GD_clust` through `inClusterTree` (`src/render/dot/attrs.ts`), and `clusters` means only "drawn". A skipped cluster prints `bb`, no fresh `_draw_`, and keeps a `_draw_` the input stored.
- **Impact**: before adding a skip to any emit path (clip, layer, page, `style=invis`), check what the dot/xdot/json writer reads from that path's callbacks. Under `layerselect` a device without layers still has `numLayers > 1` (`firstlayer`), so layer tests reach maps, xdot and json, not only svg.
- **Confidence**: High (`src/render/svg-clust-in-layer.test.ts`, `select` and `select-stored`)

## Observation: the cluster identity survey in a brief ran one engine
- **Context**: gate 6b compared base and head over 293 cluster inputs under `-Kdot` only, while the writer change applies under every engine.
- **Finding**: `GD_clust` is filled by a different function per engine (`src/layout/{dot,neato,fdp,osage,patchwork}`), and circo, twopi and sfdp leave it empty. A 40-input sample under the other 7 engines (`plans/issue-181-clust-in-layer/harness/survey-clusters-engines.txt`) cost about 8 minutes and was all `same`.
- **Impact**: when a change reads `info.clust`, sample every engine in the identity survey; `samecheck.mjs` takes the engine from the list's second column.
- **Confidence**: High
