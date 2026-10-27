# Architecture decisions (locked 2026-10-27)

Approved by the user ("approve all recommendations"). A task that needs to contradict one
stops (stop condition 4). Part 3's `render-state.ts` / `agerr.ts` and part 4's
`conjgrad-mkernel.ts`, `attr-get.ts`, `gvrender-set-style.ts`, `first-layer.ts` are existing
architecture this mission builds on.

## AD-1: commits unsigned and local; user re-signs at the end
- **Context:** every commit is SSH-signed with a YubiKey; an agent shell cannot answer it.
- **Decision:** `git -c commit.gpgsign=false commit`; never push, open a PR, sign or touch
  `main`. T17 hands the user `git rebase -f main` (repo-local `commit.gpgsign=true` re-signs
  every replayed commit; do not add `--exec`).
- **Consequences:** one interruption at the end.

## AD-2: one branch, one PR, merge commit
- **Decision:** branch `chore/post-16-1-followups-5`, one commit per task, one PR merged as
  a merge commit. semantic-release reads every task commit: only T12 (`layerselect`) is
  `feat` (minor release); no `BREAKING CHANGE`.

## AD-3: diagnosis budget
- **Decision:** ~2 h per item/site, then park with mechanism / origin / causal chain /
  ruled out / next instrument, and continue. A parked item is a valid outcome.

## AD-4: fused stress kernel on the production kD path (item 85)
- **Context:** part 4 built `src/layout/neato/conjgrad-mkernel.ts` from the 16.1 disassembly
  (per-call-site fusion, 16-wide reduction blocks); `stress-kernel.ts` still runs the
  unfused loops, `cgStep` returns true where C breaks on `p_Ap == 0`, its `OPT_SMART_INIT`
  is `1` (C `0x4`), and `checkExp` (`stresswt`) is unported.
- **Decision:** `stressMajorizationKDMkernel` calls `conjugateGradientMkernelFused` /
  `rightMultWithVectorFFFused`; `cgStep` breaks; the constant is `0x4` shared from
  `stress.ts`; `init.ts` ports `checkExp` and feeds `opt_exp_flag` from it. No new fusion
  site without disassembly evidence (part-3 AD-6 bar). Output changes only toward the
  oracle: bytediff explained per id, neato/fdp/sfdp walks no pass→worse, speed p50 ≤ 1.05×.

## AD-5: `State == GVSPLINES` as render state (item 87)
- **Context:** `lib/common/globals.h:66` `State` is set to `GVSPLINES` at
  `dotsplines.c:477`, `neatoinit.c:567`, `neatoinit.c:586`, `neatosplines.c:778`;
  `translate_drawing` maps edges only then. Patchwork never sets it; the port warns
  `lost … edge` for every patchwork edge.
- **Decision:** `src/common/layout-state.ts` exports `State`/`GVSPLINES` (`registerRenderState`
  reset), set at the port of each of the four C sites; `translateDrawing` reads it.
- **Consequences:** patchwork prints nothing, as native; dot/neato/fdp unchanged.

## AD-6: cluster attributes read the parse-time snapshot (item 89)
- **Context:** `clusterAttr` (`src/gvc/device-cluster.ts:46`) walks live parent `attrs`;
  C's `agget(sg, …)` sees the dict copied when the subgraph opened (`agsubg`), the rule
  `graphAttrInherited` (`src/common/attr-get.ts`) already implements (2184, 894589).
- **Decision:** `clusterAttr` returns `graphAttrInherited(sg, key)` for every key it serves
  (style, color, pencolor, fillcolor, bgcolor, penwidth, gradientangle, peripheries,
  colorscheme). Each key is probed against native first (declared-after and
  declared-before repros); a key whose probe disagrees stops the task (stop 10).

## AD-7: agerr partial lines (items 75, 77, 82)
- **Context:** `emit.c:parseSegs` warns `Total size > 1 in "%s" color spec ` with no newline;
  the next `agerr` call continues the same stderr line. `agerr.ts` is line-based.
