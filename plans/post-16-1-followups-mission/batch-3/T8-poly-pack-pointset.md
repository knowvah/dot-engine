# T8: `perf(T8)` or `fix(T8)`: polyRects on the shared `PointSet`

**Context:**
- C `lib/pack/pack.c:polyRects` (`newPS` at :741, used by `genBox` and `placeGraph`)
  keeps cells in `lib/common/pointset.c`, comparing raw doubles.
- The port's `src/layout/pack/poly-pack.ts:40-60` has its own `Set<string>` keyed
  `` `${cround(x)},${cround(y)}` `` (`psKey`/`inPS`/`insertPS`). Its comment argues the
  `cround` rounding is unobservable.
- Callers: osage `putRects` (`src/layout/osage/index.ts:385`, `packmode=graph`) and
  `src/layout/pack/index.ts:45-58`.

**Task:**
- Replace `psKey`/`inPS`/`insertPS` with `PointSet` and drop `cround` (AD-6).
- Update the tests: existing tests that assert string keys should assert membership
  instead. Add a test that pins a placement sequence before the change and still passes
  after it.

**Write-set:** `src/layout/pack/poly-pack.ts`, `src/layout/pack/poly-pack*.test.ts`.
**Read-set:** `~/git/graphviz/lib/pack/pack.c:700-860`; `src/layout/pack/poly-pack.ts`;
`src/layout/pack/poly-place.ts` (the `PointSet` usage pattern from PR #92).

**Acceptance criteria:**
- *Given* T0's osage and neato/fdp/sfdp/circo pack ids, *when* re-rendered, *then* output
  is byte-identical (`perf`). Otherwise every changed id is surveyed or walked against the
  oracle, with 0 regressions and moves toward the oracle only (`fix`).
- *Given* the placement-pinning test, *then* it passes on the old and new code.
- *Given* `timings-before.json`, *then* no osage id gets slower by more than its noise
  band (measured in T11).

**Observability:** N/A. **Rollback:** reversible.
