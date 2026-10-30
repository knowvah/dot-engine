# T3: `":red"` fill names on point nodes and edge arrowheads (items 98–99, AD-7)

**Context:** native 16.1 (part-6 T2 probes) handles `fillcolor=":red"` the same way in
both places: it prints `Warning:  is not a known color.` once and fills `#000000`, because
`gvrender_set_fillcolor` cuts the name at the first `:`. The port differs:

- **Point nodes:** `applyFillState`'s point path (`src/common/poly-gencode.ts:373-377`)
  calls `resolveRenderColor(findFillDflt(n))`, so it warns `:red is not a known color.`.
- **Edges:** C `emit_edge_graphics` takes `fillcolor = late_nnstring(e, E_fillcolor,
  color)` and calls `gvrender_set_fillcolor` (`emit.c:2415-2434`, 2541–2547). The port
  fills arrowheads with the pen colour and never reads `fillcolor`; T0 named the exact
  site in the journal.

Part-5 T11's `resolveFillColorName` (`src/render/color-resolve.ts:134`) already does the
cut and warning for node and cluster solid fills.

**Task:**
1. Tests first, from `src/gvc/__fixtures__/p7/colors/98-*` and `99-*` (-Tsvg, -Txdot,
   -Tjson): stderr and fill match native. Edge cases: `color=blue fillcolor=":red"`,
   `fillcolor="red:"`, and no fillcolor (unchanged).
2. Point path: resolve through `resolveFillColorName` at the point where C reaches
   `gvrender_set_fillcolor` (`shapes.c:point_gencode`).
3. Edges: port `emit_edge_graphics`' fillcolor selection (2397–2434, including the
   `DEFAULT_*FILLCOLOR` obj-state branches and `*fillcolor == '\0'` → `DEFAULT_COLOR`) at
   the T0-named site. Resolve through `resolveFillColorName`. Arrowheads use the result.

**Write-set:** `src/common/poly-gencode.ts` (point path only), `src/render/color-resolve.ts`,
and the file/function T0 named (+ tests beside each). Any other file is stop 1.
**Read-set:** `lib/common/emit.c:2350-2440,2530-2550`, `lib/common/shapes.c:point_gencode`,
`lib/gvc/gvrender.c:gvrender_set_fillcolor`, `src/render/color-resolve.ts:120-160,320-360`.

**Acceptance criteria:**
- *Given* `a[shape=point fillcolor=":red"]`, *when* rendered, *then* stderr is
  `Warning:  is not a known color.` once and the fill is `#000000` in all three formats.
- *Given* `a->b[fillcolor=":red"]`, *then* the warning and the arrowhead fill match native.
- *Given* the corpus, *when* bytediff runs, *then* any changed output matches a fresh
  native run (edges with `fillcolor` set now fill as native).

**Commit:** `fix(T3): cut point and edge fill names at the first colon`.
**Observability:** N/A. **Rollback:** reversible.
