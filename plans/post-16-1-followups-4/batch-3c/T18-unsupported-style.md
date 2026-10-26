# T18: `gvrender_set_style: unsupported style` (item 58, AD-9)

**Context:** `lib/gvc/gvrender.c:480-515` `gvrender_set_style` maps each style token
(`solid`, `dashed`, `dotted`, `invis`/`invisible`, `bold`, `setlinewidth`, `filled`,
`unfilled`, `tapered`) and warns `agwarningf("gvrender_set_style: unsupported style %s -
ignoring\n", line)` for any other, every call (no once-flag), only when a render engine is
present (`if (gvre)`). Native prints it for an ortho `style=rounded` edge; the port never
prints it. Callers filter node/cluster styles first (`shapes.c` `checkStyle`/`stylenode`,
`emit.c` cluster style), so which objects reach it depends on the caller.

**Task:** (1) locate the port's equivalent (`grep -rn "gvrender_set_style" src`: candidates
`src/gvc/device.ts`, `src/common/style-resolve.ts`, `src/render/dot/edge-draw.ts`); if the
mapping is spread over several files, stop (stop 1) and report them. (2) Port the
warning at the C position, for each renderer that has a render engine (svg, xdot, json?
check which formats have `gvre` natively; `plain`/`canon` have none). (3) Explain in the
hand-back why only the ortho case was reported (probe a spline `style=rounded` edge).

**Write-set:** the single file holding the port of `gvrender_set_style` (+ test).
**Read-set:** `lib/gvc/gvrender.c:480-520`; `lib/common/emit.c` `emit_edge_graphics`
style handling; T0's `$BASE/native/` item-58 case.

**Acceptance criteria:**
- *Given* `digraph{splines=ortho;a->b[style=rounded]}`, *when* rendered svg, *then* stderr
  equals native.
- *Given* the same with `-Tplain`, *then* stderr matches native (no gvre → no line, if so).
- *Given* the corpus, *then* bytediff main outputs identical.

**Observability:** N/A. **Rollback:** reversible.
