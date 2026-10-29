# Architecture decisions (locked 2026-10-29)

Approved by the user ("approve all recommendations"). A task that needs to contradict one
stops (stop condition 4).

## Carried from part 5 (`plans/post-16-1-followups-5/decisions.md`)

- **AD-1** commits unsigned and local; the user re-signs with `git rebase -f main`
  (repo-local `commit.gpgsign=true`; do not add `--exec`).
- **AD-2** one branch, one PR, merge commit; no `feat` task in part 6 (patch release).
- **AD-3** diagnosis budget ~2 h per item, then park with the full artifact.
- **AD-4 amendment** the fused stress kernel on the kD path is never unfused for speed.
- **AD-10** image sizing goes through the installed sizer; no filesystem access, no new
  public hook.
- **AD-13** diagnostic text byte-for-byte native through `agerr.ts`; warnings on
  `console.warn`, errors on `console.error`.
- **AD-17** locale edits by `documentation-engineer`; `npm run docs:i18n-hashes` refreshes.

## AD-1: missing-image and shapefile warnings at layout time (item 90)
- **Context:** `src/gvc/device.ts:501` calls `polyInit` on every render;
  `warnMissingImage` (`src/common/poly-init.ts:107-115`) and the `shapefile` warning
  (`:139-141`) fire per render, so `-Tjson` (whose `collectDrawLookup` is a second render,
  `src/render/json.ts:248`) and any re-render print the pair again. C prints them from
  `poly_init` (`shapes.c:2027-2046`) during layout; `json_begin_graph`'s nested `gvRender`
  (`gvrender_core_json.c:57-64`) does not re-layout.
- **Decision:** both warnings move into the layout-time port of `poly_init`
  (`commonInitNode` / `initNodeFromLabel`, `src/common/nodeinit.ts`) at C's position, after
  the node label is made; render-time `polyInit` emits nothing. Rejected: a once-per-node
  flag (keeps the wrong stderr position relative to other layout warnings).
- **Consequences:** every engine that calls `commonInitNode(Edge)` warns once per layout;
  T1 checks the engines that size nodes without it and journals each.

## AD-2: one port of `gvrender_usershape` (item 91)
- **Context:** `emitHtmlImg` (`src/common/htmltable-emit.ts:226-251`) is a partial copy:
  hard-coded `mc`, no `gvusershape_size_dpi(us, job->dpi)`, no device transform, no swap.
  Nodes have no caller at all.
- **Decision:** `src/gvc/render-usershape.ts` ports `gvrender.c:gvrender_usershape`
  (670-790) entire: `gvusershape_find` = the installed sizer/resolver supplies `name`,
  size at **job dpi** (native draws a 40×20 px PNG at 40×20 in svg while layout reserved
  30×15+2 at 96 dpi), `imagescale`, `imagepos`, `gvrender_ptf` when the renderer does not
  transform, LL/UR swap, then the renderer's loadimage. `emitHtmlImg` and the node caller
  both use it.
- **Consequences:** HTML image output can move toward native when a sizer is installed;
  corpus output is unchanged (no sizer in the walks).

## AD-3: node `usershape_p` branch of `poly_gencode` (item 91)
- **Decision:** port `shapes.c:3058-3080` as written: `usershape_p` for a usershape shape
  (custom needs a non-empty `shapefile`) or a non-empty `image=`; innermost-periphery
  coordinates; `gvrender_usershape(job, name, AF, sides, filled != 0, imagescale,
  imagepos)`; then `filled = 0`. `shapefile` sizing stays as part 5 left it (no size, so
  `gvusershape_find` misses and nothing draws, as headless native).

## AD-4: xdot loadimage (item 91)
- **Decision:** the xdot renderer gains `usershape`, the port of
  `gvrender_core_dot.c:core_loadimage_xdot` (the `I` op, `x y w h` then `-name`), so node
  and HTML images appear in xdot and therefore json. svg keeps its existing
  `core_loadimage_svg` port (`src/render/svg.ts:240`).

## AD-5: empty colour name in node and cluster fills (item 92)
- **Context (native 16.1 probe, 2026-10-29):** node `fillcolor=":red"`, cluster
  `fillcolor=":red"` and cluster `bgcolor=":red"` each print `Warning:  is not a known
  color.` once and fill `#000000`; `"red:"` is a gradient (already matches).
- **Decision:** nodes (`poly-gencode.ts`) and clusters (`device-cluster.ts`) resolve the
  fill through the same path part 5 T11 built for HTML (`resolveFillColorName`), reached
  where C reaches `gvrender_set_fillcolor` with the empty name. T2 finds the C call chain
  first and records it.

## AD-6: ipsep right-multiply from the disassembly (item 94)
- **Decision:** read `_stress_majorization_cola` (0x3904c+) in the 16.1
  `libgvplugin_neato_layout` dylib instruction by instruction, especially the
  `fmul.4s`/`fmla.4s` blocks at 0x3b19c and 0x3b570. Verdict: same shape as the kD inline
  copy → `COLA_OPS.rightMult = rightMultWithVectorFFFused`; a different shape → a cola
  variant beside it in `conjgrad-mkernel.ts` with its own evidence; unfused → keep and
  document. The six ipsep probes decide nothing alone (both forms sit 0.010 pt off).

## AD-7: verification scope
- **Decision:** T6 always runs the fresh survey. An engine walk runs for an engine only
  when bytediff over the corpus ids shows an output change for that engine on the branch
  (part 5 ran all seven unconditionally; here T2/T4 cannot reach the corpus and T3 only
  ipsep). Format walks likewise only for a changed format. No speed gate.
