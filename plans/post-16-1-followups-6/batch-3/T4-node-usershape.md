# T4: node images drawn through `gvrender_usershape` (item 91, AD-2, AD-3, AD-4)

**Context (native 16.1, 2026-10-29, 40×20 px `r.png`):**

| Case | svg | xdot `_draw_` tail |
|---|---|---|
| `a[image="r.png"]` | `<image … width="40px" height="20px" … x="7" y="-28"/>` after the ellipse | `e 27 18 27 18 I 7 8 40 20 5 -r.png` |
| `shape=box imagescale=true imagepos=tl` | `width="54px" height="27px" … x="0" y="-36"` | `I 0 9 54 27 5 -r.png` |
| `style=filled fillcolor=yellow` | filled ellipse, then the image | `C 7 -#ffff00 E … I 7 8 40 20 5 -r.png` |

The port sizes the node since part 5 T14 but draws nothing: `poly_gencode`'s
`usershape_p` branch (`shapes.c:3058-3080`) is unported, the xdot renderer has no
`usershape` (`core_loadimage_xdot`, `gvrender_core_dot.c:653`), and `emitHtmlImg`
(`htmltable-emit.ts:226-251`) is a partial `gvrender_usershape` (hard-coded `mc`, graph
dpi, no transform). Native draws at **job dpi**: layout reserved 30×15+2 (96 dpi), the
drawing is 40×20 (72).

**Task:**
1. Tests first from `$BASE/native/91*` (svg and xdot; json follows from xdot): every
   `imagepos` × `imagescale` case, filled, `peripheries=2`, `dpi=144`, `rotate=90`, HTML
   `<IMG>` with and without `SCALE`, neato.
2. `src/gvc/render-usershape.ts`: port `gvrender_usershape` entire (AD-2), including
   `get_imagescale`/`get_imagepos` parsing and `gvusershape_size_dpi(us, job->dpi)`
   (truncating `(int)` as C). "Found" = the installed sizer/resolver supplies `name`
   (`imageIsSupplied`, `src/gvc/usershape.ts`); the `find_user_shape`/`library_shape`
   branch is a no-op for svg/xdot (no renderer has `library_shape`).
3. `poly-gencode.ts`: the `usershape_p` branch (AD-3) at C's position after the
   peripheries, innermost-periphery coordinates, then `filled = 0`.
4. `htmltable-emit.ts`: `emitHtmlImg` calls the shared function with `"mc"` and the IMG
   scale (as `emit_html_img`); remove the partial copy.
5. `src/render/dot.ts`: xdot `usershape` per `core_loadimage_xdot` (AD-4).

**Write-set:** `src/gvc/render-usershape.ts` (new), `src/common/poly-gencode.ts`,
`src/common/htmltable-emit.ts`, `src/render/dot.ts` (+ tests beside each).
**Read-set:** `lib/gvc/gvrender.c:600-800` (`gvrender_usershape`, `get_imagescale`,
`get_imagepos`), `lib/common/shapes.c:3000-3085`, `lib/common/htmltable.c:emit_html_img`,
`plugin/core/gvrender_core_dot.c:640-680`, `plugin/core/gvloadimage_core.c:core_loadimage_svg`,
`src/render/svg.ts:225-252`, `src/gvc/usershape.ts`, `$BASE/native/91*`.

**Acceptance criteria:**
- *Given* `a[image="r.png"]` with a sizer reporting 40×20, *when* rendered -Tsvg and
  -Txdot, *then* the `<image>` element and the `I` op equal native's.
- *Given* each `imagepos` × `imagescale` case on `t.png`, *then* svg and xdot equal native.
- *Given* an HTML `<IMG>` cell, *then* svg equals native and xdot gains native's `I` op.
- *Given* no sizer, *then* output is unchanged; *given* the corpus, *then* bytediff is
  identical (stop 8 otherwise).

**Observability:** N/A. **Rollback:** reversible.
