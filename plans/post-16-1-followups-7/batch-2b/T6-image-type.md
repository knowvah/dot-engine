# T6: image-type sniff, loadimage warning, `FT_NULL` (item 101, AD-5)

**Context:** native `-Tjson` prints `Warning: No loadimage plugin for "png:json"` once per
image op, and the port prints nothing, because it never knows the image's type. In C,
`gvusershape_open` (`gvusershape.c:735-790`) calls `imagetype(us)`, which sniffs the file's
magic bytes into `us->type` / `us->stringtype` (124–175). Then:

- **`FT_NULL`** (no magic matched, no shape-library member): it warns
  `"<name>" was not found as a file or as a shape library member` and the shape is NULL,
  so nothing is sized or drawn (750).
- **Rendering:** `gvrender_usershape` calls `gvloadimage(job, us, b, filled,
  job->render.type)` (`gvrender.c:794`). `gvloadimage` (`gvloadimage.c:44-64`) builds
  `"<stringtype>:<target>"` and warns when no loadimage plugin serves it.

The oracle's plugin set (`GVBINDIR`) serves the core table in
`plugin/core/gvloadimage_core.c:280-335`: `png:svg`, `png:xdot`, `png:dot` (null engine),
`png:map`, …, and **not** `png:json`. The T0 journal holds the native table
"format × type → warning". Where the port stands today:
- json's image ops come from `collectDrawLookup`'s nested xdot render
  (`src/render/json.ts:240-252`), so the warning must name the json target, not xdot;
- the port gets image bytes only from the resolver (`src/gvc/image-resolver.ts`), while
  the sizer (`src/gvc/usershape.ts`) gives only a size.

**Task:**
1. Tests first, from `src/gvc/__fixtures__/p7/images/101-*`: for every format and type in
   T0's table, stderr matches native. Unknown magic gives the `FT_NULL` warning, no size
   and no draw. A sizer-only image gives no loadimage warning (AD-5 divergence).
2. `src/gvc/image-type.ts`: port `imagetype` and its `knowntypes` table
   (`gvusershape.c:60-175`), including the xml/svg scan and the riff/webp check. It takes
   resolver bytes.
3. Port `gvloadimage`'s type string and warning, and the core plugin table as data, at the
   `gvrender_usershape` site (`render-usershape.ts`). For json, pass the json target
   through the nested render.
4. `FT_NULL`, in `usershape.ts`: when the resolver supplies bytes with unknown magic, warn
   at the point where C's `gvusershape_open` runs. If that is layout time (sizing), the
   resolver must be consulted there; journal the call chain.

**Write-set:** `src/gvc/image-type.ts` (new), `src/gvc/usershape.ts`,
`src/gvc/render-usershape.ts`, `src/render/json.ts` (+ tests beside each).
**Read-set:** `lib/gvc/gvusershape.c:55-180,690-800`, `lib/gvc/gvloadimage.c`,
`plugin/core/gvloadimage_core.c:270-340`, `lib/gvc/gvrender.c:670-800`,
`src/gvc/image-resolver.ts`, `.agent-notes/post-16-1-followups-6.md` (context API, job
plumbing).

**Interface output** (consumed by T9):

```ts
export const enum ImageType { FT_NULL, FT_BMP, FT_GIF, FT_PNG, FT_JPEG, FT_PDF, FT_PS,
  FT_EPS, FT_SVG, FT_XML, FT_RIFF, FT_WEBP, FT_ICO, FT_TIFF }  // lib/common/usershape.h:24-27
export function imagetype(bytes: Uint8Array): { type: ImageType; stringtype: string };
```

**Acceptance criteria:**
- *Given* resolver PNG bytes, *when* rendering `-Tjson`, *then* the port warns
  `No loadimage plugin for "png:json"` once per image op, as native does.
- *Given* `-Tsvg` / `-Txdot` with the same bytes, *then* there is no warning.
- *Given* bytes `hello` named `x.png`, *then* the port prints the `FT_NULL` line once and
  draws nothing, with stderr and output equal to native.
- *Given* the corpus (no resolver installed), *when* bytediff runs, *then* output is
  identical.

**Commit:** `fix(T6): sniff image type and warn on missing loadimage plugin`.
**Observability:** N/A. **Rollback:** reversible.