- **Decision:** `agerr.ts` holds a message that does not end in `\n` and prefixes it to the
  next message on the same channel; a held line flushes on render-state reset. Callers
  pass C's text verbatim, newline included or omitted exactly as C does.
- **Consequences:** `probe.ts` compares whole lines, so the joined line must equal native's.

## AD-8: style tokenizer ported file for file (item 80)
- **Decision:** `styleTokens` (`src/common/style-resolve.ts:169`) becomes the port of
  `emit.c:style_token` + `parse_style`: no trimming inside a token, `(args)` kept with the
  token, `agerrorf("nesting not allowed in style: %s")`, `agerrorf("unmatched ')' in style:
  %s")`, `agwarningf("truncating style '%s'")` at FUNLIMIT. `parseStyleFlags`, the xdot `S`
  ops and `gvrenderSetStyle` consume the same tokens. Per-bezier style warnings follow
  `emit_edge_graphics` order relative to colour warnings (`device.ts:200`).

## AD-9: layers list walk ported file for file (item 79)
- **Decision:** `parse_layerselect` (`emit.c:1013`) into `src/common/layers.ts`;
  `numPhysicalLayers`, `firstlayer`, `nextlayer`, `validlayer` (`emit.c:1115-1160`) into
  `src/gvc/first-layer.ts`; `renderGraph` (`src/gvc/device.ts:343`) becomes the list walk.
  `GVDEVICE_DOES_LAYERS` stays `renderer.beginLayer !== undefined`.

## AD-10: image sizing through the installed sizer (item 83)
- **Decision:** `poly_init`'s `image=` branch (`shapes.c:2039-2050`) sizes through
  `gvc.imageSizer` (+2 padding, `has_images`); the HTML size environment carries the
  per-context resolver so `imageIsSupplied` sees it. No filesystem access, no new public
  hook (stop 12). With no sizer installed output is unchanged.

## AD-11: `agnameof` helper (item 74)
- **Decision:** `agNameOf(g)` in `src/model/cgraph-ops.ts` (next to `LOCALNAMEPREFIX`)
  returns `%<id>` for an anonymous graph; `mapGraphName` and the four neato message sites
  (`edge-len.ts:28`, `kk.ts:293`, `start.ts:150,198`) use it. Dot/xdot re-serialization is
  untouched.

## AD-12: labels freed by engine cleanup (item 72)
- **Decision:** each engine's `cleanup` frees node/edge/graph labels where its C does
  (`dotinit.c:110-111,176`, `utils.c:1517-1531`, `neatoinit.c:401-404`); `buildNodeLabel`'s
  early return stays, since C never rebuilds at render time (stop 11).

## AD-13: diagnostic text and channel
- **Decision:** part 4's AD-9 unchanged: text byte-for-byte native through `agerr.ts`;
  warnings on `console.warn`, errors on `console.error`.

## AD-14: attribute-value XML rejection follows a native probe (item 76)
- **Decision:** probe native with U+FFFE, U+FFFF and lone surrogates inside an attribute
  value; port exactly what expat rejects (expected: `CONTENT_NON_XML`'s set), nothing more.

## AD-15: `fma` handles non-finite operands at the primitive (item 84)
- **Decision:** `src/common/fma.ts` returns `a*b + c` when the product or addend is
  non-finite; `matrix-ops.ts:24`'s wrapper is removed. Finite inputs are bit-identical.

## AD-16: cluster colorscheme window spans box and label (item 81)
- **Decision:** the `withColorScheme` window moves from `applyClusterObjState` to
  `renderCluster` (`device.ts`), closing after `renderClusterLabel`, as `emit.c:3800→3943`.
  The tapered `transparent` pen is what C sets (`emit.c:2425`): probe and journal only.

## AD-17: docs wording and locales (item 86)
- **Decision:** all 24 `errors.md` pages change "not negative" to "positive" in each page's
  language; `documentation-engineer` edits; `npm run docs:i18n-hashes` refreshes hashes.

## AD-18: json nested render in `beginGraph` (item 78)
- **Decision:** the xdot sub-render moves from `JsonRenderer.endGraph` to `beginGraph`
  (`json_begin_graph`), the draw lookup held on the renderer instance.
