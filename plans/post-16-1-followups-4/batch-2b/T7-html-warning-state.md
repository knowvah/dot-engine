# T7: HTML warnings once per render (item 46, AD-7)

**Context:** rendering the same parsed `Graph` twice suppresses the HTML "cell size too
small" and "No or improper image" warnings on the second render: `missingImages`
(`src/common/htmltable.ts:231`, used at `:246`) and `sizeWarned` (`:320`, `:311`
WARN_CELL_TOO_SMALL) are module `WeakSet`s keyed by per-graph objects, which survive
`freeLayout`. Native re-parses per run.

**Task:** make both sets `let` bindings replaced by fresh `WeakSet`s in a reset registered
with `registerRenderState` (`src/common/render-state.ts`). No other behaviour change.

**Write-set:** `src/common/htmltable.ts` (+ its test).
**Read-set:** `htmltable.ts:220-330`; `src/common/render-state.ts`.

**Interface output (T23, T27):** HTML warning dedupe state lives in render-state; T23
keeps using `missingImages` for the `<IMG>` path.

**Acceptance criteria:**
- *Given* one parsed `Graph` with a too-small cell and a missing `<IMG>`, *when* rendered
  twice with `renderSvg`, *then* both warnings print on both renders.
- *Given* one render with the same `<IMG>` twice, *then* the warning prints once (unchanged).
- *Given* the HTML-label ids, *then* bytediff identical.

**Observability:** N/A. **Rollback:** reversible.
