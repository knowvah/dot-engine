# Architecture decisions (locked 2026-10-30)

The user approved these with "approve all recommendations". A task that needs to contradict
one stops (stop condition 4). Carried decisions keep their part-5 numbers and are cited as
"part-5 AD-n".

## Carried from parts 5–6

- **part-5 AD-1:** commits are unsigned and local. The user re-signs with `git rebase -f main`
  (repo-local `commit.gpgsign=true`; do not add `--exec`).
- **part-5 AD-2:** one branch, one PR, merge commit.
- **part-5 AD-3:** the diagnosis budget is about 2 h per item. Then park the item with the
  full artifact.
- **part-5 AD-4 amendment:** the fused stress kernel on the kD path is never unfused for
  speed.
- **part-5 AD-10:** image sizing goes only through the installed sizer. No filesystem
  access and no new public hook.
- **part-5 AD-13:** diagnostic text is native byte for byte, through `agerr.ts`. Warnings
  go to `console.warn`, errors to `console.error`.
- **part-5 AD-17:** locale edits are done by `documentation-engineer`;
  `npm run docs:i18n-hashes` refreshes them.

## AD-1: release type
- **Context:** before this mission, constrained ipsep logs `unsupported` and falls back
  (`src/layout/neato/start.ts:155-160`). After item 96, those inputs lay out.
- **Decision:** T5, T7, T8 and T10 commit as `feat(TN)`, so semantic-release cuts a **minor**
  release. The branch stays `chore/post-16-1-followups-7` for continuity with the series.
- **Consequences:** the PR title passes `pr-title.yml` as `chore: …`. The release note
  lists 96 as a feature.

## AD-2: item 95 lands first, separately
- **Decision:** T1 applies
  `plans/post-16-1-followups-6/patches/item94-95-fused-plus-cola-prologue.patch` as is. It
  applies cleanly to `main` and makes the 7 unconstrained probes byte-identical to native.
- **Consequences:** those 7 probes become a fixed baseline. T8 and T10 must not move them
  (stop 7).

## AD-3: structure of the item-96 port
- **Context:** ipsep borrows `stressMajorizationKDMkernel` with a `cola` flag
  (`src/layout/neato/init.ts:373-379`, `stress-kernel.ts:126-136,263-299`). That is why
  item 96 is a list of missing branches.
- **Decision:** `src/layout/neato/stress-cola.ts` ports
  `constrained_majorization_ipsep.c:stress_majorization_cola` (61–469), keeping C's
  function boundary and porting every branch:
  - the models: subset (`compute_apsp_artificial_weights_packed`), circuit, mds, and
    otherwise `compute_apsp_packed`;
  - the prologue at 166–191;
  - the cluster `clap` extension at 207–235;
  - `initCMajVPSC` at 288;
  - cola's convergence test at 363–367;
  - the `nsizeScale` loop with `generateNonoverlapConstraints` at 377–403;
  - `noverlap` 1 and 2, including `removeoverlaps`;
  - `diredges` 1 and 2;
  - the order of the `maxi == 0` / `maxi < 0` returns;
  - `initLayout`, whose return value is ignored.

  It runs on `src/layout/neato/quad-prog-vpsc.ts` (`quad_prog_vpsc.c`). Options are set in
  `src/layout/neato/ipsep-opts.ts` (`neatoinit.c:1121-1170`), a new file because `init.ts`
  is already 505 lines. ipsep leaves the kD kernel, and `cola` and `COLA_OPS` are removed
  from it.
- **Rejected:** more cola flags on the kD kernel, because that merges two C functions.
- **Models (amended 2026-10-30, user: "Add a task"):** the subset and circuit branches call
  `stress.c:compute_apsp_artificial_weights_packed` (714) and `stress.c:circuitModel`
  (169, on `matinv.c` + `lu.c`), neither ported. T7 ports both into
  `src/layout/neato/stress-models.ts` for the cola driver. The major, kk and hier paths
  keep `model=subset|circuit` loud; wiring them in is follow-up 103.
