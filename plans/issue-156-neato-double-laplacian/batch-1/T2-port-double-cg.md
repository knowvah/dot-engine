# T2: port the double Laplacian and `conjugate_gradient_d`; retire the float path

## Context

The spec is upstream `1936e80d6` and `e5be39033`/`2aca7c60d`/`5cb68c2e0`. Read
them with `git -C ~/git/graphviz-16.1.1 show -w <sha>`. The decisions are AD-1 to
AD-6, and T1's journal row confirms the widths. The port sites are:

- `conjgrad.ts:270-367`: `conjugateGradientF` and its `cgf*` helpers.
- `matrix-ops.ts:194-213`: `rightMultWithVectorF`.
- `matrix-ops-dense.ts:66-83`: `multDenseMat`.
- `smart-ini-x.ts:372-472`: `computeLaplacian`, `balanceOf`, `BalanceCtx` and
  `solveBalanced`.
- `stress-subspace.ts:291-301,363`.

## Task (TDD)

1. **Red, fixtures.** Re-capture from 16.1.1, never from the port (AD-5):
   - `__fixtures__/hier/hier-probe.{plain,xdot}`, `cases/tdist.plain` and
     `cases/dirnone.plain`, with the oracle binary
     (`GVBINDIR=/tmp/ghl1611-all … -Kneato -Tplain|-Txdot`). Re-capture the
     other `hier/` files the same way and confirm they come out unchanged.
   - `__fixtures__/hier-imds.ts` and `hier-majorization.ts`, from T1's `out/`.
   - Change each header from 16.1.0 to 16.1.1.

   Run `npx vitest run src/layout/neato`. The red tests should be
   `hier.fidelity`, `smart-ini-x` and `constrained-majorization`. Journal every
   red test. A test outside these three that goes red has a 16.1.0 capture on
   this path: re-capture it the same way and add it to the journal.
2. **Red, solver.** Write the `conjugateGradientD` tests that replace
   `conjgrad.f.test.ts`. Its per-site contraction cases come from T1's
   calibration vectors (a few small n, with n % 8 ≠ 0). Keep its branch cases:
   `ortho1`, the `pAp === 0` break, the last-iteration skip, and the underflow
   rv 1 with C's message (`conjgrad.c:140`). Switch `conjgrad.test.ts`'s
   `underflowF` site to the double matrix. These fail to import on the base.
3. **Green** per AD-1 to AD-4:
   - `conjgrad.ts`: add `conjugateGradientD` and `CgdOptions`. Name the width
     constants by site and cite T1's calibration in a doc comment. Delete
     `conjugateGradientF`, `CgfOptions`, the `cgf*` helpers and the `CGF_*`
     constants. Fix the `:177` comment, which names `conjugate_gradient_f`.
   - `matrix-ops.ts`: delete `rightMultWithVectorF`, and its import in
     `conjgrad.ts`.
   - `matrix-ops-dense.ts`: delete `multDenseMat`.
   - `smart-ini-x.ts`: apply AD-3. The file must not grow past 503 lines (the
     hook blocks it); removing `fr` calls and the guard frees lines.
   - `stress-subspace.ts`: apply AD-4.
   - Tests: delete `conjgrad.f.test.ts`, the `rightMultWithVectorF` cases
     (`matrix-ops.double.test.ts:92-115`) and the `multDenseMat` case
     (`matrix-ops-dense.test.ts:46`, with its `multDense.c` native entry if it
     is unused). Rename the `stress-subspace.test.ts` mock to
     `conjugateGradientD`.
   - `@see` tags: `lib/neatogen/conjgrad.c:conjugate_gradient_d` and
     `smart_ini_x.c:IMDS_given_dim`.
4. Run `grep -rn "conjugateGradientF\|rightMultWithVectorF\|multDenseMat(" src`.
   It must find nothing.
