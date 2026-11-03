# T5: per-context hooks in `safefile` (item 107, AD-7)

**Context:** part 7 T9 ported `safefile` with a render-state mirror of `Gvimagepath`
(`src/common/safefile.ts`). Its `findPath` treats "readable `dir/name`" as "the host
supplies `name`" via `imageIsSupplied(str)`, which reads only the **global** sizer and
resolver. With `imagepath` set and a name supplied only by a per-context sizer:
- `bindShape`'s `safefile(shapefile)` returns null, so a supplied shapefile does not force
  `custom` (C would find the file);
- image warnings are unaffected, because `warnPolyInitImages` already returns on the
  per-context `imageIsSupplied`.

**Task:**
1. Tests first from T0's `src/gvc/__fixtures__/p8/` per-context case: with `imagepath="d"`
   and `shape=custom shapefile="r.png"` supplied only by a per-context sizer, binding and
   stderr equal native (where `d/r.png` exists).
2. Extend the render-state container in `safefile.ts` to hold the layout's effective sizer
   and resolver, set beside `Gvimagepath` in `graph-init.ts` (read how `graph_init` reaches
   the context: `g.root.info.gvc`). If graph init has no context handle, stop and report the
   call chain (the alternative point, the layout entry, is outside this set).
3. `findPath` passes the mirrored hooks to `imageIsSupplied`. Keep `safefile(name)`'s C
   signature.

**Write-set:** `src/common/safefile.ts`, `src/common/graph-init.ts`, tests beside each.
**Read-set:** `src/gvc/usershape.ts:50-60`, `src/common/render-state.ts`,
`src/gvc/context.ts` (how a layout installs per-context hooks),
`plans/post-16-1-followups-7/decision-journal.md` (T9 rows).

**Acceptance criteria:**
- *Given* `imagepath` and a shapefile supplied only by a per-context sizer, *when* bound,
  *then* the shape binds as `custom` and stderr equals native.
- *Given* two consecutive layouts with different contexts, *then* the second sees only its
  own hooks.
- *Given* part 7's `102-*` fixtures, *then* stderr is unchanged.
- *Given* the corpus (no hooks), *then* bytediff over the image ids is identical.

**Commit:** `fix(T5): let safefile see the layout's own image hooks`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
