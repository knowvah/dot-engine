# issue #175: `-0` in imagemap coordinates

## Observation: the root map area is `job->pageBox`, the translation comes from `job->clip`
- **Context**: `size.gv` under fdp printed `0,-0,96,41` after the y fix; native prints `-0,-0,96,41`.
- **Finding**: `emit_page` maps the root area from `job->pageBox` (`LL = pagesArrayElem * pageSize - pad`, exactly `-pad`), while `setup_page` builds `job->translation` from `job->clip` (`LL = focus + pageSize * (0 - 1/2.)`). `pageSize` is `(Z * sz) / Z`, which can round one ulp away from `sz`, so under `size=` the two boxes differ by a few ulps and the root area's left edge is a tiny negative (`-5.35e-15`), which `%.0f` prints as `-0`. `emit_map_rect(job, job->clip)` at `emit.c:3600` is not the map device's path (it has `EMIT_CLUSTERS_LAST`).
- **Impact**: a stand-in such as `bb ± pad` for either box loses this. Use `setupPageClip`, `setupPageSize` and `setupPageBox` (`src/gvc/viewport.ts`).
- **Confidence**: High (lldb bits of native's `GVJ_t`, pinned in `src/render/map-coords-sign.test.ts`)

## Observation: reading `GVJ_t` from the native build without debug info
- **Context**: `lldb` on `~/git/graphviz-16.1.1/build/cmd/dot/dot` has no locals at `map_output_shape`.
- **Finding**: compile a small C file that prints `offsetof(GVJ_t, field)` against the 16.1.1 headers (`#include <stdbool.h>`, `<gvc/gvc.h>`, `<gvc/gvcjob.h>`; `-I lib -I build -I lib/common -I lib/cgraph -I lib/cdt -I lib/pathplan -I lib/gvc`), break on the plugin function, and `memory read -f x -s 8 -c N` at `$x0+<offset>` (arm64: the job is `x0`, `AF` is `x2`). On this build `bb` is at 336, `clip` 384, `pageBox` 416, `pageSize` 448, `focus` 464, `zoom` 480, `canvasBox` 512, `scale` 616, `translation` 632, `devscale` 648.
- **Impact**: no instrumented rebuild is needed to read job fields. A breakpoint command aborts when a read fails (`AF` is NULL for an edge under `cmapx_np`), so trace with `cmapx`.
- **Confidence**: High

## Observation: native exits 1 with complete stdout on some corpus inputs
- **Context**: a survey script treated a nonzero native exit as a timeout.
- **Finding**: `1879.dot`, `2619_1.dot` and `2619_2.dot` exit 1 after warnings and still write the full map. Only an error or a signal means the output is missing.
- **Impact**: harness scripts should compare stdout whatever the exit status, as `compare.mjs` does.
- **Confidence**: High

## Observation: `tsx` on a script under `$TMPDIR` cannot resolve the worktree's sources
- **Context**: a one-off trace script in `$TMPDIR` importing `src/index.js` by absolute path.
- **Finding**: it fails with `Cannot find module '../common/agerr.js'` from `src/parser/dot.js`; the same script under the worktree runs.
- **Impact**: keep throwaway `tsx` scripts inside the worktree (the mission's `harness/extra/`).
- **Confidence**: Medium (one occurrence; cause not traced)
