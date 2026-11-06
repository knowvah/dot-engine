# Decisions: part 10

AD-1 to AD-12 were approved by the user during planning (2026-11-04). They are locked; a change is stop 4.

## AD-1: how much of `dim` to port (114)
- **Context:** `dim=3` differs from native on one small graph on neato's default, KK, hier, sgd, ipsep,
  `overlap=false`, a pinned z and `dim=4`, x and y included, and on sfdp. fdp and circo are identical because
  C forces them to 2-D. `neatoinit.c:597-600` and `sfdpinit.c:55-58` read `dimen`, then `dim`, and clamp at
  `MAXDIM`.
- **Decision:** neato and sfdp, all modes, `dim`, `dimen` and `z`, clamped at `MAXDIM` (10).
- **Rejected:** 3-D only, since `dim=4` already differs and C is the spec. A warning only, since the user
  prefers porting.

## AD-2: how `Ndim` travels
- **Decision:** `root.info.ndim` and `odim`, already declared in `src/model/graphInfo.ts`, passed as the `dim`
  parameters solvers already take. KK's `NDIM` constant becomes a field on its state. One code path: no
  separate 3-D branch.
- **Rejected:** a module-level global as in C, which would leak between graphs in a library.

## AD-3: the bar for `dim` output
- **Decision:** neato byte-equal or ±0.01 on committed native fixtures; sfdp ±0.5, as its survey runs. Fixtures
  repeat over 8 native runs and pass the libm gate. A neato miss caused by FMA or libm is recorded, not chased.
- **Note:** neato's fused kernels are already general over `dim`, so exact should be reachable. No corpus input
  sets `dim` (`2556`'s is commented out), so the survey and bytediff cannot check this; the fixtures are the check.

## AD-4: public API for z
- **Decision:** z only through the `pos` and `z` attributes. `getLayout` is unchanged. `GVRENDER_DOES_Z`
  (`emit.c:1660,2734`) needs a device the port does not have, so that branch stays unported, and T16 notes it.
- **Rejected:** adding z to `getLayout`, a new API field the C does not have.

## AD-5: sfdp's solver drift (121)
- **Context:** the 15 filed ids are part of sfdp's 295 diverged ids in `known-divergences.md` (A1); 293 are
  `drift-exonerated`, so routing and emission match once native's positions are injected. Nobody has traced where
  the solver first departs. Neato went from 90.5% to 99.8% when the disassembly's fused kernels arrived; sfdp is
  at 68.1%. `spring-electrical.ts:421-422` still calls `Math.pow`, while its repulsive force uses `armPow`.
- **Decision:** instrument native and trace small ids to the first differing value, 3 h budget. Libm at the origin
  closes the item under PR 119. Operation order or fusion is fixed here, with an sfdp re-walk. Over budget: park
  with the evidence so far. T2 runs before T13.
- **Rejected:** reclassifying as A1 now, which leaves the cause unknown.
- **Exception to stop 8 (user decision):** sfdp first renders may change through T2's fix, if the re-walk shows
  every moved id closer to native. Sfdp only.

## AD-6: where the draw input goes (122)
- **Decision:** `test/golden/inputs`, with a native ref captured as `pt-issue-*` are and a line in
  `PROVENANCE.md`, plus a dedicated bytediff job for this input (a small `--file` option in `test/tools/bytediff.ts`).
- **Rejected:** extending the corpus manifest. It resolves against the graphviz checkout, and its 929-item count
  is quoted across the docs and 23 locales.

## AD-7: reusing `_cc_N` (115)
- **Decision:** real reuse. `agsubg(g, name, 1)` returns the existing subgraph, so the user's subgraph object gains
  the component's nodes, visible in `dot` output too. `cccompsWithClusters` is untouched. Native decides the
  expected output on twopi and sfdp.
- **Rejected:** copying only, which diverges from C.

## AD-8: later-layout items (116–120)
- **Decision:** follow C; first renders byte-identical is a hard stop. `abomShift` is port-only, so it resets when
  each dot layout starts. Item 117 gets 2 h, then parks.

## AD-9: reset edge cases (123)
- **Decision:** the native harness decides. Where C has no equivalent, as with a throw (C aborts), pin the port's
  current behaviour in a test.

## AD-10: native variance (124)
- **Decision:** trace only, plus a note, and exclude the id from the matrix's native count. No port change unless the
  trace finds otherwise. Part 9's notes already place `graphs-b56` in corrupted label bytes between processes.
- **Rejected:** reproducing the variance, since corrupted bytes are not behaviour to copy.

## AD-11: files at the size limit
- **Decision:** split along C function boundaries into new files. `neato/init.ts` (490 lines) and
  `neato/stress-cola.ts` (497) are at the 500-line limit. Nothing goes on the complexity-ignore list.

## AD-12: release and process
- **Decision:** as in parts 8 and 9: unsigned commits on `chore/post-16-1-followups-10`, the user re-signs, merge
  commit. T1, T6, T7, T8 and T13 are `feat`, so a minor release (likely v2.11.0); the rest are `fix`, `test`, `docs`.

## Carried decisions
- The C at `~/git/graphviz` (16.1.0) is the spec; diagnosis mode for every discrepancy.
- Part-5 AD-1: unsigned local commits, the user re-signs. Part-5 AD-3: fix faithfully or park with the full
  artifact. Part-5 AD-4 amendment: never unfuse the stress kernel. Part-5 AD-17: `documentation-engineer` writes
  docs and locales.
- Part-8 AD-8: VPSC neighbour-set ties go by creation order.
- Part-9 AD-11, AD-12: second layouts follow native's free cycle; a no-free layout appends its route; rendering
  writes attributes back.
- PR 119 (user decision): layouts that vary with `pow`, `hypot` or similar are accepted. A sensitive probe replays
  macOS's values in the test; runtime code does not change.
