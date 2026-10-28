# T14: image sizing through the installed sizer (AD-10, item 83)

**Context:** `shapes.c:2039-2050` sizes `image=` through `gvusershape_size` (+2 padding,
`GD_has_images`); the port's `poly-sizing.ts:586` leaves `imagesize` at 0 and
`poly-init.ts:warnMissingImage` only warns. HTML `<IMG>` sizing (`htmltable.ts:135`
`sizeHtmlImg`) takes `imageSizer` from `HtmlSizeEnv`, but `imageIsSupplied` is called
without the per-context `ctx.imageResolver` (`make-label.ts:220` reads only
`gvc.imageSizer`), so a caller supplying bytes through `GvcContext.imageResolver` still
gets the missing-image warning.

**Task:** (1) `poly_init`'s image branch: when the installed sizer returns a size, add it
with +2 padding into the node's size computation as C does and mark `has_images`; the
existing warning path stays when it returns null. (2) `HtmlSizeEnv` gains `imageResolver`;
`make-label.ts` passes `gvc.imageResolver`; `sizeHtmlImg` passes it to `imageIsSupplied`.
(3) Tests: a sizer returning 40×30 reproduces `$BASE/native/83*` node size (`-Tplain`);
resolver-only suppresses the `<IMG>` warning; no sizer → unchanged.

**Write-set:** `src/common/htmltable.ts`, `src/common/make-label.ts`,
`src/common/poly-sizing.ts`, `src/common/poly-init.ts`, `src/gvc/usershape.ts` (+ tests).
**Read-set:** `lib/common/shapes.c:2015-2060`, `lib/gvc/gvusershape.c:gvusershape_size`;
`src/gvc/image-resolver.ts:1-60`; part-4 AD-11 (missing images).

**Acceptance criteria:**
- *Given* `a[image="x.png"]` with a sizer returning 40×30, *then* `-Tplain` node size equals
  native's with the real file.
- *Given* only `ctx.imageResolver` supplying bytes for an `<IMG>`, *then* no
  missing-image warning.
- *Given* no sizer or resolver (corpus), *then* bytediff identical (console included).

**Observability:** N/A. **Rollback:** reversible.
