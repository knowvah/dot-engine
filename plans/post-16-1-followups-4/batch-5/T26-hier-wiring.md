# T26: wire `mode=hier` into neato (item 43e, AD-6)

**Context:** `src/layout/neato/start.ts:154` (`checkMode`) throws `unsupported('mode', …,
'hierarchical stress majorization')`; tests pin the throw (`start.fidelity.test.ts:76`,
`init.branch.test.ts:436-442`). C (`lib/neatogen/neatoinit.c:1089-1118`):
`checkStart(g, nv, mode == MODE_HIER ? INIT_SELF : INIT_RANDOM)`; `init == INIT_SELF` sets
`opt_smart_init`; `makeGraphData(…, mode, model, …)` (edge `dir` for hier, `:767`);
`levelsgap` = `late_double(g, "levelsgap", 0.0, -DBL_MAX)`; then
`stress_majorization_with_hierarchy(gp, nv, coords, nodes, Ndim, opts, model, MaxIter,
lgap)`. `MaxIter` for hier is `100·n` (part 3 T2, `neatoMaxIter`).

**Task:**
1. Remove the hier throw; keep the ipsep-with-constraints one and the `start=self` loud
   check for MAJOR/IPSEP. Make `checkStart`'s default `INIT_SELF` for hier, as C.
2. In `init.ts`'s majorization path, branch to `stressMajorizationWithHierarchy` (T22)
   with C's arguments, `levelsgap` parsed as C does.
3. Replace the throw-pinning tests with tests of the layout; update the `start.ts` header
   comment.
4. Compare the item-43 probe graph and corpus 1554 (forced `layout=neato`; it stays
   `engine-deferred` in the dot manifest) with native `-Kneato -Txdot` using
   `test/golden/compare-xdot.ts` at 0.01; add both as golden/fidelity tests.

**Write-set:** `src/layout/neato/start.ts`, `src/layout/neato/init.ts`,
`start.fidelity.test.ts`, `init.branch.test.ts` (+ a new `hier.fidelity.test.ts`).
**Read-set:** `start.ts:130-200`, `init.ts:40-60,320-380`; `lib/neatogen/neatoinit.c:1060-1120`,
`:760-780`; T22 interface; journal row with the native probe numbers.

**Acceptance criteria:**
- *Given* `digraph{mode=hier;a->b->c->d->e->f;a->d;b->e;c->f}`, *when* rendered with neato,
  *then* `-Tplain` positions equal native's (graph 1 2.524 2.5698; a 0.375 2.3198 …
  f 2.149 0.25) at 0.01 and xdot matches at 0.01.
- *Given* corpus 1554, *then* xdot matches native at 0.01 (or the residual is diagnosed
  and journalled with its mechanism).
- *Given* `mode=hier` with `model=subset`, *then* the loud error names the subset model.
- *Given* the neato walk, *then* 0 regressions.

**Observability:** N/A. **Rollback:** reversible. **Commit:** `feat(T26): …` (AD-2).
