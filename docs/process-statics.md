# Process statics and their per-render resets

C keeps some state in file statics and globals. One `dot` process renders one
graph, so each starts at its initial value. The port's module statics outlive a
render, so every module that holds such state registers a reset with
`registerRenderState` (`src/common/render-state.ts`). Every public render entry
runs all of them first, and so does `GvcContext.layout`
([part 3 AD-4](../plans/post-16-1-followups-3/decisions.md),
[part 4 AD-8](../plans/post-16-1-followups-4/decisions.md)): one layout
behaves as one native process.

Native in one libgvc process does not do that. On a **no-free relayout**
(`gvLayout` twice on one graph with no `gvFreeLayout` between) a C static keeps
its value, and the layout also meets the records the last layout left
(`src/gvc/layout-reset.ts` replaces records only after a free). A static that
is compared with those records must therefore not restart. Decompose's `Cmark`
was one (part 11 T8, issue #138): restarted at 1, it equalled a stale `ND_mark`
and layout 3 of `tests/graphs/nestedclust.gv` went wrong. `nextCmark`
(`src/layout/dot/decomp.ts`) now carries the count with the root's record, so
a free starts it again and a no-free relayout continues it.

This table lists every registered reset against that case. Verdicts:

- **M**: matches C. C assigns the static before every read on each layout, or
  the reset value is what C holds at that point.
- **N**: differs from C, but the static reads no layout record. It stays as it
  is under AD-4 and AD-8: a second `layout` warns again where one native
  process warns once, and the like.
- **S**: compared with stale records. Fixed at its origin, as `Cmark` was, and
  pinned by a native no-free fixture.

`test/docs/process-statics.test.ts` fails when a module under `src/` calls
`registerRenderState` and has no row here, or a row names a module that
registers nothing. A row starts with the module path in backticks; its third
cell cites C as `file:line`; its fifth cell is the verdict. C paths are under
`lib/` of graphviz 16.1.0.

| File | Port symbol | C static | C on a no-free relayout | Verdict | Evidence |
|---|---|---|---|---|---|
| `src/common/agerr.ts` | `lastLevel`, `pending` | `agerrno`, `cgraph/agerror.c:27`; an open stderr line has no static | keeps the last message's level, and an unfinished line stays open | N | Read only to give an `AGPREV` message its level (`agerror.c:137`; `agerr.ts:142`). Inputs are message arguments. C prints warnings and errors alike, so only the port's console channel can differ. |
| `src/common/color.ts` | `colorScheme` | `colorscheme`, `common/colxlate.c:35` | NULL: each emit window restores the scheme it found (`emit.c:1789`, `3072`, `3667`, `3943`) | M | Read by `colorxlate` during a render only. `withColorScheme` restores in a `finally` (`render/color-resolve.ts:198`). Probe `scheme2`: stdout equal. |
| `src/common/crand.ts` | `state` (`rand`) | libc `rand()` state; unseeded draws at `neatogen/stress.c:347`, `fdpgen/xlayout.c:128`, `sparse/general.c:26` | continues the last layout's stream | N | The state reads nothing; its draws jitter positions. Known since part 9: `src/gvc/rerender.test.ts:38` (`mixed.sfdp`, a new graph in the same process gives the same render 2). |
| `src/common/emit-once.ts` | `seen` | `strings`, `common/emit.c:3725` | keeps every string; only `gvFreeContext` clears it (`gvc/gvcontext.c:70`) | N | Keyed by message text (`gvc/gvrender.c:205`; `render/color-resolve.ts:186`). Probe `scheme2`: native warns once in 3 layouts, the port 3 times, and once with the resets off. |
| `src/common/htmltable-emit-fill.ts` | `htmlFillPen` | none: `obj->penwidth` of the job, `common/emit.c:126`, set by `htmltable.c:270` | each object's state starts at 1 | M | The port assigns 1.0 at each top-level table (`htmltable-emit.ts:295`), before the one read (`htmltable-emit.ts:124`). |
| `src/common/htmltable-emit-rules.ts` | `anchorSeq` | `anchorId`, `common/htmltable.c:386` | counts on across renders and layouts | N | A counter, compared with nothing. Probe `anchor` (svg): native ids `_0/_1`, `_2/_3`, `_4/_5`; the port `_0/_1` each time. The port also restarts it per render (`gvc/device.ts:507`): issue #191. |
| `src/common/htmltable-emit-rules.ts` | `anchorEnv` | none: locals of `emit_html_label`, `common/htmltable.c:770` | assigned per label | M | `setHtmlAnchorObj` assigns all three fields per object before its labels (`gvc/device.ts:94`, `202`, `235`, `281`). |
| `src/common/htmltable.ts` | `missingImages`, `sizeWarned` | none: C sizes once per `make_label` (`common/htmltable.c:1082`, `1102`) | each layout's `make_label` warns again | M | Both sets only meet objects parsed by the current `makeHtmlLabelTo` call, the one caller of both passes (`htmltable-label.ts:53-69`), so nothing of the last layout is ever found. Probe `htmlsize`: the port warns once in 3 layouts, resets on or off, because `buildNodeLabel` keeps the stale label: issue #190. |
| `src/common/layout-state.ts` | `State` | `State`, `common/globals.h:66` | `graph_init` assigns `GVBEGIN` (`input.c:702`) | M | The reset in `GvcContext.layout` is that assignment. Read at `postproc.ts:227` (`postproc.c:167`). |
| `src/common/multicolor.ts` | `parseSegsState.warned` | `warned`, `common/emit.c:473` | stays set after the first warning | N | Reads the colour list only. It changes stderr and `parseSegs`' return (2 or 3 once, then 1 or 0), which callers use for the `in node` line. Probe `striped`: stdout equal; native warns once, the port 3 times, and once with the resets off. |
| `src/common/postproc.ts` | `Rankdir`, `Offset` | `common/postproc.c:26`, `28` | `gv_postprocess` assigns both (`postproc.c:605`, `657-668`) before `translate_drawing` | M | `postproc.ts:422`, `430`, in the same order. |
| `src/common/random.ts` | `state` (`drand48`) | libc `drand48()` state; `srand48` at `neatogen/neatoinit.c:989`, `fdpgen/tlayout.c:487`, `ortho/partition.c:684` | every draw follows an `srand48` in the same layout | M | The port seeds at the same points (`layout/neato/start.ts:114`, `layout/fdp/tlayout-init.ts:223`, `ortho/partition.ts:276`). Sweep: neato and fdp, 40 graphs, equal with the resets off. |
| `src/common/safefile.ts` | `imagePathState` | `Gvimagepath`, `common/globals.h:50` | `graph_init` assigns it (`input.c:627`) | M | `graph-init.ts:281`, on every layout. |
| `src/common/safefile.ts` | `imageHooksState` | none: stands in for the files `safefile` opens, `common/utils.c:266` | not applicable | M | Assigned beside the path on every layout (`graph-init.ts:284`), before any read. |
| `src/common/shapes.ts` | `userShapes` | `UserShape`, `common/shapes.c:3935` | keeps every desc; `user_shape` finds it and does not warn again | N | Looked up by name (`shapes.c:3942`; `shapes.ts:179`). No reader compares a desc by identity, and each layout binds `ND_shape` again first (`nodeinit.ts:249`). Probe `shape`: native warns once, the port 3 times, and once with the resets off. |
| `src/common/textmeasure-lookup.ts` | `warnedFontNames` | `strings`, `common/emit.c:3725`, through `textspan_lut.c:780` | as `emit-once.ts` | N | Keyed by font name. Probe `edgefont`: native warns once, the port 3 times, and once with the resets off. |
| `src/common/textmeasure.ts` | `warned` | two `warning_already_reported`, `common/textspan_lut.c:807`, `819` | stay set | N | Read a character code only (`textmeasure.ts:96`, `104`). From the code: the `nonascii` probe's node label is not measured again (issue #190). |
| `src/layout/dot/decomp.ts` | `_dc.cmark` | `Cmark`, `dotgen/decomp.c:29` | `++Cmark` continues (`decomp.c:114`) | S | Compared with stale `ND_mark` (`decomp.c:90`, `123`). Fixed in part 11 T8: `nextCmark` (`decomp.ts:143-163`), pinned by `src/gvc/rerender-nestedclust.test.ts`. |
| `src/layout/dot/mincross-build.ts` | `fillSeq` | none: C's fill nodes are anonymous, `dotgen/mincross.c:990` | not applicable | M | `fillRanks` assigns 0 before every use (`mincross-build.ts:184`). `removeFill` (`dotinit.c:258`; `init.ts:337`) deletes every fill node and `_new_rank` in each completed layout, so no name outlives one. A `phase=2` or `3` stop skips it on both sides: issue #192. From the code: native segfaults on a no-free relayout of the probe input. |
| `src/layout/dot/mincross-cross.ts` | `reMincross` | `ReMincross`, `dotgen/mincross.c:166` | `init_mincross` assigns false (`mincross.c:1017`) | M | `mincross.ts:154`, before `left2right` reads it (`mincross-cross.ts:72`). |
| `src/layout/dot/rank.ts` | `clType` | `CL_type`, `common/globals.h:61` | `graph_init` assigns it (`input.c:699`) before the engine runs (`gvc/gvlayout.c:81`) | M | `graph-init.ts:337`, first in every dot layout (`init.ts:54`); read at `rank.ts:349`, `358`, `497`. Probe `clrank`: equal. |
| `src/layout/fdp/tlayout-parms.ts` | `parms` | `parms`, `fdpgen/tlayout.c:77` | `fdp_initParams` (`tlayout.c:153-179`, from `layout.c:1010`) assigns every field but `Wd`, `Ht` (`tlayout.c:439`) and `loopcnt` (`tlayout.c:139-146`), each before its first read | M | `tlayout-parms.ts:174`, from `fdp/index.ts:59`. |
| `src/layout/fdp/xlayout.ts` | `xParams` | `xParams`, `fdpgen/xlayout.c:35` | `xinit_params` assigns `K`, `numIters`, `T0`, `loopcnt` (`xlayout.c:73-76`), and `C` only when `fdp_parms->C > 0` | M | `xlayout.ts:98-102`. `fdp_parms->C` is process configuration (`-LC`, 0 unless given), so C holds 1.5 or that value on every layout, as the port does. |
| `src/layout/fdp/xlayout.ts` | `xMarg` | `X_marg`, `fdpgen/xlayout.c:42` | `x_layout` assigns it (`xlayout.c:251`) | M | `xlayout.ts:257`. |
| `src/layout/neato/start.ts` | `selfOnce.warned` | `once`, `neatogen/stuff.c:322` | stays set | N | Reads the `start` attribute only. Probe `self`: native warns once, the port 3 times, and once with the resets off. Its stdout differs in renders 2 and 3 for another cause, with the resets on or off: issue #193. |
| `src/render/color-resolve.ts` | `rendererColors.hasKnownList` | none: the renderer's `features->knowncolors`, `gvc/gvrender.c:195` | per render job | M | Assigned at the start of every render (`gvc/device.ts:506`). |

## How the rows were judged

Each row comes from reading every C read and write of the static and the
port's readers. Where the code left a doubt, a probe ran three layouts with no
free, with a render after each, natively (libgvc in one process:
`plans/post-16-1-followups-9/harness/T11/twice.c`, `nofree`, with stderr on)
and in the port (`GvcContext.layout` and `render` in the same loop). Native
repeated 3 of 3 on every probe named above, and each probe's first render
equals native (svg compared below the `<svg>` tag).

Two checks back the N and M verdicts beyond the probes:

- With every reset skipped after layout 1, the port's stderr equals native's on
  each N probe. The reset is the whole difference.
- With the resets on and then off, three no-free layouts gave the same stdout
  on 274 dot inputs in `-Tplain` and 271 in `-Tsvg` (graphviz
  `tests/graphs` and the rerender fixtures), and on 89 inputs under each of
  neato, fdp, sfdp, circo, twopi, osage and patchwork with only the two RNG
  resets kept. No reset changes a no-free layout there.

Native is no reference for many no-free relayouts. On 86 of those dot inputs
(mostly clusters) the port throws in layout 2 or 3, resets on or off, and
native fails on the same 86: 84 segfault and 2 return an error. The sweep
compares 188 dot inputs through all three layouts.
