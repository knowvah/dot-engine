# post-16-1-followups-5 mission — observations (2026-10-27)

## Observation: locale staleness is cleared by the page front-matter, not the hash banner
- **Context**: T6 (24 `errors.md` pages).
- **Finding**: `npm run docs:i18n-hashes` writes `docs-site/.vitepress/i18n-hashes.json`,
  which is gitignored. `docs:i18n-status` judges staleness by each locale page's
  `sourceHash:` front-matter line against `node scripts/i18n-hash.mjs <english page>`,
  so after an English edit every locale page's `sourceHash` must be set to the new hash
  (2 changed lines per locale page: the passage and the hash).
- **Impact**: a locale edit task's write-set includes the front-matter line; running the
  hashes script alone leaves 1 stale page per locale.
- **Confidence**: High

## Observation: the `mode=hier` `maxiter == 0` return is in constrained_majorization.c
- **Context**: T6 verifying the errors-table wording.
- **Finding**: `lib/neatogen/constrained_majorization.c:164-168`
  (`stress_majorization_with_hierarchy`) returns when `maxi == 0` before the
  `MODEL_SUBSET`/`MODEL_CIRCUIT` checks (173, 179); `neatoinit.c:majorization` has no
  `maxiter` return, and `neatoLayout` (`neatoinit.c:1290`) returns on
  `nG < 2 || MaxIter < 0`.
- **Impact**: cite the right file when documenting hier-mode behaviour.
- **Confidence**: High

## Observation: native `parse_style` faults print twice for nodes, once for edges
- **Context**: T5 (item 80).
- **Finding**: C parses a node's style in `emit_node` (`emit.c:1820`) and again in
  `stylenode`→`checkStyle` (`shapes.c:476`), so `nesting not allowed` / `unmatched ')'` /
  `truncating style` print twice per node; an edge is parsed once in `emit_edge`
  (`emit.c:3061`). The port's two reporting node calls are `applyNodeStyle` and
  `applyPenState` in `poly-gencode.ts`; every other re-read must use `styleTokensQuiet`.
- **Impact**: do not dedupe the doubled node message; keep exactly one reporting call per
  C parse site.
- **Confidence**: High

## Observation: the 5 s timeout test in `xdot-public.branch.test.ts` flakes under load
- **Context**: batch-2 landings and five agents' gate runs at load 100–150.
- **Finding**: "rethrows a GvError-like object as-is" has a 5 s cap and times out on a
  cold vitest transform cache when other vitest runs overlap; it passes alone every time.
- **Impact**: re-run that file alone before treating a Gate 2 / `npm test` failure as a
  regression; run `gates.sh` with no other vitest run on the machine.
- **Confidence**: High

## Observation: golden Gate 4 is a per-file line-count ratchet
- **Context**: T4, T7, T2 (`map.ts` 808, `json.ts` 734, `neato/splines.ts` 1014).
- **Finding**: `test/golden/line-limit-baseline.txt` pins each listed file at its current
  length; adding even one import line fails Gate 4 until something else in the file is
  trimmed.
- **Impact**: budget line trims when a task adds code to a baselined file.
- **Confidence**: High

## Observation: `probe.ts` limits
- **Context**: T7, T9.
- **Finding**: `probe.ts` is svg-only (no `-T`), takes DOT source or a file path only as
  the case argument, and its shape check sees text x/y and ellipse rx/ry but not fill
  colour, penwidth, bgcolor, gradients or peripheries; json stderr and cluster fills need
  a direct bundle render and a full-SVG diff.
- **Impact**: pick the comparison tool per attribute.
- **Confidence**: High

## Observation: zsh parses `==` and `====` as `=cmd` expansion
- **Context**: every agent's shell loops.
- **Finding**: `echo == $x` fails with `= not found`; quote the marker.
- **Impact**: quote separators in zsh one-liners.
- **Confidence**: High

## Observation: engine `cleanup` functions live in `init.ts` for five engines
- **Context**: T13.
- **Finding**: `dotCleanup` (`dot/init.ts`), `neatoCleanup` (`neato/init.ts`), `fdpCleanup`
  (`fdp/init.ts`), `sfdpCleanup` (`sfdp/init.ts`), `twopiCleanup` (`twopi/init.ts`); only
  circo, osage and patchwork keep theirs in `index.ts`. `twopiCleanup` was also called
  mid-layout from `twopi/pipeline.ts` as the stand-in for `twopi_layout`'s `free(ND_alg)`
  (now `twopiFreeAlg`).
- **Impact**: write-sets naming "the cleanup functions" must list `init.ts`.
- **Confidence**: High

## Observation: node `image=` sizing happens in `nodeinit.ts`, not `poly-init.ts`
- **Context**: T14.
- **Finding**: `polyInit` (`poly-init.ts`) runs at render time (`device.ts:491`) and only
  warns; node sizes are fixed at layout time by `nodeinit.ts:initNodeFromLabel` →
  `polySizeParamsFromNode` → `polySize`. HTML image hooks pass through
  `htmltable-label.ts` (`HtmlLabelInfo`). The port never emits `<image>` for node `image=`
  (follow-up 91). `ImageSizer` results are pixels at the graph dpi since T14.
- **Impact**: image work touches `nodeinit.ts`/`htmltable-label.ts`; sizer tests return
  pixels.
- **Confidence**: High

## Observation: `parseSegs` rv 3 fires once per process
- **Context**: T11.
- **Finding**: the Total-size warning is emitted on the first over-full parse only; later
  identical parses return rv 0 and `findStopColor` draws a gradient. `colorxlate` on an
  unknown name leaves opaque black (`#000000`), not `none`.
