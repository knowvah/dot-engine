# T4: `refactor(T4)`: share ortho's concentrate dedup with neato (item 15)

**Context:**
- C has one gather loop, `lib/ortho/ortho.c:1215-1235` (`orthoEdges`), used by dot and
  neato. Under `Concentrate` it normalises `(AGSEQ(tail), AGSEQ(head))` to (min, max) and
  makes one `isInPS`/`addPS` pair on a `PointSet`.
- dot's copy: `src/layout/dot/ortho-adapter.ts:52-67` `isConcentrateDup` on
  `src/common/pointset.ts:PointSet` (previous mission's item 11).
- neato's copy: `src/layout/neato/splines.ts:588-633` `OrthoHelper.buildEdges` uses a
  string key `${lo}|${hi}` in a `Set` — item 11's last unconverted site.
- Neither copy has C's `if (Nop == 2 && ED_spl(e)) continue;` (`ortho.c:1219`): with
  `neato -n2`, edges that already carry splines are not re-routed.

**Task (tests first):**
1. Export `isConcentrateDup` from `ortho-adapter.ts` (keep its `@see`), and use it in
   neato's `buildEdges` in place of the string set.
2. Decide reachability of the `Nop == 2 && ED_spl(e)` skip in the port: does neato `-n2`
   (pos given, `splines=ortho`, input edges with `pos`) reach `buildEdges` with edges that
   already have splines? Port it at both copies if reachable; otherwise record the evidence.
   If reachable, compare against native on a small `-n2` input.

**Write-set:** `src/layout/neato/splines.ts`, `src/layout/dot/ortho-adapter.ts`, a new
`src/layout/neato/ortho-concentrate.test.ts`.
**Read-set:** the line ranges above; `src/common/pointset.ts:20-60`.

**Acceptance criteria:**
- *Given* `concentrate=true; splines=ortho` under neato with a 2-cycle `a->b; b->a` and a
  parallel `a->b`, *when* edges are gathered, *then* exactly the first edge per unordered
  pair is kept, in agfstnode/agfstout order.
- *Given* byte-identity on neato and dot, *then* 0 SVG diffs (a pure refactor) unless the
  `Nop == 2` port changes an `-n2` case toward native.
- *Given* the `Nop == 2` question, *then* the journal row states reachable/unreachable with
  the evidence.

**Observability:** N/A. **Rollback:** reversible.
