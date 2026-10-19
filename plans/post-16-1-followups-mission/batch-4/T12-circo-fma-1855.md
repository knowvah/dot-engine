# T12: `fix(T12)` or parked: circo positioning FMA patch and graph 1855

**Context:**
- `plans/graphviz-16.1-sync/followups/circpos-fma-assoc.patch` (294 lines) touches
  `src/layout/circo/position-helpers.ts` and `position.ts`.
- `position-arith.test.ts.saved` sits beside it.
- The patch matches C's floating-point contraction and association (clang, macOS
  arm64), but flips circo 1855, believed to be libm `sin`/`cos` amplification.
  Unverified.

**Task (AD-4):**
1. Apply the patch in a worktree. Restore the saved test under its real name. Run the
   circo walk; list every verdict and diff-count change versus the committed
   `parity-circo.jsonl`.
2. Diagnose 1855.
   - Instrument both sides: env-gated `%a` dumps in a scratchpad copy of graphviz, and
     `globalThis` traces in the port.
   - Find the first divergent value.
   - Forcing experiment: feed 1855 the native build's `sin`/`cos` results. If it then
     matches, the flip is libm-only.
3. Land it only if both hold: the patch gains at least one verdict or measurably reduces
   diffs, and the forcing experiment proves libm-only.
   - Then add 1855 to `test/corpus/accepted-divergences-engines.json` (libm class) and
     `docs/known-divergences.md`.
   - Update the 23 locale copies and re-stamp `sourceHash` with
     `node scripts/i18n-hash.mjs docs/known-divergences.md`.
4. Otherwise park: leave `src/` unchanged; journal the diagnosis or ruled-out state;
   README item 7 stays open with the reason.
5. If porting bit-exact `sin`/`cos` looks necessary: STOP and ask.

**Write-set:** `src/layout/circo/position-helpers.ts`, `src/layout/circo/position.ts`,
`src/layout/circo/position-arith.test.ts`; `test/corpus/parity-circo.jsonl`,
`parity-circo.json`, `PARITY-circo.md`; `test/corpus/accepted-divergences-engines.json`,
`docs/known-divergences.md` + locale copies (landing case only).
**Read-set:** the patch; `~/git/graphviz/lib/circogen/circpos.c`;
`plans/graphviz-16.1-sync/README.md:140-150`; memory note "Native oracle libm" (libm
hypot model, fma contraction, instrumented-build technique).

**Acceptance criteria:**
- *Given* the patch applied, *when* the circo walk runs, *then* every verdict change is
  listed and explained.
- *Given* 1855 fed native `sin`/`cos`, *then* the journal records whether it matches,
  with the dumped values.
- *Given* the outcome, *then* the journal row carries mechanism / origin / causal chain /
  ruled out (fix or irreducible), or ruled out / next to instrument (parked).

**Observability:** N/A. **Rollback:** reversible (revert the commit; registry and doc
edits revert with it).
