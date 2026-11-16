# Decisions: issue #154

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-16. #154 is the lowest-numbered open `queue:ready` issue. Its one
blocker, #147, is closed. No issue is `queue:planned`. Nobody confirmed these
decisions. Each one names the rejected options and the evidence, so the
maintainer can audit it.

### AD-1: one helper pair in `src/util/overflow.ts`, returning `number | null`

- **Decision:** port `fdiv_overflow` and `fdivf_overflow`
  (`~/git/graphviz-16.1.1/lib/util/overflow.h:142-174`) into the port's
  existing `src/util/overflow.ts`, next to `saddSaturate`:
  - `fdivOverflow(n: number, d: number): number | null`: `r = n / d`;
    `null` when `!Number.isFinite(r)`, else `r`.
  - `fdivfOverflow(n: number, d: number): number | null`: the same on
    `float` (AD-2).
  - `null` stands for C's `true` return ("overflow"), when C leaves `*res`
    untouched. Call sites write C's fallback with `??`: `fdivOverflow(w, xsize)
    ?? w` is C's "`scalex = n_width`, then overwrite on success".
  - Each carries `/** @see lib/util/overflow.h:fdiv_overflow */` (and
    `fdivf_overflow`), and keeps C's `// did we overflow?` comment.
- **Why:** CLAUDE.md keeps function boundaries, and `overflow.h` is already
  ported as `overflow.ts` (`saddSaturate`, #152). `null` for C's flag maps
  `NULL`-style "no result" per the translation table, and `0` is not nullish,
  so `??` cannot swallow a real zero quotient.
- **Rejected:**
  - Inline `Number.isFinite(q)` at each of the five call sites: drops the
    `@see` to `overflow.h` and repeats the check.
  - C's shape (a `boolean` return plus an out-object `{ res }`): reads worse at
    every site and allocates on `bend`'s path for nothing.

### AD-2: `fdivfOverflow` rounds operands and quotient to float32

- **Decision:** `const r = Math.fround(Math.fround(n) / Math.fround(d));`.
  Rounding the operands models C's `float n, float d` parameters. The
  quad-prog callers already pass float32 values, so it changes nothing there.
- **Why:** C's `float` division is IEEE single division. Dividing two float32
  values in double and rounding once to float32 gives the same bits, because
  53 ≥ 2·24 + 2 (no double-rounding hazard). The finiteness test must run on
  the float32 quotient: a double quotient of 1e39 is finite, the float is
  `inf`. That is the overflow case the alpha test pins (T1).
- **Rejected:** testing `Number.isFinite(numerator / denominator)` in double:
  it misses exactly the float overflow 16.1.1 now catches.

### AD-3: beta's change cannot change output, so it gets no behaviour test

- **Decision:** port beta's guard (`lineSearchBeta` returns
  `fdivfOverflow(numerator, denominator) ?? 1.0`) for fidelity, with no new
  test that reaches it through `constrainedMajorizationVpsc`, and without
  exporting `lineSearchBeta`.
- **Why:** beta's only reader is `applyBeta`, which steps only when
  `beta > 0 && beta < 1.0` (`quad_prog_vpsc.c:152`). Every value the old code
  could produce where the new code returns 1 (`+inf`, `-inf`, `NaN`) fails that
  test, and so does 1. The step is skipped either way. A public-API test cannot
  tell old from new. The helper's own tests and the existing line coverage of
  `lineSearchBeta` (the zero-matrix test) cover the code.
- **Rejected:** exporting `lineSearchBeta` marked `@internal` just to assert
  its return value. That widens the module surface for a value nothing
  downstream can observe.

### AD-4: `bend` keeps `Math.hypot` and C's check order

- **Decision:** replace only the `magV === 0` guard with
  `if (fdivOverflow(vX, magV) === null || fdivOverflow(vY, magV) === null)
  return;` and C's comment `// avoid out of range division results`. Keep
  `Math.hypot` and the rest of `bend` as they are.
- **Why:** this is the whole of upstream `fb7f0feb3`'s change to `routespl.c`.
  `magV ≥ |vX|`, so each quotient lies in [-1, 1] unless `magV` is 0
  (0/0 = NaN), infinite (∞/∞ = NaN), or NaN. Those are the cases where 16.1.1
  returns early: the old guard caught only 0.
- **Rejected:** porting the libm `hypot` model at the same time (as #189 did for
  `sgd.c`): a different defect, with no evidence that it moves `bend`. File a
  `follow-up` if the survey shows a `hypot` last-bit diff.

### AD-5: no corpus output changes, so no corpus records change

- **Decision:** expect byte-identity, base to head, on every bytediff. Edit no
  `test/corpus/*` record and no `docs/known-divergences.md` entry. The commit
  type is `fix`: non-finite inputs now behave as 16.1.1 does (the unit tests
  show the change), but no corpus input produces one.
- **Why:** the planning survey and probes (README Evidence). #147's
  classification also found no id that changed verdict because of these four
  commits (issue comment).

## Baseline

Measured at planning on `064266d2`: see the README's Evidence section for
the numbers and load.

## Rollback

Reversible: revert the squashed commit. No data, API or format change.
`fdivOverflow`/`fdivfOverflow` are new exports of an internal util module.
Neither `src/util/index.ts`, `src/index.ts` nor `src/api/index.ts` re-exports
`overflow.ts` (grepped at planning), so the public API does not change.
