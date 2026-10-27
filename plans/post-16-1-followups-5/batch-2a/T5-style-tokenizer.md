# T5: `style_token` / `parse_style` port (AD-8, item 80)

**Context:** `lib/common/emit.c` `style_token` skips spaces and commas between tokens but
keeps everything up to the next delimiter inside one (`"dashed , bogus"` → `"dashed "`);
`parse_style` errors `nesting not allowed in style: %s` / `unmatched ')' in style: %s`
(returning an empty list) and warns `truncating style '%s'` at FUNLIMIT. The port's
`styleTokens` (`src/common/style-resolve.ts:169`) splits on commas and trims, so
`"dashed "` matches `dashed` and the diagnostics never print. Per-bezier style warnings
(`device.ts:200-206`) print after `reportEdgeColors` instead of in `emit_edge_graphics`
order.

**Task:** (1) Port `is_style_delim`, `style_token`, `parse_style` into `style-resolve.ts`
as the body of `styleTokens` (one token per C `parse[]` entry: the token text with its
`(args)` appended as C stores it after the NUL — keep the existing `setlinewidth(2)`
shape). (2) `parseStyleFlags`, `gvrenderSetStyle`'s `styleName`, and the xdot `S` ops
consume the new tokens; confirm `checkStyle`/`stylenode` (`shapes.c`) comparisons use the
untrimmed token as C does. (3) In `renderEdge`, order the per-bezier `gvrender_set_style`
warnings relative to the colour warnings as `emit_edge_graphics` does (`emit.c:2047,2677`).
(4) Tests from `$BASE/native/80*`.

**Write-set:** `src/common/style-resolve.ts` (+test), `src/gvc/gvrender-set-style.ts`
(+test), `src/gvc/device.ts` (the edge section only, lines ~160-210).
**Read-set:** `lib/common/emit.c` `is_style_delim`…`parse_style` (search `style_token`),
`emit_edge_graphics` 2030-2060, 2660-2690; `lib/gvc/gvrender.c:480-515`.

**Interface output:** `styleTokens(style)` returns C's tokens untrimmed with `(args)`
attached (consumed by T11's style reads and T12's `device.ts` edits).

**Acceptance criteria:**
- *Given* `style="dashed , bogus"` on an edge, *when* rendered svg, *then* the stroke is
  solid and stderr equals native (`unsupported style dashed `).
- *Given* `style="a(b(c))"` and `style="a)"`, *then* each `agerrorf` line equals native and
  the style list is empty.
- *Given* 65 tokens, *then* `truncating style '…'` equals native.
- *Given* a 2-bezier edge with a bad colour and a bad style, *then* stderr order equals
  native; *given* the corpus, *then* bytediff identical (console included) except ids
  whose style tokens carried inner whitespace, each explained.

**Observability:** N/A. **Rollback:** reversible.
