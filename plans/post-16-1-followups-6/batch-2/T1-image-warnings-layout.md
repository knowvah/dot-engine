# T1: missing-image and shapefile warnings once per layout (item 90, AD-1)

**Context:** `-Tjson` of `digraph{a[image="nope.png"]}` prints the pair
`Warning: No such file or directory while opening nope.png` /
`Warning: No or improper image="nope.png" for node "a"` twice; native prints it once.
Traced 2026-10-29: both copies come from `warnMissingImage` (`src/common/poly-init.ts:113-114`)
called by `polyInit`, which `render` (`src/gvc/device.ts:501`) runs for every node on every
render. The first copy is the json render itself; the second is `collectDrawLookup`'s
nested xdot render (`src/render/json.ts:248`). The `shapefile` warning
(`poly-init.ts:139-141`) has the same defect. C emits both from `poly_init`
(`shapes.c:2027-2046`), which runs once per layout from `common_init_node`; C's nested json
`gvRender` never re-lays out.

**Task:**
1. Tests first: `-Tjson`, `-Tsvg`, two renders of one laid-out graph, and the shapefile
   case each print the pair exactly once; the stderr order against other layout warnings
   matches `$BASE/native/90*` (label/font warnings before the image pair, as C builds the
   label before calling the shape's `initfn`).
2. Move both warnings into the layout-time `poly_init` port (`commonInitNode` →
   `initNodeFromLabel`, `src/common/nodeinit.ts`), after the label is made. Render-time
   `polyInit` keeps its binding work and emits nothing.
3. Check every engine's node init reaches the new site (dot, neato, fdp, sfdp, circo,
   twopi, osage, patchwork); journal any engine that sizes nodes without
   `commonInitNode(Edge)` and how it is covered. Probe neato and osage `-Tjson`.
4. Fix the stale comment "The port never sizes node images." (`poly-init.ts:104`).

**Write-set:** `src/common/poly-init.ts`, `src/common/nodeinit.ts` (+ tests beside each,
e.g. `src/gvc/usershape-missing.test.ts`, `src/layout/cleanup-labels.test.ts` if their
expected counts change).
**Read-set:** `lib/common/shapes.c:2000-2060` (`poly_init` image branch),
`lib/common/utils.c:common_init_node`, `src/gvc/device.ts:470-502`,
`src/render/json.ts:236-262`, `$BASE/native/90*`.

**Acceptance criteria:**
- *Given* `digraph{a[image="nope.png"]}` -Tjson (dot, neato, osage), *then* stderr equals
  native: the pair once.
- *Given* one laid-out graph rendered to svg twice, *then* the pair prints once (at layout).
- *Given* `a[shape=custom shapefile="nope.ps"]` -Tjson, *then* its warning prints once.
- *Given* the corpus, *then* bytediff shows output identical and console changes only on
  ids with a missing `image=`/`shapefile`, each one fewer duplicate.

**Observability:** N/A. **Rollback:** reversible.
