# T10: wire constrained ipsep (item 96c, AD-1, AD-3)

**Context:** T8's `stressMajorizationCola` and `ipsepOptions` are tested but unwired.
Today:
- `solveStress` (`src/layout/neato/init.ts:361-380`) runs ipsep on the kD kernel with
  `cola: true`;
- `checkMode` (`start.ts:155-160`) throws `unsupported` for constrained ipsep;
- `checkStartAttr` (`start.ts:162-170`) throws for `start=self` under `MODE_IPSEP`.

C's dispatch is `neatoinit.c:1113-1182`: `mode != MODE_MAJOR` → hier or cola.

**Task:**
1. `init.ts:solveStress`: MODE_IPSEP calls `stressMajorizationCola(vtx, n, dCoords,
   nodeList, { dim, model, maxi, opt: ipsepOptions(mg, g, nodeList) })`, in C's order.
   Remove the comment that says ipsep "always uses compute_apsp_packed".
2. `start.ts`: delete `checkMode`'s ipsep branch (and `ipsepHasConstraints` if nothing
   else uses it). Decide on `checkStartAttr`'s `MODE_IPSEP` from the T0 `start=self`
   fixtures, and journal the evidence: cola takes no `opts`, so native may lay it out.
3. `stress-kernel.ts`: remove the `cola` option, `COLA_OPS` and `colaScaleLayout` (now in
   `stress-cola.ts`). Move the fused pinning test's cola case onto `stress-cola.ts`'s
   kernels, or delete it if T8 covers the same assertion; journal which.
4. `ipsep-probes.test.ts`: turn the constrained `it.todo`s into assertions (≤ 0.01). Mark
   parked probes `it.fails`, each with its follow-up number.
5. Timing note (AD-8): port vs native wall time on the largest probe, as a journal row.

**Write-set:** `src/layout/neato/init.ts`, `start.ts`, `stress-kernel.ts`,
`stress-kernel.fused.test.ts`, `ipsep-probes.test.ts`, `init.ipsep.test.ts`, tests beside
`start.ts`.
**Read-set:** `lib/neatogen/neatoinit.c:1080-1185`, `stress-cola.ts`, `ipsep-opts.ts`,
the ipsep fixtures, `docs-site/guide/errors.md:125-130`.

**Acceptance criteria:**
- *Given* each ipsep probe, *when* `layout=neato` renders xdot, *then* the unconstrained
  probes are byte-identical, the constrained probes are within 0.01 (or parked), and no
  `mode` warning or `unsupported` error is raised.
- *Given* the corpus, *when* bytediff runs, *then* output is identical (stop 8).
- *Given* `npm test`, *then* no test references `COLA_OPS` or `cola:`.

**Commit:** `feat(T10): lay out constrained ipsep with stress_majorization_cola`.
**Observability:** N/A, apart from the timing row. **Rollback:** reversible.