- **Impact**: a second over-full fill in one render renders as a gradient, as native.
- **Confidence**: High

## Observation: the DOT parser rejects unquoted `0x10`, `inf`, `NaN` attribute values
- **Context**: T10 `lenattr` tests.
- **Finding**: tests must quote such values; `buildOutEdgeIndex` sorts by `head.id` then
  `seq` (agfstout order); `g.edges` is not agfstout order.
- **Impact**: per-node `agfstout` loops use the index or `np.outEdges`.
- **Confidence**: High

## Observation: a chained command with `git reset --hard` is denied by the auto-mode classifier
- **Context**: T13 worktree rebase (orchestrator and agent alike).
- **Finding**: `git reset --hard <sha>` was denied in a chained command and alone;
  `git merge --ff-only <sha>` on a clean worktree branch passed. A denied chain leaves
  every later step unrun, so a background gate launched in the same turn can run on the
  wrong tree — launch gates only after the apply is confirmed.
- **Impact**: move worktrees with `merge --ff-only`; never chain an apply and a gate launch.
- **Confidence**: High

## Observation: a session scratchpad wipe takes every worktree and baseline with it
- **Context**: resuming after an out-of-memory crash; the previous session's scratchpad
  (`53ffa636-…`) was gone, so `git worktree list` showed 19 `prunable` entries, `$BASE`
  (bundles, native refs, `timings-T0.json`), the running batch-3 survey and the T10
  walks had no result, and `/tmp/ghl` had been cleaned too.
- **Finding**: `git worktree prune` clears the registrations; the branch refs (`wt/T*`)
  survive. `test/corpus/gen-headless-gvbindir.sh /tmp/ghl` rebuilds the headless dir;
  the full plugin dir is core + dot_layout + neato_layout with all three dylib names
  linked, then `GVBINDIR=<dir> dot -c`. The engine-walk oracle caches under
  `~/.cache/dot-engine/oracle/xdot-oracle/<engine>/<sig>` survive (928 neato, 924 fdp,
  928 sfdp xdots) because `sig` hashes (dot path, GVBINDIR path, dot mtime): recreating
  the plugin dir at the *same path* (`…/dfc80e32-…/scratchpad/ghl16-all`) keeps every
  cached native render valid.
- **Impact**: anything a later session needs (bundles, timings, survey JSONL) must be
  copied out of the scratchpad or committed; keep the plugin-dir path stable.
- **Confidence**: High

## Observation: `stress_majorization_cola` shares the kD kernel's conjugate gradient
- **Context**: T15 review (mode=ipsep kernel choice).
- **Finding**: in `libgvplugin_neato_layout.dylib` (16.1.0, `-O3 -flto=thin`)
  `_conjugate_gradient_mkernel` is one out-of-line body (0x128fc) called twice each from
  `_stress_majorization_kD_mkernel` (0x32868), `_stress_majorization_with_hierarchy`
  (0x14550) and `_stress_majorization_cola` (0x3904c); `right_mult_with_vector_ff` is
  inlined per caller (no symbol). cola's squared distances are `square_vec` then
  `vectors_additionf` (two loops, product rounded before the add), unlike stress.c:1000's
  `dist_accumulator[x] += tmp * tmp` (one fmadd). `stress_majorization_kD_mkernel` is
  also one body, so the hier path's no-directionality call runs the same fused kernels.
- **Impact**: ipsep uses the fused CG, unfused square-add; its inlined right-multiply
  copy is unread (follow-up 94). The corpus has no `mode=ipsep` id, so only probes
  exercise it.
- **Confidence**: High (disassembly + C source)

## Observation: the float fma primitive costs ~7× an unfused multiply-add
- **Context**: T15 fused kernels on the production neato path.
- **Finding**: `fmaf` (`quad-prog-solve.ts`, Knuth two-sum + round-to-odd through a
  DataView) measured ~7× `fr(fr(a*b)+c)` in a monomorphic loop; typed-array views or a
  tie-only correction path gain ~10%. On the right-multiply (n² per CG iteration) 1652
  went 52 s → 140 s and 2834 48 s → 128 s alone (load ~8).
- **Impact**: the neato speed gate (p50 ≤ 1.05×) is governed by this primitive.
- **Confidence**: High (timings), Medium (benchmark absolute numbers under load)

## Observation: walk summaries appear only at the end; the big xdot inputs time out under load
- **Context**: T17 fresh walks of the batch-4 head in a worktree (survey + 7 engine walks +
  4 format walks + attribution overlapping, load 40–50).
- **Finding**: `engine-walk.ts` writes `test/corpus/parity-<engine>.json` only when the walk
  completes, and the file already present in a worktree is the committed copy, so its
  existence is not a completion signal (check the log's `summary ->` line or mtime). The
  xdot walk's timeout is 3× the oracle's own time with a 180 s floor; at load ~50 the five
  largest inputs (`1718`, `graphs-b100`, `graphs-b104`, `2108`, `2095_1`) time out, and all
  five are `conformant` when re-rendered alone (`XDOT_CONCURRENCY=1`, resume from the JSONL
  with their rows deleted). Format walks record `verdict: conformant`, engine walks
  `status: pass`.
- **Impact**: run the xdot walk after the heavy engine walks, or re-render timeouts alone
  before reading them as regressions; comparison scripts must map both status fields.
- **Confidence**: High
