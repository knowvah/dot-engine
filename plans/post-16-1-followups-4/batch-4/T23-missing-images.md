# T23: missing image messages (item 60, AD-11)

**Context:** native for a missing `image=` file prints
`Warning: No such file or directory while opening x.png` (`lib/gvc/gvusershape.c:700`,
`agwarningf("%s while opening %s\n", strerror(errno), fn)`) then
`Warning: No or improper image="x.png" for node "a"` (`lib/common/shapes.c:2044`). For
HTML `<IMG>` native prints the same `Warning: … while opening …` line before the
`Error: No or improper image file="…"` the port already prints (`htmltable.c:1092`;
port `src/common/htmltable.ts:246`). The port is browser-safe: images come from the
caller's resolver/sizer (`src/gvc/image-resolver.ts`, `usershape.ts`).

**Task:** where the port asks for an image's size (`gvusershape_size` port in
`src/gvc/usershape.ts`) and gets no data (no resolver/sizer installed, or it returns
none), print the `while opening` warning once per file as C's `gvusershape_open` does
(check C's caching: `gvusershape_find` reuses the entry, so the open is attempted once per
name per render); print `No or improper image=` in the `poly_init` port
(`src/common/poly-init.ts`) at C's position; keep `htmltable.ts`'s Error after the warning.
Dedupe state resets per render (part 3 AD-4 / T7).

**Write-set:** `src/gvc/usershape.ts`, `src/common/poly-init.ts`, `src/common/htmltable.ts`
(+ tests).
**Read-set:** `lib/gvc/gvusershape.c:600-720`, `lib/common/shapes.c:2015-2055`,
`lib/common/htmltable.c:1080-1100`; `src/gvc/usershape.ts`, `image-resolver.ts`;
`htmltable.ts:225-260`.

**Acceptance criteria:**
- *Given* `digraph{a[image="x.png"]}` with no resolver, *when* rendered, *then* stderr
  equals native's two lines.
- *Given* `a[label=<<TABLE><TR><TD><IMG SRC="x.png"/></TD></TR></TABLE>>]`, *then* stderr
  equals native's lines in order.
- *Given* a resolver that supplies `x.png`, *then* no message and output unchanged.

**Observability:** N/A. **Rollback:** reversible.
