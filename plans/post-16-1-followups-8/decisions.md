# Architecture decisions (locked 2026-11-02)

The user approved these with "approve all recommendations". A task that needs to contradict
one stops (stop condition 4). Carried decisions keep their part-5 numbers and are cited as
"part-5 AD-n".

## Carried from parts 5–7

- **part-5 AD-1:** commits are unsigned and local. The user re-signs with `git rebase -f main`
  (repo-local `commit.gpgsign=true`; do not add `--exec`).
- **part-5 AD-2:** one branch, one PR, merge commit.
- **part-5 AD-3:** the diagnosis budget is about 2 h per item. Then park it with the full
  artifact.
- **part-5 AD-4 amendment:** the fused stress kernel on the kD path is never unfused.
- **part-5 AD-13:** diagnostic text is native byte for byte, through `agerr.ts`. Warnings go
  to `console.warn`, errors to `console.error`.
- **part-5 AD-17:** locale edits are done by `documentation-engineer`; each locale page's
  `sourceHash` is set from `node scripts/i18n-hash.mjs <english page>`.
- **part-7 (journal T2, T9):** a C process global is mirrored in a module-level `const`
  container reset by `registerRenderState` (`src/common/render-state.ts`), not threaded
  through callers.

## AD-1: release type
- **Decision:** T6 and T7 commit as `feat(TN)`: three neato modes stop refusing
  `model=subset|circuit`, so semantic-release cuts a **minor** release. Everything else is
  `fix`, `test` or `docs`. Branch `chore/post-16-1-followups-8`; the PR title passes
  `pr-title.yml` as `chore: …`.

## AD-2: where the major path picks its Dij (103)
- **Context:** C chooses the distance matrix inside `stress_majorization_kD_mkernel`
  (`stress.c:833-859`: subset, circuit with its disconnected warning, mds, then shortest
  paths, weighted iff `graph->ewgts`). The port's kernel takes Dij from
  `init.ts:solveStress` (`init.ts:361-363`), which today ignores the model, so major-path
  `model=mds` silently uses shortest paths.
- **Decision:** port that block as `stressModelDij(graph, n, model)` in
  `src/layout/neato/stress-models.ts`, called from `solveStress`. Its doc comment records the
  boundary deviation (C computes it inside the kernel).
- **Rejected:** inside `stress-kernel.ts` (the shared fused kernel, stop 10); inline in
  `init.ts` (496/500 lines).

## AD-3: KK circuit on a disconnected graph (103)
- **Decision:** port C's mechanism. `kkNeato` calls `circuit_model(g, nG)`; when it fails,
  warn (`neatoinit.c:1247-1254`, four lines with `agnameof(g)`) and fall back to
  `shortest_path`. Delete `start.ts`'s `isConnected` / `kkCircuitFallsBack` pre-check.
- **Rejected:** keeping the pre-check (it guesses connectivity before C's code runs; a
  singular but connected matrix would differ).

## AD-4: KK subset helpers (103)
- **Decision:** port `kkutils.c:compute_new_weights` (165), `restore_old_weights` (196) and
  the unpacked `compute_apsp_artificial_weights` (93) into `src/layout/neato/kkutils.ts`,
  and move part 7's three helpers (`common_neighbors`, `fill_neighbors_vec_unweighted`,
  `empty_neighbors_vec`) there from `stress-models.ts`. `DistType` is `int`
  (`sparsegraph.h:39`).

## AD-5: verification of 103
- **Decision:** T0 commits native probes to `src/layout/neato/__fixtures__/models/`:
  {major, KK, hier} × {shortpath, subset, circuit, mds} on a small undirected graph, the same
  with `len`, a disconnected graph × circuit per mode (KK with and without `pack`), subset
  with `len` set (C disables `len`/weights, `neatoinit.c:763`), mds without `len`, and an
  unknown model value. Each is `-Kneato -Txdot` plus stderr.
- **Acceptance:** xdot within 0.01 and stderr byte-equal; the 22 ipsep probes unchanged;
  the corpus bytediff identical (no corpus id sets `model=`).

## AD-6: the global image hooks (104)
- **Decision:** read accessors for the active global hooks: `getGlobalImageResolver` from
  `src/gvc/image-resolver.ts` and `getGlobalImageSizer` from `src/gvc/usershape.ts`, where
  each hook lives. Layout callers pass
  the effective hook (`gvc?.imageResolver ?? getGlobalImageResolver()`) explicitly to
  `imageOpenFailure` / `usershapeSizePts`.
- **Rejected:** a global fallback inside `usershapeSizePts` (breaks ADR-2's "global not
  called" test in `context-image-hooks.test.ts`).

## AD-7: per-context hooks in `safefile` (107)
- **Decision:** the render-state container that holds `Gvimagepath` also holds the layout's
  effective sizer and resolver, set at the same point (graph init; if graph init has no
  context handle, at the layout entry, journaled). It stands in for C's filesystem;
  `safefile(name)` keeps C's signature.
- **Rejected:** passing hooks into `safefile` (changes C's signature and every caller).

## AD-8: tie-break in `src/vpsc/SweepLine.ts` (105)
- **Context:** C++ orders `Node::leftNeighbours`/`rightNeighbours` by `CmpNodePos`
  (position, ties by `Node*` address) and `Blocks` by address; the port cannot reproduce
  addresses, and native output varies run to run on ties (follow-up 106).
- **Decision:** order neighbour sets by position and break ties by creation order (node
  index), C's usual allocation order. Acceptance: each affected harness case matches at
  least one of 8 native runs; the two `it.fails` flip; a fixture is refreshed only for a
  valid non-majority variant, journaled with the per-run evidence. Any move of the 22 ipsep
  probes is stop 7.

## AD-9: `neatoModel` (108)
- **Decision:** port `neatoinit.c:neatoModel` (605-627) verbatim: `streq` (case-sensitive),
  `agnameof(g)` (an anonymous graph prints `%1`), mds without an edge `len` attribute
  declared → warning and `MODEL_SHORTPATH` before any solver. It runs once, where
  `neato_layout` calls it; the native probe decides its order among layout warnings.

## AD-10: docs (103, 106, 108)
- **Decision:** `documentation-engineer` (part-5 AD-17):
  - `docs-site/guide/errors.md` drops the `model=subset|circuit` rows;
  - `docs/known-divergences.md` gains one bullet for VPSC's heap-address order (106);
  - `docs-site/guide/images.md` fixes part 7's two nits (the `imagepath` lead sentence
    lacks a colon; the unsafe bullet gives the `image=` line for `shapefile=`, where native
    prints `No or improper shapefile=`);
  - mirror into 23 locales with refreshed `sourceHash`.
