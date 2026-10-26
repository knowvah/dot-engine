# T8: `GvcContext.layout` resets render state (item 47, AD-8)

**Context:** `GvcContext` and `renderWithContext` are public (`src/index.ts:160,167`).
Part 3 AD-4 resets C process state in `renderSvg`, `render`, `getDrawOps`, `renderAsync`
(`src/index.ts:94`, `render/public.ts:122`, `render/xdot-public.ts:164`,
`async/render-async.ts:156`) but not in the low-level pipeline, so a caller driving
`GvcContext.layout` + `renderWithContext` carries state between graphs.

**Task:** call `resetRenderState()` first in `GvcContext.layout`
(`src/gvc/context.ts:297`); document the contract in its doc comment (one graph per
layout behaves as one native run; caller hooks are not reset). Confirm no public entry
sets render state between its own reset and its `layout` call (each one: read the entry,
list what runs before `layout`); if one does, stop (stop 4).

**Write-set:** `src/gvc/context.ts` (+ a test file `src/gvc/context.reset.test.ts`).
**Read-set:** `src/gvc/context.ts:190-340`; the four entry points above;
`src/common/render-state.ts`.

**Acceptance criteria:**
- *Given* one `GvcContext` and two graphs that each emit a once-only warning (e.g. an
  unknown font name), *when* `layout` + `renderWithContext` run for each, *then* the
  warning prints for both graphs.
- *Given* a caller-installed text measurer, *when* `layout` runs, *then* it stays installed.
- *Given* the corpus, *then* bytediff identical; speed p50 ≤ 1.05× (stop 7).

**Observability:** N/A. **Rollback:** reversible.
