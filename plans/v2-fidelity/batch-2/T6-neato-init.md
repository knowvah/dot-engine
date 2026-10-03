# T6: neato init: start, model, mode

## Context

Read `CLAUDE.md` and `../decisions.md`. `src/layout/neato/init.ts`:
- `checkStart` (~364) only seeds the RNG. C's `checkStart`
  (`~/git/graphviz/lib/neatogen/neatoinit.c:900-1000`) also returns
  INIT_REGULAR (`initRegular`, 16 LOC: nodes on a regular polygon) and
  INIT_SELF (smart init).
- `model` handling: C `neatoModel` (`neatoinit.c:605-632`) maps
  `subset`/`circuit`/`mds`/`shortpath`; `mds` without any `len` falls back
  with a warning. `mds` is already correct in the port (journal row 1); do
  not touch it.
- `solveModel` (~415) warns and falls back for `mode=hier|ipsep`. C
  `majorization` (`neatoinit.c:1080-1200`) runs constrained majorization; also
  `mode=hier` defaults `start` to INIT_SELF (`:1092`).

## Task

1. **Port `start=regular`.** Port `initRegular` and the INIT_REGULAR return of
   `checkStart`, then wire it where C uses it. Read the C call graph from
   `neato_layout`, through `majorization`/`kkNeato`, to `checkStart`;
   mirror where the result is consumed, and what C does with `start=regular`
   under each mode (it may be ignored by some modes). Native oracle: ≥2 graphs
   ([../oracle.md](../oracle.md)), ±0.5.
2. **Loud:** `start=self` (and `start` values that C maps to INIT_SELF); `model=subset`;
   `model=circuit` (mirror C's "disconnected → shortpath + warning" fallback
   *before* deciding: only the connected case needs the unported circuit
   solver); `mode=hier`, `mode=ipsep` (replacing the `console.warn`). Loud check: `throw new RenderError(`<attr>=<value>: <what> is not supported yet`, 'UNSUPPORTED_FEATURE')` from `src/errors.ts`, placed where C branches into the feature (ADR-3). Step 0 (ADR-4): first confirm on a discriminating fixture that native output differs from the port; journal the Δ.
3. Precedence (ADR-3): only where neato's C reads these. `start` is also read
   by fdp/sfdp; those engines are **not** in your write-set. Report what C does
   there; do not change them.

## Write-set

`src/layout/neato/init.ts`, `src/layout/neato/init.fidelity.test.ts` (new).

## Acceptance criteria

- `start=regular` matches native within ±0.5 on ≥2 graphs (journal the Δ).
- Each loud case throws `UNSUPPORTED_FEATURE` naming the attribute and value.
  Graphs without these attributes are byte-identical to before (existing neato
  tests green).
- `model=circuit` on a disconnected graph follows C's shortpath fallback (with
  the warning text) instead of throwing.
- `model=mds` behaviour is unchanged.

## Quality bar

TDD (tests first). Strict TS, no `any`, SPDX header on new files, `@see` C
references on every ported symbol. Complexity limits: ≤30 NLOC/function,
CCN ≤10, ≤5 params. Run `npx tsc --noEmit --stableTypeOrdering`, `npx tsgo
--noEmit` and your own tests only; do not run npm scripts (pre-scripts race
with parallel agents). Do not git commit, push, stash or checkout.

## Observability

N/A — no new observable operations.

## Rollback

Reversible (revert commit); irreversible in practice once 2.0.0 publishes.

## Commit

`feat(neato)!: port start=regular; fail loudly on unported start/model/mode`