- **Consequences:** four tasks. T5 is `quad_prog_vpsc`, T7 the two models, T8 the driver
  plus options (tested directly, not wired in), and T10 the wiring.

## AD-4: item-96 verification
- **Context:** no corpus id reaches ipsep, and C has no ipsep tests.
- **Decision:** T0 commits a native probe set to `src/layout/neato/__fixtures__/ipsep/`:
  - the 7 unconstrained probes;
  - `diredgeconstraints=true` and `hier`;
  - `overlap=ipsep` and `vpsc`;
  - a top-level cluster;
  - edge `len`;
  - `model=subset`, `circuit` and `mds`;
  - the native `-v` stress trace for each.

  Acceptance: the unconstrained probes stay byte-identical, and the constrained probes are
  within 0.01 in xdot. A probe that misses gets the diagnosis artifact and a follow-up; it
  does not block the mission.

## AD-5: image type for item 101
- **Decision:** port `gvusershape.c:imagetype` (124–175), magic sniffing over the
  **resolver bytes**.
  - The `stringtype` feeds `gvloadimage.c:gvloadimage` (44–64), which warns
    `No loadimage plugin for "<type>:<target>"` for each target that native lacks.
  - Unknown magic (`FT_NULL`) warns
    `"<name>" was not found as a file or as a shape library member` (`gvusershape.c:750`)
    and draws nothing.
  - A **sizer-only** image has no bytes, so it has no type and no loadimage warning. This
    is recorded as a divergence in the docs.
- **Rejected:** extension inference (not native logic) and a `type` field on the sizer
  return (a new API; part-5 AD-10).
- **Consequences:** resolver bytes with unrecognized magic stop drawing, as in native.
  T0's probe table decides which `-T` formats warn.

## AD-6: `imagepath` for item 102
- **Decision:**
  - Plumb `Gvimagepath` (`input.c:627-630`, now SKIPPED at `src/common/graph-init.ts:277`).
  - Port `utils.c:safefile` (253–311) as a predicate in `src/common/safefile.ts`. It
    returns the name when the directory list is empty, the name is absolute, or the host
    supplies the name. Otherwise it returns null, and `gvusershape_file_access` warns
    `Filename "<name>" is unsafe`.
  - `bind_shape`'s `safefile(shapefile)` follows the same rule.
  - Sizer and resolver lookups stay keyed by the raw name, so the API does not change.
  - `GV_FILE_PATH` and `SERVER_NAME` stay unported: they are environment variables, and
    the browser has no environment.
- **Rejected:** querying the host with `dir/name` for each directory. That changes the
  lookup key and breaks callers.
- **Consequences:** the docs say the port honours `imagepath` only for deciding which
  warning prints.

## AD-7: the native probe is the spec for 97–100
- **Decision:** each item starts from its T0 native probe. Where the follow-up text and
  native disagree, native wins, and the journal records the correction. For 97, C
  `user_shape` (`shapes.c:3949`) without `-l` sets `usershape=false`, so the image branch
  **runs**; the follow-up text claims it is skipped.
- 98 and 99 reuse part-5 T11's `resolveFillColorName`, reached where C calls
  `gvrender_set_fillcolor`. For edges, that is `emit.c:emit_edge_graphics` at 2415–2434.
- 100 ports `gvloadimage_core.c:core_loadimage_svg`'s rotation branch (74–82) verbatim,
  including its FIXME width/height swap.

## AD-8: verification scope
- **Decision:**
  - Bytediff runs for each `src/` task.
  - T12 always runs a fresh survey.
  - Engine or format walks run only where bytediff over the corpus ids shows an output
    change.
  - There is no speed gate. T10 journals one timing note on the largest ipsep probe,
    because the VPSC solve is new work on that path.
