# issue-129 mission — observations (2026-11-10)

## Observation: no standing 16.1.0 plugin dir carries a non-dot engine
- **Context**: gate 6 of a queue mission, `-Kneato` against the 16.1.0 oracle with the brief's
  `GVBINDIR=/tmp/ghl`.
- **Finding**: `/tmp/ghl` holds only `core` and `dot_layout` (`test/corpus/gen-headless-gvbindir.sh`),
  so `oraclePreflight(dot, '/tmp/ghl', 'neato')` fails with `There is no layout engine support for
  "neato"`. `/tmp/ghl1611-all` is the 16.1.1 build. A 16.1.0 dir with an engine added is the script's
  recipe plus one plugin: symlink `build/plugin/{core,dot_layout,neato_layout}/libgvplugin_*` into a
  dir under `$TMPDIR`, then `GVBINDIR=<dir> <dot> -c`. Text stays on the estimate path.
- **Impact**: a queue brief that names `/tmp/ghl` for a neato, fdp, sfdp, twopi, circo, osage or
  patchwork survey cannot run as written; build the dir first and pass it as `GVBINDIR`.
- **Confidence**: High

## Observation: a PRIVATE neatogen kernel can be called natively without instrumenting the tree
- **Context**: checking that native prints one line for `conjugate_gradient_mkernel`'s zero-length
  error, a path no corpus input reaches.
- **Finding**: `cc -flto=thin -O3 h.c build/lib/neatogen/libneatogen.a build/lib/cgraph/libcgraph.dylib
  build/lib/util/libutil.a -Wl,-rpath,build/lib/cgraph -Wl,-rpath,build/lib/cdt` links a ten-line
  harness that declares the prototype itself; hidden visibility does not stop a static link. The
  fixture `A = {1e30f, 0, 1e30f}`, `b = {1e-30f, -1e-30f}`, tol 0, 3 iterations returns 1.
- **Impact**: numeric kernels under `lib/neatogen` can be probed on synthetic inputs in `$TMPDIR`
  with the oracle's own objects, with no rsync or rebuild of graphviz.
- **Confidence**: High

## Observation: a tsx script under `$TMPDIR` needs the `.mts` extension
- **Context**: a one-off survey script importing the repo's comparators by absolute path.
- **Finding**: outside the repo's `"type": "module"` scope tsx compiles `.ts` as CommonJS and rejects
  top-level `await`; `.mts` runs as ESM.
- **Impact**: name temp harness scripts `.mts`.
- **Confidence**: High
