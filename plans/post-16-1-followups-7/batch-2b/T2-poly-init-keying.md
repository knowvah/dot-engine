# T2: `poly_init` usershape keying (item 97, AD-7)

**Context:** `warnPolyInitImages` and `nodeImageSize`
(`src/common/poly-init.ts:100-140`) key the shapefile branch on `shapefile !== '' &&
shape !== 'epsf'`. C keys it on `ND_shape(n)->usershape && streq(name, "custom")`
(`shapes.c:2021-2041`). That flag comes from `bind_shape` (3970–3989), which does the
following:
- a `safefile(shapefile)` hit with shape not `epsf` forces the name `custom`;
- a name not in `Shapes` (or the name `custom`) goes to `user_shape` (3949–3968);
- `user_shape` sets `usershape = true` only for `custom` or when a `-l` library is loaded.
  Otherwise it warns `using box for unknown shape <name>`, and the image branch **runs**.

The port's `bindShape` (`src/common/shapes.ts:160-187`) maps shapefile to the box
descriptor and never sets `usershape`. Two cases differ, per the follow-up:
- `shape=custom` without a shapefile: C warns `No or improper shapefile="…"`;
- an unknown shape name together with `image=`: the follow-up text says the image branch
  is skipped, while the C reading says it runs.

The T0 fixtures `images/97-*` decide.

**Task:**
1. Tests first, from the T0 fixtures: stderr and output of both 97 cases match native,
   including where `using box for unknown shape` falls relative to the image warnings.
   Find where the port prints that line today and journal it.
2. Port `bind_shape` and `user_shape` as written, `usershape` flag included. Keep
   `safefile` as today's non-empty check; T9 replaces it. Key the two `poly-init.ts`
   functions on the bound descriptor exactly as `shapes.c:2021-2051` does.
3. Fix the stale `bindShape` doc comment ("the user-shape and shapefile branches require a
   node argument not yet ported").

**Write-set:** `src/common/poly-init.ts`, `src/common/shapes.ts` (+ tests beside each).
**Read-set:** `lib/common/shapes.c:2000-2055,3930-3990`, `src/gvc/usershape.ts`,
`src/gvc/__fixtures__/p7/images/97-*`, the part-6 journal row T1.

**Acceptance criteria:**
- *Given* `a[shape=custom]` (no shapefile), *when* laid out (`-Tsvg`, `-Tjson`), *then*
  stderr and output equal native.
- *Given* `a[shape=nosuch image="r.png"]`, *then* stderr and output equal native, and the
  journal records whether item 97's text was right.
- *Given* the corpus (including `graphs/user_shapes`), *when* bytediff runs, *then*
  output is identical or matches a fresh native run (stop 8).

**Commit:** `fix(T2): key poly_init image branches on the bound usershape`.
**Observability:** N/A. **Rollback:** reversible.
