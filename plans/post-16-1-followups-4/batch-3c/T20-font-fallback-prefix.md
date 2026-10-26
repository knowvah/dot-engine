# T20: doubled font-fallback prefix (item 61, AD-9)

**Context:** `lib/common/textspan_lut.c:776` passes the literal `"Warning: no hard-coded
metrics for '%s'.  Falling back to 'Times' metrics\n"` to `agwarningf`, which adds its own
prefix, so native prints `Warning: Warning: no hard-coded metrics …`. The port prints one
`Warning: ` (`src/common/textmeasure-lookup.ts:52`).

**Task:** pass the same literal through `agwarningf` so the doubled prefix appears exactly
as native; keep the once-per-render behaviour (part 3 T1's emit_once reset).

**Write-set:** `src/common/textmeasure-lookup.ts` (+ test; update golden allow-list entries
that pin the single-prefix text).
**Read-set:** `textmeasure-lookup.ts:30-70`; `lib/common/textspan_lut.c:760-790`.

**Acceptance criteria:**
- *Given* `digraph{a[fontname=Bogus]}`, *when* rendered, *then* stderr equals native's
  `Warning: Warning: no hard-coded metrics for 'Bogus'.  Falling back to 'Times' metrics`.
- *Given* two nodes with that font, *then* the line prints once.

**Observability:** N/A. **Rollback:** reversible.
