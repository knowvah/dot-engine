# T11: `fix(T11)`: route every Bezier mirror through one fused bezier (item 20b)

**Context:**
- C has one `lib/common/utils.c:Bezier(pointf *V, double t, pointf *Left, pointf *Right)`;
  per the previous mission's T13 disassembly, each `(1.0 - t) * a + t * b` compiles to
  `fma(a, 1 - t, t * b)`. The port has a fused copy that keeps only the apex
  (`src/common/spline-midpoint.ts:34-52`) and several unfused copies.
- T10's inventory (`.agent-notes/bezier-inventory.md`) lists the copies whose C calls
  `Bezier`: only those rows are in scope here (the rest are T12).
- AD-6: one shared function with C's signature; output changes only toward the oracle.
- Speed risk: `src/common/fma.ts` is software; this task moves it into hot paths
  (edge clipping, label placement).

**Task (tests first):**
1. New `src/common/bezier.ts` exporting
   `bezier(v: Point[], t: number, left: Point[] | null, right: Point[] | null): Point`,
   ported from `utils.c:Bezier` with the fused form, filling `left`/`right` when given.
   Test it bit-exact against values dumped from native `Bezier` (a small C harness linked
   against the oracle's `libgvc`, run from the scratchpad) on at least 3 cubics and 5 `t`.
2. Replace each in-scope copy with a call to it; `spline-midpoint.ts` imports it too.
3. Byte-identity on all eight engines; for every changed SVG, show the change moves toward
   native (diff count vs native before and after).
4. Speed gate: `BENCH_IDS` on T0's dot and neato subsets (save/restore `perf.json`); p50
   ≤ 1.05× of T0. Over budget → STOP (stop 7); do not unfuse.

**Write-set:** `src/common/bezier.ts`, `src/common/bezier.test.ts`,
`src/common/spline-midpoint.ts`, and the port files in T10's `calls Bezier = yes` rows
(expected among `src/gvc/anchor.ts`, `src/layout/dot/{compound-geom,edge-route-clip,splines-label,compound-clip}.ts`)
plus their colocated tests. A row outside that list needs a journaled write-set extension.
**Read-set:** `.agent-notes/bezier-inventory.md`; `~/git/graphviz/lib/common/utils.c`
(`Bezier`); `src/common/fma.ts`.

**Interface output (consumed by T12):** `bezier()` above.

**Acceptance criteria:**
- *Given* the native harness values, *when* `bezier` runs on the same inputs, *then* every
  coordinate is bit-identical (including `left`/`right`).
- *Given* byte-identity, *then* every SVG change has a smaller-or-equal diff count against
  native than before, per id, and none is a verdict regression.
- *Given* the speed gate, *then* p50 ≤ 1.05× on both subsets (or measurement deferred at
  load ≥ 8, journaled).

**Observability:** N/A. **Rollback:** reversible.
