# issue-141 mission — observations (2026-11-10)

## Observation: a node lies outside GD_bb only where a layout stops before setting the bb
- **Context**: the brief's native probe for #141 (a node outside `GD_bb` and within the svg pad of
  it, which the pad-4 devices draw and the pad-0 devices do not). Planning found none.
- **Finding**: a probe exists. `dot_position` calls `set_ycoords` before `dot_concentrate` and before
  the x-coordinate network simplex (`lib/dotgen/position.c`), and `set_aspect` (which sets `GD_bb`)
  comes last. When `dot_concentrate` fails (corpus `2825`: `rebuild_vlists: lead is null`), `GD_bb`
  stays `0,0,0,0`, every node has its rank y, and its x is still the order mincross saved in
  `ND_coord.x` (`saveorder`, `mincross.c`), a small integer. The lowest rank's y is that rank's
  `ht1`, which includes the cluster margins. With `margin=1` on both of 2825's clusters node `G` is
  at `0,20` with box y `[2,38]`: native 16.1.0 draws it in svg and cmapx (pad 4) and not in xdot or
  json (pad 0). `margin=0` puts the box on the bb (drawn everywhere); the default margin 8 puts it
  16 pt away (drawn nowhere); `pad=0.05` draws it on every device and `pad=0` on none.
  Fixtures and refs: `plans/issue-141-nodeinbox-pad/harness` (`regen.sh`), pinned by
  `src/gvc/node-in-box-pad.test.ts`.
- **Paths that cover every node** (native `-Tdot`, bb against each node box, 0 nodes outside):
  dot with `ratio=<n>`, `ratio=fill` + `size`, `rotate=90`, clusters and self-loops (`set_aspect`
  scales by factors >= 1 and `dot_compute_bb` takes each rank's end nodes); neato, fdp, sfdp, circo,
  twopi with `pack`, `ratio=compress`, pinned nodes and xlabels (`compute_bb` runs over every node
  after the last move); osage and patchwork (the bb is the packed rectangle); `neato -n`, `-n2`,
  `-Knop`, `-Knop2` with a wrong `bb=` (`neatoinit.c:556` recomputes it). `-y` only inverts printed
  coordinates. A layout that fails before `set_ycoords` (mincross) leaves every node at `0,0`, on
  the degenerate bb, so every device draws it.
- **Impact**: a clip or pad change needs the `abort-*` fixtures, not only complete layouts: no
  complete layout separates pad 4 from pad 0 on the node gate.
- **Confidence**: High

## Observation: `job.pad` readers after the per-device pad
- **Context**: the brief's stop condition on `job.pad` reaching non-svg, non-map output.
- **Finding**: `job.pad` is read by `deviceClip` (every device), `svg-graph.ts` (svg dims),
  `buildMapCtx` (`map.ts`, map coordinates) and `render`'s `z` → `job.scale`, which only
  `svg-graph.ts` reads. `job.zoom` stays 1 (`device-transform.ts`). `writePlain` does not read it:
  it passes a literal `{0,0}` pad to `initJobViewportZoom`, so `pad=` + `size=` gives the wrong
  `graph` scale in plain (native `0.28571`, port `0.66667` on `pad=1 size="1,1"`). Filed as #198,
  not fixed in #141.
- **Impact**: after #141 `job.pad` is C's `job->pad` on every device, so a writer that needs the
  pad can read it instead of restating a device default.
- **Confidence**: High

## Observation: Gate 4 counts comment lines in `src/render/map.ts`
- **Context**: three `defaultPad` fields with doc comments and a named constant.
- **Finding**: `map.ts` is on the line ratchet at 808 (`test/golden/line-limit-baseline.txt`) and
  was at 803; ten added lines failed Gate 4. A trailing `// @see` on the field line keeps the
  reference at one line per field.
- **Impact**: additions to a ratcheted file have about five lines of room; check `wc -l` against the
  baseline before running the gates.
- **Confidence**: High
