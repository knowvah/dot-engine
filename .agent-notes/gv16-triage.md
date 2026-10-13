# gv16-triage — Graphviz 9d6e3abfd..16.1.0 behaviour triage (mission graphviz-16.1-sync, T3)

Range: `git -C ~/git/graphviz log 9d6e3abfd..16.1.0` = 519 commits (436 non-merge + 83 merge).
Oracles: 15.x = `~/git/graphviz-15` (9d6e3abfd + env-gated GVTS), 16.1 = `~/git/graphviz` (`oracle/16.1.0`).
Scratch evidence: `/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/dfc80e32-d4b2-43d1-a20b-4d2c1be89946/scratchpad/t3/`
(`diff-svg.json`, `diff-walk-out.json`, `confirm.log`, `fdp-recheck.log`, `bisect-42.log`, `asm/`, `classified.json`).

## 1. Summary per area task

| area | `port` rows | corpus ids moved 15.x→16.1 (engine/format) |
|---|---|---|
| T7 HTML | 1 — f0d07786b | 23 HTML-table ids (tree-graphs-directed-table, 56, 1425, 1425_1, 1622_1, 1622_3, 2159, 2295, 2619, 2619_1, 2619_2, graphs-grdfillcolor, graphs-grdlinear, graphs-grdlinear_angle, graphs-grdradial, graphs-grdradial_angle, graphs-html2, graphs-rd_rules, graphs-sides, graphs-sq_rules, graphs-url, linux.x86-html2_dot, nshare-html2_dot): dot/svg, plus xdot and json on each of dot, circo, twopi, osage, patchwork, neato, fdp, sfdp — 391 id+engine+format moves |
| T8 dotgen+ortho | 8 — eec5068a6, 8fd4b59ef, 178fe6d2f, 312e49714, 057e8779d, 67bacf48e, 3660b260e, 3c01aaeb4 | 2784 dot/svg (new 16.1 input; output + stderr) |
| T9 renderers | 5 — f25f2048b, c2e8c5e98, 50c35df8b, e1fbc3ef0, 6a7e16ed2 | none |
| T10 force engines + labels | 2 — 630465f82, 13e5f6ce8 | 42 sfdp/xdot, 42 sfdp/json |
| T11 shared | 1 — 41e482146 | none |

No moved id is outside these rows. 2851 (topsort, eec5068a6) is byte-identical on both builds: Release builds define `-DNDEBUG`.

## 2. Classification counts

| port | refactor | outside | total |
|---|---|---|---|
| 17 | 279 (incl. 83 merge commits with empty `git show --cc`) | 223 | 519 |

## 3. Rows

Port rows first (one per commit), then individually noted refactor/outside rows, then grouped rows. Every sha appears exactly once (checked by script against `git log 9d6e3abfd..16.1.0`).

