# T4: layout-time FT_NULL warning (item 104, AD-6)

**Context:** native `gvusershape_open` runs at layout (`common_init_node` → `poly_init` →
`gvusershape_size` → `gvusershape_open` → `imagetype`). For resolver bytes whose magic
matches nothing it warns `"<name>" was not found as a file or as a shape library member`,
then `poly_init` warns `No or improper image="<name>" for node "<n>"`, and the image has no
size. Part 7 T6 added `imageOpenFailure(name, sizer, resolver)` and the optional `resolver`
of `usershapeSizePts` (`src/gvc/usershape.ts:85,130`) but could not wire the callers:
- `poly-init.ts:warnPolyInitImages` (~121) returns early on `imageIsSupplied`, so bad bytes
  with a sizer print nothing; `nodeImageSize` (~151) never passes a resolver, so bad bytes
  are sized;
- `htmltable.ts:sizeHtmlImg` (~145, ~153): the same for HTML `<IMG>`.

A per-context resolver replaces the global; an omitted one must not reach the global inside
`usershapeSizePts` (ADR-2 test `context-image-hooks.test.ts` "global not called").

**Task:**
1. Tests first from part 7's `src/gvc/__fixtures__/p7/images/101-bad.*` and
   `101-svgbare.*` (6 formats: stderr byte-equal, nothing drawn, no size) and T0's
   `src/gvc/__fixtures__/p8/` HTML case.
2. Export read accessors for the global hooks: `getGlobalImageResolver()` from
   `image-resolver.ts` (`activeResolver`) and `getGlobalImageSizer()` from `usershape.ts`
   (`activeSizer`, which `setImageSizer` sets).
3. `poly-init.ts`: `warnPolyInitImages` prints `imageOpenFailure(...)` (when non-null) then
   the `No or improper` line; `nodeImageSize` passes the effective resolver
   (`gvc?.imageResolver ?? getGlobalImageResolver() ?? undefined`).
4. `htmltable.ts`: the same two changes in `sizeHtmlImg`; HTML's first line keeps its
   `Warning: ` prefix and the `Error: No or improper image file=` line.

**Write-set:** `src/common/poly-init.ts`, `src/common/htmltable.ts`,
`src/gvc/image-resolver.ts`, `src/gvc/usershape.ts` (the sizer accessor only), tests beside
each.
**Read-set:** `src/gvc/usershape.ts:20-160`, `src/gvc/image-type.ts`,
`~/git/graphviz/lib/gvc/gvusershape.c:690-800`, `lib/common/shapes.c:2021-2051`,
`lib/common/htmltable.c:size_html_img`, `.agent-notes/post-16-1-followups-7.md`.

**Interface output:** `getGlobalImageResolver(): ImageResolver | null`,
`getGlobalImageSizer(): ImageSizer | null`.

**Acceptance criteria:**
- *Given* resolver bytes `hello` named `bad.png`, *when* rendered in each of svg, xdot,
  json, dot, plain and cmapx, *then* stderr equals `101-bad.<fmt>.stderr` and nothing is
  drawn.
- *Given* a sizer that sizes `bad.png` and a resolver with bad bytes, *then* the image is
  not sized and the FT_NULL pair prints, as native.
- *Given* an HTML `<IMG SRC="bad.png">`, *then* stderr equals T0's p8 fixture.
- *Given* the corpus (no resolver), *then* bytediff over the image ids is identical.

**Commit:** `fix(T4): warn on unrecognized image bytes at layout`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
