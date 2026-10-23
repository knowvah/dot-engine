# T10: unknown-color warning (item 37)

**Context:** `lib/gvc/gvrender.c:188-213 gvrender_resolve_color`: when a name is not in
the renderer's `knowncolors` and `colorxlate` returns `COLOR_UNKNOWN`, C prints
`Warning: <name> is not a known color.` once per `emit_once("color <name>")`
(`lib/common/emit.c:3731`, reset only in `gvFreeContext`, so once per process = once per
render under AD-4). Any other non-OK result prints `Error: error in colorxlate()`. The
port never prints either, for plain attributes (`a[color=foo]`) or HTML
`COLOR`/`BGCOLOR`. stderr only; SVG already matches. Item 28's attribute fuzz showed 34
labels with this as their only mismatch. Port resolution: `src/render/color-resolve.ts:84
resolveRenderColor`; other `colorxlate` callers: `src/gvc/device*.ts`,
`src/render/{svg-graph,svg,svg-multicolor,svg-parallel-edge,svg-edge-split,dot}.ts`,
`src/render/dot/{edge-draw,xdot-ops}.ts`, `src/common/{htmltable-emit-fill,poly-gencode,color}.ts`.

**Task:**
1. `src/common/emit-once.ts`: port `emit_once(str): boolean` (a set); register its clear
   with `registerRenderState` (T1).
2. In each caller whose C path goes through `gvrender_resolve_color` (per renderer: SVG's
   `knowncolors` is the SVG list; check `-Tdot/-Txdot/-Tjson` features in
   `plugin/core/gvrender_core_dot.c`/`_json.c` for their known-colors and color type),
   warn through T5's `agerr('warning', …)` on `COLOR_UNKNOWN`, in C's call order.
3. Callers that are not `gvrender_resolve_color` in C stay silent.

**Write-set:** `src/common/emit-once.ts` (+ test, new), `src/render/color-resolve.ts`, and
the callers listed above that need the warning (+ tests).
**Read-set:** `gvrender.c:180-215`, `emit.c:3725-3750`, `plugin/core/gvrender_core_*.c`
feature tables, the caller sites.

**Acceptance criteria:**
- *Given* `digraph{a[color=foo]}` (svg, xdot, json, cmapx), *when* probed, *then* stderr
  equals native's in count and order for each format.
- *Given* `foo` used on three objects, *then* one warning per render; two renders in one
  process both warn.
- *Given* an HTML `BGCOLOR="foo"`, *then* native's warning; T0's attribute fuzz loses
  every item-37 class mismatch and gains none.

**Observability:** N/A. **Rollback:** reversible.
