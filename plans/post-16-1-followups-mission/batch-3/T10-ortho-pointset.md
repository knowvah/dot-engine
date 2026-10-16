# T10: `perf(T10)`: ortho concentrate `seen` set on `PointSet`

**Context:**
- C `lib/ortho/ortho.c:orthoEdges` creates a `PointSet` when `concentrate` is set
  (:1166). It checks `isInPS(ps, t, h) || isInPS(ps, h, t)` and adds `(t, h)`
  (:1224-1229), using the tail and head ids as coordinates.
- The port's `src/layout/dot/ortho-adapter.ts:73` keeps `seen: Set<string>` with a single
  ordered key.

**Task:**
- Check that the port's one key is equivalent to C's two-point check. Write a test that
  pins it: a `(t,h)` then `(h,t)` pair must be deduplicated as in C.
- Then switch to `PointSet`, mirroring C's two `isInPS` calls and one `addPS`.

**Write-set:** `src/layout/dot/ortho-adapter.ts`, `src/layout/dot/ortho-adapter*.test.ts`.
**Read-set:** `~/git/graphviz/lib/ortho/ortho.c:1155-1235`;
`src/layout/dot/ortho-adapter.ts:65-100`.

**Acceptance criteria:**
- *Given* `concentrate=true` with edges a→b and b→a, *when* `buildEdges` runs, *then* the
  second is skipped exactly when C skips it.
- *Given* T0's ortho + concentrate ids, *when* re-rendered, *then* output is byte-identical.

**Observability:** N/A. **Rollback:** reversible.
