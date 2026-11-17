# Decisions: issue #156

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended` on 2026-11-16, base `55bb3ef4`. Every
decision below is the planner's recommendation, taken without a person. The
rejected options and the evidence are listed so the maintainer can audit them.
Disassembly excerpts of the oracle's neato plugin
(`~/git/graphviz-16.1.1/build/plugin/neato_layout/libgvplugin_neato_layout.8.0.16.dylib`,
sha256 prefix `aa9e9c6fee4cfb42`) are in [harness/disasm/](harness/disasm/).

### AD-1: one double CG, `conjugateGradientD`, with the oracle's block pattern

**Context.** Upstream `1936e80d6` replaces `conjugate_gradient_f(float **A, …)`
with `conjugate_gradient_d(double **A, …)` (`lib/neatogen/conjgrad.c:92`). Its
body is the same as before, except that the two matrix products go through
`right_mult_with_vector_d(A, n, n, …)`. In the 16.1.1 plugin, `_conjugate_gradient_d`
is **out of line** (`nm`: `t _conjugate_gradient_d`). Its three call sites
(`IMDS_given_dim` ×2, the subspace loop) branch to it with `bl 0x11974`, so one
reduction pattern serves both callers. Read from
[conjugate_gradient_d.s](harness/disasm/conjugate_gradient_d.s):

| Site | Pattern | Width |
|---|---|---|
| `orthog1` sums (inlined, `ortho1`) | in-order `fadd`, 8 per pass | same as a scalar sum |
| initial `A x` rows | `fmul.2d` ×4, in-order `fadd` ×8, `fmadd` remainder (`:208-235`) | 8 |
| initial `r·r` | `fmul` / `fmul.2d` / `fmul`, in-order `fadd` ×4, `fmadd` remainder (`:316-333`) | 4 |
| in-loop `A p` rows | as `A x` (`:451-478`) | 8 |
| `p·Ap` | as `A x` (`:495-522`) | 8 |
| in-loop `r·r` | scalar `fmadd` (`:652`) | `BLOCK_NONE` |

For the record, the float version was 4 / 4 / 4 / 8 / none (`conjgrad.ts:271-280`).

**Decision.** Add `conjugateGradientD(A: readonly Float64Array[], x, b, n, opts)` to
`src/layout/neato/conjgrad.ts`. Its products call `rightMultWithVectorD(A, n, n, …)`
(`matrix-ops-dense.ts:39`, already 8-wide, as C calls that function). Its inner
products use `innerProduct` with the widths above as named constants. The
options object keeps `CgfOptions`' shape, renamed to `CgdOptions`. T1's harness
checks the widths bit for bit before T2 relies on them.

**Rejected.** (a) Give `rightMultWithVectorF` a `Float64Array` overload. That
keeps a function C deleted, and it would carry 4-wide blocks where the oracle
uses 8. (b) Inline the product loops in the solver. C calls
`right_mult_with_vector_d`, and the port already has a calibrated copy.

### AD-2: retire the float path entirely

**Context.** `1936e80d6` deletes `conjugate_gradient_f`, `right_mult_with_vector_f`
and `mult_dense_mat`. In the port, `conjugateGradientF` and its helpers
(`conjgrad.ts:270-367`), `rightMultWithVectorF` (`matrix-ops.ts:194-213`) and
`multDenseMat` (`matrix-ops-dense.ts:66-83`) have no other caller (checked with
grep at planning).

**Decision.** Delete them and their tests: `conjgrad.f.test.ts` (the whole file),
the `rightMultWithVectorF` cases in `matrix-ops.double.test.ts:92-115`, and the
`multDenseMat` case in `matrix-ops-dense.test.ts:46` (plus its `NATIVE.multDense.c`
fixture entry if nothing else reads it). Port `conjgrad.f.test.ts`'s per-site
contraction and branch cases to `conjugateGradientD`, in `conjgrad.test.ts` or in a
new `conjgrad.d.test.ts`. Change `conjgrad.test.ts`'s `underflowF` site to
`conjugate_gradient_d`.

**Rejected.** Keep the float path for bisecting 16.1.0. The oracle is 16.1.1
(ADR-0002), and the port tracks one version. `git` keeps the old code.

### AD-3: `IMDS_given_dim` in double, as the oracle computes it

**Context.** `~/git/graphviz-16.1.1/lib/neatogen/smart_ini_x.c:253-377`. `lap` is
`double **`. `lap[i][j] = -1.0 / ((double)Dij[i][j] * Dij[i][j])`, and
`degree -= lap[i][j]`. Neither can contract. The balance terms are
`int * double`. [IMDS_given_dim-balance.s](harness/disasm/IMDS_given_dim-balance.s)
shows both balance loops fused:

- **Initial balance** (`:2dff0-2dffc`). `fneg` and `fcsel` choose `lap` when
  `pos_i < y[j]` and `-lap` otherwise, then one `fmadd` gives
  `balance = fma(D, ±lap, balance)`.
- **In-loop `b`** (`:2e08c`, `:2e0c8`). It is `fmadd(D, lap, b)` when
  `pos_i < y[j]` and `fmsub(D, lap, b)` otherwise. That is
  `fma(D, ±lap, b)` again. Negating an input is exact, so this is
  bit-identical.

The convergence test is `fabs(1 - b / balance[i]) > 1e-5`, with no `b != balance[i]`
guard. Upstream removed the guard in `e5be39033`, `2aca7c60d` and `5cb68c2e0`.
These are not tracked by any issue, so this mission takes them. The removal
does not change behaviour. When `b == balance[i]`, the quotient is 1, or NaN for
0/0 and ∞/∞, and `fabs(…) > 1e-5` is false either way. `fcmp` followed by
`b.le` treats unordered as `le` (`:2e0dc`), so NaN keeps `converged`, which is
the same as the old guard.

**Decision.** In `src/layout/neato/smart-ini-x.ts`:

- `computeLaplacian` returns `Float64Array` rows, computing
  `-1.0 / (D * D)` and `degree -= w` in double, with no `Math.fround`.
- `balanceOf` computes `b = fma(D, posI >= y[j] ? -lap : lap, b)`.
- `BalanceCtx.lap` becomes `Float64Array[]`.
- `solveBalanced` calls `conjugateGradientD` and drops the guard.
- `FloatMatrix` stays for `computeBij` and `CMDS_orthog`, which are still
  `float **` in 16.1.1 (`smart_ini_x.c:48,68,203`).

**Rejected.** Keep the unfused `b += D * -lap`. The disassembly shows `fmadd` and
`fmsub` at both sites.

### AD-4: the subspace path uses `multDenseMatD` and `conjugateGradientD`

**Context.** `stress.c:550-553` now builds `matrix` with `mult_dense_mat_d`, and
`:591` calls `conjugate_gradient_d`. `_mult_dense_mat_d` is out of line in the
plugin, with two callers (PCA and the subspace). Its loop is a scalar `fmadd`
over `fcvt d, s` ([mult_dense_mat_d.s](harness/disasm/mult_dense_mat_d.s)). That
matches the port's `multDenseMatD` (`matrix-ops-dense.ts:89`), which `pca.ts`
already uses.

**Decision.** `stress-subspace.ts:363` calls `multDenseMatD`. `SubspaceState.matrix`
becomes `Float64Array[]`. `:297` calls `conjugateGradientD`. The `stress-subspace.test.ts`
mock follows the rename.

**Rejected.** None. The C leaves no choice.

### AD-5: native fixtures on this path are re-captured from 16.1.1, never from the port

**Context.** The base port equals native **16.1.0** byte for byte on all 12 probes
(`-Tplain`). Against **16.1.1** it is 10/24 EQUAL
([harness/base-results.txt](harness/base-results.txt)). Several unit fixtures are
16.1.0 captures through the changed code:

- `__fixtures__/hier/` `hier-probe.plain`/`.xdot`, `cases/tdist.plain` and
  `cases/dirnone.plain` differ under 16.1.1 (measured). The other cases and
  `c1554` are unchanged.
- `__fixtures__/hier-imds.ts` (T17 harness, 16.1.0 sources).
- `__fixtures__/hier-majorization.ts` (T22 harness, 16.1.0 `libneatogen.a`).

No harness source was committed. `plans/post-16-1-followups-4/batch-3b/hier-harness.md`
describes how they were built.

**Decision.** Re-capture every fixture that a red test on the head names, from
16.1.1 only:

- End-to-end files with the oracle binary (`-Kneato`, `/tmp/ghl1611-all`).
- Unit vectors with a harness that links 16.1.1's `build/lib/neatogen/libneatogen.a`,
  using the flags in `.agent-notes/issue-129.md`. Before trusting that harness, T1
  checks that its `conjugate_gradient_d` disassembly has the same reduction
  pattern as the plugin's.

Never write an expected value from port output. Update each fixture header to
say 16.1.1. Commit the harness sources under [harness/](harness/), which the
earlier missions did not do.

**Rejected.** (a) Loosen the bit-for-bit unit tests to a tolerance. That hides
the next drift. (b) Keep the 16.1.0 fixtures and mark the tests expected-fail.
The oracle is 16.1.1.

### AD-6: no corpus record, accepted divergence or doc changes

**Context.** Only corpus `1554` runs `mode=hier`. The rebaseline found no verdict
change from `1936e80d6` (issue comment, and
`plans/graphviz-16-1-1-rebaseline/classification/engines.md:120-126`). `1554`
equals native 16.1.1 on the base in plain and xdot.

**Decision.** Leave `test/corpus/*.json` and `docs/` alone. If gate 5 or 6 changes
`1554`, the head must equal native there.

## Rollback

Reversible. Revert the one squash commit. Nothing persistent changes: there is
no data format, no public API, and no corpus record.