5. Build the head bundle and run `bash plans/issue-156-neato-double-laplacian/harness/compare-native.sh <head.mjs>`.
   It must give 24/24 EQUAL. If any probe differs,
   [stop condition 4](../README.md#stop-conditions) applies. Then run gates 1-6
   (README) and journal each.
6. **Finish:** the README's squash step.

## Bytediff

Build `dist/index.js` at the base (`npm run build:js` on a temporary
`git worktree` of `55bb3ef4` under `$TMPDIR`, or reuse
`$TMPDIR/base-55bb3ef4.mjs` if it is still there) and at the head. Then run
`npx tsx test/tools/bytediff.ts base.mjs head.mjs ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/bd156.json`.
Expected: identical. No smoke id runs `mode=hier`, and the default neato path
(`mode=major`, random start) does not call the changed code (the rebaseline's
P1 finding). Any change is a stop unless it equals native.

## Targeted survey

How the ids were chosen: the only corpus input that sets `mode=hier` is `1554`
(`grep -rlE 'mode *= *"?hier' ~/git/graphviz-16.1.1/tests`). `start=self` on
`mode=major` is loud in the port. `mode=ipsep` does not call either function.
The rtest `mode.gv -Gmode=hier` cases are not corpus ids, so they are probes.

- Run `printf '1554 neato\n' > ids` and pass that file to `bytediff.ts` with
  `BD_ENGINES=neato`, over all five formats. Every changed output must equal
  native 16.1.1. At planning, base `1554` equals native in plain and xdot.
- Run the 24 probe jobs from step 5.

## Acceptance criteria

- *Given* the 12 probes, *when* `compare-native.sh` runs on the head, *then*
  all 24 plain and xdot jobs are EQUAL to native 16.1.1, bytes and stderr. The
  base gives 10/24.
- *Given* the re-captured `hier-imds.ts` and `hier-majorization.ts`, *when* the
  unit tests run, *then* they pass bit for bit on the head and fail on the base.
- *Given* `case-tdist`, *when* it is laid out, *then* node `a` is at
  `0.375 2.11` (native 16.1.1, `-Tplain`). The base gives `0.375 2.1587`.
- *Given* the head, *when* `src/` is grepped for the three float functions,
  *then* nothing matches, and `smart-ini-x.ts` has at most 503 lines.
- *Given* the smoke list, *when* bytediff runs, *then* every output is
  identical.

## Write-set

- `src/layout/neato/conjgrad.ts`, `matrix-ops.ts`, `matrix-ops-dense.ts`,
  `smart-ini-x.ts`, `stress-subspace.ts`
- `src/layout/neato/conjgrad.test.ts`, `conjgrad.f.test.ts` (delete),
  `conjgrad.d.test.ts` (new, optional), `matrix-ops.double.test.ts`,
  `matrix-ops-dense.test.ts` (and the native JSON or fixture it loads, only for
  the `multDense.c` entry), `stress-subspace.test.ts`, `smart-ini-x.test.ts`,
  `constrained-majorization.test.ts`, `hier.fidelity.test.ts` (headers and any
  inline native constants, such as `PROBE_NODES`)
- `src/layout/neato/__fixtures__/hier/**`, `__fixtures__/hier-imds.ts`,
  `__fixtures__/hier-majorization.ts`
- Any other test that step 1 shows holds a 16.1.0 capture on this path. Journal
  each one.
- `plans/issue-156-neato-double-laplacian/` (journal, README status),
  `plans/decision-journal.md`, `.agent-notes/issue-156.md` (only if something
  is novel)

## Interface contracts

- `conjugateGradientD(A: readonly Float64Array[], x: Float64Array, b: Float64Array, n: number, opts: CgdOptions): number`.
  It returns 0, or 1 after the zero-length residual error. Callers test `< 0`
  (stress-subspace tests `!== 0`), as C does. `x` is updated in place.
- `CgdOptions = { tol: number; maxIterations: number; ortho1: boolean }`.
- `multDenseMatD` and `rightMultWithVectorD` keep their current signatures.

## Observability

N/A: deterministic layout numerics, no new diagnostics. The only message is
the existing `conjugate_gradient: unexpected length 0 vector`.

## Rollback

Reversible: revert the squash commit. There is no data, API or corpus-record
change.
