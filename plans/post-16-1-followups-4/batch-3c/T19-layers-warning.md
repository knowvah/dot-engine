# T19: `layers not supported in <fmt> output` (item 59, AD-9)

**Context:** `lib/common/emit.c:1125-1145` `firstlayer`: with a `layerselect` list of more
than one layer, or `numLayers > 1`, on a device without `GVDEVICE_DOES_LAYERS`, it warns
`agwarningf("layers not supported in %s output\n", job->output_langname)` and prints only
one layer (`list[1] = numLayers + 1` / `numLayers = 1`). Native prints it for xdot, cmapx
and plain; the port does not.

**Task:** locate the port of `firstlayer`/layer iteration (`grep -rn "numLayers\|layerNum"
src/gvc src/render`: candidates `src/gvc/emit-walk.ts`, `src/gvc/job.ts`); port both the
warning and the one-layer effect for every format whose native device lacks
`GVDEVICE_DOES_LAYERS` (check each plugin's `features` flags in `plugin/core/*.c`), with
`output_langname` as native prints it.

**Write-set:** the file holding the port of `firstlayer` (+ test). If the warning and the
one-layer rule live in different files, both (journal the pair).
**Read-set:** `lib/common/emit.c:1100-1170`; `plugin/core/gvrender_core_{dot,map,json}.c`,
`plugin/core/gvloadimage_core.c` feature flags; T0 native item-59 cases.

**Acceptance criteria:**
- *Given* `digraph{layers="a:b";x[layer=a];y[layer=b]}`, *when* rendered xdot, cmapx and
  plain, *then* stderr and output equal native's.
- *Given* the same as svg (which does layers), *then* no warning, output unchanged.

**Observability:** N/A. **Rollback:** reversible.