| commit | C file:function | class | behaviour change (1 line) | port target src path:fn | ids moved (engine/format) | area |
|---|---|---|---|---|---|---|
| f0d07786b | lib/common/htmltable.c:emit_html_tbl | port | table border + rules now emitted before the cells (was after); changes SVG/xdot/json op order and, for filled cells, what paints over what | src/common/htmltable-emit.ts:emitHtmlLabel (draw order comment :333 "Cells, Rules, Border" → Rules, Border, Cells; also emitTableRules) | 23 ids (tree-graphs-directed-table, 56, 1425, 1425_1, 1622_1, 1622_3, 2159, 2295, 2619, 2619_1, 2619_2, graphs-grdfillcolor, graphs-grdlinear, graphs-grdlinear_angle, graphs-grdradial, graphs-grdradial_angle, graphs-html2, graphs-rd_rules, graphs-sides, graphs-sq_rules, graphs-url, linux.x86-html2_dot, nshare-html2_dot): dot/svg; and xdot + json for each of dot, circo, twopi, osage, patchwork, neato, fdp, sfdp (391 id+engine+format moves) | T7 |
| f25f2048b | plugin/core/gvrender_core_svg.c:svg_begin_graph | port | new graph attribute `svgid` adds id="..." (XML-escaped) to the root <svg> | src/render/svg-graph.ts:svgBeginGraph | none in corpus | T9 |
| 41e482146 | lib/common/input.c:graph_init; lib/cgraph/io.c:agmemconcat | port | `postaction` graph attribute no longer re-parsed/concatenated (feature removed, agmemconcat API removed) | src/common/graph-init.ts:graphInit (:267 SKIPPED comment; port already ignores postaction, now matches C) | none in corpus | T11 |
| eec5068a6 | lib/dotgen/mincross.c:fixLabelOrder | port | assert compares topsort size to node count sampled before topsort drains sg; only assert-enabled builds aborted (Release has -DNDEBUG: 2851 byte-identical on both builds) | src/layout/dot/label-order.ts:fixLabelOrder (no assert in port; already matches) | none in corpus | T8 |
| 8fd4b59ef | lib/dotgen/dotsplines.c:dot_splines_ | port | non-zero orthoEdges rc now returned from dot_splines_ → dotLayout/doDot fail → dot_layout skips dotneato_postprocess (no translation, exit 0) | src/layout/dot/ortho-adapter.ts:dispatchOrthoEdges (+ src/layout/dot/index.ts doDot failure path) | 2784 dot/svg (skips dotneato_postprocess → untranslated output) | T8 |
| 178fe6d2f | lib/ortho/ortho.c:orthoEdges | port | mkMaze returning NULL now makes orthoEdges return -1 (was unreachable/crash) | src/ortho/index.ts:orthoEdges | none in corpus | T8 |
| 312e49714 | lib/ortho/maze.c:mkMaze | port | partition returning NULL frees the maze and returns NULL | src/ortho/maze.ts:mkMaze | none in corpus | T8 |
| 057e8779d | lib/ortho/partition.c:partition | port | empty horizontal trapezoid list → stderr "horizontal trapezoid construction failed", return NULL | src/ortho/partition.ts:partition | 2784 dot/svg (stderr `horizontal trapezoid construction failed`) | T8 |
| 67bacf48e | lib/ortho/partition.c:partition | port | empty vertical trapezoid list → stderr "vertical trapezoid construction failed", return NULL | src/ortho/partition.ts:partition | none in corpus | T8 |
| 3660b260e | lib/ortho/trapezoid.c:construct_trapezoids | port | add_segment failure discards the trapezoid list (returns empty) instead of continuing | src/ortho/trapezoid.ts:constructTrapezoids | 2784 dot/svg (empty trapezoid list) | T8 |
| 3c01aaeb4 | lib/ortho/trapezoid.c:add_segment | port | invalid trapezoid: stderr "add_segment: error" + break replaced by "trapezoid segment construction failed" + return -1 (the trigger for the ortho failure chain) | src/ortho/trap-segment.ts:addSegment/advanceT (INVALID_TRAP branch :274) | 2784 dot/svg (with 8fd4b59ef/3660b260e/057e8779d chain) | T8 |
| c2e8c5e98 | lib/xdot/xdot.c:radGradient | port | negative radial stop count rejected (parse returns NULL) instead of a huge calloc | src/xdot/parse.ts:XdotParser.radGradient/parseStops | none in corpus | T9 |
| 50c35df8b | lib/xdot/xdot.c:linGradient | port | negative linear stop count rejected (parse returns NULL) instead of a huge calloc | src/xdot/parse.ts:XdotParser.linGradient/parseStops | none in corpus | T9 |
| e1fbc3ef0 | lib/xdot/xdot.c:linGradient,toGradString; plugin/core/gvrender_core_json.c:write_linear_grad | port | linear n_stops parsed with strtoul (parseUInt): "-N" wraps to a huge count instead of the c2e8c5e98/50c35df8b reject; API type unsigned | src/xdot/parse.ts:XdotParser.linGradient; src/render/json.ts (stops) | none in corpus | T9 |
| 6a7e16ed2 | lib/xdot/xdot.c:radGradient,toGradString; plugin/core/gvrender_core_json.c:write_stops | port | radial n_stops parsed with strtoul; toGradString prints n_stops with %u (identical for valid counts) | src/xdot/parse.ts:XdotParser.radGradient; src/xdot (toGradString equivalent) | none in corpus | T9 |
| 630465f82 | lib/sfdpgen/spring_electrical.c:pcp_rotate (inlined into multilevel_spring_electrical_embedding) | port | static lets LTO inline pcp_rotate; the inlined, vectorised covariance loop `y[dim*k+l] += x*x` is no longer FMA-fused (objdump: out-of-line fmla.2d/fmadd → inlined fmul.2d+fadd.2d), so the PCA axis and every rotated sfdp coordinate shift by ULPs; on 42 this flips pathplan triangle membership and reroutes 3 edges | src/layout/sfdp/spring-driver.ts:pcpRotate (model unfused y accumulation in the vectorised main loop, fused in the scalar tail) | 42 sfdp/xdot, 42 sfdp/json (stderr warning set also changes) | T10 |
| 13e5f6ce8 | lib/neatogen/constraint.c:initItem | port | margin half-sizes converted with d2i (clamp to INT_MIN..INT_MAX, else truncate) instead of UB conversion; identical below 2^31 (and on arm64, whose fcvtzs already saturates) | src/layout/neato/constraint-adjust.ts:initItem (Math.trunc → clamp like d2i) | none in corpus | T10 |
| 1ae5c03b7 | lib/dotgen/rank.c:cleanup1 | refactor | frees the same de-duplicated edge set, just one step later; no freed pointer is dereferenced before or after (pointer-value UB only) | — | — | — |
| 2770bb28c | lib/dotgen/mincross.c:dot_mincross,cleanup2 | refactor | frees globals on the mincross failure path; success path unchanged | — | — | — |
| 3e0823c40 | lib/sparse/SparseMatrix.c:SparseMatrix_decompose_to_supervariables | refactor | mask int→size_t but tested mask[i] instead of mask[isuper] — sfdp crash regression #2852 in 15.1.1/16.0.0; reverted in semantics by f4a65210a, net no change 9d6e3abfd→16.1.0 | — | — | — |
| f4a65210a | lib/sparse/SparseMatrix.c:SparseMatrix_decompose_to_supervariables | refactor | restores the pre-3e0823c40 test (mask[isuper] unset or < i ≡ old int `mask[isuper] < i` with -1 sentinel); net no change over the range | — | — | — |
| 11feb9a71 | plugin/core/gvrender_core_json.c:json_end_graph | refactor | stops overwriting g->clos->disc.io; JSON output bytes unchanged (renderer writes via gvprintf) | — | — | — |
| 955bcde23 | lib/ortho/partition.c:monotonate_trapezoids | refactor | reverts the on-demand monchain list to a calloc(LIST_SIZE(tr)) array; identical for in-range indices | — | — | — |
| f7106b30e | plugin/core/gvrender_core_dot.c:xdot_textspan | refactor | span->font is always non-null; branch removal only | — | — | — |
| 0158f9f9a | lib/neatogen/dijkstra.c:ngdijkstra | outside | unreachable-node distance clamps at INT_MAX instead of signed overflow; ngdijkstra (int heap; callers embed_graph/kkutils/stress subspace) has no port counterpart (no @see in src/) | — | — | — |
| 3e9520d6d | lib/gvc/gvconfig.c:gvconfig_libdir | outside | libdir falls back to the compiled-in dir when dl_iterate_phdr finds nothing (plugin discovery; port has no plugin loader) | — | — | — |
| 51a993f6c | lib/gvpr/gvpr.c:travDFS/travBFS; lib/cgraph/graph.c:aggetseq | outside | gvpr traversals skip objects created mid-traversal (#2849); cgraph only gains an additive aggetseq accessor | — | — | — |
| c33e36562 | plugin/core/gvloadimage_core.c:core_loadimage_ps | outside | fstat failure now inlines the PS image (PostScript loader; port has only the SVG loader) | — | — | — |
| 673bfc6db | plugin/core/gvrender_core_fig.c | outside | FIG colour table per job (multi-graph FIG output); port has no FIG renderer | — | — | — |
| e5707a66d | plugin/core/gvrender_core_tk.c | outside | tk renderer global removal; port has no tk renderer | — | — | — |
| 3bb528b06 | lib/sparse/mq.c:Multilevel_MQ_Clustering_establish | outside | OOB fix in MQ clustering used only by the `cluster` tool | — | — | — |
| e39bc5d84, 1df4ede20, 374eef374, 6176ff615, 947512181, 4d6fd4c74, 42466dfa8, 2b19a38c7, ba89c82b9, 5e71fba24, 7c8f7c6fd, 6a107aeff, d2fd22fcd, 3d97aa70e, 6e50817e6, fc8b49247, f636503d6, 8b518ce94, 8afd59c90, 8baec8a81, ebadaba47, 03b034a1f, f27192627, 4bc429c9d, aef8a6fd8, 41d62352a, 49d9221d1, 42700ffe2, 381a11a89, 8c3bee0e2, ae50c4900, 19f67ca49, 4460077ef, 52bc92c6c, 1f57ce638, 56aaf5219, 877f27c75, 5386ee001, 3556cc36e, 1ac3445fb, df0d59211, 0a03b1126, a83e700a8, 8151d7d27, f09fd40e7, 2b97cceac, 57cc106be, 568c8932c, 6a65c87ce, 67d6e9247, b963794d6, c8cc4b557, dd7527bf4, 93855a21d, d5ecf05e8, 06fff22d8, 6657bed31, 6c9689d49, ff7836ad8, ceed094c7, 7c16cdd49, 67318f3a9, 78ae3e908, 33cd8cce4, 271fb2b4b, 08d4f3dce, c1a74c6ce, de4f6b5d2, de8b69206, a00bb7c9c, 475aa7887, 23b06521a, e6f2c1df9, 4234492fa, 3c5129067, 892f110cc, e42d3b56d, 80837292c, 28d0d479a, 9874aae01, 3a7ac0eec, adc8abf30, e41c71071 | — | refactor | merge commits with no diff of their own (`git show --cc` empty for all 83); content is classified at the merged commits (83 commits) | — | — | — |
| a671660ee, 84e3ca359, f8dacafe6, 62e9eb530, 355daeb5e, 866f8f89c, 42c16d66c, e6d59ff53, 852451992 | lib/sparse/SparseMatrix.c, general.c | refactor | dead non-real-matrix paths removed, size_t row counts, vector_* take size_t (sfdp/neato callers unchanged numerically) (9 commits) | — | — | — |
| 1cd64d0a6, bc9b2752d, 247005918, 835d71425 | lib/dotgen/mincross.c | refactor | clang-format (token-checked), agnnodes_z swaps, NDEBUG warning (4 commits) | — | — | — |
| 57f922149, 25287aaa0, e9ead305c, 2090f321b, d3692b3ca, 2ae339d11 | plugin/core/gvrender_core_{dot,json}.c, gvloadimage_core.c (format) | refactor | function-pointer cast removal, io local, branch-less separators (same bytes) (6 commits) | — | — | — |
| 3cd027466, 024d289da, 4df9ca411, 02c82ca49, e89af0a79, c239a517c, e4d5dc3d4, 1c8daa501 | lib/cgraph/{utils,subg,attr,graph}.c, cgraph.h | refactor | unused dict helpers/params removed, agnnodes_z made public (8 commits) | — | — | — |
| d7a56ec0f, 0b107968f, ece091a51, 9acfc514a, 235e81f7d, 3a12cc314, 4a622c2f0, 96095f9b2, 0a42471f2 | lib/util/random.c, list.h; pathplan/shortestpth.c; circogen/fdpgen agnnodes_z | refactor | gv_random/gv_permutation size_t (same draw path for bound ≤ RAND_MAX), const, agnnodes_z (9 commits) | — | — | — |
| 14cee5b50, 47c82fa56, afa9f4b16, d074e47a4, ffbe55e1c, bf84e31fe, 62fa856d1, f9fbd55e8, 05e9b99d9, 20a9157ab, 39a4e0dfc, e84eff7b1, eed6f433d, 39dc522f6, ece409229, 9b15cfcf0, 0d6408d54, 16d69d3d2, bdfe7041a, 952a4bc5b, 2ef113cf6, 67eb159e3, 26ee63156, 5c5ce59c2, 19dcad316, 181e049b2, 84a61c474, 1ea62972c, 33f5697db, 4152804bb, 335c71974, 2c17d7faa, 1a556f322, 40e6d4b9b, 376126f66, be6e99dba, 23e2925cf, c19981c94, 5d4d81987, 3867c3a19, 441ffd290, 5bfe4fcd3, 9db6d3997, 50a470438, 8fdbe7a41, 25b55677f, 07a87cabc, b433122e2, 49fe35e5c, 805484f44, 98bd9a978, 10d798972, 984711fb6, 2b5c967e0, f432ff8a6, 3f8712bfd | lib/neatogen/{quad_prog_vpsc,constrained_majorization*,sgd,dijkstra,constraint,neatoinit,overlap,call_tri,delaunay,stress}.c, lib/vpsc/csolve_VPSC.cpp | refactor | int→size_t counters (no wrap: loops checked), leak fixes in hier/ipsep majorization, zeroing via calloc, dead code (56 commits) | — | — | — |
| c391596c6, 04639a168, 4a5e6d312, e673fa8cb, 06a21d331, 080178234, 91e9e5ecc, 8111c4e58, 56bc381ca, f922004a9, 94f4eeaa9, 0b30fba24 | lib/sfdpgen/{Multilevel,post_process,sparse_solve,spring_electrical,stress_model,sfdpinit}.c | refactor | mask/matched int(-1)→size_t(SIZE_MAX) sentinels with equivalent tests, size_t params, static/parens (12 commits) | — | — | — |
| a60e1bc3f, 07692e6b5, 3236cb831, 777eebf82, 6e0e4e6bc, 19a24e02e, 905073fd3, 914102b2a, a3162097f, 98236d1db, 5eecab67a, 0501a805e, 40587a65c, 1f83f717f, 4b9981ca7, d612763b0, 0492dfc45, 5a1facb04, 06018b726, 9de2eadc8, dd50387a1, cf2714388, 1158c095d, 71d940a31, 7aeaa726d, 695c088f1, c24ceb83e, a3e241496, 80d8011ef, d6190e498, e06cc210f, 4be2462e8 | lib/common/htmllex.c, htmllex.h, htmltable.h, textspan.h | refactor | typed attribute tables (same names/order), const, Expat signature, clang-format, includes (32 commits) | — | — | — |
| 7ea069b99, 185e5e766, f97b14d2a | lib/common/splines.c:arrow_clip, postproc.c:addXLabels, emit.c:gvRenderJobs | refactor | SWAP macro, agnnodes_z, layerlist leak free (3 commits) | — | — | — |
| db000f144, 015435315, a4137c869, 843184b6a, fe37893ed, 627d193ec, 682fe7ac0, 67d53ae87, 425ad7598, edcaf7fbb, eac2bc8d0, bfa5a66ab, 7fc22af1e, acf876382, a27d3e26e, bcf115455, f5e64cfc3, f1d85104f, 2121cfba2, ecc3c728c, 4b9910f2a, 8c1ee2093 | lib/xdot/xdot.c parse*/printXDot/statXDot | refactor | const, NULL spelling, early return, scope, _printXDot rename (22 commits) | — | — | — |
| e64d1c978, 4da5e27b5, 80a0b7815, 088a6689b, 7597ab803, d89d3b156, 92262eb05, 256bc43fd, 15f1b7edc, e0028e92b, 44c74895c | lib/label/xlabels.c, postproc.c | refactor | unused label tracking removed, bool set, bbox threaded as param, cdt frees hdx, leak fix (11 commits) | — | — | — |
| 153b6879b, 6fe248e74, 269ce1591, 87c37818d, 5e6ac12e7, e1de59bf3, 5996debfd, eefb92978, 2d81d3316, 46d3f201b, e2bc9fcd4, 8a0691cf1, 44114fab4, 50523a6f3, 92660ffca, 23ce62352, 54a2e07dd | lib/ortho/{partition,maze,sgraph,ortho,trapezoid}.c | refactor | vert global→param, get_angle by value, rc plumbing that always returns 0 (8a0691cf1, 92660ffca), partial-init frees, WUR (17 commits) | — | — | — |
| 7d5f17af0, e6ffb720e, 6b9a5ee33, ae09a85a8, 79b11d2de, 2a3d8b409, c44d04a08, da5262483, e5279a8e1, c0bce1607, ef42514ad, e83a82919, cf62b6fd0, 80d38eb0b, 58bb973ba, 03a663cd4, ac65a9534, ee225db0f, 74df7918c, 2d445cc00, b51e4c2ae, a7c69ee69, 05f4c5e4c, 3356eff3c, 9f4c969a7, 3a498ee39, 435f35e6e, 4efbc963c, 8f7461b9f, a4133148a, ff71686cb, 628c25dd1, 0e6a2ecb6, 309234ea3, d14a1fb95, 412a5d1b6, c180c78a4, 8962ad90d, 104c925ee, 9b26ac6e3, 855f8d8df, f3bbfb775, 44097d86c, f77b1589e, 878b13200, 7d2735ee0, 4fb59afaf, 9cc263fc5, f8961e5cc, c14d81ba0, 032e0b05a, f94064dce | .gitlab-ci.yml, ci/*, CHANGELOG.md | outside | CI jobs, Docker digests, release stamps, CHANGELOG wrap (52 commits) | — | — | — |
| 970db7970, 81d011524, 301296e3d, 7b5867694, 35312bff9, 79d4ad417, dc8fbe1fa, ae9fb908c, fd908e031, 333d66f8b, f1550d6b2, f3fb840b6, 3999cb625, d0636ad88, 1efcc2a47, 92b9b7ddc, 27448cdab, 16c66eac7, 337ed8a98, ece271b33, 1e265f2dc, 34b5201ed, 338cdcf24, c72ebbd00, 322aed73f, 29ec9563a | lib/gvc/gvconfig.c, gvplugin.c | outside | plugin directory discovery/loading refactors and libdir leak fixes (port has no dynamic plugin loader) (26 commits) | — | — | — |
| 52f25ae0f, 402a9003d, dc7281d66, 0220ae9a3, b76815ac1, 543cf68bb, 8218d6694, 3a321b564, 824933a53, 587260d13, 73610c27d, fe2f4fd32, 7a6c3b101, 6d4e43545, 34fe39ab7, 6be29acf8, bf5037e63, 8b382f036, f13824978, 2103594e1, 0f3c4ff43, 4fce3ce12, c8393d538, 4a280efae, eda33c38d, 733d55a4f, 3715ad372, b644423b5, 30bf8e838, 6bd6f09d4, ce495fa42, 4c0a587fc, ef50d7c3c, beaa9d680, a24de7712, ac8d04ad2, 66b74126e, f853664df, 276ff1b78, 0934da36d, cbab42966, ee64a979a, 12d96e451, 329441d0e, cf45b0af8, e9f8985a8, 6ec0e22a2, 85f3a6db6, e3e7982db, d5752ff8f | cmd/{gvmap,mingle,smyrna,gvedit,edgepaint,tools}, tclpkg/*, lib/edgepaint, lib/mingle | outside | tool/binding-only changes (gvmap option removals, size_t, gvedit moc, cluster/edgepaint crash fixes) (50 commits) | — | — | — |
| 712327f7a, 5642d9469, 921b906fa, 2f051a2df, 4c8726d0d, e2101ba83, 60bb46ac4, 445db2d0a, ae67bbf67, 9d995b3cb, 1c571ba20, 08b890dc4, 2cbe57f5e, d2f93b347, 40dc87140, 37a054de3, 72561abac, 5c2939bf5, acda0e02e, d87919fdf, badfbdd7f, c0e8c44a3, 9955327c2, abec2fff2, 8af54d5a8, 6d86a4aff, 657485b28, 4e4dd8e75, 6a599b5dc | lib/sparse/{DotIO,mq,clustering,general}.c | outside | DotIO import / vector_ordering / clustering helpers used only by gvmap, cluster, edgepaint, mingle (29 commits) | — | — | — |
| 5266a4121, 5645ff668, bfdf70d2f, b1dbf737d, 9e210363d, 9d31e2c07, 7c68e6293, 05e1a7cd8, d054bbee4, f0d603ca9, b8fa902c5, 6bd023be4, 951efc3df, c7f08c812, 7f47edab1, d66fd37f6, b41826997, eae1d09fb, 83a796d55, 69ef370d8, 97b781666, a412a33c4, c363ed12d, 31b346095, f2aa77a08, 9eafc754b | tests/*, CHANGELOG.md | outside | new/adjusted pytest cases and corpus inputs (2778, 2784, 2834, 2849, 2851, 2852, 2854_1, 2855, 698066, 700813, 894589) (26 commits) | — | — | — |
| 97a4c1ff5, b7804a510, 5601f44c5 | plugin/core/gvloadimage_core.c:core_loadimage_ps{,lib} | outside | PostScript image loader tidy-ups (3 commits) | — | — | — |
| 9fa4c60b4, 4001827fa, 87fdad054, 6a05e691b, 613c87b74, abef43447, 5b2d35916, cd35d4f19, b0937c8fd, 259ad91e0, 65c5f9211, b29a2849c, 3cf927515, cff49bf6b | plugin/{vt,gd,gdiplus,ascii}, windows/* | outside | plugins/platform shims the port does not have (14 commits) | — | — | — |
| 831554ccc, 3e0b17fe5, c54355d21, 4e00a8622, 0ac27db01, b9382e4ea, cccd76778, d39ee82f3, 4a64fd54e, a0769808b, c17e3d0ca | lib/gvpr/gvpr.c, lib/expr/exexpr.c | outside | gvpr/expr scope/rename refactors (11 commits) | — | — | — |
| 8cdb7e799, bbe3f8aaa | plugin/core/gvrender_core_{fig,tk}.c | outside | FIG/tk renderer globals (2 commits) | — | — | — |
| c142a87c6, 273658bef, 4b4b4c253 | lib/gvc/gvevent.c:toggle_fit_cb | outside | interactive-viewer zoom callback types (3 commits) | — | — | — |

## 4. Native diff (15.x vs 16.1)

Method. (a) dot `-Tsvg`, all 950 applicable manifest inputs: 16.1 cache `c2e610dcc867` (937 SVGs) vs 15.x cache `c965268e87cc` (930 SVGs; verified to be 9d6e3abfd + headless `/tmp/ghl`: re-rendering 121, graphs-html2 and tree-contrib-dirgraph-apache with graphviz-15 + `/tmp/ghl15` was byte-identical). Missing renders were produced with 2-way parallelism. Compared with `compareSvg(16.1, 15.x, 'deterministic')` after byte-equality (version comment stripped). Result: 913 identical, 24 moved, 5 oracle-error identically on both builds (1411, 1783, imagepath_test-base, share-b545 exit 1 with identical stderr; 2723 SIGSEGV on both), 8 skipped (section 6).
(b) Walk formats on the 910-id `parity.json` conformant roster (minus `engine-exclusions.json`, i.e. 2222 for neato/fdp/sfdp/circo/twopi): dot `-Txdot`, `-Tdot`, `-Tplain`, `-Tplain-ext`, `-Tjson`, `-Tcmapx`, `-Timap`; circo/twopi/osage/patchwork/neato/fdp/sfdp `-Txdot`, `-Tplain`, `-Tplain-ext`, `-Tjson`, `-Tcmapx`, `-Timap`; `/tmp/ghl{,15}` for dot, `ghl{16,15}-all` for the rest. Comparators and tolerances as each walk: `compareXdot` (0.01; 0.5 iterative), `comparePlain({iterative})`, `compareJson` (0.01/0.5), `compareCmapx`/`compareImap` (0/1), `compareDot({iterative})`; dot `-Tdot` decoded UTF-8→Latin-1 fallback like dot-walk. Exit status and stderr were diffed too (build path in `__FILE__` normalised). Every comparator failure was re-rendered standalone 3× per build (6× for the fdp residue) to separate real moves from native run-to-run nondeterminism.

### 4.1 Moved (deterministic, attributed)

| id | engine/format | comparator first difference (16.1 vs 15.x) | explaining commit(s) | evidence |
|---|---|---|---|---|
| tree-graphs-directed-table | dot/svg | `svg/g[1]/g[2]/polygon[1]/@points[0]` 8 vs 11 (147 diffs) | f0d07786b | revert test |
| 1425 | dot/svg | `svg/g[1]/g[1]/g[1]/a[1]/polygon[1]` element polygon vs g | f0d07786b | revert test |
| 1425_1 | dot/svg | same path, polygon vs g (10 diffs) | f0d07786b | revert test |
| 1622_1 | dot/svg | `svg/g[1]/g[1]/polygon[1]/@points[0]` 8 vs 11 | f0d07786b | revert test |
| 1622_3 | dot/svg | `svg/g[1]/g[1]/polygon[1]/@points[0]` 8 vs 11 | f0d07786b | revert test |
| 2159 | dot/svg | `svg/g[1]/g[1]/polygon[1]/@points[0]` 8 vs 11 | f0d07786b | revert test |
| 2295 | dot/svg | `svg/g[1]/g[1]/polygon[1]` polygon vs g | f0d07786b | revert test |
| 2619 | dot/svg | `svg/g[1]/g[1]/polygon[1]/@points[0]` 21 vs 24 (numeric only → port-side "structural") | f0d07786b | revert test |
| 2619_1, 2619_2 | dot/svg | `.../a[1]/polygon[2]/@fill` none vs #add8e6 | f0d07786b | revert test |
| 56 | dot/svg | `svg/g[1]/g[2]/polygon[1]/@points[0]` 304.22 vs 305.22 | f0d07786b | revert test |
| graphs-grdfillcolor, -grdlinear, -grdlinear_angle, -grdradial, -grdradial_angle | dot/svg | `svg/g[1]/g[2]/path[2]` path vs polygon (1208 diffs each) | f0d07786b | revert test |
| graphs-html2, linux.x86-html2_dot, nshare-html2_dot | dot/svg | `.../a[1]/g[1]/a[1]/polygon[2]` polygon vs g | f0d07786b | revert test |
| graphs-rd_rules, graphs-sq_rules | dot/svg | `svg/g[1]/g[5]/polygon[1]/@fill` black vs none | f0d07786b | revert test |
| graphs-sides | dot/svg | `svg/g[1]/g[1]/polygon[1]` polygon vs polyline | f0d07786b | revert test |
| graphs-url | dot/svg | `.../a[1]/polygon[1]/@fill` none vs green | f0d07786b | revert test |
| the same 23 ids | {dot,circo,twopi,osage,patchwork,neato,fdp,sfdp}/{xdot,json} (368 rows) | `_ldraw_` op order/count, e.g. graphs-html2 `edge:d->c#0/_ldraw_/op[1]` pen color #000000 vs #fffffe00; rd_rules `_ldraw_[opCount]` 141 vs 140 | f0d07786b | revert test 368/368 pass |
| 2784 | dot/svg | `svg/g[1]/@transform[2]` translate 31 vs 4 (18 numeric diffs); stderr `trapezoid segment construction failed` + `horizontal trapezoid construction failed` replaces 3× `add_segment: error` + `failed at node N[0]`; exit 0 on both | 3c01aaeb4 (trigger) via 3660b260e → 057e8779d → 312e49714 → 178fe6d2f → 8fd4b59ef | revert test |
| 42 | sfdp/xdot, sfdp/json | `edge:0->3#0/_draw_[opCount]` 3 vs 6 (75 diffs); node pos identical to 2 dp; multispline warning set changes (edges (0,3),(3,7) vs (3,0)) | 630465f82 | bisect + objdump |

Revert tests (scratch rsync of `~/git/graphviz` at 16.1.0, same cmake options, LTO on):
- 16.1.0 − f0d07786b: all 23 ids `-Tsvg` byte-identical to the 15.x cache; xdot+json for 8 engines × 23 ids pass the walk comparators against 15.x (368/368); 121, apache, 2784 stay byte-identical to the 16.1 cache.
- 16.1.0 − 3c01aaeb4: 2784 `-Tsvg` byte-identical to 15.x (and stderr back to `add_segment: error`). Mechanism: add_segment now returns -1 on an invalid trapezoid → construct_trapezoids returns an empty list → partition prints the new message and returns NULL → mkMaze/orthoEdges return failure → dot_splines_ returns rc → dotLayout/doDot fail → `dot_layout` returns before `dotneato_postprocess`, so the graph is never translated (huge untranslated coordinates, no edges) while `dot` still exits 0.
- sfdp 42: `git bisect` (good 9d6e3abfd = `d0c6cc9b…`, bad 16.1.0 = `c285bab7…`, sfdp `-Tplain` md5; inside 3e0823c40..f4a65210a the one-line f4a65210a fix was applied because sfdp segfaults there) → first bad **630465f82** "sfdpgen: make 'pcp_rotate' static". `objdump -d` of libgvplugin_neato_layout at 630465f82^ vs 630465f82: `_pcp_rotate` stops being a symbol (LTO inlines it into `_multilevel_spring_electrical_embedding`); the out-of-line covariance loop used `fmla.2d`×4 + `fmadd`, the inlined vectorised loop uses `fmul.2d`+`fadd.2d` (unfused) with `fmadd` only in the scalar tail. `y[]`, the PCA axis and every rotated coordinate change in the last bits; on 42 (pinned `pos!`, splines=true) this flips pathplan triangle membership and reroutes 3 edges. Ruled out: delaunay `mkSurface` edge removal 335c71974 and the sfdp mask/size_t commits (all ancestors of the good 69ef370d8; the 3e0823c40 window tested good with the f4a65210a fix applied), node positions (identical to 2 dp).

### 4.2 Comparator failures that are NOT 15→16 moves

- Native `-Tplain`/`-Tplain-ext` label garbage (76 rows): graphs-Latin1, graphs-Symbol, graphs-b34, graphs-b56, graphs-b60, share-Latin1, tree-graphs-directed-Latin1, windows-Latin1 across all 8 engines. Only node label bytes differ (style/shape/color/fillcolor diffs are field misalignment after the garbage token); within-build re-renders also disagree (e.g. dot graphs-b56 plain intra-15 1/3, intra-16 0/3). Mechanism: `lib/common/output.c:canon` returns `agstrcanon(ns, buffer)`, which is `ns` itself when no quoting is needed, after `agstrfree(g, ns)` has freed it — a use-after-free printed by `writenodeandport`/node label emission; `output.c` is unchanged in the range. Pre-existing native nondeterminism, not attributable.
- Run-to-run nondeterministic layouts with cross-build matches (33 rows; ≥1 of 9–36 cross pairs passes): fdp 1652 xdot/json, fdp 1879 cmapx/imap/xdot/json, fdp 2108 json, fdp 2470 xdot/json, fdp 2621 cmapx/imap/xdot/json, fdp graphs-b143 xdot/json, neato tree-graphs-undirected-ngk10_4 xdot/json, sfdp linux.x86-neatosplines_neato{,1} xdot/json, twopi graphs-newarrows / macosx-arrows_dot / windows-newarrows plain/plain-ext/xdot/json (twopi edge point counts flip run-to-run on both builds).
- stderr-only rows (neato ngk10_4, sfdp neatosplines_neato{,1}): the multispline warning set varies with the same nondeterministic routing; sfdp 42's stderr change is 630465f82.
- fdp 2620: 15.x SIGSEGV vs 16.1 ok in the walk run; 6 repeats each: 15.x crashed 5/6, 16.1 crashed 1/6 — a nondeterministic native crash on both builds.
- 1879 (all dot formats): stderr differed only past the 20,000-byte capture limit (identical prefix) — harness artifact.

### 4.3 Inconclusive (native nondeterministic in both builds; no 15→16 attribution possible)

| id | engine/format | intra-15 | intra-16 | cross (16 vs 15) |
|---|---|---|---|---|
| 2108 | fdp/xdot | 0/15 | 0/15 | 0/36 |
| 2475_2 | fdp/xdot | 3/15 | 0/15 | 0/36 |
| 2475_2 | fdp/json | 4/15 | 0/15 | 0/36 |

Every 16.1 run differs from every other 16.1 run, so the cross-build failure carries no signal. Ruled out as a cause of nondeterminism: ASLR (posix_spawn `_POSIX_SPAWN_DISABLE_ASLR`) and the nano malloc zone (`MallocNanoZone=0`) — fdp 1879 still varies under both.

## 5. Unexplained

None. Every deterministic move is attributed (f0d07786b, 3c01aaeb4 chain, 630465f82) and confirmed by a revert test or bisect. The three fdp rows in 4.3 are not demonstrated moves (output varies within each build); they are listed there rather than here.

## 6. Skipped

- dot/svg, not rendered (native > 30 min or no completion on either build, none cached): tree-share-examples-4elt, 1864 (no native completion: my renders stopped after ~15 min on both builds; an earlier session found orphaned native 1864 renders running 11–14 h, `.agent-notes/2371-is-xcoord-ns-solution-selection.md`), 2064, 2593, 2778, 2834, 2854_1, 2855.
- Walk formats, circo only: 1652, graphs-b103, 2621 — the native circo render hit the 30-min cap on both builds (all six formats).
- Not skipped but no output on either build (native SIGSEGV on 15.x and 16.1, identical): circo 1447, circo 1880, fdp 2239, fdp 2717, fdp graphs-b145, fdp graphs-fdp.
- By walk design: 2222 for neato/fdp/sfdp/circo/twopi (`engine-exclusions.json`). dot/svg stderr/exit status is not in the SVG caches; it was compared for the 910 roster ids via the walk renders (no difference), for the 5 inputs rendered on both builds above, and for 2784.

## 7. Observations

## Observation: oracle caches are reusable for 15.x↔16.1 diffs
- **Context**: T3 step 2(a).
- **Finding**: `dot-corpus-oracle/c965268e87cc` was rendered by 9d6e3abfd with headless `/tmp/ghl` (byte-identical to graphviz-15 + `/tmp/ghl15` on 3 probes); `c2e610dcc867` = sha1(`~/git/graphviz/build/cmd/dot/dot`, `/tmp/ghl`, mtime) for the 16.1 binary. 13 ids are absent from both (the oracle-error set).
- **Impact**: A full 15/16 dot/svg diff takes about 1 s from the caches.
- **Confidence**: High

## Observation: multi-format single-process renders are not equivalent for cmapx
- **Context**: Trying to cut render time with several `-T… -o …` pairs in one `dot` call.
- **Finding**: HTML anchor ids keep counting across jobs (`node1_10` instead of `node1_0`) unless `-Tcmapx` is the first job; with cmapx first, cmapx/imap/plain/plain-ext/xdot/json matched standalone renders on 98 engine×id probes except where standalone output is itself nondeterministic.
- **Impact**: Batch rendering is safe only with cmapx first; the walks render standalone.
- **Confidence**: High

## Observation: native plain output prints freed memory for some labels
- **Context**: dot/circo/… `-Tplain` diffs on Latin1/Symbol/b34/b56/b60.
- **Finding**: `lib/common/output.c:canon` frees the agstrdup'd string and can return it (`agstrcanon` returns its input when no quoting is needed); label bytes vary run-to-run and between batch and standalone renders.
- **Impact**: The plain walks can never be stable on these ids; the port cannot (and should not) match the garbage.
- **Confidence**: High (source read + run-to-run variation)

## Observation: fdp, sfdp, neato and twopi native output is nondeterministic on some inputs
- **Context**: Re-rendering comparator failures 3–6× per build.
- **Finding**: fdp (1652, 1879, 2108, 2470, 2475_2, 2621, b143, b7 json), neato ngk10_4, sfdp neatosplines_neato{,1}, twopi newarrows/arrows_dot differ between identical runs of the same binary; fdp 2620 segfaults intermittently (15.x 5/6, 16.1 1/6). ASLR off and `MallocNanoZone=0` do not make fdp 1879 deterministic.
- **Impact**: Oracle refs for these ids are a single sample; parity verdicts on them are noise-sensitive.
- **Confidence**: High on the variation; cause not isolated.

## Observation: a "refactor" can move native output through LTO codegen
- **Context**: Bisecting sfdp 42.
- **Finding**: Graphviz builds with `CMAKE_INTERPROCEDURAL_OPTIMIZATION ON`; making `pcp_rotate` static (630465f82) let LTO inline it and drop FMA fusion in its covariance loop. Objects under `build/lib/*/CMakeFiles` are LLVM bitcode — disassemble the linked plugin dylib with `objdump`, not the `.o`.
- **Impact**: Source reading cannot prove a refactor output-neutral; only the native diff can. Port FMA modelling (`.agent-notes/fma-contraction-tiebreak.md` family) must follow 16.1 codegen for pcpRotate.
- **Confidence**: High

## Observation: bisect builds on macOS need fresh inodes
- **Context**: `git bisect run` in a scratch copy.
- **Finding**: (1) Relinked dylibs/binaries at the same path are SIGKILLed (exit 137) on load; deleting all `*.dylib` and `cmd/dot/dot` before each build fixes it. (2) Plugin dylib versions change across the range (`libgvplugin_*.8.0.12` … `8.0.15`); symlinking all of them into one GVBINDIR yields empty output. (3) sfdp segfaults on 42 between 3e0823c40 and f4a65210a (#2852); apply `git show f4a65210a -- lib/sparse/SparseMatrix.c` there. (4) `rsync --exclude build` also drops tracked `macosx/build`; restore with `git checkout -- .` in the copy.
- **Impact**: Reuse `scratchpad/t3/bisect-42.sh` as the template.
- **Confidence**: High

## Observation: 16.1 ortho failure exits 0 with untranslated output
- **Context**: 2784.
- **Finding**: The CHANGELOG says these inputs "exit with failure gracefully", but `dot -Tsvg 2784.dot` exits 0: `dot_layout` returns before `dotneato_postprocess`, and rendering still runs (`translate(31 2160000000000000000)`, no edges).
- **Impact**: T8 should port the early return, not an exit status.
- **Confidence**: High

## Observation: "table size too small for content" did not change in the range
- **Context**: The T4 question about empty FIXEDSIZE tables.
- **Finding**: `htmltable.c` changed only in f0d07786b; a FIXEDSIZE probe prints the same warning (and the same syntax error for an empty `<TABLE>`) on both builds. The port omits the warning (`src/common/htmltable.ts:292` comment).
- **Impact**: This is an existing port gap, not a 16.1 change; T7 or T11 may port it separately.
- **Confidence**: High

## Observation: walk runner timeouts from pausing the parent
- **Context**: I SIGSTOPped my render runner to keep to 2 native renders.
- **Finding**: Children kept running while the parent's setTimeout clock advanced; dot 1652 group A was killed at the cap (2083 s) on both builds and had to be re-rendered. For about 4 min one experiment ran alongside the runner's 2 renders (3 native processes).
- **Impact**: Do not SIGSTOP a runner that owns pipes and timers; kill it and resume instead (the scratch runner skips finished jobs).
- **Confidence**: High
