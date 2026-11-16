# T1: native harness for `conjugate_gradient_d` and `IMDS_given_dim` (16.1.1)

## Context

T2 ports numerics that have to match the oracle to the last bit. A last-bit
difference moves the CG stopping test and the balance convergence test. AD-1
and AD-3 read the reduction widths and the fusion from the plugin's disassembly
([../harness/disasm/](../harness/disasm/)). This task confirms them by running
the oracle's own objects. It also produces the vectors that the unit fixtures
need, because the T17/T22 harnesses that made `hier-imds.ts` and
`hier-majorization.ts` were never committed
(`plans/post-16-1-followups-4/batch-3b/hier-harness.md` describes them).

The technique is in `.agent-notes/issue-129.md`. A harness that declares the
`PRIVATE` prototype itself links statically against
`~/git/graphviz-16.1.1/build/lib/neatogen/libneatogen.a`, with `-O3 -flto=thin -arch arm64`.
Use `-DDIGCOLA -DIPSEPCOLA` and the include list from
`plans/post-16-1-followups-8/harness/T2/build.sh`, with `G` pointed at
`~/git/graphviz-16.1.1`.

## Task

1. Write the harness under `../harness/native/` with a `build.sh`:
   - **`cgd`**: read `n`, a dense double matrix, `x`, `b`, `tol`, `maxit` and
     `ortho1` from stdin. Call `conjugate_gradient_d`. Print rv, `x`, and the
     intermediate `r·r` and `alpha` of each iteration, all with `%a`. Getting
     the intermediates needs either a copy of `conjgrad.c` compiled into the
     harness (the same flags, `conjugate_gradient_d` renamed) or the relink
     technique. Journal which you used.
   - **`imds`**: build a `vtx_data` graph as `neatoinit.c:makeGraphData` does
     for hier (the shapes of `hier-imds.ts`'s cases). Call `IMDS_given_dim`.
     Print `new_coords` with `%a`. If T2 needs it, also print `balance` after
     the first pass.
   - **`hier`**: whatever `hier-majorization.ts` records (`d_coords` and rv of
     `stress_majorization_with_hierarchy`), with the same seeds.
2. **Check that the harness is the oracle.** Disassemble the harness binary's
   `conjugate_gradient_d`. It must show AD-1's table (8 / 4 / 8 / 8 / scalar).
   If LTO inlined it differently, use the out-of-line copy, or say so and fall
   back to the relink technique against the plugin
   (`.agent-notes/post-16-1-followups-8.md`). Then
   [stop condition 3](../README.md#stop-conditions) applies.
3. **Calibrate.** Generate random SPD matrices (Laplacians of random graphs, and
   random dense SPD) with n = 5..40, `ortho1` on and off. Feed them to `cgd`.
   With a scratch `.mts` script under `$TMPDIR`, recompute them in TS with
   `innerProduct` and `rightMultWithVectorD` at the AD-1 widths. Require bit
   equality on every case. Then try the other widths in {1, 4, 8, 16} per site,
   and journal that only AD-1's widths match (the method used in
   `smart-ini-x.ts:40-45`).
4. **Re-capture the unit vectors.** Run every case in `hier-imds.ts` and
   `hier-majorization.ts` with the new harness, and save the output under
   `../harness/native/out/`. T2 writes it into the fixtures.
5. Commit: `test(T1): native 16.1.1 harness for conjugate_gradient_d` (plans
   only).

## Acceptance criteria

- *Given* the harness binary, *when* its `conjugate_gradient_d` is
  disassembled, *then* the reduction pattern equals the plugin's
  (`harness/disasm/conjugate_gradient_d.s`), and the journal records both.
- *Given* at least 200 random cases (n = 5..40, both `ortho1` values), *when*
  the TS recomputation runs at AD-1's widths, *then* rv, `x` and every
  iteration's `r·r` are bit-equal to native. No other width tuple matches.
- *Given* `hier-imds.ts`'s cases, *when* `imds` runs, *then* `out/` holds
  16.1.1 vectors for each case. They differ from the stored 16.1.0 vectors on
  at least one case (if none differ, journal it: the fixture is then
  unaffected).

## Write-set

- `plans/issue-156-neato-double-laplacian/harness/native/` (new: C sources,
  `build.sh`, generator, `out/`)
- `plans/issue-156-neato-double-laplacian/decision-journal.md`
- Scratch only under `$TMPDIR`. Never write to `~/git/graphviz-16.1.1`.

## Read-set

- `~/git/graphviz-16.1.1/lib/neatogen/{conjgrad,smart_ini_x,constrained_majorization,stress,matrix_ops}.c`
- `src/layout/neato/{conjgrad,matrix-ops,matrix-ops-dense,smart-ini-x}.ts`
- `src/layout/neato/__fixtures__/{hier-imds,hier-majorization}.ts`
- `plans/post-16-1-followups-8/harness/T2/build.sh`
- `.agent-notes/issue-129.md`, `.agent-notes/post-16-1-followups-8.md`

## Observability

N/A: test tooling, no runtime surface.

## Rollback

Reversible: plans-only files.
