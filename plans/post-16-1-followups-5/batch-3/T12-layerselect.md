# T12: `layerselect` / `layerlist` (AD-9, item 79) — `feat`

**Context:** `lib/common/emit.c:998-1160`: `parse_layerselect` turns `layerselect` into a
list (`[count, l1, l2, …]`, warning `The layerselect attribute "%s" does not match any
layer specifed by the layers attribute - ignored.` when nothing matches);
`numPhysicalLayers`, `firstlayer`, `nextlayer`, `validlayer` walk that list (with
`GVDEVICE_DOES_LAYERS`: a count > 1 on a device without layers warns and prints one
layer by setting `list[1] = numLayers + 1`). The port (`src/common/layers.ts:35`,
`src/gvc/first-layer.ts`, `src/gvc/device.ts:343-355`) has only the `layers` loop.

**Task:** (1) Port `parse_layerselect` and its helpers (`layer_index`, range syntax) into
`layers.ts`, returning the C list shape on `LayerInfo`. (2) Port the four walk functions
into `first-layer.ts`; `renderGraph` iterates with them (`for (firstlayer; validlayer;
nextlayer)`), `job.layerNum`/`job.numLayers` set as C sets them. (3) `emit-walk.ts`'s
`nodeInLayer`/`edgeInLayer` stay keyed on `job.layerNum`; confirm `layerPagePrefix` and
`-Tcmapx` behave. (4) Tests from `$BASE/native/79*` (svg, xdot, cmapx).

**Write-set:** `src/common/layers.ts` (+test), `src/gvc/first-layer.ts` (+test),
`src/gvc/device.ts` (the `renderGraph` layer loop only), `src/gvc/emit-walk.ts` (+test).
**Read-set:** `lib/common/emit.c:995-1170`; `src/gvc/job.ts:285-300`; T5's `device.ts`
edge-section changes (rebase on them).

**Acceptance criteria:**
- *Given* `layers="a:b:c" layerselect="b"` -Tsvg, *then* only layer b is emitted, equal to
  native; *given* `"b,c"`, *then* two layer groups in that order.
- *Given* `layerselect="zz"`, *then* the native warning and all layers.
- *Given* `layerselect="b,c"` on -Txdot, *then* `layers not supported in xdot output` and
  one layer, equal to native.
- *Given* corpus ids with `layers`, *then* bytediff identical.

**Observability:** N/A. **Rollback:** reversible.
