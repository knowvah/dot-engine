# T25: HTML `BGCOLOR` gradients via `parseSegs` (item 64)

**Context:** `parseGradientSpec` (`src/common/htmltable-emit-fill.ts:42`, used at `:382`
and `src/render/svg-graph.ts:177`) trims and splits at the first `:`. C's
`findStopColor` (`lib/common/emit.c`) uses `parseSegs`, so colour names with spaces and
`;fraction` stops may differ.

**Task:** port `findStopColor` exactly on top of the port's `parseSegs` (T6), replacing
`parseGradientSpec` at its call sites (or making it a thin `@see findStopColor` port if the
signature must stay for `svg-graph.ts`; do not edit `svg-graph.ts` unless the signature
changes, and then journal it). Keep C's frac handling and its warnings (T6).

**Write-set:** `src/common/htmltable-emit-fill.ts` (+ test); `src/render/svg-graph.ts`
only if the exported signature changes.
**Read-set:** `htmltable-emit-fill.ts:30-70,370-400`; `lib/common/emit.c` `findStopColor`,
`parseSegs`.

**Acceptance criteria:**
- *Given* `BGCOLOR="light blue:red"` and `BGCOLOR="red;0.3:blue"` in an HTML cell, *when*
  rendered, *then* SVG gradients and stderr equal native's.
- *Given* the HTML-label corpus ids, *then* bytediff identical or every change toward
  native.

**Observability:** N/A. **Rollback:** reversible.
