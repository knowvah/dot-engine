# Batch 4: unknown-color warning, width warnings, `<BR/>` in a font style

Parallel worktrees after batch 3. T10 and T11 use T1's `registerRenderState` and T5's
`agerr`. T12 owns no `htmltable-emit*` file (T10 may touch `htmltable-emit-fill.ts`).

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T10](T10-unknown-color.md) | Item 37: `X is not a known color.` via `emit_once` | typescript-pro | `src/render/color-resolve.ts`, `src/common/emit-once.ts` (new), `colorxlate` callers | T1, T5, T8 | [ ] |
| [T11](T11-width-warnings.md) | Item 41: `textspan_lut` width-fallback warnings | typescript-pro | `src/common/textmeasure.ts` | T1, T5 | [ ] |
| [T12](T12-br-in-font-style.md) | Item 35: `<BR/>` lines inside a font-style element | debugger → typescript-pro | `src/common/htmltable-{parse,parse-font,parse-state,pos,pos-runs,label,types,fontinfo}.ts` | T3, T5 | [ ] |
